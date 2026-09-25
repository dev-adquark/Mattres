import catalog from '@/lib/data/mattress-catalog.json';

const BASE_URL = 'https://mattres-liart.vercel.app';

export default function sitemap() {
  const staticRoutes = [
    '',
    '/find-match',
    '/compare',
    '/methodology',
    '/disclosures',
    '/buying-guide',
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
