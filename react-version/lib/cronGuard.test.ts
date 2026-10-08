import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CRON_AUTH_FAILURE_LIMIT, guardCronRequest } from './cronGuard';

const req = (auth?: string, ip = '203.0.113.7') =>
  new Request('http://localhost/api/cron/rtings-check', { headers: { 'x-forwarded-for': ip, ...(auth ? { authorization: auth } : {}) } });

describe('guardCronRequest', () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });
  afterEach(() => {
    process.env.CRON_SECRET = saved;
  });

  it('fails closed with 500 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    expect((await guardCronRequest(req('Bearer x')))?.status).toBe(500);
  });

  it('lets the correct token through without counting it', async () => {
    for (let i = 0; i < CRON_AUTH_FAILURE_LIMIT + 5; i += 1) {
      expect(await guardCronRequest(req('Bearer test-cron-secret', '203.0.113.50'))).toBeNull();
    }
  });

  it('answers 401 for bad tokens, then 429 with Retry-After once an IP keeps guessing', async () => {
    const ip = '203.0.113.99';
    for (let i = 0; i < CRON_AUTH_FAILURE_LIMIT; i += 1) {
      expect((await guardCronRequest(req('Bearer nope', ip)))?.status).toBe(401);
    }
    const locked = await guardCronRequest(req('Bearer nope', ip));
    expect(locked?.status).toBe(429);
    expect(locked?.headers.get('Retry-After')).toBe('60');
    // Another client is unaffected.
    expect((await guardCronRequest(req('Bearer nope', '203.0.113.100')))?.status).toBe(401);
  });
});
