import type { Client } from '@libsql/client';
import type { OAuth2Client } from 'google-auth-library';

import type { AppConfig } from './config.js';
import type { createDatabase } from './db/client.js';
import type { BookRepository } from './repositories/book-repository.js';
import type { ApiTokenRepository } from './repositories/token-repository.js';
import type { UserRepository } from './repositories/user-repository.js';

export type DatabaseClient = Awaited<ReturnType<typeof createDatabase>>['db'];

export interface Repositories {
  books: BookRepository;
  tokens: ApiTokenRepository;
  users: UserRepository;
}

export interface AppContext {
  config: AppConfig;
  db: DatabaseClient;
  client: Client;
  googleClient: OAuth2Client;
  repositories: Repositories;
  webRoot: string | undefined;
}
