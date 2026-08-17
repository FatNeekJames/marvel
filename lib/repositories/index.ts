import { getDatabase } from '@/lib/db'
import { DrizzleTimelineRepository } from '@/lib/repositories/drizzle-timeline-repository'

export const getTimelineRepository = () => new DrizzleTimelineRepository(getDatabase())
