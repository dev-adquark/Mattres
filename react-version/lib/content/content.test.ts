import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import rules from '@/lib/rules/0.2.json';
import { GUIDES, GUIDE_CATEGORIES, getGuide, guidesInCategory, featuredGuide, newestGuide, guidesForCategoryPage, guideNumber } from './guides';
import { CATEGORY_SLUGS } from '@/lib/categoryPages';
import { getMaterialStill, getRenderStill } from '@/components/ui/render-stills/stills';
import { NAV_MENU } from '@/lib/site';
import { GUIDE_LINKS, POSITION_LINKS, relatedForGuide, relatedForPosition } from './links';
import { POSITIONS, POSITION_SLUGS } from './positions';
import { REPRESENTATIVE_PROFILES, profileChips } from './profiles';
import { compareTopics } from '@/lib/compareTopics';
import { SLEEP_POSITIONS } from '@/lib/site';
import { validateProfile } from '@/lib/profileValidation';
import { matchProfile } from '@/lib/matchLogic';

const ROOT = join(import.meta.dirname, '..', '..');
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('guides registry', () => {
  test('every guide has a unique slug, a matching path and an article module', () => {
    const slugs = new Set<string>();
    for (const g of GUIDES) {
      expect(slugs.has(g.slug)).toBe(false);
      slugs.add(g.slug);
      expect(g.path).toBe(`/guides/${g.slug}`);
      expect(['jsx', 'tsx'].some((ext) => existsSync(join(ROOT, 'components', 'content', 'articles', `${g.slug}.${ext}`)))).toBe(true);
      const indexFile = ['index.ts', 'index.js'].map((f) => join(ROOT, 'components', 'content', 'articles', f)).find((f) => existsSync(f));
      if (!indexFile) throw new Error('components/content/articles has no index module');
      const index = readFileSync(indexFile, 'utf8');
      expect(index).toContain(`'${g.slug}':`);
    }
  });

  test('categories, dates, emphasis and profiles are valid', () => {
    const ids = GUIDE_CATEGORIES.map((c) => c.id);
    for (const g of GUIDES) {
      expect(ids).toContain(g.category);
      for (const c of g.alsoIn || []) expect(ids).toContain(c);
      expect(g.published).toMatch(ISO);
      expect(g.updated).toMatch(ISO);
      expect(g.updated >= g.published).toBe(true);
      if (g.emphasis) expect(g.title).toContain(g.emphasis);
      expect(REPRESENTATIVE_PROFILES[g.profileKey ?? '']).toBeTruthy();
    }
    expect(GUIDES.filter((g) => g.featured)).toHaveLength(1);
    expect(featuredGuide().featured).toBe(true);
    for (const c of GUIDE_CATEGORIES) {
      const hasContent = guidesInCategory(c.id).length > 0 || c.id === 'sleep-position';
      expect(hasContent).toBe(true);
    }
  });
});

describe('editorial pillars', () => {
  test('every hub pillar has at least one guide filed under it (sleep position also has its own pages)', () => {
    for (const id of ['sleep-education', 'firmness', 'pressure-relief', 'cooling', 'couples', 'performance', 'materials', 'types', 'buying']) {
      expect(GUIDES.some((g) => g.category === id), id).toBe(true);
    }
    expect(guidesInCategory('sleep-position').length).toBeGreaterThan(0);
  });

  test('every guide cites at least one https source', async () => {
    const { getArticle } = await import('@/components/content/articles');
    for (const g of GUIDES) {
      const sources = getArticle(g.slug)?.sources ?? [];
      expect(sources.length, g.slug).toBeGreaterThan(0);
      for (const s of sources) expect(s.href.startsWith('https://'), s.href).toBe(true);
    }
  });
});

