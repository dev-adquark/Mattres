import { Rail } from '@/components/ui/Rail';
import Link from 'next/link';
import type { OutboundKind } from '@/lib/types';
import type { MethodologySectionProps } from '../methodologyTypes';
import { Chapter } from './Chapter';
import s from '../Methodology.module.css';

/* ---------- 10 Money & placement ---------- */

/** Every kind of outbound button lib/outbound ctaFor can produce, in its order of preference. */
const LINK_KINDS: readonly { id: OutboundKind; label: string; note: string }[] = [
  { id: 'affiliate', label: 'Check Price at the retailer', note: 'Affiliate link, labeled beside the button. We may earn a commission.' },
  { id: 'retailer', label: 'View at the retailer', note: 'A retailer page on file, with no affiliate code.' },
  { id: 'brand', label: 'Visit the brand', note: "The manufacturer's own product page. Earns us nothing." },
  { id: 'unavailable', label: 'Retailer link not available yet', note: 'Nothing real on file, so no button is shown.' },
];

const SPONSOR_RULES = [
  'It is scored by the same rules as every other mattress. Sponsorship is not an input to the model, and an automated test checks that an all-sponsored catalog scores and ranks identically.',
  'It keeps the rank its score earns in every ranking and is never lifted above a better fit. It is never shown as your top match or as a home-page pick, even when it scores highest.',
  'It is labeled “Sponsored” everywhere it is listed: its product page, the catalog, category and brand pages, quiz results, guide rankings, related mattresses, comparisons and search results.',
  'Affiliate links never change the price you pay.',
] as const;

export function MoneySection({ data }: MethodologySectionProps) {
  const { money } = data;
  const facts = [
    { label: 'Affiliate links live', value: money.links.affiliate },
    { label: 'Sponsored placements', value: money.sponsored },
    { label: 'Points a payment can buy', value: 0 },
  ];
  return (
    <section id="money" className="section section--deep" data-nav-theme="dark" aria-labelledby="money-title">
      <div className="container">
        <div className={s.moneyGrid}>
          <header className={s.moneyHead}>
            <Chapter index="10">Money &amp; placement</Chapter>
            <h2 id="money-title" className={`display ${s.sectionStatement}`}>
              The score and the money <em>never meet.</em>
            </h2>
            <p className={s.moneyLead}>
              {money.earnsCommission
                ? 'Some outbound links are affiliate links. Each is labeled, and none of them can touch a score, a rank or a fit flag.'
                : 'Today the site earns nothing: no commissions, no ads, no sponsors. If that changes, the rules below already decide how.'}
            </p>
            <dl className={s.moneyFacts}>
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <div className={s.moneyBody}>
            <div id="affiliate-disclosure" className={s.moneyBlock}>
              <h3 className="h3">Affiliate disclosure</h3>
              <p>
                Every &ldquo;buy&rdquo; button is chosen from real data only, in this order. Counts are from the{' '}
                {money.total} mattresses in the catalog today.
              </p>
              <ol className={s.linkKinds}>
                {LINK_KINDS.map((k) => (
                  <li key={k.id} data-empty={money.links[k.id] === 0 ? '' : undefined}>
                    <span className={`tabular ${s.linkCount}`}>{money.links[k.id]}</span>
                    <span className={s.linkLabel}>{k.label}</span>
                    <span className={s.linkNote}>{k.note}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div id="sponsored-placement" className={s.moneyBlock}>
              <h3 className="h3">Sponsored placement rules</h3>
              <p>
                {money.hasSponsored
                  ? `${money.sponsored} ${money.sponsored === 1 ? 'mattress carries' : 'mattresses carry'} a sponsored placement. Each follows these rules.`
                  : 'There are none today. If one is ever sold, these rules apply:'}
              </p>
              <ul className={s.moneyRules}>
                {SPONSOR_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <p className="small">
                <Link className="link" href="/disclosures">
                  Read the full disclosures
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 11 Limitations ---------- */

export function LimitationsSection({ data }: MethodologySectionProps) {
  const { catalog, dimensionCoverage, provenance } = data;
  const density = provenance.coverage.find((c) => c.id === 'density');
  const items = [
    {
      title: 'We have not tested any mattress.',
      text: 'Ratings come from published third-party reviews. Their methods are theirs, they differ from one another, and we copy their numbers rather than re-measure them.',
    },
    {
      title: 'Firmness is a stated number.',
      text: 'It comes from a manufacturer or reviewer and is converted to a 1–10 scale. Two people can feel the same mattress differently, which is why the preference penalty and trial periods matter.',
    },
    {
      title: 'Plenty of gaps remain.',
      text: `Cooling is estimated for ${catalog.total - dimensionCoverage.heat} of ${catalog.total} mattresses. Foam density is on file for ${density ? density.count : 0}, so the density-based durability rule cannot fire today.`,
    },
    {
      title: 'The catalog is small.',
      text: `${catalog.total} mattresses from ${catalog.brands} brands. A top score means the best fit among these, not the best mattress you could buy.`,
    },
    {
      title: 'The rules are assumptions.',
      text: 'Every weight and threshold is a documented modeling choice. None has been clinically validated or calibrated against sleep outcomes or return rates.',
    },
    {
      title: 'Not medical advice.',
      text: 'Discomfort answers only shift weights. They don’t diagnose or treat anything, and neck pain is not modeled. If pain persists, see a clinician.',
    },
    {
      title: 'Prices move.',
      text: 'A price is correct as of the check date shown with it. Always confirm on the brand’s site.',
    },
  ];
  return (
    <section id="limitations" className="section section--sand" aria-labelledby="limitations-title">
      <div className="container">
        <div className="split split--5-7 split--top">
          <div className={s.stickyHead}>
            <Chapter index="11">Limitations</Chapter>
            <h2 id="limitations-title" className={`display ${s.sectionStatement}`}>
              What this score <em>can&apos;t</em> tell you.
            </h2>
          </div>
          <Rail as="ol" cards label="limits" column="86%" align="start" className={s.limits}>
            {items.map((item, i) => (
              <li key={item.title}>
                <span className={s.limitNum} aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="h4">{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </Rail>
        </div>
      </div>
    </section>
  );
}
