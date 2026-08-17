# Deployment & Production

How to build, configure, and deploy the MCU Temporal Loom to production.

## Build pipeline

The project is a standard Next.js app with a PostgreSQL backend. The full verification
pipeline is `npm run check` (lint → typecheck → test → build).

For a production build:

```sh
npm run build      # next build
npm run start      # next start (serves the production build)
```

## Environment variables

The only required environment variable is `DATABASE_URL`, pointing at a real,
durable PostgreSQL database.

```
DATABASE_URL="postgres://user:password@host:5432/dbname"
```

Copy `.env.example` to `.env` and replace the value with the deployed connection string.
`.env` is git-ignored; in a hosted platform, set `DATABASE_URL` as a secret directly.

> In development-only, `npm run dev` short-circuits this by starting a local Prisma
> Postgres server and injecting `DATABASE_URL` itself. Production/Docker/`next start`
> has no such shortcut — set `DATABASE_URL` explicitly.

## Apply database migrations

Migrations are committed under `prisma/migrations/`. On deploy, run:

```sh
npm run db:deploy      # prisma migrate deploy
```

Apply migrations before or as part of the release so the schema matches the running
code. Never run `db:migrate` (interactive dev variant) in production.

## Seed (one-time or as needed)

```sh
npm run db:seed        # tsx prisma/seed.ts
```

The seed is **idempotent** (upserts by `legacyKey`), so it is safe to run repeatedly.
Run it once on a fresh production database.

## Regenerate the Prisma client

The generated client (`app/generated/prisma/`) is git-ignored, so it must be produced at
build/deploy time:

```sh
npm run db:generate    # prisma generate
```

Include this in your install/build steps.

## Security posture

Security headers are configured centrally in `next.config.ts` and applied to all routes:

- **Content-Security-Policy** — `default-src 'self'`; `script-src 'self' 'unsafe-inline'`
  (dev also allows `unsafe-eval`); `style-src 'self' 'unsafe-inline'`; `img-src 'self'
  data:`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`;
  `frame-ancestors 'none'`; `form-action 'self'`.
- **`X-Frame-Options: DENY`** — prevents framing.
- **`Permissions-Policy`** — disables camera, microphone, geolocation.
- **`Referrer-Policy: strict-origin-when-cross-origin`**.
- **`X-Content-Type-Options: nosniff`**.
- `poweredByHeader: false` removes the `X-Powered-By` header.

Other hardening in the codebase:

- All API input is validated with **Zod** (bounds + types) before use.
- **Prisma parameterises** all queries — no raw SQL interpolation.
- No third-party scripts are loaded at runtime.
- Failure paths log details server-side but never leak connection details to users.
- The app intentionally never falls back to browser storage for the dataset.

## Recommended deployment steps (platform-agnostic)

1. Set `DATABASE_URL` to the production PostgreSQL connection string.
2. `npm ci` (install from lockfile).
3. `npm run db:generate`.
4. `npm run db:deploy`.
5. `npm run db:seed` (first deploy only).
6. `npm run build`.
7. Start with `npm run start` (or your platform’s Node runner against the build output).

## Considerations

- **Node 24+** is required (`engines`). Ensure the runtime matches.
- The page is `force-dynamic`, so every request queries the database; use a real,
  scaled PostgreSQL rather than a serverless ephemeral store.
- The API response sets `Cache-Control: private, max-age=30`, so an HTTP cache/CDN can
  reduce DB load for the JSON endpoint.
- Keep `DATABASE_URL` out of client bundles. It is only read server-side (in
  `lib/db.ts`, `prisma/seed.ts`, `scripts/dev.mjs`, and `prisma.config.ts`).
