import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import Link from 'next/link';
import type { MattressEntry } from '@/lib/types';
import { getCatalog } from '@/lib/db/mattressRepo';
import { PolicyPage, type PolicySection } from '@/components/trust/PolicyPage';
import { POLICY_UPDATED } from '@/components/trust/trustConfig';
import { monetizationStatus, type MonetizationStatus } from '@/components/trust/monetization';

const TITLE = 'Disclosures';
const DESCRIPTION =
  'How Mattress Match Score makes money (today, it does not), our affiliate and sponsorship policy, editorial independence and where our data comes from.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/disclosures' },
  openGraph: { title: 'Disclosures · Mattress Match Score', description: DESCRIPTION, url: '/disclosures', type: 'website', images: [SHARE_IMAGE] },
};

export const revalidate = 86400;

/** Names of the review sources the catalog cites, read defensively (database rows may be partial). */
function reviewSourceNames(entries: readonly MattressEntry[]): string[] {
  return [...new Set(entries.flatMap((e) => (e.reviewSources || []).map((r) => r?.sourceName).filter((n): n is string => Boolean(n))))];
}

/** Where each record's specs were sourced, counted from the catalog (never a fixed claim). */
interface Sourcing {
  retailer: number;
  independentFirmness: number;
}

function sourcingOf(entries: readonly MattressEntry[]): Sourcing {
  return {
    retailer: entries.filter((e) => e.sourceUrl && !e.officialProductUrl).length,
    independentFirmness: entries.filter((e) => typeof e.firmnessSource === 'string' && e.firmnessSource.startsWith('independent')).length,
  };
}

