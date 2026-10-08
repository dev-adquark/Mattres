'use client';

import { ExternalLink, Link2Off } from 'lucide-react';
import { track } from '@/lib/analytics';
import { clickEventFor } from '@/lib/outbound';
import { cx } from '@/components/ui/cx';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import type { OutboundCta } from '@/lib/types';
import styles from './CommerceCta.module.css';

/**
 * Renders the CTA object from lib/outbound ctaFor(entry). Server pages
 * compute `cta` and pass it down as plain data.
 *
 *  affiliate   -> "Check Price at {retailer}", rel="sponsored noopener noreferrer",
 *                 inline disclosure, affiliate_click
 *  retailer    -> "View at {retailer}", outbound_click
 *  brand       -> "Visit {Brand}", outbound_click
 *  unavailable -> non-interactive "Retailer link not available yet" (never styled as a button)
 *
 * placement: where on the page (e.g. 'hero', 'glance'); page: pathname.
 * showHost: print the destination domain under the button.
 */
export interface CommerceCtaProps {
  cta: OutboundCta | null | undefined;
  mattressId?: string | null;
  brand?: string | null;
  placement?: string;
  page?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  showHost?: boolean;
  block?: boolean;
  className?: string;
}

export function CommerceCta({
  cta,
  mattressId,
  brand,
  placement,
  page,
  variant = 'primary',
  size = 'lg',
  showHost = true,
  block = false,
  className,
}: CommerceCtaProps) {
  if (!cta || cta.kind === 'unavailable' || !cta.href) {
    return (
      <p className={cx(styles.unavailable, className)} data-cta-kind="unavailable">
        <Link2Off aria-hidden="true" />
        <span>{cta?.label || 'Retailer link not available yet'}</span>
      </p>
    );
  }

  const onClick = () => {
    const event = clickEventFor(cta, { mattressId, brand, placement, page });
    if (event) track(event.name, event.props);
  };

  return (
    <div className={cx(styles.wrap, block && styles.block, className)} data-cta-kind={cta.kind}>
      <a
        href={cta.href}
        target="_blank"
        rel={cta.rel ?? undefined}
        className={buttonClassName({ variant, size, block })}
        onClick={onClick}
      >
        <span>{cta.label}</span>
        <ExternalLink aria-hidden="true" />
        <span className="sr-only"> (opens {cta.host} in a new tab)</span>
      </a>
      {cta.disclosure ? (
        <p className={styles.disclosure}>
          <strong>Affiliate link.</strong> {cta.disclosure.replace(/^Affiliate link\s*[—-]\s*/i, '')}.
        </p>
      ) : showHost && cta.host ? (
        <p className={styles.host}>
          {cta.kind === 'brand' ? 'Manufacturer site' : 'Retailer'} · {cta.host} · not an affiliate link
        </p>
      ) : null}
    </div>
  );
}
