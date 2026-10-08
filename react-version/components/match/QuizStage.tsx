'use client';

import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuizProgress } from './QuizProgress';
import { QuizFooter } from './QuizFooter';
import { BodyStep, ComfortStep, EnvironmentStep, PrioritiesStep, SleepStep, type StepFieldsProps } from './QuizSteps';
import { STEP_COPY } from './quizCopy';
import { QUESTION_STEPS, countEligible, questionStepAt, validateStep, type QuizAnswers, type QuizCatalogItem, type QuizErrorKey, type QuizErrors } from './quizModel';
import { scrollBehavior } from './motion';
import styles from './Quiz.module.css';

interface QuizStageProps {
  answers: QuizAnswers;
  /** Current QUESTION_STEPS index. */
  step: number;
  catalog: readonly QuizCatalogItem[];
  catalogCount: number;
  brandCount: number;
  notice: string | null;
  /**
   * Move focus to the current step's question when the quiz mounts. Set when
   * the user comes back from the results view (Edit answers, an answer chip,
   * Start over, or Review from the error view) so focus never drops to
   * <body> on that view change (WCAG 2.4.3). False on a plain page load.
   */
  focusOnMount?: boolean;
  onAnswer: (partial: Partial<QuizAnswers>) => void;
  onStep: (step: number) => void;
  onSubmit: () => void;
}

type Direction = 'forward' | 'back';

const describe = (...keys: (string | false | null | undefined)[]): string | undefined => keys.filter(Boolean).join(' ') || undefined;

/**
 * The interactive quiz: chapter progress, one step at a time, inline
 * validation, Back/Next. Answers are owned by the quiz store (passed in);
 * this component only renders and reports changes. The step bodies live in
 * QuizSteps.
 */
