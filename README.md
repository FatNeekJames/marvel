# MCU Temporal Loom

A database-backed Next.js application for exploring the Marvel multiverse timeline as a searchable catalogue and a Three.js temporal loom.

## Architecture

- **Next.js 16 App Router** provides server rendering, routing, API handlers, and production builds.
- **React 19 + TypeScript** provide typed server/client component boundaries.
- **PostgreSQL + Prisma ORM** persist timeline entries, users, watch records, and release queues.
- **Tailwind CSS 4** owns component styling; the small global stylesheet contains only design tokens and document defaults.
- **Three.js** is isolated behind `TemporalLoomScene`, which owns its renderer, animation frame, resize observer, and cleanup lifecycle.
- **Zod** validates API input before it reaches the repository.

Runtime code does not parse CSV, use browser storage, or call static utility methods. Pages and API routes receive data through the `TimelineRepository` interface, whose production implementation is `PrismaTimelineRepository`.

## Local setup

Requirement: Node.js 24+. `npm run dev` starts a persistent local PostgreSQL-compatible database automatically.

```sh
npm install
npm run db:generate
npm run dev
```

The development command starts local Prisma Postgres, applies committed migrations, seeds the 278 migrated records, injects its connection URL into Next.js, and shuts the database down with the web server. Data persists between runs under the `temporal-loom` instance name.

Production and standalone database commands still require `DATABASE_URL`; copy `.env.example` to `.env` and replace it with the deployed PostgreSQL connection string.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Run the complete verification pipeline with `npm run check`.

## Database workflow

- Change `prisma/schema.prisma` for schema updates.
- Run `npm run db:migrate` during development and commit the generated migration.
- Run `npm run db:deploy` in deployment environments.
- `npm run db:seed` is idempotent because records are upserted by `legacyKey`.

Do not access Prisma directly from UI components. Add queries to the repository contract and implement them in the Prisma adapter so domain and presentation code remain testable.

## Security

- Request input is bounded and validated with Zod.
- Prisma parameterizes database queries.
- Security headers deny framing, browser capabilities, plugins, and cross-origin form submission.
- No third-party scripts are loaded at runtime.
- Dependency versions are locked and audit clean.
- Database failures are handled without leaking connection details to users.
