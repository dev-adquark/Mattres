import Link from 'next/link';
import { firmnessFor } from '@/lib/firmness';
import type { MattressEntry, OutboundCta } from '@/lib/types';
import { Section } from '@/components/ui/Section';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MattressRender } from '@/components/ui/MattressRender';
import { DataValue } from '@/components/ui/DataValue';
import { Badge } from '@/components/ui/Badge';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { CommerceCta } from './CommerceCta';
import { HeroScore } from './HeroScore';
import { QUEEN_PRICE_QUALIFIER, queenPriceOf } from '@/lib/commerce';
import { brandHref, firmnessText, formatRating, formatUsd, positioningFor, typeLabel, warrantyText } from './productData';
import { buildWord, isLongTitle, productPath } from './productPageModel';
import type { Standout } from './productDisplay';
import styles from './ProductPage.module.css';

interface ProductHeroProps {
  entry: MattressEntry;
  name: string;
  cta: OutboundCta;
  /** scoreLineFor(rows): engine sentence appended to the positioning line. */
  scoreLine: string | null;
  standouts: readonly Standout[];
}

/**
 * The Queen price as on file, with its qualifier when its currency is
 * unconfirmed, or the missing-data marker (also for a figure withheld
 * pending a re-check, lib/commerce). A lowest-size
 * "from" price is never shown under this label (see the spec block).
 */
function QueenPrice({ entry }: { entry: MattressEntry }) {
  const price = queenPriceOf(entry);
  if (!price) return <DataValue value={null} />;
  const qualifier = QUEEN_PRICE_QUALIFIER[price.status];
  return (
    <>
      {formatUsd(price.amount)}
      {qualifier ? <span className={styles.factQualifier}>{qualifier}</span> : null}
    </>
  );
}

/** Chapter 1 of the product story: the illustrated build, name, CTA, Match Score and key facts. */
export function ProductHero({ entry, name, cta, scoreLine, standouts }: ProductHeroProps) {
  const path = productPath(entry);
  const firm = firmnessFor(entry);
  const type = typeLabel(entry);

  return (
    <Section mood="cinematic" navTheme="dark" width="full" className={styles.hero} aria-labelledby="product-title">
      <div className={`container container--wide ${styles.heroGrid}`}>
        <Breadcrumbs
          className={styles.crumbs}
          items={[
            { label: 'Mattresses', href: '/mattresses' },
            { label: entry.brand, href: brandHref(entry.brand) },
            { label: name, href: path },
          ]}
        />

        <div className={styles.heroVisual} data-photo={entry.photo ? 'true' : undefined}>
          <div className={styles.stage}>
            <MattressRender type={entry.type} seed={entry.id} aspect={entry.photo ? 'product' : 'cutaway'} fill objectPosition={entry.photo ? '50% 60%' : '46% 58%'} preload photo={entry.photo} sizes="(min-width: 1024px) 62vw, 100vw" />
          </div>
          {entry.photo ? null : <span className={`illus-tag ${styles.stageTag}`}>Illustration · typical {buildWord(entry)} build</span>}
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.kicker}>
            <Link href={brandHref(entry.brand)} className={styles.brandLink}>
              {entry.brand}
            </Link>
            <span aria-hidden="true" className={styles.kickerRule} />
            <span>{type}</span>
          </p>
          <h1 id="product-title" className={`${styles.title} ${isLongTitle(name) ? styles.titleLong : ''}`}>
            {name}
          </h1>
          <p className={styles.positioning}>
            {positioningFor(entry)}
            {scoreLine ? <> {scoreLine}</> : null}
          </p>
          {standouts.length ? (
            <ul className={styles.standouts} aria-label="Independent ratings of 8/10 or more">
              {standouts.map((s) => (
                <li key={s.id}>
                  <strong>{formatRating(s.value)}</strong> {s.label.toLowerCase()}
                </li>
              ))}
            </ul>
          ) : null}

          {entry.sponsored ? (
            <p className={styles.sponsored}>
              <Badge tone="warning">Sponsored</Badge>
              <span>{entry.disclosureText || 'This placement is paid. It does not change any Match Score or ranking.'}</span>
            </p>
          ) : null}

          <div className={styles.heroActions}>
            <CommerceCta cta={cta} mattressId={entry.id} brand={entry.brand} placement="hero" page={path} />
            <CompareToggle id={entry.id} name={name} source="product" labelOff="Add to compare" collapse={false} />
          </div>
        </div>

        <div className={styles.heroScore}>
          <HeroScore />
        </div>

        <dl className={styles.heroFacts}>
          <div>
            <dt>Firmness</dt>
            <dd>
              {firm ? (
                <>
                  {firm.label} <span className={styles.factUnit}>{firmnessText(entry)}</span>
                </>
              ) : (
                <DataValue value={null} />
              )}
            </dd>
          </div>
          <div>
            <dt>Queen price</dt>
            <dd>
              <QueenPrice entry={entry} />
            </dd>
          </div>
          <div>
            <dt>Trial</dt>
            <dd>
              <DataValue value={entry.trialDays} suffix=" nights" />
            </dd>
          </div>
          <div>
            <dt>Warranty</dt>
            <dd>
              <DataValue value={warrantyText(entry)} />
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}
