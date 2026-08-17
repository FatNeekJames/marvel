import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/app/generated/prisma/client';
const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };
const createClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
};
export const getDatabase = () => {
  const client = globalDatabase.prisma ?? createClient();
  if (process.env.NODE_ENV !== 'production') globalDatabase.prisma = client;
  return client;
};