describe('guide covers and category hand-offs', () => {
  const DIAGRAMS = ['firmness-scale', 'bands-back', 'types', 'pressure', 'heat', 'motion', 'edge', 'cooling-data', 'checklist', 'materials', 'night-temperature'];

  test('every guide has a cover with a known diagram and a real render still', () => {
    for (const g of GUIDES) {
      expect(g.cover, g.slug).toBeTruthy();
      expect(DIAGRAMS).toContain(g.cover.diagram);
      const still = g.cover.still.material
        ? getMaterialStill(g.cover.still.material)
        : getRenderStill({ type: g.cover.still.type, aspect: g.cover.still.aspect });
      expect(still, g.slug).toBeTruthy();
      expect(guideNumber(g.slug)).toBeGreaterThan(0);
    }
  });

  test('categoryPages point at real /mattresses category routes', () => {
    for (const g of GUIDES) {
      expect(g.categoryPages?.length, g.slug).toBeGreaterThan(0);
      for (const slug of g.categoryPages ?? []) expect(CATEGORY_SLUGS).toContain(slug);
    }
  });

  test('every category page gets two related guides', () => {
    for (const slug of CATEGORY_SLUGS) {
      const guides = guidesForCategoryPage(slug);
      expect(guides, slug).toHaveLength(2);
      expect(new Set(guides.map((g) => g.slug)).size).toBe(2);
    }
  });

  test('newest guide is a real guide', () => {
    expect(getGuide(newestGuide().slug)).toBeTruthy();
  });

  test('every /guides#anchor in the navigation is a hub category id', () => {
    const ids = GUIDE_CATEGORIES.map((c) => c.id);
    const anchors = NAV_MENU.flatMap((m) => m.groups.flatMap((g) => g.links))
      .map((l) => l.href)
      .filter((h) => h.startsWith('/guides#'))
      .map((h) => h.slice('/guides#'.length));
    for (const a of anchors) expect(ids).toContain(a);
  });
});

describe('internal link map', () => {
  test('every referenced guide, position and comparison exists', () => {
    const positions = SLEEP_POSITIONS.map((p) => p.slug);
    for (const [slug, links] of Object.entries(GUIDE_LINKS)) {
      expect(getGuide(slug)).toBeTruthy();
      for (const s of links.guides) expect(getGuide(s)).toBeTruthy();
      for (const p of links.positions) expect(positions).toContain(p);
      for (const t of links.compare) expect(Object.hasOwn(compareTopics, t)).toBe(true);
      expect(links.guides).not.toContain(slug);
    }
    for (const [pos, links] of Object.entries(POSITION_LINKS)) {
      expect(positions).toContain(pos);
      for (const s of links.guides) expect(getGuide(s)).toBeTruthy();
      for (const t of links.compare) expect(Object.hasOwn(compareTopics, t)).toBe(true);
    }
  });

  test('resolvers return real entries', () => {
    for (const g of GUIDES) expect(relatedForGuide(g.slug).guides.length).toBeGreaterThan(0);
    for (const p of POSITION_SLUGS) expect(relatedForPosition(p).guides.length).toBeGreaterThan(0);
  });
});

describe('sleep-position content', () => {
  test('covers exactly the site sleep positions', () => {
    expect(POSITION_SLUGS.sort()).toEqual(SLEEP_POSITIONS.map((p) => p.slug).sort());
  });

  test('comfort windows quoted in FAQ copy match the rules file', () => {
    for (const slug of POSITION_SLUGS) {
      const bands = rules.firmnessComfortBands[slug];
      const text = POSITIONS[slug].faqs.map((f) => f.a).join(' ');
      const quoted = [...text.matchAll(/(\d+)–(\d+)\/10/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(quoted.length).toBeGreaterThan(0);
      const valid = Object.values(bands).map(([a, b]) => `${a}-${b}`);
      for (const [a, b] of quoted) expect(valid).toContain(`${a}-${b}`);
    }
  });
});

describe('representative profiles', () => {
  test('are valid engine profiles and produce rankings', async () => {
    for (const [key, { profile }] of Object.entries(REPRESENTATIVE_PROFILES)) {
      expect(validateProfile(profile), key).toBeNull();
      expect(profileChips(profile).length).toBeGreaterThan(2);
      const { results } = await matchProfile(profile);
      expect(results.length, key).toBeGreaterThan(0);
    }
  });
});

describe('position rankings', () => {
  test('every sleep position hands off to a real ranked category page', async () => {
    const { rankingForPosition } = await import('./links');
    for (const p of SLEEP_POSITIONS) {
      const r = rankingForPosition(p.slug);
      expect(r, p.slug).toBeTruthy();
      expect(r?.href.startsWith('/mattresses/')).toBe(true);
    }
  });
});
