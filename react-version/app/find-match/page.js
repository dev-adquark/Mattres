import FindMatchClient from '@/components/FindMatchClient';
import { getCatalog } from '@/lib/db/mattressRepo';

// See app/page.js's comment on this same directive - keeps the real
// brand count fresh without requiring a full redeploy after a DB-only
// catalog change.
export const revalidate = 3600;

export default async function FindMatchPage() {
  const { entries } = await getCatalog();
  const brandCount = new Set(entries.map((m) => m.brand)).size;
  return <FindMatchClient brandCount={brandCount} />;
}
