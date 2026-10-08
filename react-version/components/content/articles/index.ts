/**
 * slug -> article module. Every slug in lib/content/guides.ts GUIDES must
 * have an entry here (enforced by lib/content/content.test.ts).
 */
import type { ArticleModule } from '@/lib/content/types';
import * as howToChooseMattressFirmness from './how-to-choose-mattress-firmness';
import * as mattressTypesExplained from './mattress-types-explained';
import * as pressureReliefForSideSleepers from './pressure-relief-for-side-sleepers';
import * as backSupportForHeavierSleepers from './back-support-for-heavier-sleepers';
import * as mattressesForHotSleepers from './mattresses-for-hot-sleepers';
import * as coolingMattressComparison from './cooling-mattress-comparison';
import * as motionIsolationForCouples from './motion-isolation-for-couples';
import * as edgeSupportExplained from './edge-support-explained';
import * as mattressBuyingChecklist from './mattress-buying-checklist';
import * as mattressMaterialsExplained from './mattress-materials-explained';
import * as sleepPositionAndTemperature from './sleep-position-and-temperature';

export const ARTICLES: Record<string, ArticleModule> = {
  'how-to-choose-mattress-firmness': howToChooseMattressFirmness,
  'mattress-types-explained': mattressTypesExplained,
  'pressure-relief-for-side-sleepers': pressureReliefForSideSleepers,
  'back-support-for-heavier-sleepers': backSupportForHeavierSleepers,
  'mattresses-for-hot-sleepers': mattressesForHotSleepers,
  'cooling-mattress-comparison': coolingMattressComparison,
  'motion-isolation-for-couples': motionIsolationForCouples,
  'edge-support-explained': edgeSupportExplained,
  'mattress-buying-checklist': mattressBuyingChecklist,
  'mattress-materials-explained': mattressMaterialsExplained,
  'sleep-position-and-temperature': sleepPositionAndTemperature,
};

export function getArticle(slug: string): ArticleModule | null {
  return ARTICLES[slug] || null;
}
