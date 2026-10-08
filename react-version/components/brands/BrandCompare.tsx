import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { displayTitle } from '@/lib/format';
import { Section } from '@/components/ui/Section';
import { CommerceCta } from '@/components/product/CommerceCta';
import type { MattressEntry } from '@/lib/types';
import { typeWord } from './brandCopy';
import { buyLeadCopy, compareHref } from './brandData';
import type { BrandPairLink, CommerceSummary, NearestPairLink } from './brandData';
import styles from './Brands.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

function BigLink({ href, kicker, children }: { href: string; kicker: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className={styles.bigLink}>
        <span className={styles.bigLinkKicker}>{kicker}</span>
        <span className={styles.bigLinkTitle}>{children}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </li>
  );
}

interface BrandCompareProps {
  name: string;
  path: string;
  /** Lineup in engine reference order, best first. */
  ordered: readonly MattressEntry[];
  /** Ids for the within-lineup comparison (top 3 by reference score). */
  lineupIds: readonly string[];
  pairs: readonly BrandPairLink[];
  /** Curated pairs involving the closest rival, shown only when the brand has none of its own. */
  nearest: readonly NearestPairLink[];
  rivals: readonly MattressEntry[];
  commerce: CommerceSummary;
}

/** 5 - Compare, and where to buy (honestly: no invented links, affiliate status stated). */
export function BrandCompare({ name, path, ordered, lineupIds, pairs, nearest, rivals, commerce }: BrandCompareProps) {
  const lead = ordered[0];
  const single = ordered.length === 1;
  return (
    <Section mood={single ? 'editorial' : 'product'} id="compare" className={styles.compare} aria-labelledby="compare-title">
      <div className={styles.compareGrid}>
        <div>
          <h2 id="compare-title" className={styles.sectionTitle}>
            Compare {name}
          </h2>
          <ul className={styles.linkList}>
            {!single ? (
              <BigLink href={compareHref(lineupIds)} kicker="Within the lineup">
                {lineupIds.length === ordered.length ? `All ${ordered.length} ${name} models` : `${name}’s top 3 by reference score`}, side by side
              </BigLink>
            ) : null}
            {pairs.map((p) => (
              <BigLink key={p.slug} href={p.href} kicker="Head to head">
                {p.title}
              </BigLink>
            ))}
            {pairs.length === 0
              ? nearest.map((p) => (
                  <BigLink key={p.slug} href={p.href} kicker={`Nearest head to head · involves ${displayTitle(p.rival)}, the closest ${typeWord(p.rival.type)} rival with a head-to-head page`}>
                    {p.title}
                  </BigLink>
                ))
              : null}
            {lead
              ? rivals.map((r) => (
                  <BigLink key={r.id} href={compareHref([lead.id, r.id])} kicker={`Closest ${typeWord(r.type)} rival by firmness`}>
                    {displayTitle(lead)} <em>vs</em> {displayTitle(r)}
                  </BigLink>
                ))
              : null}
          </ul>
        </div>

        <div className={styles.buy}>
          <h2 className={styles.buyTitle}>Where to buy</h2>
          <p className={styles.buyLead}>
            {buyLeadCopy(name, commerce)}
          </p>
          <ul className={styles.buyList}>
            {commerce.ctas.map(({ entry: e, cta }) => (
              <li key={e.id}>
                <span className={styles.buyModel}>
                  {displayTitle(e)}
                  <SponsoredTag sponsored={e.sponsored} />
                </span>
                <CommerceCta cta={cta} mattressId={e.id} brand={name} placement="brand_page" page={path} variant="secondary" size="sm" showHost={false} />
              </li>
            ))}
          </ul>
          <p className={styles.buyNote}>
            <Link href="/disclosures" className="link">
              How we make money
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
