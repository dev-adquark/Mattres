import Link from 'next/link';
import { getCatalog } from '@/lib/db/mattressRepo';
import { monetizationStatus } from './monetization';

interface CommissionLineProps {
  linkClassName?: string;
  withLink?: boolean;
}

/**
 * The one-line money disclosure used site-wide (footer, closing bands).
 * Async Server Component: derived from the catalog's commerce config via
 * monetizationStatus(), so it flips automatically the day an affiliate or
 * sponsored entry goes live. Renders inline content; wrap it in a <p>.
 */
export async function CommissionLine({ linkClassName = 'link', withLink = true }: CommissionLineProps) {
  let line = 'Scores can’t be bought.';
  try {
    const { entries } = await getCatalog();
    line = monetizationStatus(entries).commissionLine;
  } catch {
    // Catalog unreadable: fall back to the one claim that is always true.
  }
  return (
    <>
      {line}
      {withLink ? (
        <>
          {' '}
          <Link href="/disclosures" className={linkClassName}>
            Read our disclosures
          </Link>
          .
        </>
      ) : null}
    </>
  );
}
