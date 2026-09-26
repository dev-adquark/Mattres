import { getCatalog } from '@/lib/db/mattressRepo';

const BASE_URL = 'https://mattres-liart.vercel.app';

export default async function sitemap() {
  const { entries: catalog } = await getCatalog();
  const staticRoutes = [
    '',
    '/find-match',
    '/compare',
    '/compare/cooling-hybrids-for-couples',
    '/compare/motion-isolation-for-couples',
    '/compare/pressure-relief-for-side-sleepers',
    '/compare/back-support-for-heavier-sleepers',
    '/methodology',
    '/disclosures',
    '/guides/pressure-relief-for-side-sleepers',
    '/guides/back-support-for-heavier-sleepers',
    '/guides/cooling-mattress-comparison',
    '/faq',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  // Every real mattress detail page - generated from the actual catalog,
  // not a fixed list that could drift out of sync with what real pages
  // exist.
  const mattressRoutes = catalog.map((entry) => ({
    url: `${BASE_URL}/mattress/${entry.id}`,
    lastModified: entry.lastVerifiedAt ? new Date(entry.lastVerifiedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...mattressRoutes];
}
