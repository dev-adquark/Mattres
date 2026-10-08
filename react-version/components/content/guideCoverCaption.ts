import type { ScoringRules } from '@/lib/content/types';
import type { Guide } from '@/lib/types';

/** What the diagram half of a guide's cover shows, and where its numbers come from. */
export function coverCaption(guide: Guide, rules: ScoringRules): string {
  switch (guide.cover.diagram) {
    case 'firmness-scale':
      return `Left: the firmness range (1–10) the engine treats as comfortable for each sleep position at 130–179 lb, from scoring rules v${rules.version}.`;
    case 'bands-back':
      return `Left: the back-sleeper comfort window at each body weight, from scoring rules v${rules.version}.`;
    case 'types':
      return 'Left: conceptual cross-sections of four generic constructions, not to scale and not any specific product.';
    case 'pressure':
      return 'Left: conceptual diagram, not to scale. The same load on a firm surface and on a surface with more give.';
    case 'heat':
      return 'Left: conceptual diagram, not to scale. Dense foam holds more heat at the surface than an open coil core.';
    case 'motion':
      return 'Left: conceptual diagram, not to scale. Movement carries across a springy surface and fades in an absorbent one.';
    case 'edge':
      return 'Left: conceptual diagram, not to scale. A seated load at an unreinforced edge and at a reinforced perimeter.';
    case 'materials':
      return 'Left: conceptual diagram, not to scale. The same load on memory foam, latex and pocketed coils.';
    case 'night-temperature':
      return 'Left: conceptual curve, not measured data. Core body temperature falls into the night and rises toward waking.';
    case 'cooling-data':
      return 'Left: every independent cooling rating (0–10) in the catalog, one dot per mattress, grouped by type. Unrated mattresses are not plotted.';
    case 'checklist':
      return 'Left: the eight checks this guide walks through.';
    default:
      return '';
  }
}
