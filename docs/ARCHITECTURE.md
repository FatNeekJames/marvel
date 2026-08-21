# Architecture

This document explains how the MCU Temporal Loom is structured, why the major
decisions were made, and how data flows through the system.

## Overview

The MCU Temporal Loom is a **single-page app rendered by Next.js** that visualises the
Marvel multiverse timeline. It presents two views:

1. **Loom view** — an interactive SVG chronology where Earth-616 is the central gold
   timeline, projects are compact tick marks, and alternate realities occupy separate
   coloured lanes.
2. **Database view** — a sortable, readable HTML table of the same entries.

Both views are driven by the same typed data, surfaced through a repository interface,
so presentation and data concerns stay separate.

```
┌────────────────────────────────────────────────────────────┐
│                        Browser                             │
│                                                            │
│   TimelineExplorer (client)                                │
│   ├── TimelineCanvas (Three.js loom)                       │
│   └── DatabaseView (catalogue and session-only controls)   │
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
| **SVG**                      | Accessible, deterministic timeline lanes that remain crisp while panning and zooming.            |
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
- `lib/db.ts` — lazily creates one postgres.js pool and Drizzle client per runtime,
  cached on `globalThis` to survive hot reloads and runtime reuse.
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
- `components/timeline-map.tsx` — the interactive SVG chronology map and its imperative
  navigation bridge used by database-to-loom actions.

## Data flow

### Server-rendered page (default)

1. `HomePage` (server) calls `getTimelineRepository()`.
2. It fetches the `main`, `90s`, `2010s`, and `universe-keys` datasets in parallel.
3. The four datasets are passed to `TimelineExplorer`.
4. `TimelineExplorer` maps entries into loom points, while `DatabaseView` filters and
   sorts the selected dataset locally with `useMemo`, so typing never hits the network.

Watched markers, custom release-queue entries, queue completion/removal state, and the
print/archive button states currently live only in `DatabaseView` React state. They are
not persisted and reset on reload. The `users`, `watchRecords`, and `releaseQueueItems`
tables are schema groundwork for a future authenticated persistence workflow.

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

## The temporal map

`TimelineMap` (inside `components/timeline-map.tsx`) renders the loom as semantic SVG:

- Earth-616 is the central, visually dominant gold lane.
- Every project is a short tick rather than a decorative branch.
- Other realities are deterministic coloured lanes above and below Earth-616.
- Labels alternate around lanes and increase in density as the user zooms.
- Dragging pans the chronology and wheel input zooms around the pointer position.
- Project markers are keyboard focusable and open the existing detail card.
- A vertical scrub line dims projects beyond the selected temporal position.
- The imperative `LoomHandle` preserves database-to-map navigation and existing controls.

The map uses React state and effects only for interaction and timed scrubbing. Its interval
is cleaned up whenever playback stops or the component unmounts.

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
