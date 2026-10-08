import { useSyncExternalStore } from 'react';
import { DEVICE_DATA_CLEARED_EVENT, STORAGE_KEYS, readItem, removeItem, writeItem } from '@/lib/deviceStorage';

/**
 * Recent site searches: the last RECENT_LIMIT queries, newest first, in
 * localStorage (mms_recent_searches). Stored only on this device; never
 * sent anywhere (analytics receives counts, not the text).
 */
export const RECENT_LIMIT = 5;
type Recent = readonly string[];

const KEY: string = STORAGE_KEYS.recentSearches;
const EMPTY: Recent = Object.freeze([]);
const listeners = new Set<() => void>();
let memory: Recent = EMPTY;
let cachedRaw: string | undefined;
let cached: Recent = EMPTY;

function parse(raw: string): Recent {
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return EMPTY;
    return Object.freeze(list.filter((q): q is string => typeof q === 'string' && q.trim() !== '').map((q) => q.slice(0, 80)).slice(0, RECENT_LIMIT));
  } catch {
    return EMPTY;
  }
}

export function getRecentSearches(): Recent {
  if (typeof window === 'undefined') return EMPTY;
  const raw: string | null | undefined = readItem('local', KEY);
  if (raw == null) return memory;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function emit(): void {
  listeners.forEach((cb) => cb());
}

/** Adds a query (trimmed, case-insensitively de-duplicated) to the front. */
export function addRecentSearch(query: string): void {
  const q = String(query || '').trim().slice(0, 80);
  if (q.length < 2) return;
  const next = Object.freeze([q, ...getRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_LIMIT));
  if (!writeItem('local', KEY, JSON.stringify(next))) memory = next;
  emit();
}

export function clearRecentSearches(): void {
  removeItem('local', KEY);
  memory = EMPTY;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e || e.key === KEY || e.key === null) cb();
  };
  const onCleared = () => {
    memory = EMPTY;
    cb();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  };
}

const server = (): Recent => EMPTY;

export function useRecentSearches(): Recent {
  return useSyncExternalStore(subscribe, getRecentSearches, server);
}
