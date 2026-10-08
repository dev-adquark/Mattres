/**
 * Client half of the /mattress/[id] story, one module per part:
 *   ProductStoryContext  provider + the shared "which sleeper is on show" state
 *   HeroScore            hero ScoreRing + position chips
 *   PositionBars         engine score for each reference position
 *   XrayInspector        3D X-ray + per-layer materials and performance
 * Each part carries its own 'use client'; this file only re-exports them so
 * importers keep one path.
 */
export { ProductStoryProvider, useStory, type StorySelection, type StoryView } from './ProductStoryContext';
export { HeroScore } from './HeroScore';
export { PositionBars } from './PositionBars';
export { XrayInspector } from './XrayInspector';
