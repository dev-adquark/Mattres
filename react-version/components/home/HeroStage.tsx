'use client';

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import MattressViewer from '@/components/three/MattressViewer';
import { useScrollProgress } from '@/components/motion';
import { EVENTS, track } from '@/lib/analytics';
import { HeroBuildSwitcher, type BuildAction, type HeroBuild } from './HeroBuildSwitcher';
import styles from './Hero.module.css';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

type HeroPhase = 'intro' | 'layers';

/** A swipe must travel this far sideways, and clearly more sideways than vertical. */
const SWIPE_MIN_PX = 40;
const SWIPE_RATIO = 1.4;

interface HeroStageProps {
  /** Headline group (chapter marker, h1, lead, CTAs). Inert once the layers take over. */
  intro: ReactNode;
  /** The layer teaser that takes the headline's place mid-scroll (its kicker, naming the build, is rendered here). */
  teaser: ReactNode;
  /** The constructions the hero visual slider switches between. */
  builds: readonly HeroBuild[];
  /** Mobile stills (image first under 900px), one per build, same order. Only the selected one is mounted. */
  mobileVisuals: readonly ReactNode[];
  /** Stats pinned to the bottom of the stage. */
  base: ReactNode;
}

/**
 * The interactive half of chapter 01: the pinned section, its scroll
 * progress and the 3D illustration whose layers separate with it. All copy
 * arrives as server-rendered slots; this component only owns the scroll
 * phase (which slot is interactive) and the explode amount.
 */
export function HeroStage({ intro, teaser, builds, mobileVisuals, base }: HeroStageProps) {
  const ref = useRef<HTMLElement>(null);
  const [buildIndex, setBuildIndex] = useState(0);
  // Only a user-chosen build cross-fades in: the first still paints at full
  // opacity immediately (it is the mobile LCP element).
  const [switched, setSwitched] = useState(false);
  const total = builds.length;
  const changeBuild = useCallback(
    (next: number, action: BuildAction) => {
      const i = ((next % total) + total) % total;
      if (i === buildIndex) return;
      setBuildIndex(i);
      setSwitched(true);
      track(EVENTS.SLIDER_INTERACTION, { slider: 'home-hero-build', action, index: i + 1, total });
    },
    [buildIndex, total],
  );
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const onSwipeStart = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onSwipeEnd = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    changeBuild(buildIndex + (dx < 0 ? 1 : -1), 'swipe');
  };
  const onSwipeCancel = () => {
    swipe.current = null;
  };
  const build = builds[buildIndex] ?? builds[0];
  const buildWord = build ? build.label.toLowerCase() : 'hybrid';
  const [explode, setExplode] = useState(0);
  const [phase, setPhase] = useState<HeroPhase>('intro');

  const onProgress = useCallback((raw: number) => {
    // Matches --p in Hero.module.css: choreography runs over the first 90vh of the 190vh pin.
    const p = clamp01(raw * 2.111);
    const desktop = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
    if (!desktop) return;
    const next = Math.round(clamp01((p - 0.35) / 0.35) * 0.82 * 20) / 20;
    setExplode((prev) => (prev === next ? prev : next));
    const nextPhase: HeroPhase = p > 0.38 ? 'layers' : 'intro';
    setPhase((prev) => (prev === nextPhase ? prev : nextPhase));
  }, []);
  useScrollProgress(ref, { mode: 'pin', onProgress });
  // Below 900px the hero is not pinned; this drives its scroll-out instead
  // (0 at rest, 1 once the section has left the top). CSS-only consumers.
  useScrollProgress(ref, { mode: 'exit', property: '--hero-exit' });

  const layersShown = phase === 'layers';

  return (
    <section
      ref={ref}
      id="discover"
      className={`section--cinematic ${styles.hero}`}
      data-nav-theme="dark"
      data-phase={phase}
      aria-labelledby="home-hero-title"
    >
      <div className={styles.stage}>
        <div className={styles.night} aria-hidden="true" />

        {/* Desktop: the 3D illustration, poster first. */}
        <div className={styles.visual}>
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.visualMove}>
            <MattressViewer
              variant="hero"
              mattressType={build ? build.type : 'hybrid'}
              fill
              tone="dark"
              caption={false}
              explode={explode}
              label={`Illustration of a typical ${buildWord} mattress with bedding, at night. As the page scrolls its four layers separate. Not a photo of a specific product.`}
            />
          </div>
        </div>

        {/* Mobile still: swipe left/right to step through the constructions (the chips,
            arrows and arrow keys below do the same; this surface adds touch and drag). */}
        <div
          className={styles.mobileVisual}
          data-build={build ? build.type : undefined}
          data-switched={switched ? 'true' : undefined}
          onPointerDown={onSwipeStart}
          onPointerUp={onSwipeEnd}
          onPointerCancel={onSwipeCancel}
        >
          {mobileVisuals[buildIndex] ?? mobileVisuals[0]}
        </div>

        <div className={`container container--max ${styles.copy}`}>
          <div className={styles.intro} inert={layersShown ? true : undefined}>
            {intro}
          </div>

          <div className={styles.teaser} inert={layersShown ? undefined : true} aria-hidden={layersShown ? undefined : 'true'}>
            <p className={styles.teaserKicker}>Inside a typical {buildWord}</p>
            {teaser}
          </div>
        </div>

        {base}

        <HeroBuildSwitcher builds={builds} index={buildIndex} onChange={changeBuild} />

        <p className={styles.dragHint} aria-hidden="true">
          Drag to rotate
        </p>
      </div>
    </section>
  );
}
