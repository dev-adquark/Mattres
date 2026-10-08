'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Slider } from '@/components/motion';
import { StorySlide } from './StorySlide';
import { useStoryScores } from './useStoryScores';
import type { StorySlideData } from './types';
import styles from './Inspect.module.css';

interface ProductStoryProps {
  story: StorySlideData[];
  total: number;
}

/**
 * Product story slider (brief v3 s9). Full-bleed editorial carousel of
 * real catalog entries: featured rule first (most complete data per build),
 * then the rest by completeness. Drag, swipe, arrows and keys come from the
 * shared <Slider>. The Match Score ring appears only when this visitor has
 * a profile; otherwise the slide offers to score it.
 */
export function ProductStory({ story, total }: ProductStoryProps) {
  const ids = useMemo(() => story.map((s) => s.id), [story]);
  const scores = useStoryScores(ids);
  if (!story.length) return null;

  const header = (
    <div className={styles.storyHead}>
      <h3 className={styles.storyTitle}>
        {total} real mattresses. <em>Start here.</em>
      </h3>
      <p className={styles.storyLead}>Ordered by how complete our data is, never by who pays. Drag, swipe or use the arrows.</p>
    </div>
  );

  return (
    <div className={`container container--wide ${styles.story}`}>
      <Slider
        label="Mattresses to explore"
        id="home-story"
        perView={{ base: 1.18, sm: 1.8, md: 2.4, lg: 3.05, xl: 3.4 }}
        controls="top"
        progress="bar"
        bleed
        header={header}
        className={styles.storySlider}
      >
        {story.map((s, i) => (
          <StorySlide key={s.id} slide={s} index={i} score={scores[s.id]} />
        ))}
      </Slider>
      <p className={styles.storyFoot}>
        <Link href="/mattresses" className="link">
          Browse all {total} mattresses
        </Link>
      </p>
    </div>
  );
}
