/**
 * Registry of published Sleep Guides. One entry per real article module in
 * components/content/articles (rendered by app/guides/[slug]). The search
 * index, guides hub, footer and sitemap read from here, so a guide that
 * isn't listed here is effectively unpublished - and an entry here must
 * have an article behind it (lib/content/content.test.ts enforces both).
 *
 * Base shape (stable API): { slug, title, description, category, path }
 * Extra fields:
 *   emphasis      - substring of the title set in the display italic
 *   dek           - standfirst shown under the H1
 *   alsoIn        - other category ids the hub cross-lists the guide under
 *   published     - ISO date the guide first went live (real)
 *   updated       - ISO date of the last editorial revision (real)
 *   hero          - { kind: 'diagram', name } | { kind: 'render', type } | { kind: 'numeral', value, label }
 *   profileKey    - lib/content/profiles.ts key used to rank related mattresses
 *   featured      - the hub's lead story (exactly one)
 *   cover         - editorial cover art (components/content/GuideCover):
 *                   { diagram, still: { material } | { type, aspect }, focus, zoom }
 *                   diagram = a concept-diagram id (see GuideCover), the still
 *                   is an ORIGINAL render crop; never a photo.
 *   categoryPages - /mattresses/<slug> landing pages (lib/categoryPages.ts) the
 *                   guide's "relevant mattresses" module hands off to, primary first
 */

import type { Guide, GuideCategory } from '@/lib/types';
import { SITE_NAME } from '@/lib/site';

/**
 * Guides are credited to the site itself. There is no documented editorial
 * team or named expert, so the byline must not imply one.
 */
export const EDITORIAL_BYLINE = SITE_NAME;

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'sleep-position',
    label: 'Sleep position',
    description: 'How the way you lie changes the firmness window and what a mattress has to do well.',
  },
  {
    id: 'sleep-education',
    label: 'Sleep education',
    description: 'The sleep science behind the score: body temperature, sleep position and what the research does and does not say.',
  },
  {
    id: 'firmness',
    label: 'Firmness & support',
    description: 'Reading firmness scales, and why body weight moves the answer.',
  },
  {
    id: 'pressure-relief',
    label: 'Pressure relief',
    description: 'Cushioning at the shoulders and hips, and when softer stops helping.',
  },
  {
    id: 'cooling',
    label: 'Cooling',
    description: 'What a mattress can and cannot do about heat, and how to read cooling ratings.',
  },
  {
    id: 'couples',
    label: 'Motion & couples',
    description: 'Sharing a bed: motion isolation, edge space and two sets of preferences.',
  },
  {
    id: 'performance',
    label: 'Support & performance',
    description: 'How a mattress behaves in use: edge support, motion and the independent ratings behind each score.',
  },
  {
    id: 'materials',
    label: 'Materials',
    description: 'Memory foam, polyfoam, latex and coils: what each material does, and how to read a layer list.',
  },
  {
    id: 'types',
    label: 'Mattress types',
    description: 'All-foam, hybrid, innerspring and latex: what is inside each, and the trade-offs.',
  },
  {
    id: 'buying',
    label: 'Buying guides',
    description: 'Trials, warranties, returns and the questions to ask before you pay.',
  },
];

