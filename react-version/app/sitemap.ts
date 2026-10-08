import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { slugify } from '@/lib/searchIndex';
import { compareTopics, VS_PAGES } from '@/lib/compareTopics';
import { CATEGORY_PAGES } from '@/lib/categoryPages';
import { loadCatalogEntries } from '@/lib/content/catalog';
import { GUIDES, latestGuideUpdate } from '@/lib/content/guides';
import { POSITION_SLUGS, POSITION_UPDATED } from '@/lib/content/positions';
import type { MattressEntry } from '@/lib/types';

/**
 * Every real, indexable route. lastModified is only set where a real date
 * exists (catalog verification dates, editorial update dates) - never
 * "now", which would tell crawlers every page changed on every build.
 */

type SitemapEntry = MetadataRoute.Sitemap[number];

interface EntryOptions {
  lastModified?: string;
  priority?: number;
  changeFrequency?: SitemapEntry['changeFrequency'];
}

const url = (path: string) => `${SITE_URL}${path}`;

function latest(dates: readonly (string | undefined)[]): string | undefined {
  const valid = dates.filter((d): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d))).sort();
  return valid.at(-1);
}

function entry(path: string, { lastModified, priority = 0.6, changeFrequency = 'monthly' }: EntryOptions = {}): SitemapEntry {
  const item: SitemapEntry = { url: url(path), changeFrequency, priority };
  if (lastModified) item.lastModified = lastModified;
  return item;
}

const verified = (e: MattressEntry): string | undefined => e.lastVerifiedAt || e.lastVerified || undefined;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await loadCatalogEntries();
  const catalogDate = latest(catalog.map(verified));

  const brands = new Map<string, MattressEntry[]>();
  for (const e of catalog) {
    const slug = slugify(e.brand);
    const list = brands.get(slug) || [];
    list.push(e);
    brands.set(slug, list);
  }

  return [
    entry('', { priority: 1, changeFrequency: 'weekly', lastModified: catalogDate }),
    entry('/find-match', { priority: 0.9 }),
    entry('/mattresses', { priority: 0.9, changeFrequency: 'weekly', lastModified: catalogDate }),
    ...CATEGORY_PAGES.map((c) => entry(c.href, { priority: 0.8, changeFrequency: 'weekly', lastModified: catalogDate })),
    entry('/mattress', { priority: 0.6, lastModified: catalogDate }),
    ...catalog.map((e) => entry(`/mattress/${encodeURIComponent(e.id)}`, { priority: 0.7, lastModified: verified(e) })),
    entry('/brands', { priority: 0.6, lastModified: catalogDate }),
    ...[...brands.entries()].map(([slug, list]) => entry(`/brands/${slug}`, { priority: 0.5, lastModified: latest(list.map(verified)) })),
    entry('/compare', { priority: 0.7 }),
    ...Object.keys(compareTopics).map((slug) => entry(`/compare/${slug}`, { priority: 0.6, lastModified: catalogDate })),
    // A vs B pages that are not also topic pages.
    ...VS_PAGES.filter((p) => p.slug && !(p.slug in compareTopics)).map((p) =>
      entry(p.href || `/compare/${p.slug}`, { priority: 0.6, lastModified: catalogDate }),
    ),
    entry('/guides', { priority: 0.8, lastModified: latestGuideUpdate() }),
    ...GUIDES.map((g) => entry(g.path, { priority: 0.7, lastModified: g.updated })),
    entry('/sleep-position', { priority: 0.7, lastModified: POSITION_UPDATED }),
    ...POSITION_SLUGS.map((slug) => entry(`/sleep-position/${slug}`, { priority: 0.7, lastModified: POSITION_UPDATED })),
    entry('/methodology', { priority: 0.6 }),
    entry('/faq', { priority: 0.5 }),
    entry('/disclosures', { priority: 0.3, changeFrequency: 'yearly' }),
    entry('/privacy', { priority: 0.2, changeFrequency: 'yearly' }),
    entry('/terms', { priority: 0.2, changeFrequency: 'yearly' }),
  ];
}
