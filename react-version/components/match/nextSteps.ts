import { getGuide } from '@/lib/content/guides';
import { getCategoryPage } from '@/lib/categoryPages';
import { SLEEP_POSITIONS } from '@/lib/site';
import type { SleepPosition } from '@/lib/types';
import type { ProfileDraft } from './quizModel';

/**
 * Where a visitor goes after their results, derived only from the answers
 * they gave (no product data). Every destination is checked against the
 * real registries (guides, category pages, sleep-position pages), so a
 * missing page is dropped rather than linked.
 */

export interface ReadingLink {
  id: string;
  kind: 'Guide' | 'Sleep position';
  href: string;
  title: string;
  why: string;
}

export interface RankingLink {
  id: string;
  href: string;
  label: string;
}

/** The profile fields next steps read (a full SleepProfile or a quiz draft). */
type NextStepsProfile = Pick<ProfileDraft, 'sleepPosition' | 'weightLb' | 'sleepTemperature' | 'motionSensitivity' | 'edgeImportance'>;

const HEAVIER_LB = 230;

/** The guide that best fits each position (first of lib/content/links POSITION_LINKS). */
const POSITION_GUIDE: Record<SleepPosition, string> = {
  side: 'pressure-relief-for-side-sleepers',
  back: 'back-support-for-heavier-sleepers',
  stomach: 'how-to-choose-mattress-firmness',
  combination: 'how-to-choose-mattress-firmness',
};

const POSITION_CATEGORY: Partial<Record<SleepPosition, string>> = {
  side: 'side-sleepers',
  back: 'back-sleepers',
  stomach: 'stomach-sleepers',
};

function guideLink(slug: string, why: string): ReadingLink | null {
  const g = getGuide(slug);
  return g ? { id: `guide-${slug}`, kind: 'Guide', href: g.path, title: g.title, why } : null;
}

function isHeavier(profile: NextStepsProfile): boolean {
  return typeof profile.weightLb === 'number' && Number.isFinite(profile.weightLb) && profile.weightLb >= HEAVIER_LB;
}

/**
 * "Read for your profile": the position page, the position guide, then a
 * cooling guide if they sleep warm, a couples guide if they share a bed,
 * and the heavier-sleeper guide at 230 lb or more. At most `limit`.
 */
export function readingFor(profile: NextStepsProfile | null | undefined, limit = 4): ReadingLink[] {
  if (!profile) return [];
  const out: (ReadingLink | null)[] = [];
  const pos = SLEEP_POSITIONS.find((p) => p.slug === profile.sleepPosition);
  if (pos) out.push({ id: `position-${pos.slug}`, kind: 'Sleep position', href: pos.href, title: pos.label, why: 'How your position changes what a mattress needs to do.' });
  const heavier = isHeavier(profile);
  const posGuide = profile.sleepPosition === 'back' && !heavier ? 'how-to-choose-mattress-firmness' : profile.sleepPosition ? POSITION_GUIDE[profile.sleepPosition] : undefined;
  if (posGuide) out.push(guideLink(posGuide, 'Matches your sleep position.'));
  if (profile.sleepTemperature === 'hot') out.push(guideLink('mattresses-for-hot-sleepers', 'You said you sleep warm.'));
  if (profile.motionSensitivity === 'couple-high' || profile.motionSensitivity === 'couple-low') {
    out.push(guideLink('motion-isolation-for-couples', 'You share your bed.'));
  }
  if (heavier) out.push(guideLink('back-support-for-heavier-sleepers', 'Support matters more at 230 lb and up.'));
  if (profile.edgeImportance === 'high') out.push(guideLink('edge-support-explained', 'You said a usable edge matters.'));
  const seen = new Set<string>();
  return out
    .filter((l): l is ReadingLink => {
      if (!l || seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    })
    .slice(0, limit);
}

function categoryLink(slug: string, label?: string): RankingLink | null {
  const c = getCategoryPage(slug);
  return c ? { id: `category-${slug}`, href: `${c.href || `/mattresses/${slug}`}?sort=match`, label: label || c.title } : null;
}

/**
 * Category rankings to browse next: the position ranking first (the full
 * ranking for combination sleepers), then couples / cooling / heavier
 * when the answers point there.
 */
export function rankingsFor(profile: NextStepsProfile | null | undefined): RankingLink[] {
  if (!profile) return [];
  const pos = profile.sleepPosition;
  const posLabel = SLEEP_POSITIONS.find((p) => p.slug === pos)?.label;
  const posCategory = pos ? POSITION_CATEGORY[pos] : undefined;
  const out = [posCategory ? categoryLink(posCategory, `Browse ${posLabel ? posLabel.toLowerCase() : 'position'} rankings`) : categoryLink('best', 'Browse the full rankings')];
  if (profile.motionSensitivity === 'couple-high' || profile.motionSensitivity === 'couple-low') out.push(categoryLink('couples', 'Rankings for couples'));
  if (profile.sleepTemperature === 'hot') out.push(categoryLink('cooling', 'Cooling mattresses'));
  if (isHeavier(profile)) out.push(categoryLink('heavier-sleepers', 'Rankings for heavier sleepers'));
  return out.filter((l): l is RankingLink => l !== null);
}
