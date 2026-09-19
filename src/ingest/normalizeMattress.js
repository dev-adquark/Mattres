'use strict';

/**
 * Normalizes one raw mattress record into the canonical catalog shape
 * described in data/schema/mattress.schema.json.
 *
 * Deliberately rule-based and deterministic: every fallback is explicit and
 * recorded in `dataQualityNotes`, and `sourceConfidence` is derived from how
 * many of those fallbacks were needed (no ML, no guessing silently).
 */

const FIRMNESS_LABEL_RANGES = {
  plush: [1, 3],
  soft: [1, 3],
  'medium-soft': [3, 5],
  medium: [4, 6],
  'medium-firm': [6, 7.5],
  firm: [7.5, 9],
  'extra-firm': [9, 10],
};

function slugify(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Normalizes a free-text mattress category into the 3 canonical types. */
function normalizeType(category, notes) {
  const c = (category || '').toLowerCase();
  if (c.includes('innerspring') || c.includes('in-spring')) return 'innerspring';
  if (c.includes('hybrid')) return 'hybrid';
  if (c.includes('foam')) return 'foam';
  notes.push(`Unrecognized category "${category}"; type could not be determined.`);
  return null;
}

/** Extracts a coreMaterialNotes hint for material detail lost by the 3-way type bucket. */
function extractMaterialNotes(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('latex')) return 'Includes a latex layer.';
  if (c.includes('gel')) return 'Gel-infused foam.';
  if (c.includes('pocket coil') || c.includes('pocket spring')) return 'Pocket coil support core.';
  return null;
}

/** Parses a height value that may be a number, "12in", "12.5 in", or "30cm". */
function normalizeHeight(raw, notes) {
  if (typeof raw === 'number') return { inches: raw, raw: String(raw) };

  const str = String(raw).trim();
  const cmMatch = str.match(/([\d.]+)\s*cm/i);
  if (cmMatch) {
    const cm = parseFloat(cmMatch[1]);
    const inches = Math.round((cm / 2.54) * 10) / 10;
    notes.push(`Height given in cm ("${str}"); converted to ${inches}in.`);
    return { inches, raw: str };
  }

  const inMatch = str.match(/([\d.]+)\s*in/i) || str.match(/^([\d.]+)$/);
  if (inMatch) {
    return { inches: parseFloat(inMatch[1]), raw: str };
  }

  notes.push(`Could not parse height "${str}"; defaulting to 0.`);
  return { inches: 0, raw: str };
}

/** Parses a trial period expressed as a number or a "N nights"/"N-night trial" string. */
function normalizeTrialDays(raw, notes) {
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  notes.push(`Could not parse trial period "${raw}"; defaulting to 0.`);
  return 0;
}

/** Parses a warranty expressed as "N years" or "Lifetime". */
function normalizeWarranty(raw, notes) {
  const str = String(raw).trim().toLowerCase();
  if (str === 'lifetime') return { warrantyYears: null, warrantyLifetime: true };
  const match = str.match(/(\d+)/);
  if (match) return { warrantyYears: parseInt(match[1], 10), warrantyLifetime: false };
  notes.push(`Could not parse warranty "${raw}".`);
  return { warrantyYears: null, warrantyLifetime: false };
}

/** Parses a firmness value: an explicit "(x/10)" score, a known label, or null. */
function normalizeFirmness(raw, notes) {
  if (raw === null || raw === undefined) {
    notes.push('No firmness value supplied.');
    return null;
  }
  const str = String(raw).trim();

  const explicitMatch = str.match(/\(([\d.]+)\s*\/\s*10\)/);
  if (explicitMatch) {
    const center = parseFloat(explicitMatch[1]);
    return { min: Math.max(0, center - 0.75), max: Math.min(10, center + 0.75) };
  }

  const label = str.replace(/\s*\([^)]*\)/, '').trim().toLowerCase();
  if (FIRMNESS_LABEL_RANGES[label]) {
    const [min, max] = FIRMNESS_LABEL_RANGES[label];
    return { min, max };
  }

  notes.push(`Could not parse firmness "${raw}".`);
  return null;
}

function normalizeRetailPartners(raw) {
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Derives an overall confidence tier from how many fields needed a fallback. */
function deriveSourceConfidence(fallbackCount) {
  if (fallbackCount === 0) return 'high';
  if (fallbackCount === 1) return 'medium';
  return 'low';
}

/**
 * @param {object} raw one entry from data/raw/mattresses-raw.json
 * @returns {object} a normalized catalog entry matching mattress.schema.json
 */
function normalizeMattress(raw) {
  const notes = [];
  let fallbackCount = 0;

  const type = normalizeType(raw.category, notes);
  if (type === null) fallbackCount += 1;

  const height = normalizeHeight(raw.height_inches, notes);
  const trialDays = normalizeTrialDays(raw.trial_period, notes);
  const warranty = normalizeWarranty(raw.warranty, notes);
  const firmnessRange = normalizeFirmness(raw.firmness, notes);
  if (firmnessRange === null) fallbackCount += 1;

  return {
    id: slugify(raw.brand_name, raw.model_name),
    brand: raw.brand_name,
    model: raw.model_name,
    type: type || 'foam', // safe default so downstream consumers never see null; the note above records the fallback
    coreMaterialNotes: extractMaterialNotes(raw.category),
    retailPartners: normalizeRetailPartners(raw.retailers),
    height,
    trialDays,
    warrantyYears: warranty.warrantyYears,
    warrantyLifetime: warranty.warrantyLifetime,
    firmnessRange,
    sourceConfidence: deriveSourceConfidence(fallbackCount),
    dataQualityNotes: notes,
  };
}

module.exports = { normalizeMattress, normalizeType, normalizeFirmness };
