import { firmnessFor, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { slimEntry, hasQueenPrice } from '@/components/product/productData';
import { categoryTagsFor } from '@/lib/categoryPages';
import type { CatalogRatingKey } from '@/lib/categories';
import type { MattressEntry, MattressType, VerificationLevel } from '@/lib/types';
import type { Colourway, StillAspect } from '@/components/ui/render-stills/stills';

/**
 * Pure, client-safe helpers for the catalog listing and the category pages.
 * Everything is derived from fields the catalog really carries.
 */

export type MaterialTagId = 'memory-foam' | 'latex' | 'grid' | 'coils' | 'wool';

/**
 * The slim entry the client listing receives (catalogSlim): the shared slim
 * fields from components/product/productData plus durability and material tags.
 */
export interface CatalogListEntry
  extends Pick<
    MattressEntry,
    | 'id'
    | 'brand'
    | 'model'
    | 'type'
    | 'firmnessRange'
    | 'heightIn'
    | 'priceUsd'
    | 'trialDays'
    | 'warrantyYears'
    | 'warrantyLifetime'
    | 'coolingRatingOutOf10'
    | 'motionIsolationRatingOutOf10'
    | 'edgeSupportRatingOutOf10'
    | 'durabilityRatingOutOf10'
    | 'sponsored'
    | 'photo'
  > {
  priceFromUsd: number | null;
  /** Price status inputs (lib/commerce queenPriceOf), from slimEntry. */
  priceCurrency: string | null;
  priceNeedsReverification: boolean;
  sourceUrl: string | null;
  lastVerified: string | null;
  /** Verification bookkeeping getVerificationLevel() reads, from slimEntry. */
  verificationStatus?: string;
  verifiedFields?: string[];
  materials: MaterialTagId[];
  /** Category slugs this entry belongs to (lib/categoryPages categoryTagsFor), for the text search. */
  tags: string[];
}

/**
 * The fields the listing helpers read. Both a full MattressEntry and a
 * CatalogListEntry satisfy it, so the same helpers serve the server-rendered
 * category pages and the client explorer.
 */
export type ListingEntry = Pick<
  MattressEntry,
  | 'id'
  | 'brand'
  | 'model'
  | 'type'
  | 'firmnessRange'
  | 'priceUsd'
  | 'trialDays'
  | 'coolingRatingOutOf10'
  | 'motionIsolationRatingOutOf10'
  | 'edgeSupportRatingOutOf10'
  | 'durabilityRatingOutOf10'
  | 'sponsored'
  | 'photo'
> & {
  materials?: readonly MaterialTagId[];
  tags?: readonly string[];
  coreMaterialNotes?: string | null;
};

type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

export interface CatalogRatingField {
  field: RatingField;
  label: string;
  noun: string;
}

/**
 * Third-party ratings the listing can sort and filter by. Extends the shared
 * RATING_FIELDS (cooling, motion, edge) with durability, which 23 entries carry.
 */
export const CATALOG_RATING_FIELDS: Readonly<Record<CatalogRatingKey, CatalogRatingField>> = {
  cooling: { field: 'coolingRatingOutOf10', label: 'Cooling', noun: 'cooling' },
  motion: { field: 'motionIsolationRatingOutOf10', label: 'Motion isolation', noun: 'motion isolation' },
  edge: { field: 'edgeSupportRatingOutOf10', label: 'Edge support', noun: 'edge support' },
  durability: { field: 'durabilityRatingOutOf10', label: 'Durability', noun: 'durability' },
};

export const CATALOG_RATING_KEYS = Object.keys(CATALOG_RATING_FIELDS) as CatalogRatingKey[];

export function isCatalogRatingKey(value: unknown): value is CatalogRatingKey {
  return typeof value === 'string' && (CATALOG_RATING_KEYS as readonly string[]).includes(value);
}

export function catalogRating(entry: Partial<Pick<MattressEntry, RatingField>> | null | undefined, key: CatalogRatingKey): number | null {
  const def = CATALOG_RATING_FIELDS[key];
  const value = entry ? entry[def.field] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface MaterialTag {
  id: MaterialTagId;
  label: string;
  test: RegExp;
}

/**
 * Materials named in the manufacturer's own construction notes
 * (coreMaterialNotes). A keyword match on published text: "the notes list
 * latex", never "this is a latex mattress" beyond what the notes say.
 */
export const MATERIAL_TAGS: readonly MaterialTag[] = [
  { id: 'memory-foam', label: 'Memory foam', test: /memory[\s-]?foam/ },
  { id: 'latex', label: 'Latex', test: /latex/ },
  { id: 'grid', label: 'Polymer grid', test: /gelflex grid|microgrid|\bgrid\b/ },
  // "Coils", not "Pocketed coils": several notes name a coil unit without
  // saying pocketed or wrapped (Saatva Classic's dual-coil innerspring).
  { id: 'coils', label: 'Coils', test: /coil|spring/ },
  { id: 'wool', label: 'Wool', test: /\bwool\b/ },
];

/** "no springs", "without coils", "no steel coils", "no memory foam": a stated absence. */
const NEGATED_MATERIAL = /\b(?:no|without|zero|free of)\s+(?:[a-z-]+\s+)?(?:springs?|coils?|innersprings?|latex|wool|memory[\s-]?foam|grids?)\b/g;

export function materialTagsFor(entry: { coreMaterialNotes?: string | null } | null | undefined): MaterialTagId[] {
  // Drop negated mentions first ("all-latex construction with no springs"),
  // so a stated absence never reads as the material being present.
  const notes = String(entry?.coreMaterialNotes || '')
    .toLowerCase()
    .replace(NEGATED_MATERIAL, ' ');
  if (!notes.trim()) return [];
  return MATERIAL_TAGS.filter((m) => m.test.test(notes)).map((m) => m.id);
}

const MATERIAL_LABEL = Object.fromEntries(MATERIAL_TAGS.map((m) => [m.id, m.label])) as Record<MaterialTagId, string>;

/** "Memory foam · Coils" from the notes, or null when they name none of the tracked materials. */
export function materialLine(entryOrTags: readonly MaterialTagId[] | ListingEntry | null | undefined): string | null {
  const tags: readonly MaterialTagId[] = isTagList(entryOrTags) ? entryOrTags : entryOrTags?.materials || materialTagsFor(entryOrTags);
  if (!tags.length) return null;
  return tags
    .map((t) => MATERIAL_LABEL[t])
    .filter(Boolean)
    .join(' · ');
}

function isTagList(value: unknown): value is readonly MaterialTagId[] {
  return Array.isArray(value);
}

/** Slim entry for the client listing: the shared slim fields plus durability and material tags. */
export function catalogSlim(entry: MattressEntry): CatalogListEntry {
  return {
    ...slimEntry(entry),
    durabilityRatingOutOf10: entry.durabilityRatingOutOf10 ?? null,
    materials: materialTagsFor(entry),
    tags: categoryTagsFor(entry),
  };
}

/** Up to two decimals, so a stored 8.75 reads 8.75 on every surface (the product page shows the stored value). */
const trim = (n: number): string => String(Math.round(n * 100) / 100);

/** Short firmness text for a hairline attribute row: "Medium-firm 7/10" or "Medium–firm 5–8/10". */
export function firmnessShort(entry: Pick<ListingEntry, 'firmnessRange'> | null | undefined): string | null {
  const firm = firmnessFor(entry);
  const r = entry?.firmnessRange;
  if (!firm || !r) return null;
  const range = r.min === r.max ? `${trim(r.min)}/10` : `${trim(r.min)}–${trim(r.max)}/10`;
  return firm.multi ? `${firm.label} · ${range}` : `${firm.label} ${range}`;
}

/** True when a model is sold across several firmness options (range spans 2+ points). */
export function isMultiFirmness(entry: Pick<ListingEntry, 'firmnessRange'> | null | undefined): boolean {
  const r = entry?.firmnessRange;
  return Boolean(r && typeof r.min === 'number' && typeof r.max === 'number' && r.max - r.min >= 2);
}

export interface CardAttribute {
  id: 'type' | 'firmness' | 'trial';
  text: string | null;
  /** What to say instead when the value is not on file; null when it is. */
  missing: string | null;
}

/**
 * The three quiet attributes of a card, in order: type, firmness, trial.
 * Missing values carry a `missing` text so the UI can say so.
 */
export function cardAttributes(entry: Pick<ListingEntry, 'type' | 'firmnessRange' | 'trialDays'>): CardAttribute[] {
  const typeLabels: Partial<Record<MattressType, string>> = MATTRESS_TYPE_LABEL;
  const raw: { id: CardAttribute['id']; text: string | null; missing?: string }[] = [
    { id: 'type', text: typeLabels[entry.type] || entry.type || null, missing: 'Type not yet verified' },
    { id: 'firmness', text: firmnessShort(entry), missing: 'Firmness not yet verified' },
    { id: 'trial', text: typeof entry.trialDays === 'number' ? `${entry.trialDays} nights` : null, missing: 'Trial not yet verified' },
  ];
  return raw.map((a) => ({ id: a.id, text: a.text, missing: a.text ? null : a.missing || 'Not yet verified' }));
}

export { hasQueenPrice };

/** Deterministic small hash (FNV-1a) used to vary image crops per mattress. */
export function idHash(id: unknown): number {
  let h = 2166136261;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface Crop {
  id: 'a' | 'b' | 'c';
  aspect: StillAspect;
  objectPosition: string;
}

/**
 * Image framing per mattress: three crops of the rendered stills so a grid
 * of 37 does not read as 37 identical tiles.
 *   a = the square still, framed whole
 *   b = the 4:3 still, cropped in to the quilted corner
 *   c = the 4:3 still, cropped to the opposite side
 */
export const CROPS: readonly [Crop, Crop, Crop] = [
  { id: 'a', aspect: 'card', objectPosition: '50% 58%' },
  { id: 'b', aspect: 'product', objectPosition: '24% 62%' },
  { id: 'c', aspect: 'product', objectPosition: '78% 60%' },
];

export function cropFor(id: unknown): Crop {
  return CROPS[idHash(id) % CROPS.length] ?? CROPS[0];
}

/**
 * One framing of the construction stills for a listing tile (CatalogCard,
 * CatalogRow). The catalog has no product photography, so every tile is an
 * original render of a typical build for the mattress's TYPE; what changes
 * from tile to tile is the shot:
 *   pack   = three-quarter packshot on linen
 *   layers = the cutaway: the type's typical comfort/support stack
 *   top    = overhead quilting on warm sand
 *   corner = the corner of the slab on indigo dusk, cropped in
 *   detail = an editorial close-up (edge, quilting or bedding corner, by mattress)
 *   low    = the low side profile on night ink
 */
export interface ListingShot {
  id: 'pack' | 'layers' | 'top' | 'corner' | 'detail' | 'low';
  aspect: Extract<StillAspect, 'product' | 'cutaway' | 'detail'>;
  /** Picks the product still's composition (stills.ts STILL_BACKDROP); unused by cutaway/detail. */
  colourway?: Colourway;
  objectPosition: string;
  /** Crop in past the still's edges (the tile's CSS scales the image up). */
  zoom: boolean;
}

/**
 * Six distinct shots. Adjacent tiles take consecutive shots, so in a 1-, 2-
 * or 3-column grid no tile shares its shot with the tile beside it or the
 * tile above it (the cycle is longer than any row), and the two dark
 * backdrops (cutaway, low profile) are never side by side.
 */
export const LISTING_SHOTS: readonly ListingShot[] = [
  { id: 'pack', aspect: 'product', colourway: 'mist', objectPosition: '50% 58%', zoom: false },
  { id: 'layers', aspect: 'cutaway', objectPosition: '46% 62%', zoom: false },
  { id: 'top', aspect: 'product', colourway: 'dusk', objectPosition: '50% 50%', zoom: false },
  { id: 'corner', aspect: 'product', colourway: 'sand', objectPosition: '74% 60%', zoom: true },
  { id: 'detail', aspect: 'detail', objectPosition: '50% 46%', zoom: false },
  { id: 'low', aspect: 'product', colourway: 'linen', objectPosition: '30% 62%', zoom: false },
];

/** The shot for the `slot`-th tile of a grid or list; without a slot, one picked by the mattress id. */
export function listingShot(slot: number | null | undefined, id?: unknown): ListingShot {
  const n = typeof slot === 'number' && Number.isFinite(slot) ? Math.abs(Math.trunc(slot)) : idHash(id);
  return LISTING_SHOTS[n % LISTING_SHOTS.length] ?? (LISTING_SHOTS[0] as ListingShot);
}

/**
 * Catalog card/row status labels. Same four levels as VERIFICATION_DISPLAY
 * (components/ui/Badge), but each names its subject - the specs - because a
 * bare "Data unavailable" under a price reads as if the whole card were empty.
 */
export const LISTING_STATUS_LABEL: Record<VerificationLevel, string> = {
  verified: 'Specs verified',
  partially_verified: 'Specs source-checked',
  unverified: 'Specs need verification',
  unknown: 'Some specs unavailable',
};
