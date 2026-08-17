# Architecture

This document explains how the MCU Temporal Loom is structured, why the major
decisions were made, and how data flows through the system.

## Overview

The MCU Temporal Loom is a **single-page app rendered by Next.js** that visualises the
Marvel multiverse timeline. It presents two views:

1. **Loom view** — an interactive Three.js 3D point cloud where each timeline entry is a
   coloured point positioned along a golden temporal trunk based on its year.
2. **Database view** — a sortable, readable HTML table of the same entries.

Both views are driven by the same typed data, surfaced through a repository interface,
so presentation and data concerns stay separate.

```
┌────────────────────────────────────────────────────────────┐
│                        Browser                             │
│                                                            │
│   TimelineExplorer (client)                                │
│   ├── TimelineCanvas (Three.js loom)                       │
│   └── TimelineTable (catalogue)                            │
└───────────────────────────┬────────────────────────────────┘
                            │ server-rendered initial props
┌───────────────────────────▼────────────────────────────────┐
│              Next.js App Router (server)                    │
│   app/page.tsx            app/api/timeline/route.ts         │
└───────────────────────────┬────────────────────────────────┘
                            │ TimelineRepository
┌───────────────────────────▼────────────────────────────────┐
│           Domain + Repository layer                          │
│   lib/domain/timeline.ts    lib/repositories/                │
│   lib/db/ (Drizzle schema + client)                          │
└───────────────────────────┬────────────────────────────────┘
                            │ Drizzle (parameterized queries)
┌───────────────────────────▼────────────────────────────────┐
│                PostgreSQL                                    │
└─────────────────────────────────────────────────────────────┘
```

## Technology choices and the "why"

| Choice                       | Reason                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Next.js 16 (App Router)**  | Server rendering, route/API handlers, typed routes, and production builds in one framework.      |
| **React 19 + TypeScript**    | Strict, typed client/server component boundaries. `strict: true` in `tsconfig.json`.             |
| **PostgreSQL + Drizzle ORM** | Relational persistence with a typed query builder, SQL migrations, and a repository abstraction. |
| **Tailwind CSS 4**           | Utility-first styling; custom design tokens live in `globals.css` via `@theme`.                  |
| **Three.js**                 | 3D rendering for the temporal loom, isolated behind one class.                                   |
| **Zod 4**                    | Runtime validation of API input before it reaches the repository.                                |
| **postgres.js**              | Lightweight PostgreSQL driver used both by the Drizzle client and the seed/migration tooling.    |
| **Prettier**                 | Code formatting, enforced by `npm run format:check` inside `npm run check`.                      |
| **Vitest**                   | Fast unit tests that do not need a database.                                                     |

## Layer boundaries

The code enforces a strict layering rule, stated in the root README:

> Do not access the database directly from UI components. Add queries to the repository
> contract and implement them in the Drizzle adapter.

The layers, from innermost to outermost:

### 1. Domain (`lib/domain/timeline.ts`)

Pure types and pure functions with no I/O:

- `TimelineEntry` — the read-only shape of one timeline record.
- `TimelineQuery` — the filter/limit shape accepted by the repository.
- `normalizeQuery()` — trims, bounds, and defaults incoming queries. This is the only
  pure logic in the system and the primary unit under test.

### 2. Database (`lib/db/`)

The Drizzle runtime layer:

- `lib/db/schema.ts` — the Drizzle schema (the database source of truth), mirroring the
  four tables: `timelineEntries`, `users`, `watchRecords`, and `releaseQueueItems`.
- `lib/db.ts` — creates the postgres.js connection and the Drizzle client, cached on
  `globalThis` outside production to survive hot reloads.
- `lib/db/seed.ts` + `lib/db/seed-data.json` — the idempotent seeder and its 278 records.

### 3. Repositories (`lib/repositories/`)

- `timeline-repository.ts` — the `TimelineRepository` **interface** (contract).
- `drizzle-timeline-repository.ts` — the **Drizzle implementation** of that contract.
- `index.ts` — a factory, `getTimelineRepository()`, that wires the Drizzle client into
  the repository.

Consumers depend on the interface, never on the database directly. This keeps domain and
presentation code testable without a database.

