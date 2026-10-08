import { Section } from '@/components/ui/Section';
import { GOOD_SCORE, RATING_MARGIN, TOP_RANK } from './brandData';
import type { BrandVerdicts, VerdictItem } from './brandData';
import styles from './Brands.module.css';

interface VerdictColumnProps {
  title: string;
  tone: 'up' | 'down';
  items: readonly VerdictItem[];
  empty: string;
}

function VerdictColumn({ title, tone, items, empty }: VerdictColumnProps) {
  return (
    <div>
      <h3 className={styles.verdictCol}>
        <span className={styles.verdictDot} data-tone={tone} aria-hidden="true" />
        {title}
      </h3>
      {items.length ? (
        <ul className={styles.verdictList}>
          {items.map((v) => (
            <li key={v.id}>
              <strong>{v.title}</strong>
              <span>{v.detail}</span>
              <small>{v.basis}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.verdictEmpty}>{empty}</p>
      )}
    </div>
  );
}

interface BrandVerdictProps {
  name: string;
  verdicts: BrandVerdicts;
  /** Whether any of the brand's models has an independent rating on file. */
  hasRatings: boolean;
  /** How many mattresses are ranked for the reference sleepers (integrity rule), or null when unknown. */
  rankedCount: number | null;
}

/** 3 - Strengths and watch-outs, each with its basis. */
export function BrandVerdict({ name, verdicts, hasRatings, rankedCount }: BrandVerdictProps) {
  return (
    <Section mood="linen" id="verdict" className={styles.verdict} aria-labelledby="verdict-title">
      <div className={styles.verdictHead}>
        <p className="eyebrow">Strengths &amp; watch-outs</p>
        <h2 id="verdict-title" className={styles.verdictTitle}>
          What the data says about {name}
        </h2>
        <p className={styles.verdictIntro}>
          Derived, not written: independent ratings compared with the catalog median
          {hasRatings ? '' : ' (none on file here)'}, and engine scores placed among the {rankedCount ?? 'ranked'} mattresses with enough backed data to rank, as on every category and product page. The basis sits under each line.
        </p>
      </div>
      <div className={styles.verdictGrid}>
        <VerdictColumn
          title="Stands out"
          tone="up"
          items={verdicts.strengths}
          empty={`Nothing clears our bar: no rating sits ${RATING_MARGIN} or more above the catalog median and no reference score ranks in the top ${TOP_RANK}.`}
        />
        <VerdictColumn
          title="Watch out for"
          tone="down"
          items={verdicts.weaknesses}
          empty={`No rating sits ${RATING_MARGIN} or more below the catalog median, and for every reference sleeper at least one model reaches a Good match (${GOOD_SCORE}+).`}
        />
      </div>
      {verdicts.gaps.length ? (
        <ul className={styles.gaps} aria-label="Data gaps">
          {verdicts.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
