import { comparableQueenPriceUsd } from '@/lib/commerce';
import type { Metadata } from 'next';
import { MatchExperience } from '@/components/match/MatchExperience';
import type { QuizCatalogItem } from '@/components/match/quizModel';
import { getCatalog } from '@/lib/db/mattressRepo';
import { SITE_NAME, SHARE_IMAGE } from '@/lib/site';

// Keeps the catalog counts and the quiz's live "N mattresses fit" filter
// summary fresh after a DB-only catalog change without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Find your mattress match',
  description:
    'Answer five short questions about how you sleep and get every mattress in our catalog scored for you, with the reasons each one fits and what to watch out for.',
  alternates: { canonical: '/find-match' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/find-match',
    title: 'Find your mattress match',
    description: 'Five short questions, a transparent Match Score for every mattress, and the reasons behind it.',
    images: [SHARE_IMAGE],
  },
};

export default async function FindMatchPage() {
  const { entries } = await getCatalog();
  // Only what the quiz needs to warn before an empty result: type + Queen price.
  const catalog: QuizCatalogItem[] = entries.map((m) => ({ type: m.type, priceUsd: comparableQueenPriceUsd(m) }));
  const brandCount = new Set(entries.map((m) => m.brand)).size;
  return <MatchExperience catalog={catalog} catalogCount={entries.length} brandCount={brandCount} />;
}
