# Database & Data Model

This document covers the Drizzle schema, the underlying PostgreSQL tables, how the data
is seeded, and the workflow for making schema changes.

## Tooling

- **Drizzle ORM** with the PostgreSQL dialect, driven through Drizzle Kit
  (`drizzle-kit`).
- The schema lives in TypeScript at `lib/db/schema.ts` and is the **single source of
  truth** for the database shape.
- Migrations are committed SQL files under `drizzle/`, tracked by a small meta journal.
- Connections use the **postgres.js** driver (`postgres` package), wrapped by the Drizzle
  client in `lib/db.ts`.
- Development uses a local PostgreSQL server; production uses `DATABASE_URL` (see
  [`DEVELOPMENT.md`](DEVELOPMENT.md) and [`DEPLOYMENT.md`](DEPLOYMENT.md)).

## Schema (`lib/db/schema.ts`)

There are four tables, matching the original schema 1:1.

### `timelineEntries`

The core data entity — one row per temporal point in the timeline. This is the table
the application actually reads.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text (PK) | Random UUID generated client-side on insert. |
| `legacyKey` | text, unique | Stable key (e.g. `main:0`) used for idempotent upserts. |
| `dataset` | text | Dataset bucket; defaults to `main`. |
| `title` | text | Entry title, e.g. "Eyes of Wakanda". |
| `universe` | text | Universe label, e.g. `Earth-616`. |
| `reality` | text | Reality label; also a filter axis. |
| `note` | text? | Optional note (searchable). |
| `season` | text? | Optional season label. |
| `episodes` | text? | Optional episode label. |
| `period` | text? | Human-readable period, e.g. `1200BC`. |
| `yearStart` | double precision? | Numeric start year for the loom X position. |
| `yearEnd` | double precision? | Numeric end year. |
| `createdAt` / `updatedAt` | timestamp | Managed by DB defaults (`CURRENT_TIMESTAMP`). |

Indexes: unique `(legacyKey)`, `(dataset, reality)`, and `(title)`.

### `users`

Represents an application user keyed by an external identity.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text (PK) | Random UUID generated client-side on insert. |
| `externalId` | text, unique | External identity (OAuth / provider ID). |
| `createdAt` | timestamp | Creation time, DB default. |

### `watchRecords`

A many-to-many join table linking a `User` to a `TimelineEntry` they have watched.

| Column | Type | Notes |
| --- | --- | --- |
| `userId` | text | FK → `users.id`, cascade delete + update. |
| `entryId` | text | FK → `timeline_entries.id`, cascade delete + update. |
| `watchedAt` | timestamp | When it was watched, DB default. |

Composite primary key: `(userId, entryId)`. Index on `entryId`.

### `releaseQueueItems`

A user's release-queue item.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text (PK) | Random UUID generated client-side on insert. |
| `userId` | text | FK → `users.id`, cascade delete + update. |
| `title` | varchar(120) | Queue item title. |
| `completed` | boolean | Completion flag, default `false`. |
| `createdAt` / `updatedAt` | timestamp | Managed by DB defaults. |

Index on `(userId, createdAt)`.

> Note: only `timelineEntries` is read by the current application code. `users`,
> `watchRecords`, and `releaseQueueItems` are part of the schema but are not yet surfaced
> through any route or component. They represent the forward-looking user/tracking model.

## Relationship diagram

```
User 1 ────< WatchRecord >──── 1 TimelineEntry
  │
  └─────< ReleaseQueueItem
```

- `watchRecords` is the join table between `users` and `timeline_entries`. Deleting
  either side cascades.
- `users` has many `release_queue_items`; deleting a user cascades to their queue.

## Migrations

Migrations are committed under `drizzle/` as SQL files plus `drizzle/meta/_journal.json`.

- `npm run db:generate` — `drizzle-kit generate`: diffs `lib/db/schema.ts` against the
  last snapshot and writes a new SQL migration.
- `npm run db:migrate` — `drizzle-kit migrate`: applies pending migrations.
- `npm run db:deploy` — also `drizzle-kit migrate` (same command, applied in deployment).

Workflow for a schema change:

1. Edit `lib/db/schema.ts`.
2. Run `npm run db:generate` locally and review the generated SQL.
3. Commit the schema change together with the generated migration files.
4. In deployment, run `npm run db:deploy`.

The runtime migration path used by `scripts/dev.mjs` calls Drizzle's programmatic
`migrate()` migrator against the `drizzle/` folder, so dev and CLI stay in sync.

## Seeding

Seed script: `lib/db/seed.ts`. Seed data: `lib/db/seed-data.json` (278 records).

Key properties:

- **Idempotent** — every record is upserted by its unique `legacyKey` via PostgreSQL's
  `ON CONFLICT DO UPDATE`, so re-running the seed never duplicates rows and refreshes
  changed fields (and bumps `updatedAt`).
- Bounded — the test suite asserts every entry has a non-empty `title`, non-empty
  `reality`, and a `legacyKey` ≤ 100 chars.
- The `seed.ts` script reads `DATABASE_URL`, opens a postgres.js connection, upserts
  each record through the Drizzle client, and closes the connection.

Commands:

- `npm run db:seed` — manual seed run (`tsx lib/db/seed.ts`).
- The dev orchestration script (`npm run dev`) seeds automatically after applying
  migrations.

## The `dataset` / `reality` filter model

`timelineEntries.dataset` defaults to `main`. The application lets callers scope queries
by `dataset` and `reality`:

- `find()` filters on exact `dataset`, optional `reality`, and an optional search term
  across `title`, `reality`, and `note` (case-insensitive `ILIKE`).
- `realities(dataset)` returns the distinct, alphabetically ordered reality list for a
  given dataset, used to build the filter dropdown.

## Connection handling

- `lib/db.ts` creates a postgres.js connection pool and a Drizzle client from
  `DATABASE_URL`.
- The client is cached on `globalThis` in non-production environments to avoid
  exhausting connections on hot reload.
- The repository never constructs its own connection; it receives the Drizzle client via
  constructor injection from the factory (`lib/repositories/index.ts`).

## Backups / data integrity notes

- Idempotent seeding means data can always be re-derived from `seed-data.json`.
- Foreign keys use `ON DELETE CASCADE` (+ `ON UPDATE CASCADE`), so removing a user
  cleans up their watch records and queue items automatically.
- Production should set a real, durable `DATABASE_URL` and run `db:deploy` as part of the
  release process (see [`DEPLOYMENT.md`](DEPLOYMENT.md)).