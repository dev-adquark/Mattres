import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import type { CatalogRtingsCrossCheck } from '@/lib/rtings/evidence';
import type { EvidenceMetric, RtingsEvidence as RtingsEvidenceData } from '@/lib/rtings/types';
import { RTINGS_ACTOR_SLUG } from '@/lib/rtings/types';
import { cssVars } from '@/components/ui/cssVars';
import s from './RtingsEvidence.module.css';

/**
 * "Independent testing by RTINGS" (brief sections 18, 30, 42).
 *
 * Server component. Renders one of two honest sources:
 *   - `evidence`: a published, matched RTINGS record from the pipeline;
 *   - `crossCheck`: RTINGS figures curated into the catalog by hand, used
 *     only when no published record exists.
 * Renders nothing when neither exists. Every value shown is RTINGS' own text
 * or number; nothing is zero-filled. RTINGS' product photo is shown only via
 * the credited `photo` (lib/rtings/photo.ts), never uncredited. The copy never
 * says we tested anything.
 *
 * RTINGS' `recommendedFor` tags are not shown: the scraper returns the
 * review's section headings there, identical on every review, not a
 * per-product verdict (lib/rtings/sectionTags.ts).
 */
export interface RtingsEvidenceProps {
  name: string;
  evidence: RtingsEvidenceData | null;
  crossCheck: CatalogRtingsCrossCheck | null;
}

function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function DateValue({ iso }: { iso: string | null }) {
  const text = formatDay(iso);
  if (!iso || !text) return <span className={s.missing}>Not on file</span>;
  return <time dateTime={iso}>{text}</time>;
}

function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className}>
      {children}
      <ArrowUpRight aria-hidden="true" className={s.ext} />
      <span className="sr-only"> (opens RTINGS in a new tab)</span>
    </a>
  );
}

/** Whole numbers stay whole; RTINGS' own decimals are kept as given. */
function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/** The lead figure: RTINGS' overall score when returned, else its first measurement. */
function Feature({ overall, measurement }: { overall: number | null; measurement: EvidenceMetric | null }) {
  if (overall !== null) {
    return (
      <figure className={s.feature}>
        <figcaption className={s.featureLabel}>Overall, by RTINGS</figcaption>
        <p className={s.featureValue}>
          {num(overall)}
          <span className={s.featureUnit}>/10</span>
        </p>
        <span className={s.meter} aria-hidden="true">
          <span style={cssVars({ '--w': Math.max(0, Math.min(1, overall / 10)) })} />
        </span>
      </figure>
    );
  }
  if (measurement && measurement.value !== null) {
    return (
      <figure className={s.feature}>
        <figcaption className={s.featureLabel}>{measurement.label}, measured by RTINGS</figcaption>
        <p className={s.featureValue}>
          {num(measurement.value)}
          {measurement.scale ? <span className={s.featureUnit}>{measurement.scale}</span> : null}
        </p>
        {measurement.rawValue ? (
          <p className={s.featureRaw}>
            RTINGS reports <q>{measurement.rawValue}</q>
          </p>
        ) : null}
      </figure>
    );
  }
  return null;
}

function metricText(m: EvidenceMetric): string {
  if (m.rawValue) return m.rawValue;
  if (m.value === null) return '';
  if (m.kind === 'boolean') return m.value === 1 ? 'Yes' : 'No';
  return m.scale ? `${num(m.value)} ${m.scale === '0-10' ? '/ 10' : m.scale}` : num(m.value);
}

