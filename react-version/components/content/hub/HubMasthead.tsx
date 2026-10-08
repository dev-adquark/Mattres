import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { cx } from '@/components/ui/cx';
import { EDITORIAL_BYLINE, GUIDES, formatEditorialDate, latestGuideUpdate } from '@/lib/content/guides';
import { SLEEP_POSITIONS } from '@/lib/site';
import styles from '../Hub.module.css';

interface HubMastheadProps {
  title: string;
  path: string;
  rulesVersion: string;
}

/** Type-led masthead, like the contents page of a magazine issue. */
export function HubMasthead({ title, path, rulesVersion }: HubMastheadProps) {
  const updated = latestGuideUpdate();
  return (
    <section className={cx('section section--editorial', styles.masthead)} aria-labelledby="guides-title">
      <div className="container container--wide">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: title, href: path }]} />
        <h1 id="guides-title" className={styles.mastTitle}>
          The sleep <em>guides</em>
        </h1>
        <dl className={styles.mastMeta}>
          <div>
            <dt>In this library</dt>
            <dd>
              {GUIDES.length} guides, {SLEEP_POSITIONS.length} sleep-position pages
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>
              <time dateTime={updated}>{formatEditorialDate(updated)}</time>
            </dd>
          </div>
          <div>
            <dt>Written by</dt>
            <dd>{EDITORIAL_BYLINE}</dd>
          </div>
          <div>
            <dt>Our rule</dt>
            <dd>No sponsored picks. No invented statistics. Every number traces to scoring rules v{rulesVersion}.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
