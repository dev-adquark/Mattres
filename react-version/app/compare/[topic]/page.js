import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuditBanner from '@/components/AuditBanner';
import CompareGrid from '@/components/CompareGrid';
import { compareTopics, getCompareTopic } from '@/lib/compareTopics';
import { matchProfile } from '@/lib/matchLogic';

export function generateStaticParams() {
  return Object.keys(compareTopics).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }) {
  const { topic } = await params;
  const config = getCompareTopic(topic);
  if (!config) return { title: 'Comparison not found — Mattress Match Score' };
  return { title: `${config.title} — Mattress Match Score` };
}

export default async function CompareTopicPage({ params }) {
  const { topic } = await params;
  const config = getCompareTopic(topic);
  if (!config) notFound();

  const { results, modelVersion, catalogAudit } = await matchProfile(config.profile);
  const otherTopics = Object.entries(compareTopics).filter(([slug]) => slug !== topic);

  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">Compare</span>
          <h1 className="ph-title">{config.title}</h1>
          <p className="ph-sub">
            Ranked by the real Match Score engine for this documented profile. Sub-scores, risk flags, and review
            highlights are mapped directly to that profile&apos;s real inputs — not a static table.
          </p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap">
          <div className="compare-toolbar">
            <div className="chips">
              {config.chips.map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
            <div className="toolbar-actions">
              <span className="selected-count">{results.length} matches</span>
              <Link href="/find-match" className="btn btn-ghost-dark">
                Use my own profile
              </Link>
            </div>
          </div>

          <AuditBanner audit={catalogAudit} />
          <CompareGrid results={results} />

          <p className="compare-footnote">
            Scores reflect the documented profile above (see chips) using scoring model{' '}
            <strong>v{modelVersion}</strong>. <Link href="/find-match">Take the real quiz</Link> for your own results,
            or read the <Link href="/methodology">full methodology</Link>.
          </p>

          <div style={{ marginTop: 48 }}>
            <span
              className="eyebrow-dark"
              style={{ color: 'var(--teal-600,#0e8a72)', display: 'block', marginBottom: 14 }}
            >
              Other comparisons
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {otherTopics.map(([slug, t]) => (
                <Link key={slug} href={`/compare/${slug}`} className="chip" style={{ textDecoration: 'none' }}>
                  {t.title}
                </Link>
              ))}
              <Link href="/compare" className="chip" style={{ textDecoration: 'none' }}>
                Side sleepers under $1,000
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
