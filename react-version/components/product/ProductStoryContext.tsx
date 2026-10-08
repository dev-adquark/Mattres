'use client';

import { createContext, startTransition, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { tierFor } from '@/lib/scoreTiers';
import type { DimensionProvenance, MatchItem, ScoreCategory, SleepPosition, SubScores } from '@/lib/types';
import { profileSummary, type StoredProfile } from './lastResult';
import type { ReferenceRow } from './referenceScores';
import { useMatchFor } from './useMatchFor';

/**
 * Client half of the /mattress/[id] story. One provider holds the sleep
 * position the visitor is looking at, so the hero ring, the position bars
 * and the X-ray performance panel always describe the same engine output:
 *
 *  - 'you'     the visitor's own Match Score (this session's quiz, or a
 *              profile they chose to remember on this device)
 *  - a position id ('side' | 'back' | 'stomach' | 'combination'): the
 *              engine's score for the fully disclosed reference sleeper
 *
 * Every number shown here is passed in from scoreEngine output or read from
 * the catalog. Nothing is computed for display beyond x10 scaling.
 */

export type StorySelection = SleepPosition | 'you';

/** The engine output currently on show. */
export interface StoryView {
  mode: 'you' | 'typical';
  id: StorySelection;
  score: number | null;
  tier: string | null;
  headline: string | null;
  subScores: SubScores | null;
  provenance: Partial<Record<ScoreCategory, DimensionProvenance>> | null;
  rank?: number | null;
  total?: number | null;
  caption: string;
}

interface StoryValue {
  view: StoryView | null;
  select: (id: StorySelection) => void;
  selected: StorySelection;
  rows: readonly ReferenceRow[];
  hasYou: boolean;
  mattressId: string;
  mattressName: string;
  modelVersion: string | null;
}

interface StoryContextValue {
  live: StoryValue;
  initial: StoryValue;
}

const StoryContext = createContext<StoryContextValue | null>(null);

export const POSITION_SHORT: Record<SleepPosition, string> = { side: 'Side', back: 'Back', stomach: 'Stomach', combination: 'Combo' };
const NOUN: Record<SleepPosition, string> = { side: 'side sleeper', back: 'back sleeper', stomach: 'stomach sleeper', combination: 'combination sleeper' };

interface ProductStoryProviderProps {
  mattressId: string;
  mattressName: string;
  /** Reference rows (engine output), one per position. */
  rows: readonly ReferenceRow[];
  defaultPosition: SleepPosition;
  modelVersion: string | null;
  children: ReactNode;
}

function buildView(
  selected: StorySelection,
  item: MatchItem | null,
  profile: StoredProfile | null,
  rows: readonly ReferenceRow[],
  defaultPosition: SleepPosition,
): StoryView | null {
  if (selected === 'you' && item) {
    const score = item.result.overallScore;
    const summary = profileSummary(profile);
    return {
      mode: 'you',
      id: 'you',
      score,
      tier: (item.explanation?.tier || tierFor(score)).label,
      headline: item.explanation?.headline || null,
      subScores: item.result.subScores || null,
      provenance: item.result.dimensionProvenance || null,
      caption: summary ? `Your profile: ${summary}` : 'Your profile',
    };
  }
  const row = rows.find((r) => r.id === selected) || rows.find((r) => r.id === defaultPosition) || rows[0];
  return row
    ? {
        mode: 'typical',
        id: row.id,
        score: typeof row.score === 'number' ? row.score : null,
        tier: row.tier,
        headline: row.headline,
        subScores: row.subScores,
        provenance: row.provenance,
        rank: row.rank,
        total: row.total,
        caption: `Typical ${NOUN[row.id] || row.id}, 160 lb`,
      }
    : null;
}

export function ProductStoryProvider({ mattressId, mattressName, rows, defaultPosition, modelVersion, children }: ProductStoryProviderProps) {
  // Hydration contract with page.tsx, which wraps the below-the-fold chapters
  // in <Suspense> so React hydrates them later, in interruptible slices:
  //
  //  - `hydrated` / `hasQuiz` are NOT part of the context value. They flip on
  //    every load, and any changed provider value forces the still-dehydrated
  //    boundaries below to hydrate at once. Consumers read useMatchFor().
  //    For a visitor without a quiz result the value is referentially stable
  //    across hydration, so the deferred chapters are never force-hydrated.
  //  - With a quiz result the value does change. The provider adopts it in a
  //    transition (`clientReady`), so any forced hydration is interruptible,
  //    and useStory() hands a consumer's hydration render the server-equivalent
  //    `initial` value, so a late-hydrating chapter always matches its HTML.
  const live = useMatchFor(mattressId);
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    startTransition(() => setClientReady(true));
  }, []);
  const item = clientReady ? live.item : null;
  const profile = clientReady ? live.profile : null;
  const [choice, setChoice] = useState<StorySelection | null>(null); // null = automatic (you if available, else default)
  const selected: StorySelection = choice || (item ? 'you' : defaultPosition);

  const value = useMemo<StoryContextValue>(() => {
    const base = { select: setChoice, rows, mattressId, mattressName, modelVersion };
    const liveValue: StoryValue = { ...base, view: buildView(selected, item, profile, rows, defaultPosition), selected, hasYou: Boolean(item) };
    // Exactly what the server rendered: no personal result, default position.
    const initialValue: StoryValue = { ...base, view: buildView(defaultPosition, null, null, rows, defaultPosition), selected: defaultPosition, hasYou: false };
    return { live: liveValue, initial: initialValue };
  }, [selected, item, profile, rows, defaultPosition, mattressId, mattressName, modelVersion]);

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

const noopSubscribe = () => () => {};

/**
 * The story as this component should render it. A consumer's hydration
 * render (server snapshot: false) always gets the server-equivalent value, so
 * a chapter that hydrates late - inside a deferred <Suspense> boundary, after
 * the provider has already adopted the visitor's own result - still matches
 * the server HTML; React re-renders it with the live value right after.
 */
export function useStory(): StoryValue {
  const ctx = useContext(StoryContext);
  const onClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!ctx) throw new Error('ProductStory components must be inside <ProductStoryProvider>');
  return onClient ? ctx.live : ctx.initial;
}
