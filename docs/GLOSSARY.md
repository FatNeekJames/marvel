# Glossary

Common terms used across the codebase and this documentation.

## Domain terms

| Term | Meaning |
| --- | --- |
| **TVA** | Time Variance Authority — the Marvel organisation the app's theme invokes. Purely presentational (the UI labels itself "TVA // TEMPORAL LOOM"). |
| **Temporal Loom** | The app's central visual: a Three.js 3D point cloud where each timeline entry is a point positioned along a golden trunk by year. |
| **Timeline entry / temporal point** | One row in `timelineEntries` — a single title/event/release with a year range, reality, and optional season/episode. 278 are seeded. |
| **Reality** | A multiverse reality label (e.g. `Earth-616`). Entries are grouped and coloured by reality in the loom and filterable in the UI. |
| **Universe** | A universe label on each entry (e.g. `Earth-616`); currently stored per row but not a separate filter axis. |
| **Dataset** | A bucket of entries (defaults to `main`). Queries scope by dataset before reality/search. |
| **Period** | The human-readable time label on an entry (e.g. `1200BC`). |
| **yearStart / yearEnd** | Numeric years used to place the point on the loom's X axis and to sort results. |

## Codebase terms

| Term | Meaning |
| --- | --- |
| **Repository** | The `TimelineRepository` interface (contract) that UI/API code depends on, decoupling them from the database. |
| **Drizzle adapter / `DrizzleTimelineRepository`** | The production implementation of the repository using the Drizzle ORM query builder. |
| **Factory (`getTimelineRepository`)** | `lib/repositories/index.ts` function that constructs the repository wired to the Drizzle client. |
| **Drizzle schema (`lib/db/schema.ts`)** | TypeScript definition of all four tables; the single source of truth for migrations. |
| **`normalizeQuery`** | Pure function in `lib/domain/timeline.ts` that trims, bounds, and defaults a `TimelineQuery`. The main unit under test. |
| **Loom view / Database view** | The two `TimelineExplorer` tabs: the Three.js scene and the HTML table. |
| **`legacyKey`** | Stable unique key per seed record (e.g. `main:0`) used for idempotent upserts. |
| **postgres.js** | The `postgres` npm package; a lightweight PostgreSQL driver used by the Drizzle client, the seeder, and the dev script. |
| **`force-dynamic`** | Next.js route segment config on `app/page.tsx` ensuring the page queries the database on every request (no static caching). |

## Scripts (package.json)

| Script | What it runs |
| --- | --- |
| `npm run dev` | Orchestrated local dev: ensure DB + migrate + seed + Next dev. |
| `npm run dev:web` | `next dev` only (needs a database and `DATABASE_URL`). |
| `npm run build` | `next build`. |
| `npm run start` | `next start` (production serve). |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest run. |
| `npm run check` | Lint + typecheck + test + build. |
| `npm run db:generate` | `drizzle-kit generate` (create a migration from the schema diff). |
| `npm run db:migrate` | `drizzle-kit migrate` (apply pending migrations). |
| `npm run db:deploy` | `drizzle-kit migrate` (apply migrations in deploy environments). |
| `npm run db:seed` | `tsx lib/db/seed.ts`. |