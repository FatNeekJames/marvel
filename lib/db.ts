import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/lib/db/schema'

// Cache one postgres.js pool and its Drizzle wrapper for the lifetime of the
// runtime. This survives development hot reloads and prevents production
// requests from creating an unbounded number of pools.
const globalDatabase = globalThis as unknown as {
  __temporalLoomConnection?: ReturnType<typeof createConnection>
  __temporalLoomDrizzle?: ReturnType<typeof createDatabase>
}

function createConnection() {
  const dsn = process.env.DATABASE_URL
  if (!dsn) throw new Error('DATABASE_URL is required')
  return postgres(dsn, { max: 10, idle_timeout: 20, connect_timeout: 10 })
}

function createDatabase(connection: ReturnType<typeof createConnection>) {
  return drizzle(connection, { schema })
}

export function getDatabase() {
  if (!globalDatabase.__temporalLoomDrizzle) {
    const connection = createConnection()
    globalDatabase.__temporalLoomConnection = connection
    globalDatabase.__temporalLoomDrizzle = createDatabase(connection)
  }
  return globalDatabase.__temporalLoomDrizzle
}
