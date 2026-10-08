import Link from 'next/link';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import { displayTitle } from '@/lib/format';
import { Section } from '@/components/ui/Section';
import { DataValue } from '@/components/ui/DataValue';
import { VerificationBadge } from '@/components/ui/Badge';
import { firmnessText, mattressHref, queenPriceText, typeLabel, warrantyText } from '@/components/product/productData';
import type { MattressEntry } from '@/lib/types';
import { BRAND_RATING_DIMS, fmt10 } from './brandData';
import styles from './Brands.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

function PriceCell({ entry }: { entry: MattressEntry }) {
  // Qualified when provisional / currency-unconfirmed; a lowest-size "from" price is never a Queen price.
  const text = queenPriceText(entry);
  if (text) return <>{text}</>;
  return <DataValue value={null} missingText="Not yet verified" />;
}

/** 4 - Specs side by side (multi-model lineups only). Gaps are marked, never filled. */
export function BrandSpecs({ name, entries }: { name: string; entries: readonly MattressEntry[] }) {
  return (
    <Section mood="editorial" id="specs" className={styles.specs} aria-labelledby="specs-title">
      <div className={styles.specsHead}>
        <h2 id="specs-title" className={styles.sectionTitle}>
          Specs, side by side
        </h2>
        <p className="muted">As published by {name}; ratings out of 10 come from independent reviewers. Gaps are marked, not filled.</p>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={`${name} specs table (scrolls sideways)`}>
        <table className={styles.table}>
          <caption className="sr-only">{name} models compared by type, firmness, price, trial, warranty, independent ratings and data status</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Type</th>
              <th scope="col">Firmness</th>
              <th scope="col">Queen price</th>
              <th scope="col">Trial</th>
              <th scope="col">Warranty</th>
              {BRAND_RATING_DIMS.map((d) => (
                <th scope="col" key={d.key}>
                  {d.label}
                </th>
              ))}
              <th scope="col">Data status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <th scope="row">
                  <Link href={mattressHref(e)} className="link-quiet">
                    {displayTitle(e)}
                  </Link>
                  <SponsoredTag sponsored={e.sponsored} />
                </th>
                <td>{typeLabel(e)}</td>
                <td>{firmnessText(e) || <DataValue value={null} />}</td>
                <td className="tabular">
                  <PriceCell entry={e} />
                </td>
                <td>
                  <DataValue value={e.trialDays} suffix=" nights" />
                </td>
                <td>
                  <DataValue<string> value={warrantyText(e)} />
                </td>
                {BRAND_RATING_DIMS.map((d) => (
                  <td key={d.key} className="tabular">
                    <DataValue value={e[d.field]} format={fmt10} missingText="Not yet rated" />
                  </td>
                ))}
                <td>
                  <VerificationBadge level={getVerificationLevel(e)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
