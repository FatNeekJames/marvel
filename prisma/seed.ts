import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

type SeedEntry = { legacyKey: string; dataset: string; title: string; universe: string; reality: string; note: string | null; season: string | null; episodes: string | null; period: string | null; yearStart: number | null; yearEnd: number | null };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const entries = JSON.parse(await readFile(new URL('./seed-data.json', import.meta.url), 'utf8')) as SeedEntry[];

try {
  for (const entry of entries) {
    await prisma.timelineEntry.upsert({ where: { legacyKey: entry.legacyKey }, create: entry, update: entry });
  }
  console.log(`Seeded ${entries.length} timeline records`);
} finally {
  await prisma.$disconnect();
}
