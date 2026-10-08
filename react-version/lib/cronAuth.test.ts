import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from './cronAuth';

function headers(value: string | null) {
  return { get: (name: string) => name.toLowerCase() === 'authorization' ? value : null };
}

describe('isAuthorizedCronRequest', () => {
  it('accepts the exact configured bearer token', () => {
    expect(isAuthorizedCronRequest(headers('Bearer cron-secret'), 'cron-secret')).toBe(true);
  });

  it.each([undefined, '', 'wrong-secret'])('rejects missing or incorrect credentials: %s', (secret) => {
    expect(isAuthorizedCronRequest(headers('Bearer ***'), secret)).toBe(false);
  });

  it.each([null, '', 'cron-secret', 'bearer cron-secret', 'Bearer cron-secret '])('rejects malformed authorization header: %s', (authorization) => {
    expect(isAuthorizedCronRequest(headers(authorization), 'cron-secret')).toBe(false);
  });

  it('rejects absent headers', () => {
    expect(isAuthorizedCronRequest(null, 'cron-secret')).toBe(false);
  });
});