function buildSections(money: MonetizationStatus, citedFrom: string, sourcing: Sourcing): PolicySection[] {
  const { sponsored, earnsCommission, total } = money;
  const { affiliate, retailer: withRetailer, brand: withBrandLink, unavailable: noLink } = money.links;
  return [
    {
      id: 'money',
      title: 'How we make money',
      body: (
        <>
          {earnsCommission || sponsored > 0 ? (
            <p>
              Mattress Match Score is free and shows no ads.{' '}
              {earnsCommission
                ? `${affiliate} ${affiliate === 1 ? 'mattress has' : 'mattresses have'} an affiliate link: if you buy through it, we may earn a commission. Each one is labeled next to the button.`
                : 'We earn no commissions.'}{' '}
              {sponsored > 0
                ? `${sponsored} ${sponsored === 1 ? 'mattress carries' : 'mattresses carry'} a labeled sponsored placement.`
                : 'There are no sponsored placements.'}{' '}
              None of it changes a score.
            </p>
          ) : (
            <p>
              Today, we don&apos;t. Mattress Match Score is free, shows no ads, earns no commissions and has no sponsors. No
              brand or retailer has paid for anything on this site.
            </p>
          )}
          <p>
            That may change one day, because running the site costs money. If it does, this page will say exactly what
            changed and when, before it affects anything you see.
          </p>
        </>
      ),
    },
    {
      id: 'affiliate',
      title: 'Affiliate links',
      body: (
        <>
          <p>
            {affiliate === 0
              ? 'There are no affiliate links on this site. '
              : `${affiliate} of the ${total} mattresses ${affiliate === 1 ? 'has' : 'have'} an affiliate link, shown as “Check Price at retailer” and labeled as one. `}
            Of the {total} mattresses in the catalog, {withBrandLink} link to the manufacturer&apos;s own product page,
            shown as &ldquo;Visit&nbsp;brand&rdquo;, and {withRetailer} to a retailer page, shown as
            &ldquo;View&nbsp;at&nbsp;retailer&rdquo;. Neither carries an affiliate code or earns us anything.{' '}
            {noLink === 0
              ? 'Every mattress has at least one real link on file.'
              : `${noLink} ${noLink === 1 ? 'has' : 'have'} no link on file; the page says so instead of showing a button.`}
          </p>
          <p>{affiliate === 0 ? 'If we ever add affiliate links:' : 'For every affiliate link:'}</p>
          <ul>
            <li>each one will be labeled as an affiliate link next to the button, with the retailer named;</li>
            <li>it will never change a Match Score, a ranking or a fit flag;</li>
            <li>it will never change the price you pay;</li>
            <li>this page will be updated first, with the date.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'sponsored',
      title: 'Sponsored placements',
      body: (
        <>
          <p>
            {sponsored === 0 ? 'There are none. ' : ''}{sponsored === 0 ? `All ${total} mattresses are scored by the same model alone. Those with too little published or independent data are listed but not ranked.` : `${sponsored} of ${total} mattresses carry a sponsored placement, labeled wherever it appears.`}
          </p>
          <p>
            Scores can&apos;t be bought.{' '}
            {sponsored === 0 ? 'If a sponsored placement is ever sold, these rules apply:' : 'Every sponsored placement follows these rules:'}
          </p>
          <ul>
            <li>
              it is scored by exactly the same rules as every other mattress. The sponsored flag is not an input to the
              scoring model, so it cannot raise a score, change a sub-score, move a rank or hide a fit flag. An automated
              test runs the real catalog with every mattress marked sponsored and requires identical scores and order;
            </li>
            <li>
              it keeps the rank its score earns in every ranking and is not lifted above a better fit. It is never
              shown as your top match or as a home-page pick, even when it scores highest;
            </li>
            <li>
              it is labeled &ldquo;Sponsored&rdquo; everywhere it is listed: its product page, the catalog, category and
              brand pages, quiz results, guide rankings, related mattresses, side-by-side comparisons and search results.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'independence',
      title: 'Editorial independence',
      body: (
        <>
          <p>
            Every Match Score comes from a published, versioned set of rules applied the same way to every mattress. You
            can read all of them, with the weights and thresholds, on{' '}
            <Link href="/methodology">How it works</Link>. No brand can buy a higher score, alter a sub-score or remove a
            risk flag.
          </p>
          <p>
            We don&apos;t lab-test mattresses, and we don&apos;t present anything here as tested by us or reviewed by
            experts. Independent ratings are cited from {citedFrom} with links; specs come from manufacturer
            pages{sourcing.retailer > 0 ? ', or a retailer listing where noted' : ''}.
          </p>
        </>
      ),
    },
    {
      id: 'sources',
      title: 'Where the data comes from',
      body: (
        <>
          <ul>
            <li>
              <strong>Specs, prices, trial and warranty</strong> come from the manufacturer&apos;s product page
              {sourcing.retailer > 0
                ? `, or for ${sourcing.retailer === 1 ? 'one house-brand mattress' : `${sourcing.retailer} house-brand mattresses`} the retailer's listing`
                : ''}
              , with the source and check date shown on every mattress page.
              {sourcing.independentFirmness > 0
                ? ` ${sourcing.independentFirmness === 1 ? 'One firmness number comes' : `${sourcing.independentFirmness} firmness numbers come`} from a published independent review instead of the brand, and the mattress page says so.`
                : ''}
            </li>
            <li>
              <strong>Ratings out of 10</strong> for cooling, motion isolation, edge support and durability come from
              published third-party reviews, named on each mattress page. Citing a source doesn&apos;t mean it endorses us.
            </li>
            <li>
              <strong>Missing data stays missing.</strong> It reads &ldquo;Not yet verified&rdquo; or &ldquo;Data
              unavailable&rdquo;, and any estimated score is labeled as an estimate.
            </li>
            <li>
              <strong>Pictures are labeled.</strong> Where RTINGS has published and we have matched a review to a mattress,
              we show RTINGS&apos; own photo of that mattress, credited &ldquo;Photo: RTINGS&rdquo; and linked to their review. We
              don&apos;t own those photos. Every other image is an illustration drawn by this site to show typical
              construction, labeled as such, and is not a product photo.
            </li>
          </ul>
          <p>
            The full breakdown of what is verified, and how, is in{' '}
            <Link href="/methodology#provenance">Where the data comes from</Link>.
          </p>
        </>
      ),
    },
  ];
}

export default async function DisclosuresPage() {
  const { entries } = await getCatalog();
  const money = monetizationStatus(entries);
  const { sponsored, earnsCommission } = money;
  const affiliate = money.links.affiliate;
  const names = reviewSourceNames(entries);
  const citedFrom = names.length ? names.join(' and ') : 'published third-party reviews';

  return (
    <PolicyPage
      path="/disclosures"
      crumb="Disclosures"
      eyebrow="Policy"
      title={
        <>
          Nobody pays <em>for a score.</em>
        </>
      }
      lead="How this site is funded, what a link to a brand means, and the rules that keep recommendations separate from money."
      updated={POLICY_UPDATED}
      summary={[
        { label: 'Commissions earned', value: earnsCommission ? 'Possible on labeled links' : 'None' },
        { label: 'Affiliate links', value: affiliate === 0 ? 'None' : String(affiliate) },
        { label: 'Sponsored placements', value: sponsored === 0 ? 'None' : String(sponsored) },
        { label: 'Ads', value: 'None' },
      ]}
      sections={buildSections(money, citedFrom, sourcingOf(entries))}
      related={[
        { href: '/methodology', kicker: 'The full method', label: 'How the Match Score works' },
        { href: '/privacy', kicker: 'What we collect', label: 'Privacy' },
      ]}
    />
  );
}
