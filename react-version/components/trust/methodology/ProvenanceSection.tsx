import type { VerificationLevel } from '@/lib/types';
import { VERIFICATION_DISPLAY } from '@/components/ui/Badge';
import { cssVars } from '@/components/ui/cssVars';
import type { MethodologySectionProps, Provenance } from '../methodologyTypes';
import { Chapter } from './Chapter';
import { formatDate } from './format';
import s from '../Methodology.module.css';

const LEVELS: readonly VerificationLevel[] = ['verified', 'partially_verified', 'unverified', 'unknown'];

/** A "count/total" figure with the total muted. */
function OutOf({ count, total }: { count: number; total: number }) {
  return (
    <>
      {count}
      <span className="muted">/{total}</span>
    </>
  );
}

function rtingsText(p: Provenance): string {
  if (!p.rtingsCrossChecks.count) return 'None on file yet.';
  return `${p.rtingsCrossChecks.count} mattresses cross-checked against RTINGS's published measurements, most recently ${formatDate(p.rtingsCrossChecks.latest)}. The measuring is theirs, not ours. Kept as separate evidence, never folded into the Match Score as a score of its own.`;
}

function publishedCount(n: number | null): string {
  if (n === null) return '';
  if (n === 0) return ' No synced RTINGS record is published on a mattress page yet.';
  return ` ${n} synced RTINGS ${n === 1 ? 'record is' : 'records are'} published on mattress pages.`;
}

/** What the RTINGS sync does, and whether it is live, stated from the store the site actually reads. */
function rtingsPipelineText(p: Provenance): string {
  const r = p.rtingsPipeline;
  const how = `Review data comes from RTINGS through the Apify actor ${r.actorSlug}. Each record is validated, matched to a catalog mattress only by an exact review link or an exact brand-and-model match, and held back for review if a run looks wrong (too few records, broken links, vanished scores). Mattress pages show RTINGS' own review date apart from the date we retrieved it, and never show RTINGS' photos.`;
  if (r.databaseConnected) {
    return `${how} A daily check refreshes it every ${r.syncIntervalDays} days.${publishedCount(r.publishedReviews)}`;
  }
  return `${how} Scheduled syncing every ${r.syncIntervalDays} days is built but not live: its database isn't connected yet, so syncs are run by hand and published records ship with each site update.${publishedCount(r.publishedReviews)}`;
}

function lastCheckedText(p: Provenance): string {
  if (!p.lastVerified) return 'Not yet recorded.';
  return p.lastVerified.earliest === p.lastVerified.latest
    ? `Every record was checked against its source on ${formatDate(p.lastVerified.latest)}.`
    : `Between ${formatDate(p.lastVerified.earliest)} and ${formatDate(p.lastVerified.latest)}.`;
}

