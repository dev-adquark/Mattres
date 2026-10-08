/**
 * Small, pure text helpers for the match UI. Every value comes from the
 * scoring engine's own output (result.firmnessFit / comfortBand); nothing
 * is written per product.
 */

import type { ScoreResult } from '@/lib/types';

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** One sentence on how the mattress's firmness sits against the sleeper's range and preference. */
export function firmnessFitText(result: Pick<ScoreResult, 'firmnessFit' | 'comfortBand'> | null | undefined): string | null {
  const fit = result && result.firmnessFit;
  const band = result && result.comfortBand;
  if (!fit) return null;
  if (!fit.known || typeof fit.firmness !== 'number') {
    return 'Firmness is not yet verified for this mattress, so its fit is estimated.';
  }
  const range = band && typeof band.min === 'number' ? `${fmt(band.min)}–${fmt(band.max)}/10` : null;
  let text = `About ${fmt(fit.firmness)}/10`;
  if (range && fit.bandDirection === 'in-band') text += `, inside your recommended ${range} range.`;
  else if (range && fit.bandDirection === 'softer') text += `, softer than your recommended ${range} range.`;
  else if (range && fit.bandDirection === 'firmer') text += `, firmer than your recommended ${range} range.`;
  else text += '.';
  if (typeof fit.preferenceDistance === 'number') {
    text += fit.preferenceDistance <= 1
      ? ' Close to the feel you asked for.'
      : ` ${fmt(fit.preferenceDistance)} points from the feel you asked for.`;
  }
  return text;
}
