import type { TimelineEntry, TimelineQuery } from '@/lib/domain/timeline'
export interface TimelineRepository {
  find(query?: TimelineQuery): Promise<readonly TimelineEntry[]>
  realities(dataset?: string): Promise<readonly string[]>
}
