'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { track, EVENTS } from '@/lib/analytics';
import { useLastResult, type StoredMatchResult } from '@/lib/useLastResult';
import { hasSavedProfile, loadSavedProfile, saveProfileOnDevice } from '@/lib/deviceStorage';
import { QuizStage } from './QuizStage';
import { MatchLoading } from './MatchLoading';
import { MatchResults } from './MatchResults';
import { MatchError } from './MatchError';
import { requestMatch, type MatchErrorKind, type MatchOutcome } from './matchApi';
import { prefersReducedMotion } from './motion';
import {
  QUESTION_STEPS,
  answersFromSearch,
  answersKey,
  answersToProfile,
  firstInvalidStep,
  isScorableProfile,
  profileToAnswers,
  validateStep,
  type QuizAnswers,
  type QuizCatalogItem,
} from './quizModel';
import { pickTopMatch } from './matchRanking';
import { getQuizState, resetQuiz, setAnswers, updateQuiz, useQuizHydrated, useQuizState } from './quizStore';

const MIN_LOADING_MS = 1500;
const LAST_STEP = QUESTION_STEPS.length - 1;

type Phase = 'loading' | 'error' | null;

interface SubmitOptions {
  /** A remembered profile being re-scored (not a fresh quiz completion). */
  restored?: boolean;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface MatchExperienceProps {
  /** Only what the quiz needs to warn before an empty result: type + Queen price. */
  catalog: readonly QuizCatalogItem[];
  catalogCount: number;
  brandCount: number;
}

/**
 * /find-match orchestrator: quiz -> staged loading -> match reveal and
 * results, plus error / empty / recovery states.
 *  - Quiz answers + step live in sessionStorage (quizStore), so a refresh
 *    keeps progress; ?position=&firmness= prefill the quiz.
 *  - The scored result is stored via useLastResult ('mms_last_result') so
 *    mattress detail pages can show "your score" for any scored mattress.
 *  - Scores only ever come from POST /api/match (matchApi).
 */
export function MatchExperience({ catalog, catalogCount, brandCount }: MatchExperienceProps) {
  const state = useQuizState();
  const hydrated = useQuizHydrated();
  const { payload, setPayload } = useLastResult();
  const [phase, setPhase] = useState<Phase>(null);
  const [errorKind, setErrorKind] = useState<MatchErrorKind | null>(null);
  const [live, setLive] = useState<StoredMatchResult | null>(null); // in-memory copy in case sessionStorage is full/unavailable
  const [focusResults, setFocusResults] = useState(false);
  // Set when leaving results for the quiz, so QuizStage focuses the question on mount.
  const [focusQuiz, setFocusQuiz] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { answers, step, view } = state;
  const key = answersKey(answers);
  const stored: StoredMatchResult | null =
    live && live.answersKey === key
      ? live
      : payload && payload.version === 2 && payload.answersKey === key
        ? // A v2 payload this page wrote itself (same answers key): complete by construction.
          (payload as StoredMatchResult)
        : null;

  // Prefill from ?position=&firmness= once, then drop the params so a
  // refresh doesn't re-apply them over later edits.
  useEffect(() => {
    const pre = answersFromSearch(window.location.search);
    if (!Object.keys(pre).length) return;
    const current = getQuizState();
    const merged: QuizAnswers = { ...current.answers, ...pre };
    const firstOpen = QUESTION_STEPS.findIndex((s) => Object.keys(validateStep(s.id, merged)).length > 0);
    updateQuiz({ answers: merged, view: 'quiz', step: firstOpen === -1 ? LAST_STEP : firstOpen });
    if (!current.started) {
      updateQuiz({ started: true });
      track(EVENTS.QUIZ_STARTED, { source: 'prefill' });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('position');
    url.searchParams.delete('firmness');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onAnswer = useCallback((partial: Partial<QuizAnswers>) => {
    if (!getQuizState().started) {
      updateQuiz({ started: true });
      track(EVENTS.QUIZ_STARTED, { source: 'direct' });
    }
    setNotice(null);
    setAnswers(partial);
  }, []);

  const onStep = useCallback((i: number) => updateQuiz({ step: Math.max(0, Math.min(LAST_STEP, i)) }), []);

  const submit = useCallback(
    async (overrideAnswers?: QuizAnswers, { restored = false }: SubmitOptions = {}) => {
      const current = overrideAnswers || getQuizState().answers;
      const invalidAt = firstInvalidStep(current);
      const profile = answersToProfile(current);
      if (invalidAt !== -1 || !isScorableProfile(profile)) {
        updateQuiz({ view: 'quiz', step: invalidAt === -1 ? 0 : invalidAt });
        setNotice('Some answers need another look before we can score.');
        setPhase(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase('loading');
      setErrorKind(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (!restored) track(EVENTS.QUIZ_COMPLETED, {
        position: profile.sleepPosition,
        firmness: profile.preferredFirmnessLabel,
        temperature: profile.sleepTemperature,
        sharing: profile.motionSensitivity || 'unanswered',
        pain_focus: typeof profile.painFocus === 'string' ? profile.painFocus : 'unanswered',
        edge: profile.edgeImportance || 'unanswered',
        type_count: (profile.mattressTypePreference || []).length,
        has_budget: !!profile.budgetUsd,
      });

      const started = performance.now();
      const outcome: MatchOutcome | null = await requestMatch(profile, controller.signal);
      if (!outcome) return; // aborted
      if (!prefersReducedMotion()) {
        const remaining = MIN_LOADING_MS - (performance.now() - started);
        if (remaining > 0) await wait(remaining);
      }
      if (controller.signal.aborted) return;

      if ('error' in outcome) {
        setErrorKind(outcome.error);
        setPhase('error');
        return;
      }

      const data = outcome.data;
      const next: StoredMatchResult = {
        version: 2,
        savedAt: new Date().toISOString(),
        answersKey: answersKey(current),
        answers: current,
        profile,
        scoreVersion: data.scoreVersion || null,
        modelVersion: data.modelVersion || null,
        results: data.results,
        top: pickTopMatch(data.results)?.item || null,
        all: data.all || [],
        catalogAudit: (data.catalogAudit as StoredMatchResult['catalogAudit']) || null,
        catalogSource: data.catalogSource || null,
      };
      setLive(next);
      setPayload(next);
      // Opted in to "Remember my matches on this device": keep the remembered profile current.
      if (hasSavedProfile()) saveProfileOnDevice(profile, next.scoreVersion);
      updateQuiz({ view: 'results', answers: current });
      setFocusResults(true);
      setFocusQuiz(false);
      setPhase(null);
    },
    [setPayload]
  );

  // Opt-in remembered profile: on a fresh visit (no quiz in progress, no
  // result in this tab, no URL prefill), re-score it with the current engine.
  const restoreTried = useRef(false);
  useEffect(() => {
    if (!hydrated || restoreTried.current) return undefined;
    const current = getQuizState();
    if (current.started || current.view === 'results' || Object.keys(answersFromSearch(window.location.search)).length) return undefined;
    const saved = profileToAnswers(loadSavedProfile());
    if (!saved || firstInvalidStep(saved) !== -1) return undefined;
    // Deferred so the effect itself never sets state; cancelled on unmount.
    const timer = setTimeout(() => {
      restoreTried.current = true;
      updateQuiz({ answers: saved, started: true, step: LAST_STEP });
      void submit(saved, { restored: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [hydrated, submit]);

  const onEdit = useCallback((i: number) => {
    setPhase(null);
    setFocusQuiz(true);
    updateQuiz({ view: 'quiz', step: i });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const onRestart = useCallback(() => {
    setLive(null);
    setPhase(null);
    setFocusQuiz(true);
    resetQuiz();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const onPatch = useCallback(
    (partial: Partial<QuizAnswers>) => {
      const merged = { ...getQuizState().answers, ...partial };
      setAnswers(partial);
      void submit(merged);
    },
    [submit]
  );

  if (phase === 'loading') return <MatchLoading answers={answers} catalogCount={catalogCount} stageMs={prefersReducedMotion() ? 0 : 500} />;
  if (phase === 'error') return <MatchError kind={errorKind} onRetry={() => void submit()} onReview={() => onEdit(LAST_STEP)} />;

  if (hydrated && view === 'results' && stored) {
    return <MatchResults data={stored} answers={answers} onEdit={onEdit} onRestart={onRestart} onPatch={onPatch} focusOnMount={focusResults} />;
  }

  // Results were requested but the stored result is gone or no longer
  // matches the answers (e.g. storage cleared): recover into the quiz.
  const recovering = hydrated && view === 'results' && !stored;
  return (
    <QuizStage
      answers={answers}
      step={recovering ? LAST_STEP : step}
      catalog={catalog}
      catalogCount={catalogCount}
      brandCount={brandCount}
      focusOnMount={focusQuiz}
      notice={recovering ? 'Your previous results are no longer available in this tab. Your answers are still here: review them and score again.' : notice}
      onAnswer={onAnswer}
      onStep={(i) => {
        if (recovering) updateQuiz({ view: 'quiz' });
        onStep(i);
      }}
      onSubmit={() => void submit()}
    />
  );
}
