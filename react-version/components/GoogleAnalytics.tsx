/**
 * GA4 measurement id for this property. Public by design - a GA4 id is meant
 * to sit in page source (every gtag.js install snippet ships it in plain
 * text), so it is a constant here rather than an env var: an env var would
 * only add a step where the tag silently never fires because a deployment
 * forgot to set it.
 */
const GA_MEASUREMENT_ID = 'G-C17KS0HWRS';

/**
 * Google Analytics (gtag.js), rendered server-side exactly as Google's own
 * setup snippet does, and only on a production Vercel deployment - mirrors
 * components/VercelInsights.tsx's ON_VERCEL gate, but checks VERCEL_ENV
 * specifically so preview deployments and local development never report
 * into the real GA4 property.
 *
 * This is plain markup, not next/script: a next/script 'afterInteractive'
 * tag is injected client-side after hydration, so it is invisible to a tool
 * that reads the server-rendered document rather than running a full
 * browser - the GA4 measurement tag is expected to be present in the
 * document's own HTML (it is literally how Google's own install checker and
 * most third-party tag-presence audits verify a tag is "installed").
 * `async` already keeps it off the critical rendering path, the same way
 * Google's own snippet does: it downloads in parallel and never blocks
 * parsing or paint, so it does not compete with the LCP work in HomeHero.tsx
 * or the render-blocking-CSS budget guarded in next.config.mts.
 *
 * Disclosed on /privacy (`#analytics`): GA4 sets first-party cookies and
 * sends requests to Google, which Vercel Analytics (cookieless) does not -
 * that disclosure must stay in sync with whether this component is mounted.
 */
export function GoogleAnalytics() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script
        id="ga4-init"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`,
        }}
      />
    </>
  );
}
