/**
 * Site-wide constants: canonical URL, name, tagline and the navigation
 * model shared by the header, footer, search dialog and sitemap.
 *
 * Only routes that exist (or are being built in this redesign) belong
 * here - a nav item pointing at a route that 404s is a dead link.
 */

import type { FooterGroup, NavLink, NavMenu, SleepPosition } from '@/lib/types';

const FALLBACK_SITE_URL = 'https://mattres-liart.vercel.app';

function normaliseSiteUrl(raw: string | undefined): string {
  const value = typeof raw === 'string' && raw.trim() ? raw.trim() : FALLBACK_SITE_URL;
  return value.replace(/\/+$/, '');
}

export const SITE_URL = normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_NAME = 'Mattress Match Score';
export const SITE_SHORT_NAME = 'Mattress Match';
export const SITE_TAGLINE = 'Find the mattress that fits the way you sleep.';
/** Home / default <title>, kept under ~65 characters so search results don't truncate it. */
export const SITE_TITLE = `${SITE_NAME} — Find the mattress that fits how you sleep`;
/**
 * Question steps in the /find-match quiz (QUESTION_STEPS in
 * components/match/quizModel.ts; lib/site.test.ts keeps them in sync).
 */
export const QUIZ_QUESTION_COUNT = 5;
const COUNT_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const quizCountWord = COUNT_WORD[QUIZ_QUESTION_COUNT] ?? String(QUIZ_QUESTION_COUNT);
/** "Five questions, a ranked shortlist" - the quiz promise used in nav and search. */
export const QUIZ_PROMISE = `${quizCountWord.charAt(0).toUpperCase()}${quizCountWord.slice(1)} questions, a ranked shortlist`;

export const SITE_DESCRIPTION =
  'Tell us how you sleep and a transparent, deterministic scoring model ranks real mattresses against your profile - pressure relief, support, temperature, motion, edge and durability, with every gap in the data shown honestly.';

/**
 * The site-wide share card (file-based app/opengraph-image). A page that sets
 * its own `openGraph` replaces the root segment's object (Next merges
 * metadata shallowly), which drops the inherited image - so such pages list
 * this in `openGraph.images`. Twitter title, description and image then
 * auto-fill from the page's openGraph (the root `twitter` only sets the card).
 */
export const SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Mattress Match Score: find the mattress that fits the way you sleep.',
} as const;

/** Longest <title> we emit before dropping the " · Mattress Match Score" suffix. */
export const MAX_TITLE_LENGTH = 60;

/**
 * Metadata `title` for a page: the plain title (the root template appends
 * " · Mattress Match Score") unless the suffixed result would run past
 * MAX_TITLE_LENGTH, in which case the title is used as-is.
 */
export function pageTitle(title: string): string | { absolute: string } {
  return `${title} · ${SITE_NAME}`.length > MAX_TITLE_LENGTH ? { absolute: title } : title;
}

