# MCU Temporal Loom

A database-backed Next.js application for exploring the Marvel multiverse timeline as a
searchable catalogue and an interactive SVG chronology map.

## Architecture

- **Next.js 16 App Router** provides server rendering, routing, API handlers, and production builds.
- **React 19 + TypeScript** provide typed server/client component boundaries.
- **PostgreSQL + Drizzle ORM** persist timeline entries, users, watch records, and release queues.
- **Tailwind CSS 4** owns component styling; the small global stylesheet contains only design tokens and document defaults.
- **SVG** renders the temporal map as deterministic horizontal reality lanes with
  accessible project markers, panning, zooming, filtering, and time scrubbing.
- **Zod** validates API input before it reaches the repository.

Runtime code does not parse CSV, use browser storage, or call static utility methods. Pages and API routes receive data through the `TimelineRepository` interface, whose production implementation is `DrizzleTimelineRepository`.

Timeline catalogue data is persisted in PostgreSQL. Watched markers and release-queue
controls are currently session-only UI state and reset when the page is reloaded; the
related database tables are reserved for a future authenticated-user workflow.

## Local setup

Requirement: Node.js 24+ and a local PostgreSQL server. `npm run dev` creates the `temporal_loom` database if needed, applies committed migrations, seeds the 278 migrated records, and starts Next.js automatically.

```sh
npm install
npm run dev
```

`npm run dev` connects to PostgreSQL at `postgres://localhost:5432/temporal_loom` by default (override with `DATABASE_URL`), applies the committed migration, seeds idempotently, and shuts the web server down with the database connection. Data persists between runs.

Production and standalone database commands still require `DATABASE_URL`; copy `.env.example` to `.env` and replace it with the deployed PostgreSQL connection string.

## Quality checks

```sh
npm run format        # format the codebase with Prettier
npm run format:check  # fail if anything has drifted
npm run lint
npm run typecheck
npm test
npm run build
```

Run the complete verification pipeline with `npm run check`.

## Documentation

In-depth supporting documentation lives in [`docs/`](docs/README.md): architecture,
database & data model, local development, API reference, deployment, testing, and a
glossary.

## Database workflow

- Change `lib/db/schema.ts` for schema updates; the Drizzle schema is the source of truth.
- Run `npm run db:generate` to emit a new migration and `npm run db:migrate` to apply it
  during development. Commit the generated migration.
- Run `npm run db:deploy` in deployment environments.
- `npm run db:seed` is idempotent because records are upserted by `legacyKey`.

Do not access the database directly from UI components. Add queries to the repository contract and implement them in the Drizzle adapter so domain and presentation code remain testable.

## Security

- Request input is bounded and validated with Zod.
- Drizzle parameterizes database queries.
- Security headers deny framing, browser capabilities, plugins, and cross-origin form submission.
- No third-party scripts are loaded at runtime.
- Dependency versions are locked and audit clean.
- Database failures are handled without leaking connection details to users.
