import { afterEach, describe, expect, it } from 'vitest';
import { isRateLimited, resetRateLimitForTests } from './rateLimit';

afterEach(() => resetRateLimitForTests());

describe('isRateLimited', () => {
  it('allows requests up to the configured limit and blocks the next', () => {
    const options = { limit: 2, windowMs: 1000, now: 100 };
    expect(isRateLimited('client-a', options)).toBe(false);
    expect(isRateLimited('client-a', options)).toBe(false);
    expect(isRateLimited('client-a', options)).toBe(true);
  });

  it('keeps separate client keys independent', () => {
    const options = { limit: 1, now: 100 };
    expect(isRateLimited('a', options)).toBe(false);
    expect(isRateLimited('b', options)).toBe(false);
    expect(isRateLimited('a', options)).toBe(true);
  });

  it('resets after the fixed window', () => {
    expect(isRateLimited('a', { limit: 1, windowMs: 1000, now: 100 })).toBe(false);
    expect(isRateLimited('a', { limit: 1, windowMs: 1000, now: 1100 })).toBe(false);
  });

  it('fails closed for missing keys', () => {
    expect(isRateLimited('', {})).toBe(true);
    expect(isRateLimited(null, {})).toBe(true);
  });
});