### 4. Presentation (`app/`, `components/`)

- `app/page.tsx` — server component that queries the repository and hands initial data
  to the explorer. `force-dynamic` because the data changes.
- `app/api/timeline/route.ts` — a JSON API that validates query params with Zod, then
  queries the repository.
- `components/timeline-explorer.tsx` — a client component owning the view toggle, and
  client-side search/reality filtering over the server-provided entries.
- `components/timeline-canvas.tsx` — the client component wrapping the Three.js scene.

## Data flow

### Server-rendered page (default)

1. `HomePage` (server) calls `getTimelineRepository()`.
2. It fetches `find()` (entries) and `realities()` in parallel.
3. Data is passed to `TimelineExplorer` as `initialEntries` and `realities`.
4. The client component filters locally via `useDeferredValue` + `useMemo`, so typing in
   the search box never hits the network.

### API route (`GET /api/timeline`)

1. `NextRequest` query params are parsed by the Zod `querySchema`.
2. Invalid input returns `400` with Zod issues.
3. Valid input is passed to `timelineRepository.find(...)`.
4. Results are returned as JSON with a `Cache-Control: private, max-age=30` header.

## The Drizzle layer in practice

`DrizzleTimelineRepository` builds queries with Drizzle's query builder over the
`schema.ts` tables:

- `find()` filters by `dataset` (exact), optional `reality` (exact), and an optional
  `search` term using case-insensitive `ILIKE` across `title`, `reality`, and `note`.
  Results are ordered by `yearStart ASC NULLS LAST`, then `title ASC`, capped at
  `query.limit`.
- `realities(dataset)` selects distinct realities via `GROUP BY reality` ordered
  alphabetically, powering the filter dropdown.

Timestamps are managed by Drizzle's `defaultNow()` at the column level; the seeder and
repository never construct them by hand (the `updated_at` columns default to
`CURRENT_TIMESTAMP`, so the `onConflictDoUpdate` seed also bumps `updatedAt` on updates).

## The Three.js scene

`TemporalLoomScene` (inside `components/timeline-canvas.tsx`) owns all Three.js state:

- Creates a `WebGLRenderer`, a perspective camera, and a scene.
- Builds a golden line along the X axis (the "trunk").
- Maps each entry to a 3D point:
  - X position derives from `yearStart` (clamped to the trunk bounds).
  - Y/Z position wraps around the trunk based on the entry's reality and index.
  - Colour is derived from the reality index via HSL.
- Runs a single animation frame loop (slow X rotation).
- Handles resize through a `ResizeObserver`.
- Exposes `dispose()` for full cleanup (renderer, geometries, materials, observer).

The React component mounts the scene in a `useEffect` and disposes it on unmount or
when `entries` changes.

## Fail-soft behaviour

If the database is unavailable, `HomePage` catches the error and renders a "Temporal Loom
could not initialize" screen. It **never** falls back to browser storage, by design — the
dataset is large and the app is database-backed.

## Configuration

- `next.config.ts` — security headers (CSP, frame denial, permissions), typed routes,
  React strict mode, no powered-by header.
- `drizzle.config.ts` — Drizzle Kit config: schema location (`lib/db/schema.ts`),
  migrations output (`drizzle/`), and the PostgreSQL dialect with a local DSN fallback.
- `eslint.config.mjs` — Next core-web-vitals + TypeScript rules, with
  `eslint-config-prettier` disabling formatting rules; ignores generated code and the
  migration folder.
- `.prettierrc` + `.prettierignore` — Prettier formatting rules (no semicolons, single
  quotes, trailing commas, 100-char width) and exclusions.
- `postcss.config.mjs` — Tailwind PostCSS plugin.

## Key invariants

1. UI components never touch the database directly.
2. All API/query input is bounded and validated (Zod server-side, capped length client-side).
3. The seed is idempotent (upserts by `legacyKey`).
4. `normalizeQuery` caps `limit` to `[1, 500]` and defaults everything safely.
5. Runtime code performs no CSV parsing, no browser-storage use, and no static utility calls.
6. The Drizzle schema in `lib/db/schema.ts` is the single source of truth for migrations.
