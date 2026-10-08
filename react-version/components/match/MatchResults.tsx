'use client';

import { useCallback, useEffect, useRef } from 'react';
import { track, EVENTS } from '@/lib/analytics';
import type { StoredMatchResult } from '@/lib/useLastResult';
import { EmptyResults } from './EmptyResults';
import { MatchReveal } from './MatchReveal';
import { ResultsMethod } from './ResultsMethod';
import { ResultsNextSteps } from './ResultsNextSteps';
import { ResultsProfile } from './ResultsProfile';
import { ResultsRanking } from './ResultsRanking';
import { pickTopMatch, rankedExcept } from './matchRanking';
import { scrollBehavior } from './motion';
import type { QuizAnswers } from './quizModel';

interface MatchResultsProps {
  /** The stored payload (lib/useLastResult v2). */
  data: StoredMatchResult;
  answers: QuizAnswers;
  onEdit: (step: number) => void;
  onRestart: () => void;
  onPatch: (partial: Partial<QuizAnswers>) => void;
  /** Move focus to the reveal heading (after a fresh submit). */
  focusOnMount: boolean;
}

/**
 * Results view: the reveal (top match), why / watch-outs, the ranking
 * (#2-#5 as editorial cards, then the full list), next steps tailored to
 * the profile, the profile itself (editable, optionally remembered) and how
 * it was scored.
 */
export function MatchResults({ data, answers, onEdit, onRestart, onPatch, focusOnMount }: MatchResultsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rankingHeadingRef = useRef<HTMLHeadingElement>(null);
  const results = data.results || [];
  // The recommendation is the best NON-sponsored result (engine isTopMatch
  // rule); a sponsored entry is never revealed as "Your top match".
  const topRanked = pickTopMatch(results);
  const top = topRanked ? topRanked.item : null;
  const others = rankedExcept(results, top);
  const viewedFor = useRef<string | null>(null);

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus({ preventScroll: true });
  }, [focusOnMount, data.savedAt]);

  useEffect(() => {
    if (viewedFor.current === data.savedAt) return;
    viewedFor.current = data.savedAt;
    track(EVENTS.MATCH_VIEWED, {
      result_count: results.length,
      top_mattress_id: top ? top.entry.id : null,
      top_score: top ? top.result.overallScore : null,
      score_version: data.scoreVersion || data.modelVersion || null,
    });
  }, [data.savedAt, data.scoreVersion, data.modelVersion, results.length, top]);

  const seeAll = useCallback(() => {
    document.getElementById('ranking')?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    rankingHeadingRef.current?.focus({ preventScroll: true });
  }, []);

  if (!results.length) return <EmptyResults answers={answers} onPatch={onPatch} onEdit={onEdit} headingRef={headingRef} />;

  return (
    <>
      {topRanked ? (
        <MatchReveal item={topRanked.item} rank={topRanked.rank} total={results.length} headingRef={headingRef} onSeeAll={seeAll} />
      ) : null}
      {others.length ? (
        <ResultsRanking
          items={others}
          total={results.length}
          top={top}
          headingRef={topRanked ? rankingHeadingRef : headingRef}
        />
      ) : null}
      <ResultsNextSteps profile={data.profile} />
      <ResultsProfile
        answers={answers}
        profile={data.profile}
        scoreVersion={data.scoreVersion}
        factors={(top || results[0])?.explanation?.profileFactors || []}
        onEdit={onEdit}
        onRestart={onRestart}
      />
      <ResultsMethod modelVersion={data.modelVersion} scoreVersion={data.scoreVersion} audit={data.catalogAudit} />
    </>
  );
}
