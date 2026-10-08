import type { CSSProperties } from 'react';
import { Section } from '@/components/ui/Section';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import type { MattressEntry } from '@/lib/types';
import { BrandFeature } from './BrandFeature';
import { BrandFindIn } from './BrandFindIn';
import { BrandLineup } from './BrandLineup';
import { ConstructionBar } from './ConstructionBar';
import type { BrandCategoryLink, TypeMixItem } from './brandData';
import styles from './Brands.module.css';

interface BrandHeroProps {
  name: string;
  path: string;
  sentence: string;
  mix: readonly TypeMixItem[];
  /** Lineup in engine reference order, best first. */
  ordered: readonly MattressEntry[];
  /** Compare link for the top of the lineup (multi-model brands only). */
  compareHref: string | null;
  /** Category pages the brand's models are listed on. */
  categories: readonly BrandCategoryLink[];
}

/** 1 - Wordmark, one sentence, then the lineup itself (or the single model). */
export function BrandHero({ name, path, sentence, mix, ordered, compareHref, categories }: BrandHeroProps) {
  const lead = ordered[0];
  const single = ordered.length === 1;
  // Runtime: the wordmark's font size scales with the name length (see .markRow / .mega).
  const megaVars = { '--mega-len': Math.max(name.length, 6) } as CSSProperties;
  return (
    <Section mood="editorial" className={styles.brandHero} aria-labelledby="brand-title" containerClassName={styles.brandHeroContainer}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Brands', href: '/brands' },
          { label: name, href: path },
        ]}
      />
      <div className={styles.markRow} style={megaVars} data-split={name.length <= 8 || undefined}>
        <p className={styles.markEyebrow}>
          <span className="eyebrow">Brand</span>
          <ConstructionBar mix={mix} className={styles.markMix} />
        </p>
        <h1 id="brand-title" className={styles.mega}>
          {name}
        </h1>
        <div className={styles.markFoot}>
          <p className={styles.markLead}>{sentence}</p>
          <div className={styles.markActions}>
            {compareHref ? (
              <Button href={compareHref} variant="secondary" size="md" className={styles.markSecondary}>
                Compare {Math.min(3, ordered.length) === ordered.length ? 'the lineup' : 'the top 3'}
              </Button>
            ) : null}
            <Button href="/find-match" arrow>
              Score {single ? 'it' : 'them'} for me
            </Button>
          </div>
        </div>
      </div>
      <BrandFindIn name={name} single={single} categories={categories} />

      {single && lead ? (
        <BrandFeature entry={lead} />
      ) : (
        <div className={styles.lineup}>
          <BrandLineup
            name={name}
            entries={ordered}
            header={
              <p className={styles.lineupHead}>
                <span className={styles.lineupCount}>The lineup</span>
                <span className={styles.lineupNote}>Ordered by engine score for a reference combination sleeper</span>
              </p>
            }
          />
        </div>
      )}
    </Section>
  );
}
