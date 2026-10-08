/**
 * Types for the editorial area (sleep guides, sleep-position pages, FAQ).
 * Domain types shared across the app (Guide, SleepProfile, MattressEntry...)
 * live in lib/types.ts; these are the shapes only editorial code uses.
 *
 * Types only: importing this module has no runtime cost.
 */

import type { ReactNode } from 'react';
import type rulesJson from '@/lib/rules/0.2.json';
import type { Guide, MattressEntry, ScoreCategory, SleepPosition, SleepProfile } from '@/lib/types';

/** The published scoring rules (lib/rules/0.2.json) exactly as imported. */
export type ScoringRules = typeof rulesJson;

/** Keys of ScoringRules.weightBands (also the keys of each firmnessComfortBands entry). */
export type WeightBandKey = 'under-130' | '130-180' | '180-230' | 'over-230';

/** One question and its plain-text answer (shown on the page and in FAQPage JSON-LD verbatim). */
export interface FaqItem {
  q: string;
  a: string;
}

/** An external source cited by an editorial page. */
export interface SourceLink {
  label: string;
  href: string;
}

/** A plain internal link. */
export interface LinkItem {
  href: string;
  label: string;
}

/** One "what matters" item on a sleep-position page. */
export interface PositionMatter {
  dimension: ScoreCategory;
  title: string;
  text: string;
}

/** Editorial copy for /sleep-position/[position] (lib/content/positions.ts). */
export interface PositionContent {
  slug: SleepPosition;
  label: string;
  noun: string;
  title: string;
  /** [before, emphasised word, after] */
  headline: [string, string, string];
  description: string;
  lead: string;
  profileKey: string;
  sources: SourceLink[];
  meaning: string[];
  matters: PositionMatter[];
  firmness: string[];
  faqs: FaqItem[];
}

/** A representative profile used to rank related mattresses (lib/content/profiles.ts). */
export interface RepresentativeProfile {
  profile: SleepProfile;
}

/** Hand-curated link targets for one guide or position (lib/content/links.ts). */
export interface LinkSpec {
  guides?: string[];
  positions?: SleepPosition[];
  compare?: string[];
}

export interface PositionLink {
  slug: SleepPosition;
  label: string;
  href: string;
}

export interface ComparisonLink {
  slug: string;
  title: string;
  href: string;
}

/** Resolved related destinations for a guide or position page. */
export interface RelatedDestinations {
  guides: Guide[];
  positions: PositionLink[];
  comparisons: ComparisonLink[];
}

/** Context every article section renders with. */
export interface ArticleContext {
  rules: ScoringRules;
  catalog: MattressEntry[];
}

export interface ArticleSection {
  id: string;
  title: string;
  render: (ctx: ArticleContext) => ReactNode;
}

/** One article module in components/content/articles. */
export interface ArticleModule {
  takeaways: string[];
  sections: ArticleSection[];
  faqs?: FaqItem[];
  sources?: SourceLink[];
  ranking?: { title: string; intro?: string };
  cta?: { title: string; body?: string };
}

/** A row of the comfort-window chart (RangeChart / BandsDiagram). */
export interface RangeRow {
  key: string;
  label: string;
  sub?: string;
  min: number;
  max: number;
  highlight?: boolean;
}

/** Item accepted by collectionJsonLd (a guide, or any titled link). */
export interface CollectionItem {
  path?: string;
  href?: string;
  title?: string;
  label?: string;
}

/** Heading elements editorial blocks can render their titles as. */
export type HeadingLevel = 'h2' | 'h3' | 'h4';
