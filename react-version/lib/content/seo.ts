/**
 * Metadata and structured-data helpers for editorial pages. Only facts we
 * actually have go into JSON-LD: the organisation as author/publisher (no
 * invented people), real publish/update dates, and FAQ text exactly as it
 * is shown on the page.
 */

import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, absoluteUrl, pageTitle } from '@/lib/site';
import { EDITORIAL_BYLINE } from './guides';
import type { CollectionItem, FaqItem } from './types';

type OpenGraph = NonNullable<Metadata['openGraph']>;

interface EditorialMetadataInput {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  published?: string;
  updated?: string;
}

// Page-level openGraph replaces the root segment's object (shallow merge),
// which would drop the file-based app/opengraph-image - so reference it.
const SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Mattress Match Score: find the mattress that fits the way you sleep.',
};

/** Page metadata with canonical + Open Graph that carry the page's own title and URL. */
/**
 * Search snippets cut around 155-160 characters. Trims at a word boundary and
 * adds an ellipsis only when it has to; shorter text is returned untouched.
 */
export function clampMeta(text: string, max = 158): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 80 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

export function editorialMetadata({ title, description, path, type = 'website', published, updated }: EditorialMetadataInput): Metadata {
  const base = { siteName: SITE_NAME, locale: 'en_US', url: path, title, description, images: [SHARE_IMAGE] };
  const openGraph: OpenGraph =
    type === 'article'
      ? {
          type: 'article',
          ...base,
          ...(published ? { publishedTime: published } : {}),
          ...(updated ? { modifiedTime: updated } : {}),
          authors: [EDITORIAL_BYLINE],
        }
      : { type: 'website', ...base };
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: path },
    openGraph,
    twitter: { card: 'summary_large_image', title, description, images: [SHARE_IMAGE.url] },
  };
}

const ORGANIZATION_REF = { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL };

interface ArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
  section: string;
}

export function articleJsonLd({ title, description, path, published, updated, section }: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    url: absoluteUrl(path),
    datePublished: published,
    dateModified: updated || published,
    articleSection: section,
    inLanguage: 'en',
    author: ORGANIZATION_REF,
    publisher: ORGANIZATION_REF,
    image: absoluteUrl('/opengraph-image'),
  };
}

export function faqPageJsonLd(faqs: readonly FaqItem[] | null | undefined) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

interface CollectionJsonLdInput {
  title: string;
  description: string;
  path: string;
  items: readonly CollectionItem[];
}

export function collectionJsonLd({ title, description, path, items }: CollectionJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(item.path || item.href || ''),
        name: item.title || item.label,
      })),
    },
  };
}
