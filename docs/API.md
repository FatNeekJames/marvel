# API & Domain Reference

Reference for the JSON API endpoint and the domain/repository contract that backs both
the page and the API.

## Domain (`lib/domain/timeline.ts`)

### `TimelineEntry`

The read-only shape of one timeline record. All fields except `note`, `season`,
`episodes`, `period`, `yearStart`, and `yearEnd` are required.

```ts
type TimelineEntry = Readonly<{
  id: string;
  legacyKey: string;
  dataset: string;
  title: string;
  universe: string;
  reality: string;
  note: string | null;
  season: string | null;
  episodes: string | null;
  period: string | null;
  yearStart: number | null;
  yearEnd: number | null;
}>;
```

### `TimelineQuery`

```ts
type TimelineQuery = Readonly<{
  dataset?: string;   // exact dataset bucket (default 'main')
  reality?: string;   // exact reality filter
  search?: string;    // case-insensitive substring across title, reality, note
  limit?: number;     // 1..500 (default 500)
}>;
```

### `normalizeQuery(query): Required<TimelineQuery>`

Pure function that normalises any query before it reaches the database:

- `dataset` — trimmed, sliced to 32 chars, defaults to `main`.
- `reality` — trimmed, sliced to 100 chars, defaults to `''`.
- `search` — trimmed, sliced to 120 chars, defaults to `''`.
- `limit` — clamped to the inclusive range `[1, 500]`, defaults to `500`.

This is the single source of truth for input bounds shared by the repository and the tests.

## Repository contract (`lib/repositories/timeline-repository.ts`)

```ts
interface TimelineRepository {
  find(query?: TimelineQuery): Promise<readonly TimelineEntry[]>;
  realities(dataset?: string): Promise<readonly string[]>;
}
```

- `find(...)` — returns timeline entries matching the (normalised) query, ordered by
  `yearStart` ascending (nulls last) then `title` ascending, limited to `query.limit`.
- `realities(dataset='main')` — returns the distinct realities for a dataset,
  alphabetically ordered. Used to populate the filter dropdown.

The production implementation is `PrismaTimelineRepository` in
`lib/repositories/prisma-timeline-repository.ts`, and `getTimelineRepository()` in
`lib/repositories/index.ts` is the factory that returns it wired to the database client.

## HTTP API

### `GET /api/timeline`

Returns timeline entries as JSON. Query parameters are parsed with Zod and bounded
identically to `normalizeQuery`.

**Query parameters:**

| Param | Type | Default | Constraint |
| --- | --- | --- | --- |
| `dataset` | string | `main` | max 32 chars |
| `reality` | string | — | optional, max 100 chars |
| `search` | string | — | optional, max 120 chars |
| `limit` | int | `500` | coerced int, min 1, max 500 |

**Success — `200 OK`:**

```json
{
  "entries": [
    {
      "id": "…",
      "legacyKey": "main:0",
      "dataset": "main",
      "title": "Eyes of Wakanda",
      "universe": "Earth-616",
      "reality": "Earth-616",
      "note": null,
      "season": "Season 1",
      "episodes": "Episode 2",
      "period": "1200BC",
      "yearStart": -1200,
      "yearEnd": -1200
    }
  ]
}
```

Response header: `Cache-Control: private, max-age=30`.

**Validation failure — `400 Bad Request`:**

```json
{
  "error": "Invalid query",
  "issues": [ /* Zod issue objects */ ]
}
```

**Server error — `500`:** the framework default. Database failure details are logged,
never returned to the client.

### Example calls

```sh
# All entries in the 'main' dataset (default), capped at 500
curl 'http://localhost:3000/api/timeline'

# Filter by reality
curl 'http://localhost:3000/api/timeline?reality=Earth-616'

# Full-text-ish search across title / reality / note
curl 'http://localhost:3000/api/timeline?search=iron+man'

# Both, with a custom limit
curl 'http://localhost:3000/api/timeline?reality=Earth-616&search=spider&limit=25'

# Invalid limit -> 400
curl 'http://localhost:3000/api/timeline?limit=999999'
```

## Notes / behaviour

- The search is a case-insensitive `contains` across `title`, `reality`, and `note`
  (database-side) — not a full-text index.
- Filtering is exact-match for `dataset` and `reality`.
- The page (`app/page.tsx`) does **not** call the API; it queries the repository directly
  server-side and passes initial data as props. The API is a separate, independently
  consumable surface.
