import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '@/lib/db/mattressRepo';
import { displayTitle, formatPrice } from '@/lib/format';
import { Section } from '@/components/ui/Section';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/ui/JsonLd';
import { firmnessText, typeLabel, brandHref } from '@/components/product/productData';
import { absoluteUrl, SHARE_IMAGE } from '@/lib/site';
import type { MattressEntry } from '@/lib/types';
import styles from '@/components/product/MattressIndex.module.css';

const DESCRIPTION =
  'Every mattress profile in the Mattress Match Score catalog, A to Z: brand, construction, firmness and published Queen price, with gaps shown honestly.';

export const metadata: Metadata = {
  title: 'Mattress profiles A–Z',
  description: DESCRIPTION,
  alternates: { canonical: '/mattress' },
  openGraph: {
    title: 'Mattress profiles A–Z · Mattress Match Score',
    description: DESCRIPTION,
    url: '/mattress',
    type: 'website',
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mattress profiles A–Z · Mattress Match Score',
    description: DESCRIPTION,
  },
};

export const revalidate = 3600;

interface IndexRow {
  entry: MattressEntry;
  name: string;
}

interface LetterGroup {
  letter: string;
  rows: IndexRow[];
}

function letterOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default async function MattressIndexPage() {
  const { entries } = await getCatalog();
  const rows: IndexRow[] = entries
    .map((e) => ({ entry: e, name: displayTitle(e) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const groups: LetterGroup[] = [];
  for (const row of rows) {
    const letter = letterOf(row.name);
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.rows.push(row);
    else groups.push({ letter, rows: [row] });
  }
  const brandCount = new Set(entries.map((e) => e.brand)).size;
  const priced = entries.filter((e) => typeof e.priceUsd === 'number').length;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Mattress profiles A–Z',
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.name,
      url: absoluteUrl(`/mattress/${encodeURIComponent(r.entry.id)}`),
    })),
  };

  return (
    <>
      <JsonLd id="mattress-index-itemlist" data={itemList} />
      <Section mood="editorial" className={styles.hero} aria-labelledby="mattress-index-title">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Mattress profiles', href: '/mattress' },
          ]}
        />
        <div className={styles.heroGrid}>
          <p className="eyebrow">Mattress profiles, A–Z</p>
          <h1 id="mattress-index-title" className={styles.title}>
            {rows.length} mattresses. <em>Every one profiled.</em>
          </h1>
          <div className={styles.lead}>
            <p className="lead">
              {rows.length} models from {brandCount} brands. {priced} have a published Queen price on file; where a figure is
              missing, the profile says so instead of guessing.
            </p>
            <Button href="/mattresses" variant="secondary" arrow>
              Filter and sort instead
            </Button>
          </div>
        </div>
        <nav aria-label="Jump to letter" className={styles.letters}>
          <ul>
            {groups.map((g) => (
              <li key={g.letter}>
                <a href={`#letter-${g.letter === '#' ? 'num' : g.letter}`}>{g.letter}</a>
              </li>
            ))}
          </ul>
        </nav>
      </Section>

      <Section mood="editorial" tight className={styles.listSection} aria-label="All mattress profiles">
        {groups.map((g) => {
          const id = `letter-${g.letter === '#' ? 'num' : g.letter}`;
          return (
            <section key={g.letter} id={id} className={styles.group} aria-labelledby={`${id}-title`}>
              <h2 id={`${id}-title`} className={styles.letter}>
                {g.letter}
              </h2>
              <ul className={styles.rows}>
                {g.rows.map(({ entry, name }) => {
                  const firm = firmnessText(entry);
                  return (
                    <li key={entry.id} className={styles.row}>
                      <Link href={`/mattress/${encodeURIComponent(entry.id)}`} className={styles.name}>
                        {name}
                      </Link>
                      <p className={styles.meta}>
                        <Link href={brandHref(entry.brand)} className={styles.brand}>
                          {entry.brand}
                        </Link>
                        <span aria-hidden="true"> · </span>
                        <span>{typeLabel(entry)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{firm ? `Firmness ${firm}` : 'Firmness not yet verified'}</span>
                      </p>
                      <p className={styles.price}>{formatPrice(entry)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </Section>

      <Section mood="linen" className={styles.close}>
        <div className={styles.closeGrid}>
          <h2 className={styles.closeTitle}>
            Alphabetical is a start. <em>Fit is the answer.</em>
          </h2>
          <div>
            <p className="lead">Six questions, and every profile above is scored against how you actually sleep.</p>
            <Button href="/find-match?from=catalog" arrow magnetic>
              Find My Match
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
