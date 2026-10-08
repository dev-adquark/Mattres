import Link from 'next/link';
import { loadCatalogEntries } from '@/lib/content/catalog';
import { buildFaqGroups } from '@/lib/content/faq';
import { editorialMetadata, faqPageJsonLd } from '@/lib/content/seo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { cx } from '@/components/ui/cx';
import { FaqAccordion } from '@/components/FaqAccordion';
import { ContentCta } from '@/components/content/ContentCta';
import styles from '@/components/content/FaqPage.module.css';

const TITLE = 'Frequently asked questions';
const DESCRIPTION =
  'How the Match Score is calculated, which scores are measured and which are estimated, where the mattress data comes from, and how this site is funded.';

export const metadata = editorialMetadata({ title: 'FAQ', description: DESCRIPTION, path: '/faq' });

export const revalidate = 3600;

export default async function FaqPage() {
  const entries = await loadCatalogEntries();
  const groups = buildFaqGroups({ mattressCount: entries.length, brandCount: new Set(entries.map((e) => e.brand)).size });
  const all = groups.flatMap((g) => g.items);

  return (
    <>
      <section className={cx('section section--editorial', styles.hero)} aria-labelledby="faq-title">
        <div className="container container--wide">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQ', href: '/faq' }]} />
          <div className={styles.heroGrid}>
            <h1 id="faq-title" className={cx('display-l', styles.title)}>
              Straight <em>answers.</em>
            </h1>
            <p className={cx('lead', styles.lead)}>
              {TITLE} about how the Match Score works, what we know and do not know about each mattress, and how this
              site is funded. The full method is on{' '}
              <Link href="/methodology" className="link">
                How It Works
              </Link>
              ; our funding policy is on{' '}
              <Link href="/disclosures" className="link">
                Disclosures
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="section section--editorial section--flush-top" aria-label="Questions by topic">
        <div className={cx('container container--wide', styles.layout)}>
          <nav className={styles.nav} aria-label="FAQ topics">
            <ol>
              {groups.map((g, i) => (
                <li key={g.id}>
                  <a href={`#${g.id}`}>
                    <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    {g.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className={styles.groups}>
            {groups.map((g) => (
              <section key={g.id} id={g.id} className={styles.group} aria-labelledby={`${g.id}-title`}>
                <h2 id={`${g.id}-title`} className={cx('h3', styles.groupTitle)}>
                  {g.title}
                </h2>
                <FaqAccordion items={g.items} headingLevel="h3" />
              </section>
            ))}
          </div>
        </div>
      </section>

      <ContentCta
        id="faq-cta"
        title="The quickest answer is your own."
        body="Tell us how you sleep and see which mattresses fit, why they fit, and what to watch out for."
        secondary={{ href: '/guides', label: 'Read the sleep guides' }}
      />

      <JsonLd data={faqPageJsonLd(all)} />
    </>
  );
}
