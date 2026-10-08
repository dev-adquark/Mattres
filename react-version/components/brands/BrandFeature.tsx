import Link from 'next/link';
import { displayTitle } from '@/lib/format';
import { firmnessFor } from '@/lib/firmness';
import { VerificationBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MattressRender } from '@/components/ui/MattressRender';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { firmnessText, mattressHref, queenPriceText, positioningFor, typeLabel, warrantyText } from '@/components/product/productData';
import type { MattressEntry } from '@/lib/types';
import { typeWord } from './brandCopy';
import styles from './Brands.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

interface FactRow {
  label: string;
  value: string | null;
}

/** The facts a single model actually has on file - missing ones are summarised once, not given a cell each. */
function singleFacts(entry: MattressEntry): { present: FactRow[]; missing: string[] } {
  const firm: { label: string } | null = firmnessFor(entry);
  const rows: FactRow[] = [
    { label: 'Construction', value: typeLabel(entry) },
    { label: 'Firmness', value: firm ? `${firm.label} · ${firmnessText(entry)}` : null },
    { label: 'Queen price', value: queenPriceText(entry) },
    { label: 'Trial', value: typeof entry.trialDays === 'number' ? `${entry.trialDays} nights` : null },
    { label: 'Warranty', value: warrantyText(entry) },
    { label: 'Height', value: typeof entry.heightIn === 'number' ? `${entry.heightIn} in` : null },
  ];
  return {
    present: rows.filter((r) => r.value),
    missing: rows.filter((r) => !r.value).map((r) => r.label.toLowerCase()),
  };
}

/** A one-model brand: the model itself takes the hero, with only the facts on file. */
export function BrandFeature({ entry }: { entry: MattressEntry }) {
  const facts = singleFacts(entry);
  const href = mattressHref(entry);
  const title = displayTitle(entry);
  return (
    <article className={styles.feature} aria-labelledby="feature-title">
      <Link href={href} className={styles.featureMedia} tabIndex={-1} aria-hidden="true">
        <MattressRender type={entry.type} seed={entry.id} aspect="product" size="fluid" fill photo={entry.photo} photoCreditLink={false} sizes="(min-width: 900px) 58vw, 100vw" preload />
        {entry.photo ? null : <span className={`illus-tag ${styles.featureTag}`}>Illustration · typical {typeWord(entry.type)}</span>}
      </Link>
      <div className={styles.featureBody}>
        <p className="eyebrow">
          The model
          <SponsoredTag sponsored={entry.sponsored} />
        </p>
        <h2 id="feature-title" className={styles.featureTitle}>
          <Link href={href}>{title}</Link>
        </h2>
        <p className={styles.featureLead}>{positioningFor(entry)}</p>
        <dl className={styles.featureFacts}>
          {facts.present.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        {facts.missing.length ? <p className={styles.featureMissing}>Not published on the pages we checked: {facts.missing.join(', ')}.</p> : null}
        <div className={styles.featureActions}>
          <Button href={href} arrow>
            Layers, details and your score
          </Button>
          <CompareToggle id={entry.id} name={title} source="brand_page" />
        </div>
        <VerificationBadge entry={entry} />
      </div>
    </article>
  );
}
