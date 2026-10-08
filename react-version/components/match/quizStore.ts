'use client';

import { useSyncExternalStore } from 'react';
import { DEVICE_DATA_CLEARED_EVENT } from '@/lib/deviceStorage';
import { EMPTY_ANSWERS, QUESTION_STEPS, QUIZ_STATE_VERSION, QUIZ_STORAGE_KEY, sanitiseAnswers, type QuizAnswers } from './quizModel';

/**
 * Quiz progress store backed by sessionStorage (key 'mms_quiz_state'), so a
 * refresh never loses answers. Read with useSyncExternalStore: SSR and the
 * hydration pass see the empty initial state, then the stored state.
 */

export type QuizView = 'quiz' | 'results';

export interface QuizState {
  v: number;
  answers: QuizAnswers;
  /** Index into QUESTION_STEPS (0-4). */
  step: number;
  view: QuizView;
  started: boolean;
}

export type QuizPatch = Partial<Omit<QuizState, 'v'>>;

const INITIAL: Readonly<QuizState> = Object.freeze({ v: QUIZ_STATE_VERSION, answers: EMPTY_ANSWERS, step: 0, view: 'quiz', started: false });

let memory: string | null = null; // fallback when sessionStorage is unavailable
let cachedRaw: string | null | undefined;
let cachedState: QuizState = INITIAL;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(QUIZ_STORAGE_KEY);
  } catch {
    return memory;
  }
}

function parse(raw: string | null): QuizState {
  if (!raw) return INITIAL;
  try {
    // Untrusted JSON from storage: every field is checked below.
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return INITIAL;
    const d = data as Record<string, unknown>;
    if (d.v !== QUIZ_STATE_VERSION) return INITIAL;
    const step = typeof d.step === 'number' && Number.isInteger(d.step) ? Math.max(0, Math.min(QUESTION_STEPS.length - 1, d.step)) : 0;
    return {
      v: QUIZ_STATE_VERSION,
      answers: sanitiseAnswers(d.answers),
      step,
      view: d.view === 'results' ? 'results' : 'quiz',
      started: !!d.started,
    };
  } catch {
    return INITIAL;
  }
}

function getSnapshot(): QuizState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parse(raw);
  }
  return cachedState;
}

function getServerSnapshot(): QuizState {
  return INITIAL;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // "Forget everything on this device" removes the stored quiz state.
  const onCleared = () => {
    memory = null;
    cb();
  };
  window.addEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  return () => {
    listeners.delete(cb);
    window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  };
}

function write(next: QuizState): void {
  const raw = JSON.stringify(next);
  try {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, raw);
  } catch {
    memory = raw;
  }
  listeners.forEach((cb) => cb());
}

export function getQuizState(): QuizState {
  return typeof window === 'undefined' ? INITIAL : getSnapshot();
}

/** Shallow-merges into the stored state. `patch` may be a function of the current state. */
export function updateQuiz(patch: QuizPatch | ((current: QuizState) => QuizPatch)): void {
  const current = getQuizState();
  const delta = typeof patch === 'function' ? patch(current) : patch;
  write({ ...current, ...delta, v: QUIZ_STATE_VERSION });
}

export function setAnswers(partial: Partial<QuizAnswers>): void {
  updateQuiz((s) => ({ answers: { ...s.answers, ...partial } }));
}

export function resetQuiz(): void {
  write({ ...INITIAL });
}

export function useQuizState(): QuizState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** False during SSR and hydration, true once stored state can be trusted. */
export function useQuizHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
