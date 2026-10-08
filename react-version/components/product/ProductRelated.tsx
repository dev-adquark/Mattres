import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { displayTitle } from '@/lib/format';
import { guideCategoryLabel } from '@/lib/content/guides';
import type { Guide, MattressEntry } from '@/lib/types';
import { Section } from '@/components/ui/Section';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { Chapter, Slider } from '@/components/motion';
import { SponsoredTag } from '@/components/trust/SponsoredTag';
import { brandHref, mattressHref, typeLabel } from './productData';
import { buildWord } from './productPageModel';
import styles from './ProductPage.module.css';

interface ProductRelatedProps {
  entry: MattressEntry;
  name: string;
  /** similarFromOtherBrands(): same type, nearest firmness. */
  similar: readonly MattressEntry[];
  /** The rest of this brand's lineup. */
  sameBrand: readonly MattressEntry[];
  guides: readonly Pick<Guide, 'slug' | 'path' | 'title' | 'description' | 'category'>[];
}

function SimilarSlider({ name, typeWord, similar }: { name: string; typeWord: string; similar: readonly MattressEntry[] }) {
  if (!similar.length) {
    return (
      <h2 id="similar-title" className={styles.h2}>
        Compare
      </h2>
    );
  }
  return (
    <Slider
      id="product-similar"
      label={`Mattresses similar to ${name}`}
      perView={{ base: 1.15, sm: 1.8, md: 2.4, lg: 3.2, xl: 3.6 }}
      controls="top"
      header={
        <div className={styles.sliderHead}>
          <Chapter index={5} label="Compare" />
          <h2 id="similar-title" className={styles.h2}>
            Compare with similar.
          </h2>
          <p className={styles.fine}>Other {typeWord} mattresses, nearest firmness first. Order is by construction and firmness only, never by payment.</p>
        </div>
      }
    >
      {similar.map((e) => (
        <ProductCard key={e.id} entry={e} headingLevel="h3" />
      ))}
    </Slider>
  );
}

/** Chapter 6: similar mattresses from other brands, the compare tray, the rest of the lineup and guides to read next. */
export function ProductRelated({ entry, name, similar, sameBrand, guides }: ProductRelatedProps) {
  return (
    <Section mood="linen" id="similar" width="wide" className={styles.related} aria-labelledby="similar-title">
      <SimilarSlider name={name} typeWord={buildWord(entry)} similar={similar} />

      <div className={styles.nextSteps}>
        <div className={styles.compareBox}>
          <h3 className={styles.h3}>Line it up against your finalists.</h3>
          <p className={styles.fine}>Add up to three mattresses to see specs, ratings and your scores side by side.</p>
          <div className={styles.compareActions}>
            <CompareToggle id={entry.id} name={name} source="product-related" labelOff={`Add ${name}`} />
            <Button href="/compare" variant="secondary">
              Open compare
            </Button>
          </div>
          {sameBrand.length ? (
            <div className={styles.moreBrand}>
              <p className={styles.sourcesLabel}>More from {entry.brand}</p>
              <ul>
                {sameBrand.map((e) => (
                  <li key={e.id}>
                    <Link href={mattressHref(e)} className={styles.brandRow}>
                      <span>
                        {displayTitle(e)}
                        <SponsoredTag sponsored={e.sponsored} />
                      </span>
                      <span className={styles.brandRowMeta}>{typeLabel(e)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={brandHref(entry.brand)} className={styles.footLink}>
                All {entry.brand} mattresses <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className={styles.guides}>
          <h3 className={styles.h3}>Keep reading</h3>
          <ul className={styles.guideList}>
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={g.path} className={styles.guideLink}>
                  <span className={styles.guideCat}>{guideCategoryLabel(g.category)}</span>
                  <span className={styles.guideTitle}>{g.title}</span>
                  <span className={styles.guideDesc}>{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
