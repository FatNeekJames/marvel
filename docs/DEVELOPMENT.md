# Local Development & Tooling

How to set up and work on the MCU Temporal Loom locally, including the custom dev
orchestration script.

## Requirements

- **Node.js 24+** (the project enforces this via `engines`).
- **PostgreSQL** — a local server reachable at `postgres://localhost:5432` (the dev
  script auto-creates the `temporal_loom` database on it).
- `npm` (the repo uses `package-lock.json`).

## One-time setup

```sh
npm install
npm run dev
```

That is the whole happy path. `npm run dev` does everything else for you.

## What `npm run dev` actually does

The `dev` script is `node --no-warnings scripts/dev.mjs`. In order it:

1. **Connects to local PostgreSQL.** It uses `DATABASE_URL` if set, otherwise defaults
   to `postgres://localhost:5432/temporal_loom`.
2. **Ensures the database exists.** It connects to the `postgres` maintenance database
   and creates `temporal_loom` if missing (best-effort; fails softly if creation is not
   possible on the current server).
3. **Applies migrations** with Drizzle's programmatic migrator against the `drizzle/`
   folder (the same migration set `drizzle-kit migrate` applies).
4. **Seeds the database** with `tsx lib/db/seed.ts` (idempotent, 278 records).
5. **Starts Next.js** with `next dev` using the same environment.
6. **Cleans up on exit**: it terminates the web process and closes its database
   connections on SIGINT/SIGTERM.

Data persists between runs because it lives in your local PostgreSQL server.

### `npm run dev:web`

Runs `next dev` alone. Only useful when you already have a database available and
`DATABASE_URL` set in your environment.

## Environment variables

Copy `.env.example` to `.env` and fill it in **only when** you need a database other
than the local default (for example a shared dev database).

```
DATABASE_URL="postgres://postgres:postgres@localhost:5432/temporal_loom"
```

`.env` is git-ignored. `.env.example` is committed as a template.

## Project layout (files you touch often)

```
app/page.tsx                      # server page; queries the repository
app/api/timeline/route.ts         # JSON API
components/timeline-explorer.tsx  # view toggle, search/filter UI
components/timeline-canvas.tsx    # Three.js loom
lib/domain/timeline.ts            # domain types + normalizeQuery
lib/db/schema.ts                  # Drizzle schema (source of truth)
lib/db.ts                         # Drizzle client factory
lib/db/seed.ts                    # idempotent seeder
lib/db/seed-data.json             # seed data (278 records)
lib/repositories/                 # contract + Drizzle adapter + factory
drizzle/                          # committed SQL migrations + journal
drizzle.config.ts                 # Drizzle Kit configuration
scripts/dev.mjs                   # dev orchestration
test/timeline.test.ts             # unit tests
```

## Editor / TypeScript

`tsconfig.json` uses `strict: true`, ES2022, module `esnext`, bundler resolution, and a
`@/*` path alias pointing at the repo root. It also registers the Next.js type plugin,
so typed routes are enforced by the editor and `tsc`.

## Common tasks

### Add a new query / filter

1. Extend `TimelineQuery` in `lib/domain/timeline.ts`.
2. Update `normalizeQuery` to bound and default the new field.
3. Implement the filter in `DrizzleTimelineRepository.find()`.
4. Optionally expose it on the API route and add a Zod field.

### Change the schema

1. Edit `lib/db/schema.ts`.
2. Run `npm run db:generate` to produce a migration.
3. Run `npm run db:migrate` to apply it locally.
4. Commit the schema change with the generated migration files.

### Change a component

Keep the layering rule: components consume data through props / the repository, never
the database directly. Client components that filter locally should do so with
`useDeferredValue` + `useMemo` (as `TimelineExplorer` does) to keep typing responsive.

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| `DATABASE_URL is required` | You ran `next dev` / a script that needs a DB without the orchestrated env. Use `npm run dev`, or set `DATABASE_URL`. |
| `ECONNREFUSED` to localhost:5432 | PostgreSQL is not running. Start it (`brew services start postgresql@18`, or your platform's equivalent). |
| Seed count mismatch in tests | The test asserts 278 records with unique `legacyKey`s; the data file must match. |
| Migration conflicts | The `drizzle/` journal says a migration already applied but the DB disagrees. Reconcile the DB or reset the dev database. |
| Database persists unexpectedly | Data is stored in your local PostgreSQL. To reset, `dropdb temporal_loom` and let `npm run dev` recreate it. |