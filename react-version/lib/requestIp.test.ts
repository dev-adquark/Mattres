import { describe, expect, it } from 'vitest';
import { clientIpFrom, proxyHeadersTrusted } from './requestIp';

const h = (init: Record<string, string>) => new Headers(init);

describe('clientIpFrom', () => {
  it('on Vercel trusts x-real-ip, then the first x-forwarded-for hop', () => {
    const env = { VERCEL: '1' };
    expect(clientIpFrom(h({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }), env)).toBe('1.1.1.1');
    expect(clientIpFrom(h({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' }), env)).toBe('2.2.2.2');
  });

  it('off-platform uses the right-most forwarded hop, which a client cannot choose', () => {
    expect(proxyHeadersTrusted({})).toBe(false);
    expect(clientIpFrom(h({ 'x-forwarded-for': '9.9.9.1, 127.0.0.1' }), {})).toBe('127.0.0.1');
    expect(clientIpFrom(h({ 'x-real-ip': '9.9.9.2' }), {})).toBe('9.9.9.2');
  });

  it('TRUST_PROXY_HEADERS=1 opts a self-hosted proxy in', () => {
    expect(clientIpFrom(h({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' }), { TRUST_PROXY_HEADERS: '1' })).toBe('2.2.2.2');
  });
});
