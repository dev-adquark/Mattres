import { describe, expect, it } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { buildRowGroups, compareVerdict, salePriceNote } from './compareModel';
import type { CompareColumn } from './types';

const catalog = catalogJson as MattressEntry[];
const col = (id: string): CompareColumn => {
  const entry = catalog.find((e) => e.id === id);
  if (!entry) throw new Error(`missing ${id}`);
  return { id, entry, item: null };
};

describe('compare verdict without a sleep profile', () => {
  it('names every unique leader the table marks on the independent ratings', () => {
    const columns = ['casper-dream', 'purple-plus', 'helix-midnight'].map(col);
    const verdict = compareVerdict(columns);
    expect(verdict.kind).toBe('no-profile');
    const ratings = buildRowGroups(columns).find((g) => g.id === 'ratings');
    expect(ratings).toBeTruthy();
    for (const row of ratings?.rows || []) {
      if (row.leaders.length !== 1) continue; // shared leads are not "pulls ahead"
      const leader = verdict.differences[row.leaders[0] as number];
      expect(leader?.leads.some((l) => l.id === row.id)).toBe(true);
    }
    // And never a lead the table does not show.
    for (const [i, d] of verdict.differences.entries()) {
      for (const lead of d.leads.filter((l) => l.id.startsWith('r-'))) {
        expect(ratings?.rows.find((r) => r.id === lead.id)?.leaders).toEqual([i]);
      }
    }
  });
});

describe('salePriceNote', () => {
  it('surfaces only the sale/promo kind and the regular or list figure the note quotes', () => {
    expect(salePriceNote('Queen, sale price ($2,229 regular). Per-size breakdown not exposed.')).toBe('Sale price · $2,229 regular');
    expect(salePriceNote('Queen, promo price (code LDW25; list $1,865.33). Full table not captured.')).toBe('Promo price · $1,865.33 list');
    expect(salePriceNote('Queen, Firm option, sale price ($775 list).')).toBe('Sale price · $775 list');
    expect(salePriceNote('Queen only; other sizes not captured.')).toBeNull();
    expect(salePriceNote(undefined)).toBeNull();
  });
});

describe('firmness row', () => {
  it('a model sold in several firmness options is never labelled with one midpoint word', () => {
    const columns = ['silk-and-snow-mattress', 'tuft-and-needle-mint-ii'].map(col);
    const row = buildRowGroups(columns)
      .find((g) => g.id === 'build')
      ?.rows.find((r) => r.id === 'firmness');
    expect(row?.cells.map((c) => c.text)).toEqual(['Several options', 'Medium-firm']);
    expect(row?.same).toBe(false);
  });

  it('counts a different published range as a difference even when the label matches', () => {
    const columns = ['leesa-original-hybrid', 'leesa-original'].map(col);
    const row = buildRowGroups(columns)
      .find((g) => g.id === 'build')
      ?.rows.find((r) => r.id === 'firmness');
    expect(row).toBeTruthy();
    expect(row?.cells.map((c) => c.text)).toEqual(['Medium', 'Medium']);
    expect(row?.same).toBe(false);
  });

  it('still reports the same firmness as the same', () => {
    const columns = ['casper-dream', 'casper-dream'].map(col);
    const row = buildRowGroups(columns)
      .find((g) => g.id === 'build')
      ?.rows.find((r) => r.id === 'firmness');
    expect(row?.same).toBe(true);
  });
});
