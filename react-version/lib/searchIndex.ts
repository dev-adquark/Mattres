import { displayTitle } from '@/lib/format';
import { firmnessFor, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { GUIDES, guideCategoryLabel } from '@/lib/content/guides';
import { compareTopics } from '@/lib/compareTopics';
import { SLEEP_POSITIONS } from '@/lib/site';
import { CATEGORY_PAGES, categoryCounts, categoryTagsFor, countLabel } from '@/lib/categoryPages';
import type { CompareTopic, MattressEntry, SearchGroup, SearchGroupId, SearchIndexData, SearchItem, SearchResultGroup } from '@/lib/types';

/** A curated A-vs-B page as the search index needs it. */
export interface SearchPair {
  slug: string;
  title: string;
  href?: string;
  chips?: string[];
}

type Limits = Partial<Record<SearchGroupId, number>>;

/**
 * Site search: a compact index built from the real catalog plus the
 * editorial registries, and a small, dependency-free ranking function.
 *
 * buildSearchIndex(entries, { pairs }?) -> { mattresses, brands, categories, guides, comparisons }
 *   pairs: optional curated A-vs-B pages [{ slug, title, href?, chips? }]
 *          (lib/compareTopics COMPARE_PAIRS when the compare page builder adds it).
 * searchIndex(index, query, limits?, { group }?) -> [{ id, label, items[] }]
 *   groups with results only; categories come first unless the query names a
 *   brand (exact or 3+ character prefix), which then leads; `group` restricts to one group.
 *
 * Mattress terms include category tags derived from real data only
 * (lib/categoryPages categoryTagsFor): "cooling" only with an independent
 * cooling rating >= 7/10, "firm"/"soft" from the firmness range, "latex" /
 * "memory foam" from the construction notes.
 */

/** Search words added to a mattress for each derived category tag (also used by the /mattresses text search). */
export const TAG_WORDS: Record<string, string> = {
  cooling: 'cooling cool cooler',
  firm: 'firm firmer',
  soft: 'soft softer plush',
  hybrid: 'hybrid',
  foam: 'foam',
  'memory-foam': 'memory foam',
  latex: 'latex',
  'under-1000': 'budget under 1000',
};

export function slugify(value: unknown): string {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalise(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, ' ')
    .trim();
}

export function buildSearchIndex(entries: readonly MattressEntry[] = [], { pairs = [] }: { pairs?: readonly SearchPair[] } = {}): SearchIndexData {
  const typeLabels: Record<string, string> = MATTRESS_TYPE_LABEL;
  const mattresses = entries.map((entry): SearchItem => {
    const firmness = firmnessFor(entry);
    const typeLabel = typeLabels[entry.type] || entry.type;
    const tags: string[] = categoryTagsFor(entry);
    const item: SearchItem = {
      kind: 'mattress',
      id: entry.id,
      title: displayTitle(entry),
      brand: entry.brand,
      // A paid placement is labeled in the result row itself (never hidden in a tooltip).
      meta: [entry.sponsored ? 'Sponsored' : null, typeLabel, firmness ? firmness.label : null].filter(Boolean).join(' · '),
      href: `/mattress/${encodeURIComponent(entry.id)}`,
      terms: normalise([entry.brand, entry.model, entry.type, typeLabel, firmness && firmness.label, ...tags.map((t) => TAG_WORDS[t] || '')].join(' ')),
      tags,
    };
    // Tie-break boost for facet queries ("cool" ranks 9/10 above 7/10). Real ratings only.
    if (typeof entry.coolingRatingOutOf10 === 'number' && tags.includes('cooling')) item.facets = { cooling: entry.coolingRatingOutOf10 };
    return item;
  });

  const counts: Record<string, number> = categoryCounts([...entries]);
  const countOf = (slug: string) => counts[slug] ?? 0;
  const categories = CATEGORY_PAGES.filter((c) => countOf(c.slug) > 0).map((c): SearchItem => ({
    kind: 'category',
    id: c.slug,
    title: c.title,
    meta: `${countLabel(c, countOf(c.slug))} scored`,
    count: countOf(c.slug),
    href: c.href,
    terms: normalise(`${c.title} ${c.chip} ${c.terms}`),
  }));

  const brandCounts = new Map<string, number>();
  entries.forEach((e) => brandCounts.set(e.brand, (brandCounts.get(e.brand) || 0) + 1));
  const brands = [...brandCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]): SearchItem => ({
      kind: 'brand',
      id: slugify(name),
      title: name,
      meta: `${count} mattress${count === 1 ? '' : 'es'} in catalog`,
      href: `/brands/${slugify(name)}`,
      terms: normalise(name),
    }));

  const guides: SearchItem[] = [
    ...GUIDES.map((g): SearchItem => ({
      kind: 'guide',
      id: g.slug,
      title: g.title,
      meta: guideCategoryLabel(g.category),
      href: g.path,
      terms: normalise(`${g.title} ${g.description} ${guideCategoryLabel(g.category)}`),
    })),
    ...SLEEP_POSITIONS.map((p): SearchItem => ({
      kind: 'guide',
      id: `position-${p.slug}`,
      title: `Mattresses for ${p.label.toLowerCase()}`,
      meta: 'Sleep position',
      href: p.href,
      terms: normalise(`${p.label} ${p.slug} sleeper sleeping position`),
    })),
  ];

  const pairItems = (Array.isArray(pairs) ? pairs : [])
    .filter((p) => p && p.slug && p.title)
    .map((p): SearchItem => ({
      kind: 'comparison',
      id: `pair-${p.slug}`,
      title: p.title,
      meta: 'Head-to-head comparison',
      href: p.href || `/compare/${p.slug}`,
      terms: normalise(`${p.title} vs versus compare ${(p.chips || []).join(' ')}`),
    }));

  const topics: Record<string, Pick<CompareTopic, 'title' | 'chips'>> = compareTopics;
  const comparisons: SearchItem[] = [
    ...pairItems,
    ...Object.entries(topics).map(([slug, topic]): SearchItem => ({
      kind: 'comparison',
      id: slug,
      title: topic.title,
      meta: (topic.chips || []).slice(0, 3).join(' · ') || 'Profile shortlist',
      href: `/compare/${slug}`,
      terms: normalise(`${topic.title} ${(topic.chips || []).join(' ')} compare`),
    })),
  ];

  return { mattresses, brands, categories, guides, comparisons };
}

