# MCU Temporal Loom — Documentation Index

This directory is the supporting documentation for the MCU Temporal Loom project, a
database-backed Next.js application that lets you explore the Marvel multiverse
timeline as a searchable catalogue and an interactive Three.js temporal loom.

The project lives in a single repository. The documentation here is meant to get a
developer from zero to productive as quickly as possible, and to serve as a reference
for how the pieces fit together.

## Document map

| Document                             | What it covers                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the app is structured: framework choices, layers, data flow, and design decisions. |
| [`DATABASE.md`](DATABASE.md)         | The Drizzle data model, the schema, migrations, seeding, and database workflow.        |
| [`DEVELOPMENT.md`](DEVELOPMENT.md)   | Local setup, the dev server orchestration script, and day-to-day tooling.              |
| [`API.md`](API.md)                   | The public API routes, query parameters, and the domain/repository contract.           |
| [`DEPLOYMENT.md`](DEPLOYMENT.md)     | Production builds, environment variables, security headers, and deployment steps.      |
| [`TESTING.md`](TESTING.md)           | The test suite, quality gates, and how to verify changes.                              |
| [`GLOSSARY.md`](GLOSSARY.md)         | Domain and codebase terminology (TVA, Loom, realities, temporal points).               |

## Quick start

```sh
npm install
npm run dev
```

Requires **Node.js 24+** and a local PostgreSQL server. `npm run dev` creates the
`temporal_loom` database if needed, applies migrations, seeds the 278 timeline
records, and starts Next.js automatically. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for
details.

## Verifying changes

```sh
npm run check
```

Runs lint, typecheck, tests, and a production build. See [`TESTING.md`](TESTING.md).

## Where the code lives

```
app/          Next.js App Router pages, layout, error/loading states, API routes
components/   Client components: the Three.js canvas and the explorer UI
lib/          Domain model, Drizzle schema, repository interfaces, and the Drizzle adapter
drizzle/      SQL migrations and the migration journal
scripts/      Dev-server orchestration script
test/         Vitest unit tests
```

## Related

- Root [`README.md`](../README.md) — the project landing page and quick setup.
