import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

// postgres.js supports connection reuse across hot reloads. In non-production we
// cache the client on globalThis to avoid exhausting connections on reload.
const globalDatabase = globalThis as unknown as { __temporalLoomConnection?: ReturnType<typeof createConnection>; __temporalLoomDrizzle?: ReturnType<typeof createDatabase> };

function createConnection() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) throw new Error('DATABASE_URL is required');
  return postgres(dsn, { max: 10, idle_timeout: 20, connect_timeout: 10 });
}

function createDatabase() {
  return drizzle(createConnection(), { schema });
}

export function getDatabase() {
  if (process.env.NODE_ENV !== 'production') {
    if (!globalDatabase.__temporalLoomDrizzle) {
      globalDatabase.__temporalLoomConnection = createConnection();
      globalDatabase.__temporalLoomDrizzle = createDatabase();
    }
    return globalDatabase.__temporalLoomDrizzle;
  }
  return createDatabase();
}