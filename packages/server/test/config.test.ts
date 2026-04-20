import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SESSION_MAX_AGE_DAYS: process.env.SESSION_MAX_AGE_DAYS,
};

describe('loadConfig', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.SESSION_MAX_AGE_DAYS = originalEnv.SESSION_MAX_AGE_DAYS;
  });

  it('defaults web session persistence to 30 days', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SESSION_MAX_AGE_DAYS;

    expect(loadConfig().sessionMaxAgeDays).toBe(30);
  });

  it('allows overriding web session persistence', () => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_MAX_AGE_DAYS = '14';

    expect(loadConfig().sessionMaxAgeDays).toBe(14);
  });
});
