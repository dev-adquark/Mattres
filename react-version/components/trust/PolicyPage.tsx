import Link from 'next/link';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { absoluteUrl, SITE_URL } from '@/lib/site';
import { CONTACT } from './trustConfig';
import s from './Policy.module.css';

export interface PolicySection {
  /** Anchor id; also used for the section heading's id. */
  id: string;
  title: string;
  body: ReactNode;
}

/** A short plain-language fact shown first, in the "at a glance" list. */
export interface PolicyFact {
  label: string;
  value: string;
}

export interface PolicyRelated {
  href: string;
  kicker: string;
  label: string;
}

export interface PolicyPageProps {
  path: string;
  crumb: string;
  eyebrow: string;
  title: ReactNode;
  lead: string;
  /** ISO date the policy was last materially revised. */
  updated: string;
  summary?: readonly PolicyFact[];
  sections: readonly PolicySection[];
  related?: readonly PolicyRelated[];
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

const num = (i: number): string => String(i + 1).padStart(2, '0');

/** The "something wrong?" note: the only real contact channel is the public issue tracker. */
function PolicyContact() {
  return (
    <aside className={s.contact} aria-labelledby="policy-contact">
      <h2 id="policy-contact" className="h3">Something wrong or unclear?</h2>
      <p>
        There is no support inbox yet. The site&apos;s code and issue tracker are public: open an issue on GitHub and
        it will be read. Issues there are public, so please don&apos;t include personal details.
      </p>
      <p>
        <a className="link" href={CONTACT.issuesUrl} target="_blank" rel="noopener noreferrer">
          {CONTACT.issuesLabel}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </aside>
  );
}

/**
 * Shared layout for the policy pages (disclosures, privacy, terms): a
 * linen title block with the real "last updated" date, an "at a glance"
 * summary, a sticky contents list on wide screens and numbered prose
 * sections. Server component.
 */
export function PolicyPage({ path, crumb, eyebrow, title, lead, updated, summary, sections, related }: PolicyPageProps) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: crumb,
    description: lead,
    dateModified: updated,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <>
      <section className={`section section--linen ${s.hero}`} aria-labelledby="policy-title">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: crumb, href: path }]} />
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className="eyebrow">{eyebrow}</p>
              <h1 id="policy-title" className={`display-l ${s.title}`}>{title}</h1>
            </div>
            <div className={s.heroAside}>
              <p className="lead">{lead}</p>
              <p className={s.updated}>
                Last updated <time dateTime={updated}>{formatDate(updated)}</time>
              </p>
            </div>
          </div>
          {summary && summary.length ? (
            <dl className={s.glance} aria-label="At a glance">
              {summary.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <section className="section section--editorial" aria-label={`${crumb} in full`}>
        <div className={`container ${s.layout}`}>
          <nav className={s.toc} aria-label="On this page">
            <p className={s.tocTitle}>On this page</p>
            <ol>
              {sections.map((sec, i) => (
                <li key={sec.id}>
                  <a href={`#${sec.id}`}>
                    <span className={s.tocNum}>{num(i)}</span>
                    {sec.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className={s.body}>
            {sections.map((sec, i) => (
              <article key={sec.id} id={sec.id} className={s.block} aria-labelledby={`${sec.id}-title`}>
                <span className={s.blockNum} aria-hidden="true">{num(i)}</span>
                <div className="prose">
                  <h2 id={`${sec.id}-title`} className={s.blockTitle}>{sec.title}</h2>
                  {sec.body}
                </div>
              </article>
            ))}
            <PolicyContact />
            {related && related.length ? (
              <nav className={s.related} aria-label="Related policies">
                {related.map((r) => (
                  <Link key={r.href} href={r.href} className={s.relatedLink}>
                    <span className="small muted">{r.kicker}</span>
                    <span className="h4">{r.label}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </section>
      <JsonLd data={ld} />
    </>
  );
}
