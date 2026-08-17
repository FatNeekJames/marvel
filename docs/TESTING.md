# Testing & Quality Checks

How the project verifies correctness and what each quality gate covers.

## Quality gates

The umbrella command is `npm run check`, which runs, in order:

1. `npm run lint` — ESLint (Next core-web-vitals + TypeScript configs).
2. `npm run typecheck` — `tsc --noEmit` (strict TypeScript).
3. `npm test` — Vitest unit tests.
4. `npm run build` — a production Next.js build (catches build-time issues).

Run them individually with the corresponding `npm run …` command, or all at once with
`npm run check`.

## Test framework

**Vitest** runs the unit suite from `test/timeline.test.ts`. No database is required —
the tests exercise pure logic and static data, so they run fast and everywhere.

### What the tests cover

**`normalizeQuery` (pure query normalization):**
- Applies stable defaults when given an empty query.
  - `normalizeQuery({})` → `{ dataset: 'main', reality: '', search: '', limit: 500 }`.
- Trims input and caps limits.
  - `' main '` → `'main'`; `'iron man'` search is trimmed; `limit: 10_000` is capped to
    `500`.
- Prevents unbounded or empty queries.
  - `limit: -4` → clamps to `1`.

**Timeline seed data (`prisma/seed-data.json`):**
- Contains exactly **278** migrated records, each with a **stable unique** `legacyKey`
  (no duplicates).
- Contains only bounded values the database accepts: every title and reality is
  non-empty, and every `legacyKey` is ≤ 100 chars.

## Linting

`eslint.config.mjs` composes `eslint-config-next/core-web-vitals` and
`eslint-config-next/typescript`. It globally **ignores**:

- `.next/**` — Next build output.
- `app/generated/**` — the generated Prisma client.
- `prisma/seed-data.json` — large data file.

## Type checking

`tsconfig.json` enables `strict: true`, `noEmit`, ES2022, and paths (`@/*` → repo root).
The Next.js plugin enforces typed routes. `npm run typecheck` runs `tsc --noEmit`.

## Production build

`npm run build` runs `next build`. Because the repo uses `next build` with the generated
Prisma client, ensure you have run `npm run db:generate` first if the client is missing
(otherwise the typecheck/build may fail on missing modules).

## Adding a test

Put tests in `test/`. Follow the existing style:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeQuery } from '../lib/domain/timeline';

describe('normalizeQuery', () => {
  it('applies stable defaults', () => {
    expect(normalizeQuery({})).toEqual({ dataset: 'main', reality: '', search: '', limit: 500 });
  });
});
```

Sample JSON is imported directly with `import seedData from '../prisma/seed-data.json'`
(resolveJsonModule is enabled).

## CI recommendation

Run `npm run check` in CI. Ensure Node 24+ and run `npm install` (or `npm ci`) before
the gates. For deploy-time, follow the steps in [`DEPLOYMENT.md`](DEPLOYMENT.md).
