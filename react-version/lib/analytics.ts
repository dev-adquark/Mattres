import { track as vercelTrack } from '@vercel/analytics';
import type { AnalyticsProps } from '@/lib/types';

/**
 * The complete set of custom events this site sends. Anything else is
 * dropped, so a typo can't silently create a new, unanalysable event.
 */
export const EVENTS = Object.freeze({
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  /** The score reveal animation/moment for a top match was shown. */
  MATCH_REVEALED: 'match_revealed',
  MATCH_VIEWED: 'match_viewed',
  MATTRESS_VIEWED: 'mattress_viewed',
  /** Fired by lib/compareStore on a successful add / remove. */
  COMPARE_ADDED: 'compare_added',
  COMPARE_REMOVED: 'compare_removed',
  COMPARISON_STARTED: 'comparison_started',
  COMPARISON_COMPLETED: 'comparison_completed',
  /** ONLY for a real affiliate link. There is no affiliate program today, so nothing should fire this yet. */
  AFFILIATE_CLICK: 'affiliate_click',
  /** Non-affiliate outbound link (e.g. the manufacturer's officialProductUrl). */
  OUTBOUND_CLICK: 'outbound_click',
  GUIDE_VIEWED: 'guide_viewed',
  SEARCH_USED: 'search_used',
  FILTER_USED: 'filter_used',
  /** X-ray layer explored ({layer, source: 'slider'|'button'}). */
  LAYER_EXPLORED: 'layer_explored',
  /** Fired by components/motion/Slider ({slider, action: 'next'|'prev'|'drag'|'swipe'|'key'|'dot'}). */
  SLIDER_INTERACTION: 'slider_interaction',
  /** A /mattresses/<category> page was viewed ({category, count}). */
  CATEGORY_VIEWED: 'category_viewed',
  /** Header/mega-menu/mobile-menu link chosen ({menu, item}) - enumerated ids only. */
  NAV_USED: 'nav_used',
} as const);

/** The allowlisted event names, derived from EVENTS so the two cannot drift. */
export type AnalyticsEventName = (typeof EVENTS)[keyof typeof EVENTS];

const ALLOWED: ReadonlySet<string> = new Set<string>(Object.values(EVENTS));

type SafeValue = string | number | boolean | null;

// Keys that could carry personal data are never forwarded, whatever the caller passes.
const BLOCKED_KEYS = /(email|name_full|full_name|phone|address|ip|user_?id|weight|query_text)/i;

function sanitise(props: AnalyticsProps | undefined): Record<string, SafeValue> | undefined {
  if (!props || typeof props !== 'object') return undefined;
  const out: Record<string, SafeValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_KEYS.test(key)) continue;
    if (value === null || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 120);
    else if (Array.isArray(value)) out[key] = value.slice(0, 6).join(',').slice(0, 120);
  }
  return out;
}

/**
 * Fire-and-forget custom event. Safe to call anywhere on the client:
 * unknown events, server-side calls and analytics failures are all no-ops.
 * Never pass free text the visitor typed or anything identifying - send
 * counts, ids of catalog entries, and enumerated choices only.
 */
export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return;
  if (!ALLOWED.has(name)) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[analytics] unknown event "${name}" ignored`);
    return;
  }
  try {
    vercelTrack(name, sanitise(props));
  } catch {
    // Analytics must never break the page.
  }
}
