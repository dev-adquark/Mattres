import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import Link from 'next/link';
import { PolicyPage, type PolicySection } from '@/components/trust/PolicyPage';
import { POLICY_UPDATED } from '@/components/trust/trustConfig';
import { AnalyticsEventsTable } from '@/components/trust/AnalyticsEventsTable';
import { DeviceDataPanel } from '@/components/ui/DeviceDataPanel';
import { getCatalog } from '@/lib/db/mattressRepo';
import { monetizationStatus } from '@/components/trust/monetization';

const TITLE = 'Privacy';
const DESCRIPTION =
  'What this site collects and what it does not: cookieless Vercel analytics, anonymous product events, quiz answers kept in your browser, and how the match API handles your request.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy · Mattress Match Score', description: DESCRIPTION, url: '/privacy', type: 'website', images: [SHARE_IMAGE] },
};

export const revalidate = 86400;

function buildSections(affiliateLinks: number): PolicySection[] {
  return [
    {
      id: 'device-data',
      title: 'Your data on this device',
      body: (
        <>
          <p>
            Everything the site remembers about you stays in this browser, in <strong>session storage</strong> (cleared
            when you close the tab) or <strong>local storage</strong> (kept until you clear it). There is no account and
            nothing is copied to a server. This is the complete list:
          </p>
          <DeviceDataPanel headingLevel="h3" />
          <p>
            To score mattresses, your answers (sleep position, body weight, firmness preference, temperature and any
            optional answers you gave) are sent to this site&apos;s match service. It calculates the scores and sends them
            back. The service does not save your answers, write them to a database or log them.
          </p>
        </>
      ),
    },
    {
      id: 'analytics',
      title: 'Analytics and performance',
      body: (
        <>
          <p>
            This site uses <strong>Vercel Web Analytics</strong> to count page views and{' '}
            <strong>Vercel Speed Insights</strong> to measure how fast pages load (Core Web Vitals). Neither sets cookies.
            Both report in aggregate: which pages are visited, the referring site, and the country, browser, operating
            system and device type of visits. According to Vercel, visitors are not tracked across sites and the
            identifier used to count a visit is a hash that is discarded within 24 hours. See{' '}
            <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">
              Vercel&apos;s analytics privacy notes<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
          <p>
            On top of page views, the site sends a short list of anonymous product events through the same service, so
            we can see whether the quiz, comparisons and guides are actually useful. The code only allows the events
            below, keeps only short plain values, and drops any field whose name suggests personal data (such as email,
            weight or search text).
          </p>
          <AnalyticsEventsTable />
        </>
      ),
    },
    {
      id: 'ip-address',
      title: 'Your IP address',
      body: (
        <>
          <p>
            Every website receives the IP address of whoever requests it. The match service reads it for one purpose: to
            stop a single address sending more than 30 scoring requests a minute. The counter keyed by your address
            expires after 60 seconds. Depending on how the site is deployed, that counter lives either in the server&apos;s
            short-lived memory or in a rate-limit counter in our Supabase database that is overwritten when the window expires and cleaned up automatically.
          </p>
          <p>
            Our code does not log IP addresses. The hosting provider, Vercel, processes every request and keeps its own
            operational logs under its own policies.
          </p>
        </>
      ),
    },
    {
      id: 'not-collected',
      title: 'What we do not do',
      body: (
        <ul>
          <li>No accounts, sign-ups or email collection.</li>
          <li>No advertising, ad networks or tracking pixels.</li>
          <li>No tracking cookies.</li>
          <li>No selling or sharing of data with brands. Brands get nothing from this site.</li>
          <li>
            Fonts are served from this site, so loading a page makes no request to Google. The search box runs in your
            browser against a downloaded index, so what you type there is not sent to us. (Searches and filters on the
            Mattresses page are saved in the page address so they can be shared, like any link.)
          </li>
        </ul>
      ),
    },
    {
      id: 'rtings-photos',
      title: 'Photos from RTINGS',
      body: (
        <p>
          Product photos credited &ldquo;Photo: RTINGS&rdquo; load straight from RTINGS&apos; image server
          (i.rtings.com), not from this site, so RTINGS can see your IP address and browser details when one loads. We
          ask your browser not to send them the address of the page you are on. This site loads nothing else from
          a third party.
        </p>
      ),
    },
    {
      id: 'other-sites',
      title: 'Links to brand sites',
      body: (
        <p>
          &ldquo;Visit&nbsp;brand&rdquo; links go straight to the manufacturer&apos;s own product page (or the retailer listing the mattress page names). We don&apos;t add
          tracking codes to them. Once you are on their site, their privacy policy applies.{' '}
          {affiliateLinks === 0 ? (
            <>
              See our <Link href="/disclosures">disclosures</Link> for why there are no affiliate links.
            </>
          ) : (
            <>
              Affiliate links are labeled as such; see our <Link href="/disclosures">disclosures</Link>.
            </>
          )}
        </p>
      ),
    },
    {
      id: 'choices',
      title: 'Your choices',
      body: (
        <ul>
          <li>Close the tab to clear quiz answers and results.</li>
          <li>
            Use <a href="#device-data">&ldquo;Forget everything on this device&rdquo;</a> above to remove every item the
            site keeps in this browser at once.
          </li>
          <li>Remembering your matches between visits is opt-in and off by default. The button above clears it too.</li>
          <li>A content blocker that blocks Vercel&apos;s analytics scripts stops analytics without breaking the site.</li>
        </ul>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this page',
      body: (
        <p>
          If what the site collects changes, this page will name the service and what it collects before it goes live,
          and the date at the top will change.
        </p>
      ),
    },
  ];
}

export default async function PrivacyPage() {
  let affiliateLinks = 0;
  try {
    affiliateLinks = monetizationStatus((await getCatalog()).entries).links.affiliate;
  } catch {
    affiliateLinks = 0;
  }

  return (
    <PolicyPage
      path="/privacy"
      crumb="Privacy"
      eyebrow="Policy"
      title={
        <>
          What we know <em>about you.</em>
        </>
      }
      lead="Very little, on purpose. This page describes what the site actually does today, checked against its code."
      updated={POLICY_UPDATED}
      summary={[
        { label: 'Accounts', value: 'None' },
        { label: 'Cookies', value: 'None for tracking' },
        { label: 'Quiz answers', value: 'Kept in your browser tab' },
        { label: 'Analytics', value: 'Vercel, cookieless and aggregated' },
      ]}
      sections={buildSections(affiliateLinks)}
      related={[
        { href: '/disclosures', kicker: 'How we stay independent', label: 'Disclosures' },
        { href: '/terms', kicker: 'Using this site', label: 'Terms' },
      ]}
    />
  );
}
