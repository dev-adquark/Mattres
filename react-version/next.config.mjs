/** @type {import('next').NextConfig} */
const nextConfig = {
  // /mx.html is served from an internal route (app/buying-guide) rather than
  // a literal app/mx.html folder. Next.js names a static app-router page's
  // prerendered output file after its route path plus its own .html suffix,
  // so a route segment that already ends in ".html" produces a file named
  // "mx.html.html" on disk (confirmed via `next build`'s .next/server/app/
  // output). Next's own server resolves that correctly through its route
  // manifest, but Vercel's edge can serve prerendered static app-router
  // output directly from its CDN for pure-static routes, and a request path
  // ending in a real ".html" extension is exactly the case that layer is
  // built to match literally against a file of that same name - a name this
  // route's real output file does not have. Rewriting the external URL to
  // an internal path with no ".html" in the route segment removes that
  // collision entirely, rather than depending on how the edge and origin
  // layers reconcile the double-suffix case in production, which cannot be
  // verified against Vercel's actual edge routing from this environment.
  //
  // rewrites() is an internal path mapping, not a redirect: the browser
  // receives a direct 200 at /mx.html itself, with no visible URL change
  // and no 3xx status.
  async rewrites() {
    return [
      { source: '/mx.html', destination: '/buying-guide' },
    ];
  },
};

export default nextConfig;
