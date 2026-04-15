import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient } from '@libsql/client/node';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import * as schema from './schema.js';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

export async function createDatabase(databasePath: string) {
  const client = createClient({
    url: toDatabaseUrl(databasePath),
  });

  await client.execute('PRAGMA journal_mode = WAL');
  await client.execute('PRAGMA foreign_keys = ON');

  const db = drizzle({
    client,
    schema,
  });

  await migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, '../../drizzle'),
  });

  return { client, db };
}

function toDatabaseUrl(databasePath: string) {
  if (databasePath === ':memory:') {
    return ':memory:';
  }

  return pathToFileURL(databasePath).toString();
}
