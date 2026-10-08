import type { Metadata } from 'next';
import { getHomeData } from '@/components/home/homeData';
import { HomeHero } from '@/components/home/HomeHero';
import { UnderstandChapter } from '@/components/home/UnderstandChapter';
import { MatchChapter } from '@/components/home/MatchChapter';
import { InspectChapter } from '@/components/home/InspectChapter';
import { CompareSection } from '@/components/home/CompareSection';
import { ChooseChapter } from '@/components/home/ChooseChapter';
import { ChapterRail } from '@/components/motion';
import { SITE_NAME, SITE_TITLE } from '@/lib/site';
import styles from '@/components/home/Home.module.css';

// The catalog can change in the database without a redeploy (see
// lib/db/mattressRepo.ts); revalidating hourly keeps every engine-derived
// number on this page current.
export const revalidate = 3600;

const TITLE = SITE_TITLE;
const DESCRIPTION =
  'Tell us how you sleep and we score real mattresses against your profile: pressure relief, support, cooling, motion, edge and durability, with the reasons, the risks and every gap in the data shown.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', url: '/', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

/**
 * The homepage is one continuous story in six chapters (brief v3 s10):
 * Discover -> Understand -> Match -> Inspect -> Compare -> Choose.
 * Each chapter's section id matches HOME_CHAPTERS for the fixed rail.
 */
export default async function HomePage() {
  const data = await getHomeData();
  return (
    <>
      <HomeHero facts={data.facts} />
      <UnderstandChapter contrast={data.contrast} personal={data.personal} />
      <MatchChapter preview={data.preview} anatomy={data.anatomy} />
      <InspectChapter story={data.story} total={data.facts.total} />
      <CompareSection compare={data.compare} bySleep={data.bySleep} />
      <ChooseChapter trust={data.trust} />
      {/* The home stylesheet widens the desktop gutter to hold this rail. */}
      <ChapterRail className={styles.chapterRail} />
    </>
  );
}
