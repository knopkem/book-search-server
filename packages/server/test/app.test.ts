import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('app', () => {
  const config = {
    ...loadConfig(),
    databasePath: ':memory:',
    googleClientId: '',
  };

  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp(config);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('rejects mobile google auth when google auth is not configured', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/google/mobile',
      payload: {
        credential: 'test-credential',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      message: 'Google auth is not configured.',
    });
  });

  it('requires a bearer token for mobile logout', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/mobile/logout',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: 'Bearer token required.',
    });
  });
});
