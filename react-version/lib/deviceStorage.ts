import { validateProfile, POSITIONS, FIRMNESS_LABELS, TEMPERATURES, MOTION_SENSITIVITIES, MATTRESS_TYPES, PAIN_FOCUS, EDGE_IMPORTANCE, SCORE_VERSIONS } from './profileValidation';
import type { BudgetRange, ScoreVersion, SleepProfile } from './types';

export type StorageKind = 'local' | 'session';

/** The sanitised profile kept on the device: enumerated choices and numbers only, no free text. */
export type StoredProfile = Partial<Omit<SleepProfile, 'painFocus' | 'budgetUsd'>> & {
  painFocus?: SleepProfile['painFocus'];
  budgetUsd?: { min: number; max?: BudgetRange['max'] };
};

export interface DeviceDataItem {
  key: string;
  storage: StorageKind;
  label: string;
  what: string;
  lifetime: string;
}

/**
 * Everything this site keeps in the visitor's browser, in one place.
 * No accounts and no server persistence: these keys never leave the device.
 * Every access is wrapped in try/catch (private mode, blocked storage,
 * SSR) and callers get null / false instead of an exception.
 *
 * The /privacy page lists DEVICE_DATA (the "Your data on this device"
 * section) and offers forgetEverythingOnDevice().
 */

export const STORAGE_KEYS = Object.freeze({
  quizState: 'mms_quiz_state', // sessionStorage: in-progress quiz answers
  lastResult: 'mms_last_result', // sessionStorage: the latest match result
  savedProfile: 'mms_saved_profile', // localStorage, opt-in: profile enums + scoreVersion
  compare: 'mms_compare', // localStorage: up to 3 mattress ids
  compareLabels: 'mms_compare_labels', // localStorage: display names for those ids
  recentSearches: 'mms_recent_searches', // localStorage: last 5 search queries
  catalogView: 'mms_catalog_view', // localStorage: gallery or list layout of the mattress catalog
});

/** Human-readable inventory for the privacy page. */
export const DEVICE_DATA: readonly DeviceDataItem[] = Object.freeze([
  {
    key: STORAGE_KEYS.quizState,
    storage: 'session',
    label: 'Quiz progress',
    what: 'Your answers while you take the quiz, so a reload does not lose them.',
    lifetime: 'Cleared when you close the tab.',
  },
  {
    key: STORAGE_KEYS.lastResult,
    storage: 'session',
    label: 'Latest match',
    what: 'Your most recent match results, so other pages can show your scores.',
    lifetime: 'Cleared when you close the tab.',
  },
  {
    key: STORAGE_KEYS.savedProfile,
    storage: 'local',
    label: 'Remembered matches (opt-in)',
    what: 'Only if you tick "Remember my matches on this device": your sleep profile choices and the score version. Scores are recalculated each visit.',
    lifetime: 'Kept until you clear it.',
  },
  {
    key: STORAGE_KEYS.compare,
    storage: 'local',
    label: 'Compare list',
    what: 'The ids of up to three mattresses you added to compare.',
    lifetime: 'Kept until you clear it.',
  },
  {
    key: STORAGE_KEYS.compareLabels,
    storage: 'local',
    label: 'Compare list names',
    what: 'The display names of the mattresses in your compare list, so the compare tray can name them without loading the catalog.',
    lifetime: 'Kept until you clear it.',
  },
  {
    key: STORAGE_KEYS.recentSearches,
    storage: 'local',
    label: 'Recent searches',
    what: 'The last five things you searched for on this site.',
    lifetime: 'Kept until you clear it.',
  },
  {
    key: STORAGE_KEYS.catalogView,
    storage: 'local',
    label: 'Catalog layout',
    what: 'Whether you like the mattress catalog as a gallery or a list.',
    lifetime: 'Kept until you clear it.',
  },
]);

/** Fired on window after forgetEverythingOnDevice() so live stores can reset. */
export const DEVICE_DATA_CLEARED_EVENT = 'mms:device-data-cleared';

