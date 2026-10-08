import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/db/mattressRepo';
import { absoluteUrl } from '@/lib/site';
import { editorialMetadata } from '@/lib/content/seo';
import { CATEGORY_SLUGS, getCategoryPage, getCategoryEditorial, categoryCounts } from '@/lib/categories';
import * as compareTopics from '@/lib/compareTopics';
import { JsonLd } from '@/components/ui/JsonLd';
import { buildCategoryView } from '@/components/catalog/buildCategory';
import type { CategoryView } from '@/components/catalog/buildCategory';
import { CategoryPage } from '@/components/catalog/CategoryPage';
import type { CategoryPair } from '@/components/catalog/CategoryPage';
import { CategoryUnavailable } from '@/components/catalog/CategoryUnavailable';

// Rankings are computed from the live catalog by the scoring engine; refresh hourly.
export const revalidate = 3600;
// Unknown slugs get a real 404 status. (With dynamicParams=true the root
// loading.js starts streaming first and a notFound() would answer 200.)
export const dynamicParams = false;

export function generateStaticParams(): { category: string }[] {
  return CATEGORY_SLUGS.map((category: string) => ({ category }));
}

function metaTitle(slug: string): string | null {
  const ed = getCategoryEditorial(slug);
  const cat = getCategoryPage(slug);
  if (!ed || !cat) return null;
  return slug === 'best' ? 'Best mattresses by Match Score' : cat.title;
}

export async function generateMetadata({ params }: PageProps<'/mattresses/[category]'>): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryPage(category);
  if (!cat) return { title: 'Category not found' };
  return editorialMetadata({ title: metaTitle(category) ?? cat.title, description: cat.description, path: cat.href });
}

/** Curated head-to-head pairs whose two mattresses both appear on this category page (max three). */
function pairsOn(view: CategoryView): CategoryPair[] {
  const ids = new Set(view.lists.flatMap((l) => [...l.ranked, ...l.unranked].map((r) => r.id)));
  return compareTopics.COMPARE_PAIRS.filter((p) => ids.has(p.a) && ids.has(p.b))
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, href: p.href }));
}

export default async function CategoryRoute({ params }: PageProps<'/mattresses/[category]'>) {
  const { category } = await params;
  const cat = getCategoryPage(category);
  if (!cat) notFound();

  const catalog = await getCatalog();
  const { entries } = catalog;
  let view: CategoryView | null = null;
  try {
    view = await buildCategoryView(category, entries);
  } catch (error) {
    console.error(`[category] ranking failed for ${category}:`, error);
  }
  if (!view) return <CategoryUnavailable title={metaTitle(category)} />;

  // Only lists whose members meet the category's own definition are published
  // as the category's ItemList: the budget page's "next step up" group is a
  // comparison, not "under $1,000", so it stays out of the structured data.
  const ownLists = view.lists.filter((l) => l.inCategory);
  const ranked = ownLists.flatMap((l) => l.ranked);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: metaTitle(category),
    description: cat.description,
    url: absoluteUrl(cat.href),
    mainEntity: {
      '@type': 'ItemList',
      // Several groups (e.g. all-latex, then latex hybrids) are each ordered, but not as one list.
      itemListOrder: ownLists.length > 1 ? 'https://schema.org/ItemListUnordered' : 'https://schema.org/ItemListOrderDescending',
      numberOfItems: ranked.length,
      itemListElement: ranked.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.title,
        url: absoluteUrl(`/mattress/${encodeURIComponent(r.id)}`),
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <CategoryPage view={view} counts={categoryCounts(entries)} pairs={pairsOn(view)} />
    </>
  );
}
