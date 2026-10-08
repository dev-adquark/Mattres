'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import { useScrollProgress } from './useScrollProgress';
import { stickyStory as s } from '@/components/ui/systemStyles';

export interface StoryStep {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  body: ReactNode;
  /** Per-step media override (mobile). */
  media?: ReactNode;
}

type StoryMedia = ReactNode[] | ((index: number, ctx: { stepId: string | undefined }) => ReactNode) | ReactNode;

interface StickyStoryProps {
  steps?: StoryStep[];
  media?: StoryMedia;
  /** Accessible name for the region. */
  label: string;
  mediaSide?: 'left' | 'right';
  onStepChange?: (index: number) => void;
  headingLevel?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * Pinned split storytelling section. On >= 900px the media column is
 * position: sticky while the steps scroll past; the step crossing the
 * middle of the viewport becomes active. Below 900px it stacks: each step
 * renders its own media above its text (no pinning, nothing hidden).
 *
 * Props:
 *  - steps: [{ id, eyebrow?, title, body (node), media? (node, per-step override) }]
 *  - media: the sticky visual (desktop). Either
 *      an ARRAY of nodes, one per step (works from Server Components; the
 *      frames are stacked and cross-fade on step change), or
 *      a FUNCTION (activeIndex, { stepId }) => node (Client Components only), or
 *      a single node (static visual).
 *    On mobile each step shows step.media, else media[i] / media(i).
 *  - label: accessible name for the region (required)
 *  - mediaSide: 'left' | 'right' (default 'right')
 *  - onStepChange?: (index) => void
 *  - headingLevel: 'h3' default
 *  - className
 * The container gets --progress (0..1, pin mode) for CSS-driven extras and
 * data-active-step on itself. Active step text is full opacity, others 0.38.
 * Reduced motion: no opacity/transform transitions, same behaviour.
 */
export function StickyStory({ steps = [], media, label, mediaSide = 'right', onStepChange, headingLevel = 'h3', className }: StickyStoryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const cb = useRef(onStepChange);
  useEffect(() => {
    cb.current = onStepChange;
  });
  useScrollProgress(rootRef, { mode: 'pin' });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-story-step]'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = Number(entry.target.getAttribute('data-story-step'));
          setActive(i);
          if (cb.current) cb.current(i);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [steps.length]);

  const Heading = headingLevel;
  const activeStep = steps[active];
  const mediaFor = (i: number): ReactNode => (typeof media === 'function' ? media(i, { stepId: steps[i]?.id }) : Array.isArray(media) ? media[i] : media);
  const stage = Array.isArray(media)
    ? media.map((node, i) => (
        <div key={i} className={s.frame} data-active={i === active ? 'true' : 'false'} aria-hidden={i === active ? undefined : 'true'}>
          {node}
        </div>
      ))
    : mediaFor(active);

  return (
    <section
      ref={rootRef}
      className={cx(s.story, mediaSide === 'left' && s.mediaLeft, className)}
      aria-label={label}
      data-active-step={activeStep ? activeStep.id : undefined}
    >
      {media ? (
        <div className={s.media}>
          <div className={s.stage}>{stage}</div>
        </div>
      ) : null}
      <ol className={s.steps}>
        {steps.map((step, i) => (
          <li key={step.id} className={s.step} data-story-step={i} data-active={i === active ? 'true' : 'false'}>
            {step.media || media ? (
              <div className={s.stepMedia}>{step.media || mediaFor(i)}</div>
            ) : null}
            <p className={s.index} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
              <span> / {String(steps.length).padStart(2, '0')}</span>
            </p>
            {step.eyebrow ? <p className="eyebrow eyebrow--plain">{step.eyebrow}</p> : null}
            <Heading className={s.title}>{step.title}</Heading>
            <div className={s.body}>{step.body}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
