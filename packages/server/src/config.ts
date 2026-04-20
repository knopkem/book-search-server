import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().default('./data/book-search.sqlite'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost,https://localhost,capacitor://localhost'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const envFilePath = loadEnvironmentFile();
  const parsed = envSchema.parse(process.env);
  const databaseBaseDir = envFilePath ? dirname(envFilePath) : process.cwd();
  const databasePath = isAbsolute(parsed.DATABASE_PATH)
    ? parsed.DATABASE_PATH
    : resolve(databaseBaseDir, parsed.DATABASE_PATH);
  const sessionSecret = parsed.SESSION_SECRET ?? getDefaultSessionSecret(parsed.NODE_ENV);
  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  mkdirSync(dirname(databasePath), { recursive: true });

  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    host: parsed.HOST,
    port: parsed.PORT,
    databasePath,
    googleClientId: parsed.GOOGLE_CLIENT_ID,
    sessionMaxAgeDays: parsed.SESSION_MAX_AGE_DAYS,
    allowedOrigins,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindow: parsed.RATE_LIMIT_WINDOW,
    logLevel: parsed.LOG_LEVEL,
    sessionKey: createHash('sha256').update(sessionSecret).digest(),
  };
}

function loadEnvironmentFile() {
  let currentDir = process.cwd();

  while (true) {
    const envPath = join(currentDir, '.env');

    if (existsSync(envPath)) {
      loadDotenv({ path: envPath });
      return envPath;
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function getDefaultSessionSecret(nodeEnv: z.infer<typeof envSchema>['NODE_ENV']) {
  if (nodeEnv === 'production') {
    throw new Error('SESSION_SECRET must be set in production.');
  }

  return 'development-session-secret-change-me-123';
}
