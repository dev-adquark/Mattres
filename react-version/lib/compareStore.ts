import { useSyncExternalStore } from 'react';
import { track, EVENTS } from './analytics';
import { DEVICE_DATA_CLEARED_EVENT, STORAGE_KEYS } from './deviceStorage';
import type { CompareAddResult, CompareToggleResult } from './types';

/**
 * Compare selection: up to MAX_COMPARE mattress ids, persisted in
 * localStorage under COMPARE_STORAGE_KEY as a JSON array of ids, plus a
 * small id -> display-name cache (COMPARE_LABELS_KEY) so the tray can show
 * names without fetching the catalog. SSR-safe (server snapshot is an
 * empty list) and tolerant of blocked storage (falls back to memory).
 */

type Ids = readonly string[];
type Labels = Readonly<Record<string, string>>;

export const COMPARE_STORAGE_KEY: string = STORAGE_KEYS.compare;
export const COMPARE_LABELS_KEY: string = STORAGE_KEYS.compareLabels;
export const MAX_COMPARE = 3;

const EMPTY: Ids = Object.freeze([]);
const EMPTY_LABELS: Labels = Object.freeze({});

let memoryIds: Ids | null = null; // used when localStorage is unavailable
let memoryLabels: Labels = {};
let cachedRaw: string | null | undefined;
let cachedIds: Ids = EMPTY;
let cachedLabelsRaw: string | null | undefined;
let cachedLabels: Labels = EMPTY_LABELS;
const listeners = new Set<() => void>();

/** The stored string, null when unset, undefined when storage is unavailable. */
function readRaw(key: string): string | null | undefined {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return undefined;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseIds(raw: string): Ids {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = [...new Set(parsed.filter((v): v is string => typeof v === 'string' && v !== ''))].slice(0, MAX_COMPARE);
    return Object.freeze(ids);
  } catch {
    return EMPTY;
  }
}

export function getCompareIds(): Ids {
  if (typeof window === 'undefined') return EMPTY;
  const raw = readRaw(COMPARE_STORAGE_KEY);
  if (raw === undefined) return memoryIds || EMPTY;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = raw ? parseIds(raw) : EMPTY;
  }
  return cachedIds;
}

export function getCompareLabels(): Labels {
  if (typeof window === 'undefined') return EMPTY_LABELS;
  const raw = readRaw(COMPARE_LABELS_KEY);
  if (raw === undefined) return memoryLabels;
  if (raw !== cachedLabelsRaw) {
    cachedLabelsRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      cachedLabels = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Labels) : EMPTY_LABELS;
    } catch {
      cachedLabels = EMPTY_LABELS;
    }
  }
  return cachedLabels;
}

function emit(): void {
  listeners.forEach((cb) => cb());
}

function setIds(ids: Ids): void {
  const next = Object.freeze(ids.slice(0, MAX_COMPARE));
  if (!writeRaw(COMPARE_STORAGE_KEY, JSON.stringify(next))) memoryIds = next;
  emit();
}

/**
 * Caches display names for the tray. All incoming labels are written in one
 * pass: pruning per label would drop the earlier labels of a batch whose ids
 * are not selected yet (setCompareIds), leaving the tray with id-derived names.
 */
function rememberLabels(incoming: Readonly<Record<string, string | null | undefined>>): void {
  const fresh = Object.entries(incoming).filter((kv): kv is [string, string] => Boolean(kv[1]));
  if (!fresh.length) return;
  const labels: Record<string, string> = { ...getCompareLabels() };
  for (const [id, label] of fresh) labels[id] = String(label).slice(0, 120);
  // Keep the cache from growing without bound: only labels for current ids + the incoming ones.
  const keep = new Set([...getCompareIds(), ...fresh.map(([id]) => id)]);
  const pruned = Object.fromEntries(Object.entries(labels).filter(([k]) => keep.has(k)));
  if (!writeRaw(COMPARE_LABELS_KEY, JSON.stringify(pruned))) memoryLabels = pruned;
}

function rememberLabel(id: string, label: string | null | undefined): void {
  rememberLabels({ [id]: label });
}

/**
 * Add a mattress id. Fires compare_added {mattress_id, count, source} on success.
 * @param label display name cached for the tray
 * @param source where it was added from (e.g. 'card', 'detail', 'results')
 */
export function addToCompare(id: string, label?: string | null, source?: string): CompareAddResult {
  const ids = getCompareIds();
  if (ids.includes(id)) return { ok: false, reason: 'duplicate' };
  if (ids.length >= MAX_COMPARE) return { ok: false, reason: 'limit' };
  rememberLabel(id, label);
  setIds([...ids, id]);
  track(EVENTS.COMPARE_ADDED, { mattress_id: id, count: ids.length + 1, source: source || 'unknown' });
  return { ok: true };
}

/** Remove an id. Fires compare_removed {mattress_id, count, source} when it was selected. */
export function removeFromCompare(id: string, source?: string): void {
  const ids = getCompareIds();
  if (!ids.includes(id)) return;
  setIds(ids.filter((x) => x !== id));
  track(EVENTS.COMPARE_REMOVED, { mattress_id: id, count: ids.length - 1, source: source || 'unknown' });
}

export function toggleCompare(id: string, label?: string | null, source?: string): CompareToggleResult {
  if (getCompareIds().includes(id)) {
    removeFromCompare(id, source);
    return { ok: true, selected: false };
  }
  const res = addToCompare(id, label, source);
  return res.ok ? { ok: true, selected: true } : { ok: false, selected: false, reason: res.reason };
}

/** Clear the selection. Fires compare_removed (source 'clear' unless given) per removed id. */
export function clearCompare(source = 'clear'): void {
  const ids = getCompareIds();
  setIds([]);
  ids.forEach((id, i) => track(EVENTS.COMPARE_REMOVED, { mattress_id: id, count: ids.length - 1 - i, source }));
}

/** Replace the whole selection (e.g. from a /compare?ids= URL). */
export function setCompareIds(ids: readonly string[], labels: Readonly<Record<string, string>> = {}): void {
  rememberLabels(labels);
  setIds([...new Set(ids)]);
}

export function compareHref(ids: readonly string[]): string {
  return `/compare?ids=${ids.map(encodeURIComponent).join(',')}`;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === COMPARE_STORAGE_KEY || event.key === COMPARE_LABELS_KEY || event.key === null) callback();
  };
  // "Forget everything on this device" (/privacy) clears storage directly.
  const onCleared = () => {
    memoryIds = null;
    memoryLabels = {};
    callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  };
}

const serverIds = (): Ids => EMPTY;
const serverLabels = (): Labels => EMPTY_LABELS;

/** Reactive list of selected ids (empty during SSR and first hydration pass). */
export function useCompareIds(): Ids {
  return useSyncExternalStore(subscribe, getCompareIds, serverIds);
}

/** Reactive id -> name cache for selected items. */
export function useCompareLabels(): Labels {
  return useSyncExternalStore(subscribe, getCompareLabels, serverLabels);
}
