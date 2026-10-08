/**
 * Text normalisation helpers shared by the RTINGS pipeline's validation and
 * matching (lib/rtings/validate.ts, lib/rtings/match.ts). Matching itself lives
 * in lib/rtings/match.ts; nothing here decides identity.
 *
 * The catalog's own "model" field is inconsistent about whether it includes the
 * brand name (Bear's is "Elite Hybrid", Purple's is "The Purple Mattress"), so
 * comparisons reduce both sides to a token set with the brand and generic
 * filler words ("the", "mattress") removed.
 */

const FILLER_WORDS = new Set(['the', 'mattress']);

export function normalizeText(text: string | null | undefined): string[] {
  return (text || '')
    .toLowerCase()
    // "&" and "and" are the same word in a brand name (this catalog
    // stores "Tuft & Needle"; RTINGS's own data spells it "Tuft and
    // Needle" - confirmed via a real sync run that this exact mismatch
    // caused a genuine match to be missed entirely at the brand-filter
    // stage, before model-token comparison even ran). Normalizing "&" to
    // "and" up front means both spellings produce the same token set.
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function tokensWithoutBrandAndFiller(text: string | null | undefined, brand: string | null | undefined): Set<string> {
  const brandTokens = new Set(normalizeText(brand));
  return new Set(normalizeText(text).filter((t) => !brandTokens.has(t) && !FILLER_WORDS.has(t)));
}