/** Result groups in display order. Also the search dialog's type chips. */
export const SEARCH_GROUPS: SearchGroup[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'mattresses', label: 'Mattresses' },
  { id: 'brands', label: 'Brands' },
  { id: 'guides', label: 'Guides' },
  { id: 'comparisons', label: 'Comparisons' },
];
const GROUPS = SEARCH_GROUPS;

const DEFAULT_LIMITS: Limits = { categories: 3, mattresses: 6, brands: 4, guides: 4, comparisons: 3 };
/** Limits when a single type chip is active. */
export const EXPANDED_LIMITS: Limits = { categories: 14, mattresses: 40, brands: 20, guides: 20, comparisons: 20 };

function facetBoost(item: SearchItem, tokens: string[]): number {
  if (!item.facets) return 0;
  let boost = 0;
  for (const [facet, value] of Object.entries(item.facets)) {
    if (tokens.some((t) => t.length >= 3 && facet.startsWith(t))) boost += value / 10;
  }
  return boost;
}

function scoreItem(item: SearchItem, tokens: string[], phrase: string): number {
  const title = normalise(item.title);
  const words = item.terms.split(' ');
  let score = 0;
  for (const token of tokens) {
    if (words.some((w) => w === token)) score += 3;
    else if (words.some((w) => w.startsWith(token))) score += 2;
    else if (item.terms.includes(token)) score += 1;
    else return 0; // every token must match somewhere
  }
  if (title.startsWith(phrase)) score += 4;
  else if (title.includes(phrase)) score += 2;
  return score + facetBoost(item, tokens);
}

export function searchIndex(
  index: SearchIndexData | null | undefined,
  query: string,
  limits: Limits = DEFAULT_LIMITS,
  { group: only }: { group?: SearchGroupId | 'all' | null } = {},
): SearchResultGroup[] {
  const phrase = normalise(query);
  if (!index || !phrase) return [];
  const tokens = phrase.split(' ').filter(Boolean);
  const groups = GROUPS.filter((g) => !only || only === 'all' || g.id === only).map((group): SearchResultGroup => {
    const items = (index[group.id] || [])
      .map((item) => ({ item, score: scoreItem(item, tokens, phrase) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, limits[group.id] ?? 5)
      .map((r) => r.item);
    return { ...group, items };
  }).filter((g) => g.items.length > 0);
  // Entity promotion: when the query names a brand or category ("purple",
  // "saatva", "hybrid"), that entity leads, so Enter opens the brand or
  // category page rather than whichever model of that brand ranked first.
  // Exact title matches lead first, then name prefixes (3+ characters).
  // Array.prototype.sort is stable, so the default group order holds otherwise.
  const lead = (g: SearchResultGroup): number => {
    if (g.id !== 'brands' && g.id !== 'categories') return 2;
    const title = normalise(g.items[0]?.title);
    if (title === phrase) return 0;
    if (phrase.length >= 3 && title.startsWith(phrase)) return 1;
    return 2;
  };
  return groups.map((g, i) => ({ g, i, rank: lead(g) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((r) => r.g);
}
