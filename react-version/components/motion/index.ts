/**
 * Motion system (brief v3 sections 39-42). Levels, as CSS tokens in globals.css:
 *   L1 micro-interactions  --motion-1-dur / --motion-1-ease  (hover, press, toggles)
 *   L2 section reveals     --motion-2-dur / --motion-2-ease  (<Reveal>, chapter markers)
 *   L3 product interaction --motion-3-dur / --motion-3-ease  (sliders, layer x-ray, cards)
 *   L4 cinematic / 3D      --motion-4-dur / --motion-4-ease  (hero scroll, score reveal)
 * Never run two L4 moments at once. Everything degrades under reduced motion.
 */
export { Slider, SliderControls } from './Slider';
export { ScrollProgress } from './ScrollProgress';
export { StickyStory } from './StickyStory';
export { Chapter, ChapterRail, HOME_CHAPTERS } from './ChapterRail';
export { useScrollProgress, progressFor } from './useScrollProgress';
export { useReducedMotion, prefersReducedMotion } from './useReducedMotion';
