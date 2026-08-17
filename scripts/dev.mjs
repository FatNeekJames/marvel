import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startPrismaDevServer } from '@prisma/dev';

const databaseName = 'temporal-loom';
const executable = process.execPath;
const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const seedFile = fileURLToPath(new URL('../prisma/seed.ts', import.meta.url));
let database;
let web;
let shuttingDown = false;

const run = (label, arguments_, environment) => new Promise((resolve, reject) => {
  const child = spawn(executable, arguments_, { env: environment, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code ?? 'unknown'}`)));
});

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (web && !web.killed) web.kill('SIGTERM');
  await database?.close();
  process.exit(exitCode);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  console.log('Starting local PostgreSQL...');
  database = await startPrismaDevServer({ name: databaseName, persistenceMode: 'stateful' });
  const environment = { ...process.env, DATABASE_URL: database.database.prismaORMConnectionString };

  console.log('Applying database migrations...');
  await run('database migration', [prismaCli, 'migrate', 'deploy'], environment);

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
