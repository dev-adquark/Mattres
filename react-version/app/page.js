import HomeClient from '@/components/HomeClient';
import { getCatalog } from '@/lib/db/mattressRepo';

// Without this, Next statically prerenders this page once at build time
// (getCatalog() itself doesn't use any dynamic API, so nothing here
// signals otherwise) - meaning a catalog change made only in the
// database (e.g. the weekly RTINGS sync auto-applying new evidence)
// wouldn't show up here until the next full redeploy. Revalidating
// hourly means it shows up on its own well within that cadence, without
// needing every DB write to also trigger a redeploy.
export const revalidate = 3600;

export default async function HomePage() {
  const { entries: catalog } = await getCatalog();
  return <HomeClient catalog={catalog} />;
}
