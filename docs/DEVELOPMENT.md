# Local Development & Tooling

How to set up and work on the MCU Temporal Loom locally, including the custom dev
orchestration script.

## Requirements

- **Node.js 24+** (the project enforces this via `engines`).
- `npm` (the repo uses `package-lock.json`).

## One-time setup

```sh
npm install
npm run db:generate     # emit the Prisma client into app/generated/prisma
npm run dev
```

That is the whole happy path. `npm run dev` does everything else for you.

## What `npm run dev` actually does

The `dev` script is `node --no-warnings scripts/dev.mjs` and it is the orchestrator for
the whole local experience. In order it:

1. **Starts a local Prisma Postgres server** named `temporal-loom`
   (`startPrismaDevServer` with `persistenceMode: 'stateful'`). Stateful persistence
   means your data survives restarts between runs under the same instance name.
2. **Builds the environment**: it injects `DATABASE_URL` set to the local server's
   Prisma ORM connection string.
3. **Applies migrations** with `prisma migrate deploy` against that URL.
4. **Seeds the database** with `tsx prisma/seed.ts` (idempotent, 278 records).
5. **Starts Next.js** with `next dev` using the same environment.
6. **Cleans up on exit**: it shuts down the web process and closes the local database
   server (`shutdown()`), handling SIGINT/SIGTERM.

Because it manages a local database automatically, you normally never need to set
`DATABASE_URL` for development. The connection string is printed/used internally.

### `npm run dev:web`

Runs `next dev` alone. Only useful when you already have a database available and
`DATABASE_URL` set in your environment.

## A note on the generated Prisma client

Prisma generates its client into `app/generated/prisma/`, which is **git-ignored**.
After `npm install` or after changing the schema, regenerate it:

```sh
npm run db:generate
```

If you see import errors like `Cannot find module '@/app/generated/prisma/client'`, the
client has not been generated — run `db:generate`.

## Environment variables

Copy `.env.example` to `.env` and fill it in **only when** you need a database other than
the locally orchestrated one (for example a shared dev database).

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
lib/repositories/                 # contract + Prisma adapter + factory
prisma/schema.prisma              # schema
prisma/seed-data.json             # seed data (278 records)
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
3. Implement the filter in `PrismaTimelineRepository.find()`.
4. Optionally expose it on the API route and add a Zod field.

### Change a component

Keep the layering rule: components consume data through props / the repository, never
Prisma directly. Client components that filter locally should do so with
`useDeferredValue` + `useMemo` (as `TimelineExplorer` does) to keep typing responsive.

### Regenerate after schema change

```sh
npm run db:generate
```

### Watch the app

`npm run dev` streams all child output (`stdio: 'inherit'`), so you see Prisma, seed, and
Next.js logs in one terminal.

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| `DATABASE_URL is required` | You ran `next dev` / a script that needs a DB without the orchestrated env. Use `npm run dev`, or set `DATABASE_URL`. |
| `Cannot find module '@app/generated/prisma/client'` | Run `npm run db:generate`. |
| Port already in use | The Next.js dev port is taken. Stop other dev servers or configure a different port. |
| Seed count mismatch in tests | The test asserts 278 records with unique `legacyKey`s; the data file must match. |
| Database persists unexpectedly | `persistenceMode: 'stateful'` keeps data under the `temporal-loom` instance. To reset, remove the local Prisma server state. |
