import { getDatabase } from '@/lib/db';
import { PrismaTimelineRepository } from '@/lib/repositories/prisma-timeline-repository';
export const getTimelineRepository = () => new PrismaTimelineRepository(getDatabase());
