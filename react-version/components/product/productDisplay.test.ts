import { describe, expect, it } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import {
  componentName,
  componentsFor,
  mapMaterialsToLayers,
  publicNote,
  scoreLineFor,
  shortDate,
  sourceLabel,
  standoutRatings,
} from './productDisplay';

// JSON imports type string unions as plain strings; lib/types MattressEntry is
// the audited shape of every record in this file.
const catalog = catalogJson as unknown as MattressEntry[];

function byId(id: string): MattressEntry {
  const entry = catalog.find((e) => e.id === id);
  if (!entry) throw new Error(`fixture ${id} missing from catalog`);
  return entry;
}
const PIPELINE = /fetch|caveat|flagged|403|apex|subdomain|mirror|client-side|automated|priceUsd|JS-rendered/i;

describe('sourceLabel', () => {
  it('drops scraper provenance from the display name', () => {
    const s = sourceLabel(byId('helix-plus'));
    if (!s) throw new Error('expected a source label');
    expect(s.name).toBe('Helix Sleep');
    expect(s.kind).toBe('official product page');
    expect(s.date).toBe('25 Sep 2026');
  });
  it('labels a retailer source as such', () => {
    expect(sourceLabel(byId('novaform-comfortgrande-plus'))?.kind).toBe('retailer product page');
  });
  it('returns null without a real source URL', () => {
    expect(sourceLabel({ sourceName: 'X', sourceUrl: 'https://example.com/a' })).toBeNull();
  });
  it('never leaks pipeline vocabulary for any catalog entry', () => {
    for (const e of catalog) {
      const s = sourceLabel(e);
      if (s) expect(s.name).not.toMatch(PIPELINE);
    }
  });
});

describe('publicNote', () => {
  it('keeps reader-facing sentences and drops pipeline ones', () => {
    expect(publicNote(byId('saatva-classic').priceNote).text).toBe('Queen, sale price ($2,229 regular). Per-size/per-firmness breakdown not shown on the brand\'s page.');
  });
  it('drops a whole caveat clause including its lower-case continuation', () => {
    const n = publicNote(byId('bear-elite-hybrid').priceNote);
    expect(n.text).toBeNull();
    expect(n.provisional).toBe(true);
  });
  it('flags figures that are due a re-check', () => {
    const n = publicNote(byId('saatva-rx').priceNote);
    expect(n.provisional).toBe(true);
    expect(n.text).toBe('Queen, sale price ($3,639 regular).');
  });
  it('removes jargon parentheticals but keeps the sentence', () => {
    expect(publicNote(byId('sleep-on-latex-hybrid').priceNote).text).toBe('Not shown on the official page.');
  });
  it('never shows pipeline vocabulary for any catalog note', () => {
    for (const e of catalog) {
      for (const field of ['priceNote', 'heightNote'] as const) {
        const { text } = publicNote(e[field]);
        if (text) expect(text).not.toMatch(PIPELINE);
      }
    }
  });
  it('handles empty input', () => {
    expect(publicNote(null)).toEqual({ text: null, provisional: false });
  });
});

describe('materials -> layers', () => {
  it('splits on semicolons and top-level plus signs only', () => {
    expect(componentsFor({ coreMaterialNotes: 'A (x + y) + B; C' })).toEqual(['A (x + y)', 'B', 'C']);
  });
  it('drops annotations and research notes', () => {
    expect(componentName('manufacturer states "no foams"')).toBeNull();
    expect(componentName('Organic cotton knit face. NOTE: conflicting figures.')).toBe('Organic cotton knit face');
  });
  it('maps a hybrid build by component name', () => {
    const m = mapMaterialsToLayers(componentsFor(byId('helix-plus')), 'hybrid');
    expect(m.cover).toEqual(['Premium cooling cover (TENCEL or GlacioTex)']);
    expect(m.comfort).toEqual(['4-lb Memory Plus Foam comfort layer']);
    expect(m.transition).toContain('Firm Memory Foam transition layer');
    expect(m.support).toEqual(['XL Wrapped Coils', 'DuraDense Foam base']);
  });
  it('puts every published component somewhere, exactly once', () => {
    for (const e of catalog) {
      const list = componentsFor(e);
      const m = mapMaterialsToLayers(list, e.type);
      const placed = [...m.cover, ...m.comfort, ...m.transition, ...m.support];
      expect(new Set(placed)).toEqual(new Set(list));
    }
  });
});

describe('positioning', () => {
  const rows = [
    { id: 'side', score: 72, rank: 22, total: 37 },
    { id: 'back', score: 89, rank: 1, total: 37 },
    { id: 'stomach', score: 90, rank: 1, total: 37 },
  ];
  it('names the best position with its engine score and a notable rank', () => {
    expect(scoreLineFor(rows)).toBe('Scores highest for stomach sleepers: 90/100, 1st of 37 ranked.');
  });
  it('leaves a low rank out of the highlight sentence', () => {
    expect(scoreLineFor([{ id: 'back', score: 72, rank: 33, total: 37 }])).toBe('Scores highest for back sleepers: 72/100.');
  });
  it('returns null when nothing was scored', () => {
    expect(scoreLineFor([{ id: 'side', score: null }])).toBeNull();
  });
  it('lists only independent ratings of 8/10 or more', () => {
    expect(standoutRatings(byId('helix-plus')).map((s) => s.id)).toEqual(['edge', 'durability', 'heat']);
  });
  it('formats dates in UTC', () => {
    expect(shortDate('2026-09-25')).toBe('25 Sep 2026');
    expect(shortDate('nope')).toBeNull();
  });
});
