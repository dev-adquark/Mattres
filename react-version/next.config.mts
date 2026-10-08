import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
// Explicit extension: Node's native TypeScript loader (which Next uses for this
// file on Node >= 22.10) resolves ESM specifiers literally.
import { reversedPairRedirects } from './lib/comparePairs.data.mts';

// The repo root has its own package-lock.json (the legacy root project), so
// Next would otherwise guess the wrong workspace root. This app imports
// nothing from outside react-version/.
const appRoot = fileURLToPath(new URL('.', import.meta.url));

const isDev = process.env.NODE_ENV !== 'production';

// Lets parallel agents/devs run isolated servers and builds:
//   NEXT_DIST_DIR=.next-foo next dev -p 3101
const distDir = process.env.NEXT_DIST_DIR || '.next';

/**
 * `next dev` / `next build` append `<distDir>/types/**\/*.ts` and
 * `<distDir>/dev/types/**\/*.ts` to the tsconfig "include" list for whatever
 * distDir they run with. For an isolated dist dir that would leak scratch
 * paths into the committed tsconfig.json, so an isolated run gets its own
 * throwaway tsconfig instead: `<distDir>.tsconfig.json` (gitignored by the
 * `.next-*` rule), which extends the real one and is the file Next rewrites.
 * `tsconfig.guard.test.ts` fails if a `.next-*` path ever lands in the real one.
 */
function isolatedTsconfig(dir: string): string | undefined {
  if (dir === '.next') return undefined;
  const file = `${dir.replace(/\/+$/, '')}.tsconfig.json`;
  const path = fileURLToPath(new URL(file, import.meta.url));
  if (!existsSync(path)) {
    const config = {
      extends: './tsconfig.json',
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '**/*.mts'],
      exclude: ['node_modules', '.next', '.next-*', '.qa-*'],
    };
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  }
  return file;
}
const tsconfigPath = isolatedTsconfig(distDir);

/**
 * Content-Security-Policy, ENFORCED (a full-site production sweep, 111 routes
 * at two viewports, logged zero report-only violations before the switch).
 * Everything the app loads is same-origin, except credited RTINGS product
 * photos, which load straight from i.rtings.com (the one third-party image
 * host; see lib/rtings/photo.ts). Same-origin: scripts and styles (Next inlines
 * bootstrap scripts and the RSC payload, hence 'unsafe-inline'), next/font
 * files, /_next/image stills, OG images, /api/*, and Vercel Analytics /
 * Speed Insights under /_vercel/*. Images also allow data: (blur
 * placeholders) and blob: (WebGL / canvas). Dev adds 'unsafe-eval' for
 * React's debugging tools and ws: for HMR.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.rtings.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  turbopack: { root: appRoot },
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  images: {
    // The render stills are immutable code-rendered images: serve AVIF where
    // supported (WebP otherwise) and cache optimized variants for 31 days.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
  outputFileTracingRoot: appRoot,
  distDir,
  experimental: {
    // CSS chunking. Two parts work together:
    // 1. components/ui/systemStyles.ts is the ONLY importer of globals.css,
    //    the shell / shared-UI / motion CSS Modules, so their CSS
    //    order is identical on every route and they ship as one sheet.
    //    (When each component imported its own module, client and server
    //    components pulled them in conflicting orders; the chunker could not
    //    merge them and every route blocked on 7-10 sheets, with route-only
    //    modules such as Brands, Content/Hub and Catalog packed in beside
    //    them: /find-match loaded 252 KB of CSS, mobile LCP 3.2-4.1 s.)
    // 2. 'graph' with its default requestCost (20 KB) then keeps each route's
    //    own modules in their own sheets. A/B of the per-route sheets
    //    (`next experimental-analyze -o`, then reading
    //    .next/diagnostics/analyze/data/<route>/analyze.data), mean over 12
    //    routes: the default 20 KB gives 3-7 sheets per route (globals +
    //    shell, the next/font sheet, then route modules) and the fewest
    //    bytes: /find-match 3 sheets / 147 KB raw / 39 KB gzip (was 8 /
    //    252 KB), product 7 / 43 KB gzip, guide 5 / 40 KB gzip; no route
    //    loads another route's modules. 150 KB and `true` re-merge route
    //    modules (product 54-70 KB gzip, guide 52-58 KB gzip).
    //    ('strict' is webpack-only and rejected under Turbopack.)
    // Re-measure with `npm run perf:lighthouse -- --assert` on a `next start`
    // build after changing it (count <link rel=stylesheet> per route too).
    cssChunking: 'graph',
    // experimental.inlineCss is deliberately OFF. It was on to save the
    // render-blocking <link> round trips (mobile FCP 1.8-2.0 s -> 1.1-1.4 s
    // in an earlier A/B), but certification found Next 16.3 serializes each
    // route's CSS up to three times per document: once in the <style> tag and
    // twice more as CSS text chunks in the RSC flight payload. CSS was
    // ~520-650 KB of a 600-980 KB raw HTML document (105-147 KB gzip; gzip's
    // 32 KB window can't dedupe the repeats), and mobile LCP sat at 3.3-4.3 s
    // on every route. With it off, route CSS ships as cacheable <link> files
    // referenced by href only, and later pages reuse the cached sheets.
    // Re-measure mobile LCP (target <= 2.5 s) and document bytes on a
    // `next start` build before ever turning it back on.
  },
  ...(tsconfigPath ? { typescript: { tsconfigPath } } : {}),
  // A reversed head-to-head slug ("b-vs-a") is a true 308 to the canonical page.
  async redirects() {
    return reversedPairRedirects();
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
