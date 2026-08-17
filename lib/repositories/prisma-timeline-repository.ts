import type { PrismaClient } from '@/app/generated/prisma/client';
import { normalizeQuery, type TimelineEntry, type TimelineQuery } from '@/lib/domain/timeline';
import type { TimelineRepository } from '@/lib/repositories/timeline-repository';

export class PrismaTimelineRepository implements TimelineRepository {
  constructor(private readonly client: PrismaClient) {}
  async find(input: TimelineQuery = {}): Promise<readonly TimelineEntry[]> {
    const query = normalizeQuery(input);
    return this.client.timelineEntry.findMany({
      where: { dataset: query.dataset, ...(query.reality ? { reality: query.reality } : {}), ...(query.search ? { OR: [
        { title: { contains: query.search, mode: 'insensitive' as const } },
        { reality: { contains: query.search, mode: 'insensitive' as const } },
        { note: { contains: query.search, mode: 'insensitive' as const } }
      ] } : {}) },
      orderBy: [{ yearStart: { sort: 'asc', nulls: 'last' } }, { title: 'asc' }], take: query.limit
    });
  }
  async realities(dataset = 'main'): Promise<readonly string[]> {
    const rows = await this.client.timelineEntry.findMany({ where: { dataset: dataset.slice(0, 32) }, distinct: ['reality'], orderBy: { reality: 'asc' }, select: { reality: true } });
    return rows.map(({ reality }) => reality);
  }
}