function MetricList({ metrics }: { metrics: EvidenceMetric[] }) {
  if (!metrics.length) return null;
  return (
    <dl className={s.metrics}>
      {metrics.map((m) => {
        const text = metricText(m);
        const rated = m.kind === 'score_0_10' && m.value !== null;
        return (
          <div key={m.key} className={s.metric}>
            <dt className={s.metricLabel}>{m.label}</dt>
            <dd className={s.metricValue}>
              {rated ? (
                <>
                  <span className="tabular">
                    {num(m.value as number)}
                    <span className={s.metricUnit}>/10</span>
                  </span>
                  <span className={s.meter} aria-hidden="true">
                    <span style={cssVars({ '--w': Math.max(0, Math.min(1, (m.value as number) / 10)) })} />
                  </span>
                </>
              ) : (
                text
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function TextList({ label, items }: { label: string; items: string[] | null }) {
  if (!items || !items.length) return null;
  return (
    <div className={s.block}>
      <p className={s.blockLabel}>{label}</p>
      <ul className={s.textList}>
        {items.map((t, i) => (
          <li key={`${i}-${t}`}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function Header({ name, lead }: { name: string; lead: ReactNode }) {
  return (
    <>
      <p className={s.kicker}>
        <span className={s.sourceMark}>RTINGS</span>
        <span className={s.kickerRule} aria-hidden="true" />
        <span>Independent review evidence</span>
      </p>
      <h2 id="rtings-title" className={s.title}>
        Independent testing <span className={s.titleBy}>by RTINGS</span>
      </h2>
      <p className={s.lead}>{lead}</p>
      <span className="sr-only">For the {name}.</span>
    </>
  );
}

function PublishedPanel({ name, evidence }: { name: string; evidence: RtingsEvidenceData }) {
  const measurement = evidence.metrics.find((m) => m.kind === 'measurement' && m.value !== null) ?? null;
  const featuredKey = evidence.overallScore === null && measurement ? measurement.key : null;
  const rest = evidence.metrics.filter((m) => m.key !== featuredKey);
  const firstPublished = evidence.publishedAt;
  const updated = evidence.sourceUpdatedAt;
  const sameDay = formatDay(firstPublished) !== null && formatDay(firstPublished) === formatDay(updated);

  return (
    <div className={s.grid}>
      <header className={s.head}>
        <Header
          name={name}
          lead={
            <>
              What RTINGS published from its own testing of the {evidence.productName}, shown as RTINGS reports it. Mattress Match Score did not test this mattress,
              and these results sit beside the Match Score without changing it.
            </>
          }
        />
        <ExternalLink href={evidence.reviewUrl} className={s.cta}>
          Read the full review on RTINGS
        </ExternalLink>
        <dl className={s.dates}>
          {sameDay || !updated || !firstPublished ? (
            <div>
              <dt>RTINGS review published/updated</dt>
              <dd>
                <DateValue iso={updated ?? firstPublished} />
              </dd>
            </div>
          ) : (
            <>
              <div>
                <dt>RTINGS review first published</dt>
                <dd>
                  <DateValue iso={firstPublished} />
                </dd>
              </div>
              <div>
                <dt>RTINGS review last updated</dt>
                <dd>
                  <DateValue iso={updated} />
                </dd>
              </div>
            </>
          )}
          <div>
            <dt>Data retrieved by us</dt>
            <dd>
              <DateValue iso={evidence.retrievedAt} />
            </dd>
          </div>
          {evidence.testBenchName ? (
            <div>
              <dt>RTINGS test bench</dt>
              <dd className="tabular">{evidence.testBenchName}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className={s.body}>
        <Feature overall={evidence.overallScore} measurement={measurement} />
        {evidence.verdict ? <p className={s.verdict}>{evidence.verdict}</p> : null}
        <MetricList metrics={rest} />
        <div className={s.lists}>
          <TextList label="RTINGS pros" items={evidence.pros} />
          <TextList label="RTINGS cons" items={evidence.cons} />
        </div>
        {evidence.mixedSummary ? <p className={s.summary}>{evidence.mixedSummary}</p> : null}

        {evidence.licensedImages.length ? (
          <div className={s.images}>
            {evidence.licensedImages.map((img) => (
              <figure key={img.imageUrl} className={s.image}>
                {/* eslint-disable-next-line @next/next/no-img-element -- licensed third-party image, shown at its source URL */}
                <img src={img.imageUrl} alt={img.alt ?? ''} loading="lazy" decoding="async" />
                <figcaption>Image: RTINGS. {img.licenseNote}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        <p className={s.provenance}>
          Source: RTINGS, independent review. Collected with the Apify actor {RTINGS_ACTOR_SLUG}
          {evidence.provenance.apifyRunId ? <> (run <code>{evidence.provenance.apifyRunId}</code>)</> : null}, checked and matched to this mattress before
          publishing. {evidence.photo ? 'The product photo on this page is RTINGS’, credited and linked to their review; we do not own it.' : null}
        </p>
      </div>
    </div>
  );
}

function CrossCheckPanel({ name, check }: { name: string; check: CatalogRtingsCrossCheck }) {
  const firmness: EvidenceMetric | null =
    check.firmnessPaPerMm !== null
      ? {
          key: 'firmness_level',
          label: 'Firmness',
          rawValue: check.firmnessLabel ? `${check.firmnessLabel} (${num(check.firmnessPaPerMm)} Pa/mm)` : null,
          value: check.firmnessPaPerMm,
          scale: 'Pa/mm',
          kind: 'measurement',
        }
      : null;
  const labelOnly: EvidenceMetric[] =
    firmness === null && check.firmnessLabel
      ? [{ key: 'firmness_level', label: 'Firmness', rawValue: check.firmnessLabel, value: null, scale: null, kind: 'label' }]
      : [];

  return (
    <div className={s.grid}>
      <header className={s.head}>
        <Header
          name={name}
          lead={
            <>
              RTINGS figures we checked by hand against its published review of this mattress. The measuring is RTINGS&rsquo;; Mattress Match Score did not test this
              mattress, and these figures do not change the Match Score.
            </>
          }
        />
        <ExternalLink href={check.reviewUrl} className={s.cta}>
          Read the full review on RTINGS
        </ExternalLink>
        <dl className={s.dates}>
          <div>
            <dt>RTINGS review published/updated</dt>
            <dd>
              <span className={s.missing}>Not on file</span>
            </dd>
          </div>
          <div>
            <dt>Checked against RTINGS by us</dt>
            <dd>
              <DateValue iso={check.crossCheckedAt} />
            </dd>
          </div>
        </dl>
      </header>

      <div className={s.body}>
        <Feature overall={null} measurement={firmness} />
        <MetricList metrics={labelOnly} />
        <p className={s.provenance}>
          Source: RTINGS, independent review, cross-checked into our catalog. Only figures RTINGS published are listed; anything it did not report is left out.
          RTINGS&rsquo; product photos stay on RTINGS.
        </p>
      </div>
    </div>
  );
}

export function RtingsEvidence({ name, evidence, crossCheck }: RtingsEvidenceProps) {
  if (!evidence && !crossCheck) return null;
  return (
    <Section mood="deep" id="rtings" className={s.section} aria-labelledby="rtings-title" data-rtings-source={evidence ? 'published' : 'catalog'}>
      {evidence ? <PublishedPanel name={name} evidence={evidence} /> : crossCheck ? <CrossCheckPanel name={name} check={crossCheck} /> : null}
    </Section>
  );
}
