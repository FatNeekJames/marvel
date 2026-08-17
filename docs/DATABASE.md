# Database & Data Model

This document covers the Prisma schema, the underlying PostgreSQL tables, how the data
is seeded, and the workflow for making schema changes.

## Tooling

- **Prisma 7** with the PostgreSQL provider.
- The generated Prisma client is emitted to `app/generated/prisma/` (git-ignored).
- A **Prisma Postgres** local server is used in development (see
  [`DEVELOPMENT.md`](DEVELOPMENT.md)), while production uses a regular PostgreSQL
  connection string from `DATABASE_URL`.
- The `@prisma/adapter-pg` adapter is used for the connection pool.

## Schema (`prisma/schema.prisma`)

There are four models.

### `TimelineEntry`

The core data entity — one row per temporal point in the timeline. This is the model
the application actually reads.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | String (CUID) | Primary key. |
| `legacyKey` | String, unique | Stable key (e.g. `main:0`) used for idempotent upserts. |
| `dataset` | String | Dataset bucket; defaults to `main`. |
| `title` | String | Entry title, e.g. "Eyes of Wakanda". |
| `universe` | String | Universe label, e.g. `Earth-616`. |
| `reality` | String | Reality label; also a filter axis. |
| `note` | String? | Optional note (searchable). |
| `season` | String? | Optional season label. |
| `episodes` | String? | Optional episode label. |
| `period` | String? | Human-readable period, e.g. `1200BC`. |
| `yearStart` | Float? | Numeric start year for the loom X position. |
| `yearEnd` | Float? | Numeric end year. |
| `createdAt` / `updatedAt` | DateTime | Timestamps managed by Prisma / DB. |

Indexes: `(dataset, reality)` and `(title)`.

### `User`

Represents an application user keyed by an external identity.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | String (CUID) | Primary key. |
| `externalId` | String, unique | External identity (OAuth / provider ID). |
| `createdAt` | DateTime | Creation time. |

### `WatchRecord`

A many-to-many join table linking a `User` to a `TimelineEntry` they have watched.

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | String | FK → `users.id`, cascade delete. |
| `entryId` | String | FK → `timeline_entries.id`, cascade delete. |
| `watchedAt` | DateTime | When it was watched. |

Composite primary key: `(userId, entryId)`. Index on `entryId`.

### `ReleaseQueueItem`

A user's release-queue item.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | String (CUID) | Primary key. |
| `userId` | String | FK → `users.id`, cascade delete. |
| `title` | VarChar(120) | Queue item title. |
| `completed` | Boolean | Completion flag, default `false`. |
| `createdAt` / `updatedAt` | DateTime | Timestamps. |

Index on `(userId, createdAt)`.

> Note: only `TimelineEntry` is read by the current application code. `User`,
> `WatchRecord`, and `ReleaseQueueItem` are part of the schema but are not yet surfaced
> through any route or component. They represent the forward-looking user/tracking model.

## Relationship diagram

```
User 1 ────< WatchRecord >──── 1 TimelineEntry
  │
  └─────< ReleaseQueueItem
```

- `WatchRecord` is the join entity between `User` and `TimelineEntry`. Deleting either
  side cascades.
- `User` has many `ReleaseQueueItem`s; deleting a user cascades to their queue.

## Migrations

Migrations are committed to `prisma/migrations/`. There is currently one migration,
`20260817204500_initial`, which creates the `public` schema (where relevant) and the four
tables with all indexes, unique constraints, and FKs.

- `npm run db:migrate` — creates/ applies a new migration during development (`prisma migrate dev`).
- `npm run db:deploy` — applies committed migrations in deployment (`prisma migrate deploy`).

Workflow for a schema change:

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` locally and review the generated SQL.
3. Commit the schema change together with the generated migration folder.
4. In deployment, run `npm run db:deploy`.

## Seeding

Seed script: `prisma/seed.ts`. Seed data: `prisma/seed-data.json` (278 records).

Key properties:

- **Idempotent** — every record is upserted by its unique `legacyKey`, so re-running the
  seed never duplicates rows.
- Bounded — the test suite asserts every entry has a non-empty `title`, non-empty
  `reality`, and a `legacyKey` ≤ 100 chars.
- The `seed.ts` script reads `DATABASE_URL`, constructs its own `PrismaClient` with the
  `pg` adapter, upserts each record, and disconnects.

Commands:

- `npm run db:seed` — manual seed run (`tsx prisma/seed.ts`).
- The dev orchestration script (`npm run dev`) seeds automatically after applying
  migrations.
- `prisma.config.ts` declares the seed command, so Prisma can invoke it opportunistically.

## The `dataset` / `reality` filter model

`TimelineEntry.dataset` defaults to `main`. The application lets callers scope queries by
`dataset` and `reality`:

- `find()` filters on exact `dataset`, optional `reality`, and an optional search term
  across `title`, `reality`, and `note` (case-insensitive contains).
- `realities(dataset)` returns the distinct, alphabetically ordered reality list for a
  given dataset, used to build the filter dropdown.

## Connection handling

- `lib/db.ts` creates a `PrismaClient` with a `PrismaPg` adapter from `DATABASE_URL`.
- The client is cached on `globalThis` in non-production environments to avoid
  exhausting connections on hot reload.
- The repository never constructs its own client; it receives one via constructor
  injection from the factory (`lib/repositories/index.ts`).

## Backups / data integrity notes

- Idempotent seeding means data can always be re-derived from `seed-data.json`.
- Foreign keys use `ON DELETE CASCADE`, so removing a user cleans up their watch
  records and queue items automatically.
- Production should set a real, durable `DATABASE_URL` and run `db:deploy` as part of the
  release process (see [`DEPLOYMENT.md`](DEPLOYMENT.md)).