/** Search URL used by the WebSite SearchAction JSON-LD and the search dialog's "see all" option. */
export const SEARCH_PATH = '/mattresses';
export function searchUrl(query: string): string {
  return `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
}

/** Absolute URL for a site path (for JSON-LD, canonical links, share URLs). */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * NAV_MENU - the single navigation tree. It drives the desktop mega-panels,
 * the mobile accordion, the search dialog's quick links and the footer, so
 * they can never drift apart. lib/site.test.ts checks every href resolves to
 * a real route (static app dir, or a dynamic segment + its registry).
 *
 * menu: { id, label, href (landing page), intro, groups[], feature? }
 * group: { id, title, href?, caption?, links[] }
 * link: { label, href, caption? }
 * feature: { eyebrow, title, href, categorySlug? (live count from the search
 *            index), still: { type, aspect } (original render, labelled as an
 *            illustration), links[] (extra featured links under the card) }
 *
 * No login, account or "saved" entries - the site has no accounts.
 */
export const NAV_MENU: NavMenu[] = [
  {
    id: 'mattresses',
    label: 'Mattresses',
    href: '/mattresses',
    intro: 'Every mattress, scored the same way.',
    groups: [
      {
        id: 'discover',
        title: 'Discover',
        links: [
          { label: 'Best Mattresses', href: '/mattresses/best', caption: 'The whole catalog, ranked by Match Score.' },
          { label: 'Mattress Finder', href: '/find-match', caption: `${QUIZ_PROMISE}.` },
          {
            label: 'Mattress Profiles',
            href: '/mattress',
            caption: "Specs and the independent ratings we cite. We don't test mattresses ourselves.",
          },
          { label: 'All mattresses', href: '/mattresses', caption: 'Filter and sort the full catalog.' },
        ],
      },
      {
        id: 'types',
        title: 'Mattress Types',
        links: [
          { label: 'Hybrid', href: '/mattresses/hybrid' },
          { label: 'All-foam', href: '/mattresses/foam' },
          { label: 'Memory foam', href: '/mattresses/memory-foam' },
          { label: 'Latex', href: '/mattresses/latex' },
        ],
      },
      {
        id: 'positions',
        title: 'Sleep Positions',
        links: [
          { label: 'Side sleepers', href: '/mattresses/side-sleepers' },
          { label: 'Back sleepers', href: '/mattresses/back-sleepers' },
          { label: 'Stomach sleepers', href: '/mattresses/stomach-sleepers' },
          { label: 'Combination sleepers', href: '/sleep-position/combination' },
        ],
      },
      {
        id: 'firmness',
        title: 'Firmness',
        links: [
          { label: 'Firm', href: '/mattresses/firm' },
          { label: 'Softer', href: '/mattresses/soft' },
          { label: 'How to choose firmness', href: '/guides/how-to-choose-mattress-firmness' },
        ],
      },
    ],
    feature: {
      eyebrow: 'Featured type',
      title: 'Hybrid mattresses',
      href: '/mattresses/hybrid',
      categorySlug: 'hybrid',
      still: { type: 'hybrid', aspect: 'product' },
      links: [
        { label: 'Mattresses for couples', href: '/mattresses/couples' },
        { label: 'Under $1,000', href: '/mattresses/under-1000' },
      ],
    },
  },
  {
    id: 'compare',
    label: 'Compare',
    href: '/compare',
    intro: 'Side by side, scored on the same profile.',
    groups: [
      {
        id: 'workspace',
        title: 'Compare Mattresses',
        links: [
          { label: 'Compare workspace', href: '/compare', caption: 'Up to three mattresses. Your list is saved on this device only.' },
          { label: 'Popular Comparisons', href: '/compare#popular', caption: 'Curated head-to-head pairs and profile shortlists.' },
        ],
      },
      {
        id: 'topics',
        title: 'Profile shortlists',
        links: [
          { label: 'Side sleepers under $1,000', href: '/compare/side-sleepers-under-1000' },
          { label: 'Cooling hybrids for couples', href: '/compare/cooling-hybrids-for-couples' },
          { label: 'Motion isolation for couples', href: '/compare/motion-isolation-for-couples' },
          { label: 'Pressure relief for side sleepers', href: '/compare/pressure-relief-for-side-sleepers' },
          { label: 'Back support for heavier sleepers', href: '/compare/back-support-for-heavier-sleepers' },
        ],
      },
    ],
    feature: {
      eyebrow: 'Head to head',
      title: 'Casper Dream vs Casper Snow',
      href: '/compare/casper-dream-vs-casper-snow',
      still: { type: 'hybrid', aspect: 'cutaway' },
      links: [],
    },
  },
  {
    id: 'guides',
    label: 'Guides',
    href: '/guides',
    intro: 'Plain-language guides, linked to real scores.',
    groups: [
      {
        id: 'reading',
        title: 'Guides',
        links: [
          { label: 'Buying Guides', href: '/guides#buying' },
          { label: 'Sleep Guides', href: '/guides#sleep-position' },
          { label: 'Sleep positions hub', href: '/sleep-position' },
          { label: 'Materials', href: '/guides#materials' },
          { label: 'Cooling', href: '/guides#cooling' },
          { label: 'Pressure Relief', href: '/guides#pressure-relief' },
          { label: 'Motion & couples', href: '/guides#couples' },
          { label: 'Mattress types', href: '/guides#types' },
        ],
      },
      {
        id: 'featured',
        title: 'Start here',
        links: [
          { label: 'Mattress types explained', href: '/guides/mattress-types-explained' },
          { label: 'Mattresses for hot sleepers', href: '/guides/mattresses-for-hot-sleepers' },
          { label: 'Pressure relief for side sleepers', href: '/guides/pressure-relief-for-side-sleepers' },
          { label: 'Mattress buying checklist', href: '/guides/mattress-buying-checklist' },
        ],
      },
    ],
    feature: {
      eyebrow: 'Materials',
      title: 'What is inside a mattress, layer by layer',
      href: '/guides/mattress-types-explained',
      still: { type: 'hybrid', aspect: 'cutaway' },
      links: [],
    },
  },
  {
    id: 'methodology',
    label: 'Methodology',
    href: '/methodology',
    intro: 'How every number is made, and where it comes from.',
    groups: [
      {
        id: 'method',
        title: 'Methodology',
        links: [
          { label: 'How Match Score Works', href: '/methodology', caption: 'The weights, the rules, the limits.' },
          { label: 'Data & Sources', href: '/methodology#provenance', caption: 'Where every number comes from. No lab testing.' },
          { label: 'Affiliate Disclosure', href: '/disclosures', caption: 'How we could earn money, and why scores cannot be bought.' },
        ],
      },
    ],
    feature: null,
  },
];

/** Every link in the tree, de-duplicated by href (menu landing pages included). */
export function navLinks(menu: readonly NavMenu[] = NAV_MENU): (NavLink & { menu: string })[] {
  const seen = new Map<string, NavLink & { menu: string }>();
  const add = (link: NavLink | undefined, menuId: string) => {
    if (link && link.href && !seen.has(link.href)) seen.set(link.href, { ...link, menu: menuId });
  };
  for (const m of menu) {
    add({ label: m.label, href: m.href }, m.id);
    for (const g of m.groups) g.links.forEach((l) => add(l, m.id));
    if (m.feature) {
      add({ label: m.feature.title, href: m.feature.href }, m.id);
      (m.feature.links || []).forEach((l) => add(l, m.id));
    }
  }
  return [...seen.values()];
}

/** Curated starting points shown in the empty search state (static, editorial, not traffic-based). */
export const POPULAR_SEARCHES: { label: string; href: string; meta: string }[] = [
  { label: 'Best mattresses', href: '/mattresses/best', meta: 'Category' },
  { label: 'Mattresses for side sleepers', href: '/mattresses/side-sleepers', meta: 'Category' },
  { label: 'Cooling mattresses', href: '/mattresses/cooling', meta: 'Category' },
  { label: 'Compare Casper Dream vs Casper Snow', href: '/compare/casper-dream-vs-casper-snow', meta: 'Comparison' },
  { label: 'How Match Score works', href: '/methodology', meta: 'Methodology' },
];

export const PRIMARY_CTA: { href: string; label: string } = { href: '/find-match', label: 'Find My Match' };

export const SLEEP_POSITIONS: { slug: SleepPosition; label: string; href: string }[] = [
  { slug: 'side', label: 'Side sleepers', href: '/sleep-position/side' },
  { slug: 'back', label: 'Back sleepers', href: '/sleep-position/back' },
  { slug: 'stomach', label: 'Stomach sleepers', href: '/sleep-position/stomach' },
  { slug: 'combination', label: 'Combination sleepers', href: '/sleep-position/combination' },
];

/** Footer columns, derived from NAV_MENU plus the policy pages. */
const METHODOLOGY_LINKS = (NAV_MENU.find((m) => m.id === 'methodology')?.groups[0]?.links ?? []).map(({ href, label }) => ({ href, label }));

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: 'Mattresses',
    links: [
      { href: '/mattresses', label: 'All mattresses' },
      { href: '/mattresses/best', label: 'Best mattresses' },
      { href: '/find-match', label: 'Mattress Finder' },
      { href: '/brands', label: 'Brands' },
      { href: '/mattress', label: 'Mattress profiles' },
    ],
  },
  {
    title: 'Compare & learn',
    links: [
      { href: '/compare', label: 'Compare mattresses' },
      { href: '/compare#popular', label: 'Popular comparisons' },
      { href: '/guides', label: 'Sleep guides' },
      { href: '/sleep-position', label: 'Sleep positions' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Methodology',
    links: METHODOLOGY_LINKS,
  },
  {
    title: 'Policies',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/privacy#device-data', label: 'Your data on this device' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];
