import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import catalog from '@/lib/data/mattress-catalog.json';
import { NAV_MENU, navLinks, FOOTER_GROUPS, POPULAR_SEARCHES, SLEEP_POSITIONS, QUIZ_QUESTION_COUNT, QUIZ_PROMISE } from '@/lib/site';
import { QUESTION_STEPS } from '@/components/match/quizModel';
import { CATEGORY_SLUGS } from '@/lib/categoryPages';
import { GUIDES } from '@/lib/content/guides';
import * as compareTopics from '@/lib/compareTopics';
import { slugify } from '@/lib/searchIndex';

const APP = path.resolve(import.meta.dirname, '..', 'app');

/** Slugs a dynamic segment accepts, keyed by "<parent route>/[param]". */
const REGISTRY: Record<string, Set<string>> = {
  'mattresses/*': new Set(CATEGORY_SLUGS),
  'mattress/*': new Set(catalog.map((e) => e.id)),
  'guides/*': new Set(GUIDES.map((g) => g.slug)),
  'sleep-position/*': new Set(SLEEP_POSITIONS.map((p) => p.slug)),
  'compare/*': new Set([
    ...(compareTopics.COMPARE_TOPIC_SLUGS || []),
    ...(Array.isArray(compareTopics.COMPARE_PAIRS) ? compareTopics.COMPARE_PAIRS.map((p) => p.slug) : []),
  ]),
  'brands/*': new Set(catalog.map((e) => slugify(e.brand))),
};

/**
 * Routes the page builders create in the Build phase (listed in the system
 * contract). Until they exist the test reports them instead of failing;
 * set NAV_ROUTES_STRICT=1 (integration gate) to require them.
 */
const PENDING = new Set(['/mattress', '/sleep-position', ...CATEGORY_SLUGS.map((s) => `/mattresses/${s}`)]);
const STRICT = process.env.NAV_ROUTES_STRICT === '1';

function hasPage(dir: string): boolean {
  return ['page.js', 'page.jsx', 'page.ts', 'page.tsx'].some((f) => fs.existsSync(path.join(dir, f)));
}

/** true when the pathname resolves to a page under app/. */
export function routeExists(href: string): boolean {
  const pathname = (href.split('#')[0] as string).split('?')[0] as string;
  const segments = pathname.split('/').filter(Boolean);
  let dir = APP;
  let parent = '';
  for (const seg of segments) {
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
    const groups = entries.filter((d) => /^\(.+\)$/.test(d.name)); // (route groups) are transparent
    const searchDirs = [dir, ...groups.map((g) => path.join(dir, g.name))];
    let next: string | null = null;
    for (const base of searchDirs) {
      if (fs.existsSync(path.join(base, seg))) { next = path.join(base, seg); break; }
    }
    if (!next) {
      for (const base of searchDirs) {
        const dyn = fs.readdirSync(base, { withFileTypes: true }).find((d) => d.isDirectory() && /^\[[^.].*\]$/.test(d.name));
        if (dyn) {
          const reg = REGISTRY[`${parent}/*`.replace(/^\//, '')];
          if (reg && !reg.has(seg)) return false;
          next = path.join(base, dyn.name);
          break;
        }
      }
    }
    if (!next) return false;
    dir = next;
    parent = parent ? `${parent}/${seg}` : seg;
  }
  return hasPage(dir);
}

const allHrefs = [
  ...navLinks(NAV_MENU).map((l) => l.href),
  ...FOOTER_GROUPS.flatMap((g) => g.links.map((l) => l.href)),
  ...POPULAR_SEARCHES.map((p) => p.href),
];

describe('navigation model', () => {
  it('has the four brief v3 menus and no account entries', () => {
    expect(NAV_MENU.map((m) => m.label)).toEqual(['Mattresses', 'Compare', 'Guides', 'Methodology']);
    const labels = navLinks().map((l) => l.label.toLowerCase()).join(' ');
    expect(labels).not.toMatch(/log ?in|sign ?up|account|my saved/);
  });

  it('every nav, footer and popular-search href resolves to a real route', () => {
    const missing = [...new Set(allHrefs)].filter((href) => !routeExists(href));
    const unexpected = missing.filter((href) => STRICT || !PENDING.has((href.split('#')[0] as string).split('?')[0] as string));
    if (missing.length && !STRICT) console.info('[nav] routes pending page builders:', missing.join(', '));
    expect(unexpected).toEqual([]);
  });

  it('every group has links and every link has a label', () => {
    for (const m of NAV_MENU) {
      expect(m.groups.length).toBeGreaterThan(0);
      for (const g of m.groups) for (const l of g.links) expect(l.label && l.href.startsWith('/')).toBeTruthy();
    }
  });
});

describe('quiz copy', () => {
  it('QUIZ_QUESTION_COUNT matches the quiz question steps', () => {
    expect(QUIZ_QUESTION_COUNT).toBe(QUESTION_STEPS.length);
    expect(QUIZ_PROMISE).toBe('Five questions, a ranked shortlist');
  });
});
