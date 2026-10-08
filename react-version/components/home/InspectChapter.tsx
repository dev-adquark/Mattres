import { Chapter } from '@/components/motion';
import { LayerInspector } from './LayerInspector';
import { ProductStory } from './ProductStory';
import type { StorySlideData } from './types';
import styles from './Inspect.module.css';

interface InspectChapterProps {
  story: StorySlideData[];
  total: number;
}

/**
 * Chapter 04 - Inspect. A full-bleed night stage (LayerInspector: the 3D
 * hybrid and its layer rail), then the product story slider: real catalog
 * entries, ordered by a stated rule (most complete data), never by payment.
 */
export function InspectChapter({ story, total }: InspectChapterProps) {
  return (
    <section id="inspect" className={`mood-dark ${styles.inspect}`} aria-labelledby="inspect-title">
      <div className={`container container--wide ${styles.head}`}>
        <Chapter index={4} label="Inspect" />
        <h2 id="inspect-title" className={styles.title}>
          Inspect the <em>layers.</em>
        </h2>
        <p className={styles.lead}>
          What&rsquo;s inside decides how a mattress feels at 3am. Step through a typical hybrid and see which parts of your Match
          Score each layer mostly drives.
        </p>
      </div>

      <LayerInspector />

      <ProductStory story={story} total={total} />
    </section>
  );
}
