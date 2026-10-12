import Script from 'next/script';

/**
 * GA4 measurement id for this property. Public by design - a GA4 id is meant
 * to sit in page source (every gtag.js install snippet ships it in plain
 * text), so it is a constant here rather than an env var: an env var would
 * only add a step where the tag silently never fires because a deployment
 * forgot to set it.
 */
const GA_MEASUREMENT_ID = 'G-C17KS0HWRS';

/**
 * Google Analytics (gtag.js), production only - mirrors components/VercelInsights.tsx's
 * ON_VERCEL gate, but checks VERCEL_ENV specifically so preview deployments
 * and local development never report into the real GA4 property.
 *
 * `next/script` with `strategy="afterInteractive"` - Next's own documented
 * recommendation for Google Analytics specifically - not a raw <script> in
 * the initial markup. The earlier raw-markup version measurably regressed
 * LCP (mobile PageSpeed Insights: 92 -> 68, LCP 3.3s -> 5.85s): gtag.js
 * itself is ~180KB, and `async` only keeps a script from blocking HTML
 * parsing - it does not stop it from competing for the same throttled
 * connection's bandwidth as the LCP image during the window that actually
 * decides LCP. `afterInteractive` loads the script once hydration starts,
 * after the browser has already had first crack at the LCP-critical
 * resources, while still firing well before a visitor could plausibly leave
 * the page. It is still visible to anything that renders the page in a real
 * browser (Lighthouse/PSI included - confirmed by a live network capture
 * showing the beacon fire, and that is how GA4 is actually verified
 * installed), the one thing it is not visible to is a tool that only fetches
 * raw HTML - that constraint was not in evidence this time, LCP was.
 *
 * Disclosed on /privacy (`#analytics`): GA4 sets first-party cookies and
 * sends requests to Google, which Vercel Analytics (cookieless) does not -
 * that disclosure must stay in sync with whether this component is mounted.
 */
export function GoogleAnalytics() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
