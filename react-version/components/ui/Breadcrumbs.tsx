import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { absoluteUrl } from '@/lib/site';
import { JsonLd } from './JsonLd';
import { cx } from './cx';
import { breadcrumbs as s } from '@/components/ui/systemStyles';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  /** Root to current page; the last item is the current page. */
  items: readonly BreadcrumbItem[] | null | undefined;
  className?: string;
  jsonLd?: boolean;
}

/**
 * The last item renders as text with aria-current. Emits BreadcrumbList
 * JSON-LD with absolute URLs.
 */
export function Breadcrumbs({ items, className, jsonLd = true }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
  return (
    <>
      <nav aria-label="Breadcrumb" className={cx(s.breadcrumbs, className)}>
        <ol>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${item.label}-${i}`}>
                {last || !item.href ? <span aria-current={last ? 'page' : undefined}>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
                {!last ? <ChevronRight className={s.sep} aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
      </nav>
      {jsonLd ? <JsonLd data={data} /> : null}
    </>
  );
}