/** Non-empty by construction, so the first guide is always defined. */
export const GUIDES: [Guide, ...Guide[]] = [
  {
    slug: 'how-to-choose-mattress-firmness',
    title: 'How to choose mattress firmness',
    emphasis: 'firmness',
    description:
      'Firmness labels are not standardized. How to read a 1–10 scale, why your weight and position move the right number, and when your own preference should win.',
    dek: 'Brands do not share a firmness standard, so “medium-firm” can mean three different things. Here is how to turn a label into a number that fits your body.',
    category: 'firmness',
    path: '/guides/how-to-choose-mattress-firmness',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'firmness-scale' },
    profileKey: 'combination-170',
    cover: { diagram: 'firmness-scale', still: { material: 'foam' }, focus: '38% 62%', zoom: 1.15 },
    categoryPages: ['firm', 'soft', 'side-sleepers', 'back-sleepers', 'stomach-sleepers', 'best'],
    featured: true,
  },
  {
    slug: 'mattress-types-explained',
    title: 'Mattress types explained: foam, hybrid, innerspring and latex',
    emphasis: 'types',
    description:
      'What is actually inside each mattress type, how each one tends to feel, and the trade-offs the scoring engine assumes when no independent rating exists.',
    dek: 'Four constructions, four sets of trade-offs. A plain-language tour of what sits under the cover, and why the type alone never decides a match.',
    category: 'types',
    alsoIn: ['materials'],
    path: '/guides/mattress-types-explained',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'render', type: 'hybrid' },
    profileKey: 'combination-170',
    cover: { diagram: 'types', still: { type: 'hybrid', aspect: 'cutaway' }, focus: '44% 62%', zoom: 1.9 },
    categoryPages: ['hybrid', 'foam', 'memory-foam', 'latex'],
  },
  {
    slug: 'pressure-relief-for-side-sleepers',
    title: 'Pressure relief for side sleepers',
    emphasis: 'side sleepers',
    description:
      'Why side sleeping concentrates load at the shoulders and hips, how much give you need at your weight, and the point where softer stops helping.',
    dek: 'On your side, a narrow strip of shoulder and hip carries most of your weight. The surface has to let those points sink in without letting your middle fall out of line.',
    category: 'pressure-relief',
    alsoIn: ['sleep-position'],
    path: '/guides/pressure-relief-for-side-sleepers',
    published: '2026-09-25',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'pressure' },
    profileKey: 'side-shoulders-150',
    cover: { diagram: 'pressure', still: { material: 'quilt' }, focus: '52% 42%', zoom: 1.1 },
    categoryPages: ['side-sleepers'],
  },
  {
    slug: 'back-support-for-heavier-sleepers',
    title: 'Back support for heavier back sleepers',
    emphasis: 'heavier',
    description:
      'Why the right firmness rises with body weight, how support and durability differ, and what to check before buying if you weigh 230 lb or more.',
    dek: 'Support is about how level you lie tonight. Durability is about whether that is still true in a few years. At higher body weights you need to check both.',
    category: 'firmness',
    alsoIn: ['sleep-position'],
    path: '/guides/back-support-for-heavier-sleepers',
    published: '2026-09-25',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'bands-back' },
    profileKey: 'heavier-back-250',
    cover: { diagram: 'bands-back', still: { material: 'coils' }, focus: '22% 60%', zoom: 1.2 },
    categoryPages: ['heavier-sleepers', 'back-sleepers', 'stomach-sleepers'],
  },
  {
    slug: 'mattresses-for-hot-sleepers',
    title: 'Mattresses for hot sleepers',
    emphasis: 'hot sleepers',
    description:
      'What a mattress can realistically do about heat, which constructions breathe better, and the parts of the bed that matter as much as the mattress.',
    dek: 'No mattress cools you down on its own. The good ones stop adding to the problem. Here is what helps, what is mostly marketing, and how your answer changes the score.',
    category: 'cooling',
    path: '/guides/mattresses-for-hot-sleepers',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'heat' },
    profileKey: 'hot-side-170',
    cover: { diagram: 'heat', still: { type: 'innerspring', aspect: 'cutaway' }, focus: '42% 64%', zoom: 2.2 },
    categoryPages: ['cooling'],
  },
  {
    slug: 'cooling-mattress-comparison',
    title: 'Cooling mattress comparison: what the ratings show',
    emphasis: 'ratings',
    description:
      'Every independent cooling rating in our catalog, grouped by construction type, and what the gaps in that data mean for your results.',
    dek: 'We grouped every independent cooling rating in the catalog by construction type. The pattern is real, the exceptions matter, and the blanks are part of the story.',
    category: 'cooling',
    path: '/guides/cooling-mattress-comparison',
    published: '2026-09-25',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'cooling-data' },
    profileKey: 'hot-back-190',
    cover: { diagram: 'cooling-data', still: { material: 'coils' }, focus: '82% 55%', zoom: 1.25 },
    categoryPages: ['cooling', 'hybrid'],
  },
  {
    slug: 'motion-isolation-for-couples',
    title: 'Motion isolation for couples',
    emphasis: 'couples',
    description:
      'Why some mattresses carry a partner’s movement across the bed and others absorb it, and how much weight to give it if you are a light sleeper.',
    dek: 'If your partner’s every turn wakes you, motion isolation can matter more than almost anything else. If it doesn’t, it barely matters at all.',
    category: 'couples',
    alsoIn: ['performance'],
    path: '/guides/motion-isolation-for-couples',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'motion' },
    profileKey: 'couple-side-170',
    cover: { diagram: 'motion', still: { material: 'foam' }, focus: '70% 70%', zoom: 1.3 },
    categoryPages: ['couples', 'memory-foam', 'foam'],
  },
  {
    slug: 'edge-support-explained',
    title: 'Edge support explained',
    emphasis: 'Edge',
    description:
      'What edge support is, which constructions tend to have it, and who should care: people who sit on the edge, sleep near it or share a smaller bed.',
    dek: 'The perimeter is where a mattress is weakest. Whether that matters depends on how you use the bed.',
    category: 'performance',
    alsoIn: ['couples'],
    path: '/guides/edge-support-explained',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'diagram', name: 'edge' },
    profileKey: 'edge-back-190',
    cover: { diagram: 'edge', still: { material: 'quilt' }, focus: '80% 70%', zoom: 1.35 },
    categoryPages: ['couples', 'heavier-sleepers'],
  },
  {
    slug: 'mattress-buying-checklist',
    title: 'The mattress buying checklist: trials, warranties and returns',
    emphasis: 'checklist',
    description:
      'Eight things to confirm before you pay: trial length and break-in rules, return costs, warranty sag thresholds, size, height and what the price actually includes.',
    dek: 'The fine print decides what happens if the mattress is wrong. Eight things to confirm on the brand’s own pages before you buy.',
    category: 'buying',
    path: '/guides/mattress-buying-checklist',
    published: '2026-10-06',
    updated: '2026-10-06',
    hero: { kind: 'numeral', value: '8', label: 'checks before you pay' },
    profileKey: 'back-180',
    cover: { diagram: 'checklist', still: { type: 'latex', aspect: 'cutaway' }, focus: '40% 58%', zoom: 1.9 },
    categoryPages: ['best', 'under-1000'],
  },
  {
    slug: 'mattress-materials-explained',
    title: 'Mattress materials explained: memory foam, latex and coils',
    emphasis: 'materials',
    description:
      'What memory foam, polyfoam, latex and pocketed coils each do in a mattress, how they differ in feel, heat and motion, and how to read a brand’s layer list.',
    dek: 'Type names the core. Materials decide the feel. A plain-language guide to the four materials you will find in almost every layer list, and what each one is good and bad at.',
    category: 'materials',
    alsoIn: ['types'],
    path: '/guides/mattress-materials-explained',
    published: '2026-10-08',
    updated: '2026-10-08',
    hero: { kind: 'diagram', name: 'materials' },
    profileKey: 'combination-170',
    cover: { diagram: 'materials', still: { type: 'foam', aspect: 'cutaway' }, focus: '46% 60%', zoom: 1.9 },
    categoryPages: ['memory-foam', 'latex', 'foam', 'hybrid'],
  },
  {
    slug: 'sleep-position-and-temperature',
    title: 'How sleep position and temperature affect your sleep',
    emphasis: 'temperature',
    description:
      'What the research says about body temperature and sleep, why a hot, humid bedroom costs deep and REM sleep, and how sleep position relates to snoring, reflux and back comfort.',
    dek: 'Two things shape a night before the mattress does: how warm you are and how you lie. Here is what public sleep research says about each, and where the mattress fits in.',
    category: 'sleep-education',
    alsoIn: ['sleep-position', 'cooling'],
    path: '/guides/sleep-position-and-temperature',
    published: '2026-10-08',
    updated: '2026-10-08',
    hero: { kind: 'diagram', name: 'night-temperature' },
    profileKey: 'side-160',
    cover: { diagram: 'night-temperature', still: { type: 'latex', aspect: 'hero' }, focus: '64% 52%', zoom: 1.25 },
    categoryPages: ['side-sleepers', 'cooling', 'back-sleepers', 'stomach-sleepers'],
  },
];

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) || null;
}

