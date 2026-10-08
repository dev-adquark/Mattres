import type { ComponentType, SVGProps } from 'react';
import { CircleCheck, CircleMinus, CircleDot, ArrowUpRight } from 'lucide-react';
import type { CatalogReviewHighlight, MattressEntry } from '@/lib/types';
import { Section } from '@/components/ui/Section';
import { DataValue } from '@/components/ui/DataValue';
import { Chapter } from '@/components/motion';
import { reviewSourceLinks, type ReviewSourceLink } from './productPageModel';
import styles from './ProductPage.module.css';

type Sentiment = CatalogReviewHighlight['sentiment'];

const SENTIMENT: Record<Sentiment, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  positive: { label: 'Strength', Icon: CircleCheck },
  negative: { label: 'Drawback', Icon: CircleMinus },
  neutral: { label: 'Note', Icon: CircleDot },
};

function Highlight({ highlight, soleSource }: { highlight: CatalogReviewHighlight; soleSource: ReviewSourceLink | null }) {
  const sentiment = SENTIMENT[highlight.sentiment] || SENTIMENT.neutral;
  const Icon = sentiment.Icon;
  return (
    <li className={styles.highlight} data-sentiment={highlight.sentiment || 'neutral'}>
      <p className={styles.highlightHead}>
        <Icon aria-hidden="true" />
        <span className={styles.highlightKind}>{sentiment.label}</span>
        <span className={styles.highlightLabel}>{highlight.label}</span>
      </p>
      <p className={styles.highlightText}>{highlight.snippet}</p>
      {soleSource ? <p className={styles.attribution}>Paraphrased from {soleSource.name}</p> : null}
    </li>
  );
}

/**
 * Chapter 5: review notes from the catalog, paraphrased and attributed. Notes
 * are shown only when at least one named source with a real URL is on file.
 */
export function ProductReviews({ entry }: { entry: MattressEntry }) {
  const sources = reviewSourceLinks(entry);
  const highlights = sources.length ? entry.reviewHighlights || [] : [];
  const soleSource = sources.length === 1 ? (sources[0] ?? null) : null;

  return (
    <Section mood="editorial" id="reviews" className={styles.reviews} aria-labelledby="reviews-title">
      <div className={styles.reviewGrid}>
        <header className={styles.reviewHead}>
          <Chapter index={4} label="Independent notes" />
          <h2 id="reviews-title" className={styles.h2}>
            What reviewers noted.
          </h2>
          {sources.length ? (
            <div className={styles.sources}>
              <p className={styles.sourcesLabel}>Sources</p>
              <ul>
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="link-quiet">
                      {s.name}
                      <ArrowUpRight aria-hidden="true" className={styles.extIcon} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className={styles.fine}>Our paraphrase, not quotes. A listed source is evidence we checked, not an endorsement of this site.</p>
            </div>
          ) : null}
        </header>
        {highlights.length ? (
          <ul className={styles.highlights}>
            {highlights.map((h, i) => (
              <Highlight key={`${h.label}-${i}`} highlight={h} soleSource={soleSource} />
            ))}
          </ul>
        ) : (
          <p className={styles.noReviews}>
            <DataValue value={null} missing="unavailable" missingText="No independent review notes on file yet." /> We only show notes we can attribute to a
            named source.
          </p>
        )}
      </div>
    </Section>
  );
}