function store(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readItem(kind: StorageKind, key: string): string | null {
  const s = store(kind);
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

/** true when the write succeeded */
export function writeItem(kind: StorageKind, key: string, value: string): boolean {
  const s = store(kind);
  if (!s) return false;
  try {
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(kind: StorageKind, key: string): void {
  const s = store(kind);
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    // ignore
  }
}

/** Parsed JSON or `fallback`. */
export function readJson<T = unknown>(kind: StorageKind, key: string, fallback: T | null = null): T | null {
  const raw = readItem(kind, key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(kind: StorageKind, key: string, value: unknown): boolean {
  try {
    return writeItem(kind, key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * Removes every mms_* key from localStorage and sessionStorage, then
 * dispatches DEVICE_DATA_CLEARED_EVENT. Returns the number of keys removed.
 */
export function forgetEverythingOnDevice(): number {
  let removed = 0;
  for (const kind of ['local', 'session'] as const) {
    const s = store(kind);
    if (!s) continue;
    try {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (k && k.startsWith('mms_')) keys.push(k);
      }
      keys.forEach((k) => s.removeItem(k));
      removed += keys.length;
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(DEVICE_DATA_CLEARED_EVENT));
    } catch {
      // ignore
    }
  }
  return removed;
}

/* ---- Opt-in saved profile ("Remember my matches on this device") ---- */

const ENUMS: Readonly<Record<'sleepPosition' | 'preferredFirmnessLabel' | 'sleepTemperature' | 'motionSensitivity' | 'edgeImportance' | 'scoreVersion', readonly string[]>> = {
  sleepPosition: POSITIONS,
  preferredFirmnessLabel: FIRMNESS_LABELS,
  sleepTemperature: TEMPERATURES,
  motionSensitivity: MOTION_SENSITIVITIES,
  edgeImportance: EDGE_IMPORTANCE,
  scoreVersion: SCORE_VERSIONS,
};

/**
 * Reduces a Sleep Profile to enumerated choices + numbers (no free text).
 * Returns null when the result would not be a valid profile.
 */
export function sanitizeProfileForStorage(input: unknown, scoreVersion?: unknown): StoredProfile | null {
  if (!input || typeof input !== 'object') return null;
  const profile = input as Record<string, unknown>;
  // Built field by field from allow-listed values only; typed once complete.
  const out: Record<string, unknown> = {};
  for (const [field, allowed] of Object.entries(ENUMS)) {
    const value = profile[field];
    if (typeof value === 'string' && allowed.includes(value)) out[field] = value;
  }
  if (isScoreVersion(scoreVersion)) out.scoreVersion = scoreVersion;
  const weightLb = profile.weightLb;
  if (isFiniteNumber(weightLb)) out.weightLb = Math.round(weightLb);
  if (Array.isArray(profile.mattressTypePreference)) {
    out.mattressTypePreference = profile.mattressTypePreference.filter((t: unknown) => (MATTRESS_TYPES as readonly unknown[]).includes(t));
  }
  const budget = profile.budgetUsd;
  if (budget && typeof budget === 'object') {
    const { min, max } = budget as { min?: unknown; max?: unknown };
    const clean: { min: number; max?: number } = { min: isFiniteNumber(min) ? min : 0 };
    if (isFiniteNumber(max)) clean.max = max;
    out.budgetUsd = clean;
  }
  const painFocus = profile.painFocus;
  if (typeof painFocus === 'string' && (PAIN_FOCUS as readonly string[]).includes(painFocus)) out.painFocus = painFocus;
  // validateProfile() is the gate: only a profile it accepts is returned as a StoredProfile.
  return validateProfile(out) ? null : (out as StoredProfile);
}

function isScoreVersion(v: unknown): v is ScoreVersion {
  return (SCORE_VERSIONS as readonly unknown[]).includes(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Opt-in: store the sanitised profile in localStorage. Returns true on success. */
export function saveProfileOnDevice(profile: unknown, scoreVersion?: unknown): boolean {
  const clean = sanitizeProfileForStorage(profile, scoreVersion);
  if (!clean) return false;
  return writeJson('local', STORAGE_KEYS.savedProfile, { v: 1, savedAt: new Date().toISOString().slice(0, 10), profile: clean });
}

/** The stored profile (re-validated), ready for matchProfile(), or null. */
export function loadSavedProfile(): StoredProfile | null {
  const data = readJson<{ profile?: unknown }>('local', STORAGE_KEYS.savedProfile, null);
  if (!data || typeof data !== 'object') return null;
  const stored = data.profile;
  const storedVersion = stored && typeof stored === 'object' ? (stored as { scoreVersion?: unknown }).scoreVersion : undefined;
  const clean = sanitizeProfileForStorage(stored, storedVersion);
  return clean;
}

export function clearSavedProfile(): void {
  removeItem('local', STORAGE_KEYS.savedProfile);
}

export function hasSavedProfile(): boolean {
  return loadSavedProfile() !== null;
}
