import { describe, expect, it } from 'vitest';
import { normalizeQuery } from '../lib/domain/timeline';
import seedData from '../prisma/seed-data.json';

describe('normalizeQuery', () => {
  it('applies stable defaults', () => expect(normalizeQuery({})).toEqual({ dataset: 'main', reality: '', search: '', limit: 500 }));
  it('trims input and caps limits', () => expect(normalizeQuery({ dataset: ' main ', search: ' iron man ', limit: 10_000 })).toEqual({ dataset: 'main', reality: '', search: 'iron man', limit: 500 }));
  it('prevents unbounded or empty queries', () => expect(normalizeQuery({ limit: -4 })).toMatchObject({ limit: 1 }));
});

describe('timeline seed', () => {
  it('contains every migrated record with stable unique keys', () => {
    expect(seedData).toHaveLength(278);
    expect(new Set(seedData.map(({ legacyKey }) => legacyKey)).size).toBe(seedData.length);
  });

  it('contains only bounded values accepted by the database schema', () => {
    expect(seedData.every(({ title, reality, legacyKey }) => title.length > 0 && reality.length > 0 && legacyKey.length <= 100)).toBe(true);
  });
});
