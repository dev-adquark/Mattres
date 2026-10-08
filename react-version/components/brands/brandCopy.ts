import type { MattressType, SleepPosition } from '@/lib/types';

/**
 * Dependency-free wording tables for the brand pages, safe to import from
 * client components (brandData pulls in server-side catalog helpers).
 */

export const POSITION_LABELS: Record<SleepPosition, string> = {
  side: 'side',
  back: 'back',
  stomach: 'stomach',
  combination: 'combination',
};

/** Column headings for the reference score matrix. */
export const POSITION_SHORT: Record<SleepPosition, string> = {
  side: 'Side',
  back: 'Back',
  stomach: 'Stomach',
  combination: 'Combo',
};

/** Construction type as a word inside a sentence ("a typical all-foam construction"). */
export const TYPE_WORD: Record<MattressType, string> = {
  hybrid: 'hybrid',
  foam: 'all-foam',
  latex: 'latex',
  innerspring: 'innerspring',
};

const lookup = (map: Partial<Record<string, string>>, key: string): string | undefined => map[key];

/** "side", "combination" ...; falls back to the raw position id. */
export const positionLabel = (position: string): string => lookup(POSITION_LABELS, position) || position;

/** "Side", "Combo" ...; falls back to the raw position id. */
export const positionShort = (position: string): string => lookup(POSITION_SHORT, position) || position;

/** "all-foam", "hybrid" ...; falls back to the raw type. */
export const typeWord = (type: string): string => lookup(TYPE_WORD, type) || type;