export function guideCategoryLabel(id: string): string {
  const match = GUIDE_CATEGORIES.find((c) => c.id === id);
  return match ? match.label : 'Guide';
}

export function getCategory(id: string): GuideCategory | null {
  return GUIDE_CATEGORIES.find((c) => c.id === id) || null;
}

/** Guides whose primary category is `id`, followed by those cross-listed under it. */
export function guidesInCategory(id: string): Guide[] {
  const primary = GUIDES.filter((g) => g.category === id);
  const cross = GUIDES.filter((g) => g.category !== id && Array.isArray(g.alsoIn) && g.alsoIn.includes(id));
  return [...primary, ...cross];
}

/** 1-based position of a guide in the registry ("Guide 03 of 09"); 0 if unknown. */
export function guideNumber(slug: string): number {
  return GUIDES.findIndex((g) => g.slug === slug) + 1;
}

/** Sort order for newestGuide(): newest first, then featured, then registry order. */
function newerFirst(a: Guide, b: Guide): number {
  if (a.published !== b.published) return a.published < b.published ? 1 : -1;
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  return guideNumber(a.slug) - guideNumber(b.slug);
}

/**
 * The newest guide by first-publication date; ties go to the featured
 * guide, then registry order. Drives the hub's full-bleed cover story.
 */
export function newestGuide(): Guide {
  return GUIDES.reduce((best, g) => (newerFirst(g, best) < 0 ? g : best));
}

const FALLBACK_GUIDE_SLUGS = ['mattress-types-explained', 'mattress-buying-checklist'];

/** Guides whose `categoryPages` include a /mattresses/<slug> page (primary mapping first). */
export function guidesForCategoryPage(categorySlug: string, limit = 2): Guide[] {
  const primary = GUIDES.filter((g) => g.categoryPages?.[0] === categorySlug);
  const secondary = GUIDES.filter((g) => g.categoryPages?.slice(1).includes(categorySlug));
  // Generic fallbacks so every category page can show `limit` guides.
  const fallback = FALLBACK_GUIDE_SLUGS.map(getGuide).filter((g): g is Guide => g !== null);
  const seen = new Set<string>();
  const unique: Guide[] = [];
  for (const g of [...primary, ...secondary, ...fallback]) {
    if (seen.has(g.slug)) continue;
    seen.add(g.slug);
    unique.push(g);
  }
  return unique.slice(0, limit);
}

export function featuredGuide(): Guide {
  return GUIDES.find((g) => g.featured) ?? GUIDES[0];
}

/** Most recent real editorial date across all guides (for the hub's sitemap entry). */
export function latestGuideUpdate(): string {
  return GUIDES.reduce((latest, g) => (g.updated > latest ? g.updated : latest), GUIDES[0].updated);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "6 October 2026" from an ISO date, without timezone drift. */
export function formatEditorialDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return '';
  return `${d} ${MONTHS[m - 1] ?? ''} ${y}`;
}
