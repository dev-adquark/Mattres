import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from './cronAuth';

function headers(value: string | null) {
  return { get: (name: string) => name.toLowerCase() === 'authorization' ? value : null };
}

describe('admin bearer authorization', () => {
  it('accepts only the configured exact bearer token', () => {
    expect(isAuthorizedCronRequest(headers('Bearer admin-secret'), 'admin-secret')).toBe(true);
  });

  it.each([
    [null, 'admin-secret'],
    ['', 'admin-secret'],
    ['Bearer wrong', 'admin-secret'],
    ['bearer admin-secret', 'admin-secret'],
    ['Bearer admin-secret ', 'admin-secret'],
    ['Bearer admin-secret', ''],
    ['Bearer admin-secret', undefined],
  ])('rejects invalid authorization header or missing secret', (header, secret) => {
    expect(isAuthorizedCronRequest(headers(header), secret)).toBe(false);
  });

  it('rejects headers without a get method', () => {
    expect(isAuthorizedCronRequest({}, 'admin-secret')).toBe(false);
  });
});
