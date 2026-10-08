/** Display helpers shared by the /methodology sections. Pure, server- and client-safe. */
import type { FirmnessLabel, MattressType, ScoreCategory } from '@/lib/types';
import { DIMENSIONS } from '@/lib/explain';

/** A 0-1 share as a whole percentage. */
export const pct = (w: number): string => `${Math.round(w * 100)}%`;

/** One decimal unless whole; an em dash for a missing value. */
export const fmt1 = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : '—';

/** Two-digit chapter / row number. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const DIM_LABEL = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.label])) as Record<ScoreCategory, string>;

export const TYPE_LABEL: Record<MattressType, string> = { hybrid: 'Hybrid', foam: 'All-foam', innerspring: 'Innerspring', latex: 'Latex' };

export const FIRMNESS_LABEL: Record<FirmnessLabel, string> = {
  soft: 'Soft',
  'medium-soft': 'Medium-soft',
  medium: 'Medium',
  'medium-firm': 'Medium-firm',
  firm: 'Firm',
  'extra-firm': 'Extra-firm',
};

/** Label for a firmness key from the rules file (falls back to the key itself). */
export function firmnessLabel(key: string): string {
  return (FIRMNESS_LABEL as Partial<Record<string, string>>)[key] || key;
}

/** Long US date for an ISO date or timestamp; the raw value if it does not parse. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** "Support ×1.2, Pressure relief ×0.8" from a weight rule's multipliers. */
export function multiplierText(multiply: Partial<Record<ScoreCategory, number>>, separator = ', '): string {
  return Object.entries(multiply)
    .map(([dim, factor]) => `${DIM_LABEL[dim as ScoreCategory] || dim} ×${factor}`)
    .join(separator);
}
