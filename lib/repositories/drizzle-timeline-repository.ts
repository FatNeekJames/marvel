import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { timelineEntries } from '@/lib/db/schema';
import { normalizeQuery, type TimelineEntry, type TimelineQuery } from '@/lib/domain/timeline';
import type { TimelineRepository } from '@/lib/repositories/timeline-repository';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as dbSchema from '@/lib/db/schema';

type Database = PostgresJsDatabase<typeof dbSchema>;

export class DrizzleTimelineRepository implements TimelineRepository {
  constructor(private readonly db: Database) {}

  async find(input: TimelineQuery = {}): Promise<readonly TimelineEntry[]> {
    const query = normalizeQuery(input);
    const conditions = [];

    if (query.dataset) conditions.push(eq(timelineEntries.dataset, query.dataset));
    if (query.reality) conditions.push(eq(timelineEntries.reality, query.reality));
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(or(
        ilike(timelineEntries.title, pattern),
        ilike(timelineEntries.reality, pattern),
        ilike(timelineEntries.note, pattern)
      ));
    }

    const rows = await this.db
      .select()
      .from(timelineEntries)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        sql`${timelineEntries.yearStart} ASC NULLS LAST`,
        asc(timelineEntries.title)
      )
      .limit(query.limit);

    return rows.map(toTimelineEntry);
  }

  async realities(dataset = 'main'): Promise<readonly string[]> {
    const rows = await this.db
      .select({ reality: timelineEntries.reality })
      .from(timelineEntries)
      .where(eq(timelineEntries.dataset, dataset.slice(0, 32)))
      .groupBy(timelineEntries.reality)
      .orderBy(asc(timelineEntries.reality));

    return rows.map(({ reality }) => reality);
  }
}

function toTimelineEntry(row: typeof timelineEntries.$inferSelect): TimelineEntry {
  return {
    id: row.id,
    legacyKey: row.legacyKey,
    dataset: row.dataset,
    title: row.title,
    universe: row.universe,
    reality: row.reality,
    note: row.note,
    season: row.season,
    episodes: row.episodes,
    period: row.period,
    yearStart: row.yearStart,
    yearEnd: row.yearEnd
  };
}
