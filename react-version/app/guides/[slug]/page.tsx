import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import rules from '@/lib/rules/0.2.json';
import { loadCatalogEntries } from '@/lib/content/catalog';
import { GUIDES, getGuide } from '@/lib/content/guides';
import { editorialMetadata } from '@/lib/content/seo';
import { getArticle } from '@/components/content/articles';
import { GuideLayout } from '@/components/content/GuideLayout';

// Related mattresses are ranked live from the catalog (database first,
// JSON fallback); refresh hourly like the other catalog-backed pages.
interface RouteProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide not found' };
  return editorialMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.path,
    type: 'article',
    published: guide.published,
    updated: guide.updated,
  });
}

export default async function GuidePage({ params }: RouteProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const article = getArticle(slug);
  if (!guide || !article) notFound();
  const catalog = await loadCatalogEntries();
  return <GuideLayout guide={guide} article={article} rules={rules} catalog={catalog} />;
}
