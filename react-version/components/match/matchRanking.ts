import type { WireMatchItem } from '@/lib/matchPayload';

/** A scored result plus its engine rank (1-based position by Match Score). */
export interface RankedItem {
  item: WireMatchItem;
  rank: number;
}

/**
 * True for a paid placement. The engine's badge (lib/matchLogic badgeFor)
 * and the catalog flag are both honoured, so a sponsored entry is labeled
 * even if only one of them says so.
 */
export function isSponsored(item: Pick<WireMatchItem, 'entry' | 'badge'> | null | undefined): boolean {
  if (!item) return false;
  return !!(item.entry && item.entry.sponsored) || (!!item.badge && item.badge.className === 'badge-sponsored');
}

/**
 * The match recommendation: the highest-scoring NON-sponsored result (the
 * engine's isTopMatch rule). Sponsorship never earns the "Your top match"
 * slot. If every result is sponsored there is no recommendation (null).
 */
export function pickTopMatch(results: readonly WireMatchItem[] | null | undefined): RankedItem | null {
  if (!Array.isArray(results)) return null;
  const index = results.findIndex((r) => r && !isSponsored(r));
  return index === -1 ? null : { item: results[index], rank: index + 1 };
}

/** Every result except `exclude`, in engine order, each with its engine rank. */
export function rankedExcept(results: readonly WireMatchItem[], exclude: WireMatchItem | null | undefined): RankedItem[] {
  const out: RankedItem[] = [];
  results.forEach((item, i) => {
    if (item !== exclude) out.push({ item, rank: i + 1 });
  });
  return out;
}
