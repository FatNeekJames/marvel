import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databaseName = 'temporal_loom';
const executable = process.execPath;
const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const seedFile = fileURLToPath(new URL('../lib/db/seed.ts', import.meta.url));
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const DEFAULT_DSN = `postgres://localhost:5432/${databaseName}`;

let web;
let shuttingDown = false;
let adminConnection;

/** Best-effort: create the target database if it does not yet exist, using a
 * local PostgreSQL that is reachable at `postgres://localhost:5432/postgres`.
 * Falls back to assuming the database already exists if creation isn't possible. */
async function ensureDatabase() {
  const admin = postgres('postgres://localhost:5432/postgres', { max: 1, onnotice: () => {} });
  adminConnection = admin;
  const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
  if (exists.length === 0) {
    try {
      await admin`CREATE DATABASE ${admin(databaseName)}`;
      console.log(`Created database "${databaseName}"`);
    } catch (error) {
      console.log('Could not auto-create database (continuing):', error instanceof Error ? error.message : String(error));
    }
  }
}

const run = (label, arguments_, environment) => new Promise((resolvePromise, reject) => {
  const child = spawn(executable, arguments_, { env: environment, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${label} exited with code ${code ?? 'unknown'}`)));
});

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (web && !web.killed) web.kill('SIGTERM');
  if (adminConnection) await adminConnection.end().catch(() => {});
  process.exit(exitCode);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  const explicitUrl = process.env.DATABASE_URL;
  const databaseUrl = explicitUrl ?? DEFAULT_DSN;
  const environment = { ...process.env, DATABASE_URL: databaseUrl };

  if (explicitUrl) {
    console.log('Using DATABASE_URL from the environment.');
  } else {
    console.log('Starting local PostgreSQL and ensuring the database exists...');
    await ensureDatabase();
  }

  console.log('Applying database migrations...');
  const migrationConnection = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  await migrate(drizzle(migrationConnection), { migrationsFolder });
  await migrationConnection.end();

  console.log('Synchronizing timeline seed data...');
  await run('database seed', [tsxCli, seedFile], environment);

  console.log('Starting Next.js...');
  web = spawn(executable, [nextCli, 'dev'], { env: environment, stdio: 'inherit' });
  web.once('error', (error) => { console.error(error); void shutdown(1); });
  web.once('exit', (code) => void shutdown(code ?? 0));
} catch (error) {
  console.error('Development startup failed:', error);
  await shutdown(1);
}