export function QuizStage({ answers, step, catalog, catalogCount, brandCount, notice, focusOnMount = false, onAnswer, onStep, onSubmit }: QuizStageProps) {
  const uid = useId();
  const ids = (k: string) => `${uid}-${k}`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const errorFocusRef = useRef<HTMLInputElement | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<QuizErrors>({});
  // null until the first step change: the first question paints in place
  // (it is the page's LCP text), later steps slide in.
  const [dir, setDir] = useState<Direction | null>(null);
  const [showExact, setShowExact] = useState(false);
  const lastStep = useRef(step);
  const current = questionStepAt(step);
  const copy = STEP_COPY[current.id];
  const isLast = step === QUESTION_STEPS.length - 1;
  const collapsed = step > 0;
  const eligible = countEligible(catalog, answers);
  const exactOpen = showExact || !!answers.weightExact;

  // Move focus to the new step's question (not on first paint).
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    const top = h.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight * 0.6) {
      h.closest('section')?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }
  }, [step]);

  // Returning from results (focusOnMount): the quiz mounts on the step being
  // edited (or step 1 after Start over). Focus that step's question so screen
  // readers announce the view change and Tab continues from the question.
  // Read once: only the mount that follows the view change should move focus.
  const focusOnMountRef = useRef(focusOnMount);
  useEffect(() => {
    if (!focusOnMountRef.current) return;
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    // The page was scrolled to the top; keep the focused question visible
    // (on a phone the step-1 question sits below the intro).
    const { top, bottom } = h.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight * 0.75) {
      h.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, []);

  // The sticky Back/Next bar overlays the bottom of the viewport. Publish its
  // height as --quiz-nav-h so html's scroll-padding-bottom (Quiz.module.css)
  // reserves that space when the browser scrolls a focused control into view
  // (WCAG 2.2 SC 2.4.11 Focus Not Obscured).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--quiz-nav-h', `${Math.ceil(nav.getBoundingClientRect().height)}px`);
    publish();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    ro?.observe(nav);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--quiz-nav-h');
    };
    // The form (and its bar) remounts when the layout key flips after step 1.
  }, [collapsed]);

  // Belt and braces for engines that ignore scroll-padding on focus scrolling
  // (and for focus that lands without a scroll, e.g. an already-visible
  // control the bar covers): if a focused control sits under the sticky bar,
  // scroll it clear.
  const keepFocusVisible = (e: FocusEvent<HTMLFormElement>) => {
    const nav = navRef.current;
    const target = e.target as HTMLElement;
    if (!nav || nav.contains(target)) return;
    // Visually hidden inputs (custom radios/checkboxes) are 1px; use the
    // visible tile that wraps them when there is one.
    const box = (target.closest('label') ?? target).getBoundingClientRect();
    const barTop = nav.getBoundingClientRect().top;
    const overlap = box.bottom + 32 - barTop; // clear the bar's fade shadow too
    if (overlap > 0) window.scrollBy({ top: overlap, behavior: 'auto' });
  };

  // After a failed Next, focus the first invalid control.
  useEffect(() => {
    if (errorFocusRef.current) {
      errorFocusRef.current.focus();
      errorFocusRef.current = null;
    }
  }, [errors]);

  const answer = (partial: Partial<QuizAnswers>) => {
    onAnswer(partial);
    // Clear errors for fields that were just answered.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(partial) as (keyof QuizAnswers)[]) delete next[k];
      if ('weightExact' in partial) delete next.weightBand;
      if ('weightBand' in partial) delete next.weightBand;
      if ('types' in partial || 'budgetMax' in partial) delete next.eligible;
      return next;
    });
  };

  const validate = (): QuizErrors => {
    const errs = validateStep(current.id, answers);
    if (current.id === 'priorities' && eligible === 0) {
      errs.eligible = 'No mattresses in the catalog fit these filters. Raise your budget or allow more types.';
    }
    return errs;
  };

  const next = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const errs = validate();
    setErrors(errs);
    const firstKey = Object.keys(errs)[0] as QuizErrorKey | undefined;
    if (firstKey) {
      errorFocusRef.current = document.getElementById(ids(`focus-${firstKey}`))?.querySelector('input') || firstInputRef.current;
      return;
    }
    if (isLast) {
      onSubmit();
      return;
    }
    setDir('forward');
    onStep(step + 1);
  };

  const back = () => {
    setErrors({});
    setDir('back');
    onStep(step - 1);
  };

  const jump = (i: number) => {
    setErrors({});
    setDir(i < step ? 'back' : 'forward');
    onStep(i);
  };

  const fields: StepFieldsProps = { answers, errors, ids, describe, answer, firstInputRef };
  // Leaving step 1 collapses the statement above the rail; on a single
  // column that lifts the rail and the panel. Remounting both on that one
  // change (keyed by the collapse state) makes them enter as new content
  // instead of moving, so the step change adds no layout shift (CLS).
  const layoutKey = collapsed ? 'steps' : 'intro';

  return (
    <section className={`section section--cinematic ${styles.stage}`} data-nav-theme="dark" aria-labelledby={ids('h1')}>
      <div className={`container container--wide ${styles.layout}`}>
        <aside className={styles.aside} data-collapsed={collapsed ? '' : undefined}>
          <p className="eyebrow">Find your match</p>
          <h1 id={ids('h1')} className={styles.title}>
            Built around the way you <em>sleep.</em>
          </h1>
          <p className={styles.intro}>
            Five short steps. We score {catalogCount ? `all ${catalogCount} mattresses` : 'every mattress'}
            {brandCount ? ` from ${brandCount} brands` : ''} in our catalog against your answers, then show why each one
            fits and what might not.
          </p>
          <QuizProgress key={layoutKey} step={step} answers={answers} onJump={jump} />
        </aside>

        <form key={layoutKey} className={styles.panel} onSubmit={next} onFocus={keepFocusVisible} noValidate>
          {notice ? (
            <p className={styles.notice} role="status">
              <Info aria-hidden="true" />
              {notice}
            </p>
          ) : null}

          <div key={current.id} className={styles.stepAnim} data-dir={dir ?? undefined}>
            <p className={`eyebrow eyebrow--plain ${styles.stepCount}`}>
              Step {Number(current.index)} of {QUESTION_STEPS.length} · {current.label}
            </p>
            <h2 id={ids('q')} ref={headingRef} tabIndex={-1} className={styles.question}>
              {copy.question}
            </h2>
            <p id={ids('sub')} className={styles.sub}>
              {copy.sub}
            </p>

            {current.id === 'sleep' ? <SleepStep {...fields} /> : null}
            {current.id === 'body' ? <BodyStep {...fields} exactOpen={exactOpen} onShowExact={() => setShowExact(true)} /> : null}
            {current.id === 'comfort' ? <ComfortStep {...fields} /> : null}
            {current.id === 'environment' ? <EnvironmentStep {...fields} /> : null}
            {current.id === 'priorities' ? <PrioritiesStep {...fields} eligible={eligible} catalogTotal={catalog.length} /> : null}

            <div className={styles.why}>
              <p className={styles.whyLabel}>Why we ask</p>
              <p>{copy.why}</p>
            </div>
          </div>

          <div ref={navRef} className={styles.nav}>
            {step > 0 ? (
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" size="lg" arrow magnetic={isLast}>
              {isLast ? 'See my matches' : 'Next'}
            </Button>
          </div>
        </form>
      </div>
      <QuizFooter saved />
    </section>
  );
}
