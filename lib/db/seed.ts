import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { timelineEntries } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

type SeedEntry = {
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
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed the database');

  const connection = postgres(connectionString, { max: 1 });
  const db = drizzle(connection);
  const entries = JSON.parse(await readFile(resolve('lib/db/seed-data.json'), 'utf8')) as SeedEntry[];

  try {
    for (const entry of entries) {
      await db
        .insert(timelineEntries)
        .values(entry)
        .onConflictDoUpdate({
          target: timelineEntries.legacyKey,
          set: {
            dataset: sql.raw(`excluded.dataset`),
            title: sql.raw(`excluded.title`),
            universe: sql.raw(`excluded.universe`),
            reality: sql.raw(`excluded.reality`),
            note: sql.raw(`excluded.note`),
            season: sql.raw(`excluded.season`),
            episodes: sql.raw(`excluded.episodes`),
            period: sql.raw(`excluded.period`),
            yearStart: sql.raw(`excluded.year_start`),
            yearEnd: sql.raw(`excluded.year_end`),
            updatedAt: sql`now()`
          }
        });
    }
    console.log(`Seeded ${entries.length} timeline records`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
