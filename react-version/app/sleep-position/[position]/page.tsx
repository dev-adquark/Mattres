import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import rules from '@/lib/rules/0.2.json';
import { POSITION_SLUGS, getPosition, positionPageTitle } from '@/lib/content/positions';
import { editorialMetadata } from '@/lib/content/seo';
import { PositionPage } from '@/components/content/PositionPage';

// Related mattresses are ranked live from the catalog; refresh hourly.
interface RouteProps {
  params: Promise<{ position: string }>;
}

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return POSITION_SLUGS.map((position) => ({ position }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { position } = await params;
  const content = getPosition(position);
  if (!content) return { title: 'Sleep position not found' };
  return editorialMetadata({
    title: positionPageTitle(content),
    description: content.description,
    path: `/sleep-position/${content.slug}`,
  });
}

export default async function SleepPositionPage({ params }: RouteProps) {
  const { position } = await params;
  const content = getPosition(position);
  if (!content) notFound();
  return <PositionPage content={content} rules={rules} />;
}
