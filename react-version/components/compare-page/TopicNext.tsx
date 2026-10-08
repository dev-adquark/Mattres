import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Guide } from '@/lib/types';
import { TopicList, type TopicListItem } from './TopicList';
import styles from './Compare.module.css';

interface TopicNextProps {
  guides: readonly Guide[];
  otherTopics: readonly TopicListItem[];
}

/** "Your turn": get personal scores, related guides and the other curated comparisons. */
export function TopicNext({ guides, otherTopics }: TopicNextProps) {
  return (
    <section className="section section--linen" aria-labelledby="next-title">
      <div className="container container--wide">
        <div className={styles.nextGrid}>
          <div className={styles.nextCta}>
            <p className="eyebrow">Your turn</p>
            <h2 id="next-title" className="h2">
              These scores belong to a demo sleeper. <em>Get yours.</em>
            </h2>
            <p className="lead">Answer a few questions about how you sleep, and every mattress in the catalog is scored for you, with the reasons.</p>
            <Button href="/find-match" arrow size="lg">
              Find My Match
            </Button>
          </div>
          {guides.length ? (
            <div>
              <h3 className={styles.sideTitle}>Related guides</h3>
              <ul className={styles.guideList}>
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={g.path} className={styles.guideLink}>
                      <span className={styles.guideTitle}>{g.title}</span>
                      <span className={styles.guideDesc}>{g.description}</span>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className={styles.otherTopics}>
          <h3 className={styles.sideTitle}>Other comparisons</h3>
          <TopicList topics={otherTopics} headingLevel="h4" showIntro={false} />
        </div>
      </div>
    </section>
  );
}
