import rules from '@/lib/rules/0.2.json';
import { loadCatalogEntries } from '@/lib/content/catalog';
import { GUIDES, newestGuide } from '@/lib/content/guides';
import { positionPageTitle } from '@/lib/content/positions';
import { SLEEP_POSITIONS } from '@/lib/site';
import { collectionJsonLd, editorialMetadata } from '@/lib/content/seo';
import { JsonLd } from '@/components/ui/JsonLd';
import { cx } from '@/components/ui/cx';
import { GuideCarousel } from '@/components/content/GuideCarousel';
import { ContentCta } from '@/components/content/ContentCta';
import { HubMasthead } from '@/components/content/hub/HubMasthead';
import { HubCoverStory } from '@/components/content/hub/HubCoverStory';
import { HubContents } from '@/components/content/hub/HubContents';
import { HubPositions } from '@/components/content/hub/HubPositions';
import { HubRankedLists } from '@/components/content/hub/HubRankedLists';
import styles from '@/components/content/Hub.module.css';

const TITLE = 'Sleep guides';
const PATH = '/guides';
const DESCRIPTION =
  'Plain-language guides to sleep temperature and position, mattress firmness, pressure relief, cooling, motion isolation, edge support, materials, mattress types and buying, tied to the same published rules as your Match Score.';

export const metadata = editorialMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export const revalidate = 3600;

export default async function GuidesIndexPage() {
  const catalog = await loadCatalogEntries();

  return (
    <>
      <HubMasthead title={TITLE} path={PATH} rulesVersion={rules.version} />
      <HubCoverStory guide={newestGuide()} catalog={catalog} />
      <HubContents />

      {/* Every cover, browsable. */}
      <section className={cx('section section--editorial section--linen', styles.shelf)} aria-labelledby="shelf-title">
        <div className="container container--wide">
          <GuideCarousel
            id="guides-hub"
            label="Every sleep guide"
            catalog={catalog}
            header={
              <h2 id="shelf-title" className="h2">
                Browse by cover
              </h2>
            }
          />
        </div>
      </section>

      <HubPositions rules={rules} />
      <HubRankedLists catalog={catalog} />

      <ContentCta
        id="guides-cta"
        title="Reading helps. A match is faster."
        body="Answer a few questions about how you sleep and the engine ranks every mattress in the catalog for you."
        secondary={{ href: '/methodology', label: 'How scoring works' }}
      />

      <JsonLd
        data={collectionJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
          items: [...GUIDES, ...SLEEP_POSITIONS.map((p) => ({ href: p.href, title: positionPageTitle(p.slug) }))],
        })}
      />
    </>
  );
}