/** The "we don't lab-test" statement with the citation counts behind it. */
function NoLabCallout({ p, total }: { p: Provenance; total: number }) {
  return (
    <aside className={s.noLab} aria-labelledby="no-lab-title">
      <p className={s.noLabKicker}>
        <span className="status-dot" aria-hidden="true" /> Plainly
      </p>
      <p id="no-lab-title" className={s.noLabStatement}>
        We don&rsquo;t lab-test mattresses. <em>Independent ratings are cited</em> from{' '}
        {p.reviewSources.length ? p.reviewSources.map((r) => r.name).join(' and ') : 'Sleep Foundation and RTINGS'} with
        links; specs come from manufacturer pages (or, where a mattress page says so, a retailer listing).
      </p>
      <dl className={s.noLabFacts}>
        {p.reviewSources.map((r) => (
          <div key={r.name}>
            <dt>{r.name === 'RTINGS' ? 'Catalog cites RTINGS' : `Cites ${r.name}`}</dt>
            <dd className="tabular">
              <OutOf count={r.count} total={total} />
            </dd>
          </div>
        ))}
        {typeof p.rtingsPipeline.publishedReviews === 'number' ? (
          <div>
            <dt>RTINGS test data on product pages</dt>
            <dd className="tabular">
              <OutOf count={p.rtingsPipeline.publishedReviews} total={total} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Manufacturer product page</dt>
          <dd className="tabular">
            <OutOf count={p.brandPageSource} total={total} />
          </dd>
        </div>
        {p.retailerSource > 0 ? (
          <div>
            <dt>Retailer listing only</dt>
            <dd className="tabular">
              <OutOf count={p.retailerSource} total={total} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Tested by us</dt>
          <dd className="tabular">0</dd>
        </div>
      </dl>
    </aside>
  );
}

/* ---------- 09 Provenance ---------- */

export function ProvenanceSection({ data }: MethodologySectionProps) {
  const { provenance: p, catalog } = data;
  return (
    <section id="provenance" className="section section--neutral" aria-labelledby="provenance-title">
      <div className="container">
        <span id="data-and-sources" className={s.anchorAlias} aria-hidden="true" />
        <header className="section__header">
          <Chapter index="09">Data &amp; sources</Chapter>
          <h2 id="provenance-title" className="section__title">Every record says how sure we are.</h2>
          <p className="section__intro">
            Counts below are computed from the catalog each time this page is built, using the same checks the product
            pages use.
          </p>
        </header>

        <NoLabCallout p={p} total={catalog.total} />

        <div className={s.levelsGrid}>
          {LEVELS.map((level) => {
            const { Icon, label, description } = VERIFICATION_DISPLAY[level];
            return (
              <div key={level} className={s.levelCard} data-level={level}>
                <span className={s.levelCount}>{p.audit.byLevel[level] ?? 0}</span>
                <span className={s.levelName}>
                  <Icon aria-hidden="true" /> {label}
                </span>
                <span className="small muted">{description}</span>
              </div>
            );
          })}
        </div>
        <p className={`small muted ${s.levelNote}`}>
          Of {p.audit.total} mattresses. A mattress is only marked Verified when every required spec (brand, model, type,
          height, trial, warranty, firmness and price) is on file, it has both a source link and a check date, and every
          one of those specs is recorded as confirmed against that source. A complete record short of that reads Source checked.
        </p>

        <div className={`split split--top ${s.provSplit}`}>
          <div>
            <h3 className="h3">What&apos;s on file</h3>
            <ul className={s.coverage}>
              {p.coverage.map((c) => (
                <li key={c.id}>
                  <span className={s.coverageName}>{c.label}</span>
                  <span className={s.meter} aria-hidden="true">
                    <span style={cssVars({ '--w': catalog.total ? c.count / catalog.total : 0 })} />
                  </span>
                  <span className={`tabular ${s.coverageCount}`}>
                    <OutOf count={c.count} total={catalog.total} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="h3">Sources</h3>
            <dl className={s.sources}>
              <div>
                <dt>Specs, prices, trial and warranty</dt>
                <dd>
                  The manufacturer&apos;s product page for {p.brandPageSource} of {catalog.total}
                  {p.retailerSource > 0
                    ? `, and a retailer's listing for ${p.retailerSource} house-brand ${p.retailerSource === 1 ? 'mattress' : 'mattresses'}`
                    : ''}
                  . The source is linked on every mattress page.
                  {p.independentFirmness > 0
                    ? ` ${p.independentFirmness} firmness ${p.independentFirmness === 1 ? 'number comes' : 'numbers come'} from a published independent review instead of the brand, and ${p.independentFirmness === 1 ? 'is' : 'are'} labeled on the mattress page.`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Ratings out of 10</dt>
                <dd>
                  Published third-party reviews:{' '}
                  {p.reviewSources.length
                    ? p.reviewSources.map((r, i) => (
                        <span key={r.name}>
                          {i ? ', ' : ''}
                          {r.name} (cited for {r.count})
                        </span>
                      ))
                    : 'none on file'}
                  . We record their numbers; we don&apos;t run our own tests.
                </dd>
              </div>
              <div>
                <dt>RTINGS cross-checks</dt>
                <dd>{rtingsText(p)}</dd>
              </div>
              <div>
                <dt>RTINGS sync</dt>
                <dd>{rtingsPipelineText(p)}</dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>
                  {lastCheckedText(p)} Each mattress page shows its own date.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
