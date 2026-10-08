/**
 * The client IP used as a rate-limit key by the API routes. Server-side only.
 *
 * Forwarding headers are only as trustworthy as the proxy in front of the
 * app:
 *  - On Vercel (process.env.VERCEL) or behind a proxy you declare with
 *    TRUST_PROXY_HEADERS=1, the platform overwrites x-real-ip and
 *    x-forwarded-for, so x-real-ip (else the first x-forwarded-for hop) is
 *    the real client.
 *  - Anywhere else (`next start` on a bare host) a client can send any
 *    x-real-ip / x-forwarded-for it likes and Next keeps it. We then use the
 *    right-most x-forwarded-for hop (the one nearest this server; Next fills
 *    it from the socket when the client sent none) and report the key as
 *    untrusted, so callers can add a global ceiling (see
 *    app/api/match/route.ts) that header rotation cannot get around.
 */
type HeaderGetter = Pick<Headers, 'get'>;
type Env = Record<string, string | undefined>;

export function proxyHeadersTrusted(env: Env = process.env): boolean {
  return Boolean(env.VERCEL) || env.TRUST_PROXY_HEADERS === '1';
}

function forwardedHops(headers: HeaderGetter): string[] {
  return (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
}

export function clientIpFrom(headers: HeaderGetter, env: Env = process.env): string | undefined {
  const realIp = headers.get('x-real-ip')?.trim() || undefined;
  const hops = forwardedHops(headers);
  if (proxyHeadersTrusted(env)) return realIp || hops[0];
  return hops[hops.length - 1] || realIp;
}
