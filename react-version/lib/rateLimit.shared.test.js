import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, resetRateLimitForTests } from './rateLimit';

const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  resetRateLimitForTests();
  vi.unstubAllGlobals();
  if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
  if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
});

describe('checkRateLimit', () => {
  it('uses local fallback when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: false, backend: 'memory' });
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: true, backend: 'memory' });
  });

  it('uses atomic Redis command and returns shared counter decision', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 31 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await checkRateLimit('client', { limit: 30, windowMs: 60000 })).toEqual({ limited: true, backend: 'redis' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://redis.example');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)[0]).toBe('EVAL');
  });

  it('fails closed when configured Redis is unavailable', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await checkRateLimit('client')).toEqual({ limited: true, backend: 'redis-error' });
  });
});
