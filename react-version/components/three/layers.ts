/**
 * Default layer description sets for the 3D mattress illustration.
 *
 * These are GENERIC, educational explanations of what each layer type
 * typically does in a mattress of that construction. They are not claims
 * about any specific product's materials, thicknesses or performance - the
 * catalog does not carry per-unit teardown data. Pages that show a specific
 * mattress must keep that framing (the viewer captions the render as an
 * illustration).
 *
 * Layer shape: MattressLayer { id, label, description, summary, material }
 *   id          - stable key; 'cover' | 'comfort' | 'transition' | 'support'
 *                 (matches lib/categories DIMENSION_TO_LAYER values)
 *   label       - short display name
 *   description - one or two plain-language sentences
 *   summary     - a shorter (about two lines) version for the X-ray tabs
 *   material    - how the 3D scene draws it (LayerMaterial)
 *
 * Layers are ordered top (body side) to bottom (foundation side).
 *
 * Erasable TypeScript only, with type-only imports: scripts/render-stills
 * strips the types and serves this file to the render studio as plain JS.
 */

import type { MattressType } from '@/lib/types';
import type { MattressLayer } from './types';

export const MATTRESS_TYPES: readonly MattressType[] = ['hybrid', 'foam', 'latex', 'innerspring'];

const COVER: MattressLayer = {
  id: 'cover',
  label: 'Cooling Cover',
  description:
    'The fabric layer you lie on. It is often a quilted or knit panel; breathable weaves help move heat and moisture away from the body, which is one input to how warm a bed sleeps.',
  summary: 'The fabric you lie on. Breathable knits move heat and moisture away from the body, one input to how warm a bed sleeps.',
  material: 'quilt',
};

export const LAYER_SETS: Readonly<Record<MattressType, readonly MattressLayer[]>> = {
  hybrid: [
    COVER,
    {
      id: 'comfort',
      label: 'Comfort Layer',
      description:
        'Softer foam or latex near the surface that contours around shoulders and hips. This is where most pressure relief comes from.',
      summary: 'Softer foam or latex near the surface that contours around shoulders and hips. Most pressure relief comes from here.',
      material: 'foam',
    },
    {
      id: 'transition',
      label: 'Transition Layer',
      description:
        'A slightly firmer layer that keeps heavier areas from sinking straight through to the coils and helps damp motion before it spreads.',
      summary: 'A firmer buffer that stops heavier areas sinking through to the coils and damps motion before it spreads.',
      material: 'dense-foam',
    },
    {
      id: 'support',
      label: 'Core Support',
      description:
        'Individually wrapped coils, usually framed by firmer edge material. Coils keep the spine aligned, let air circulate and largely determine edge support and long-term durability.',
      summary: 'Individually wrapped coils keep the spine level, let air move and largely set edge support and durability.',
      material: 'pocket-coils',
    },
  ],
  innerspring: [
    COVER,
    {
      id: 'comfort',
      label: 'Comfort Layer',
      description:
        'A thin layer of padding, foam or fiber that softens the feel of the springs. Innersprings typically have less of it than hybrids, so they feel more buoyant.',
      summary: 'A thin layer of padding that softens the springs. Less of it than a hybrid, so the feel is more buoyant.',
      material: 'foam',
    },
    {
      id: 'transition',
      label: 'Transition Layer',
      description:
        'An insulator pad that stops the springs being felt through the padding and spreads load across the coil unit.',
      summary: 'An insulator pad that keeps the springs from being felt and spreads load across the coil unit.',
      material: 'dense-foam',
    },
    {
      id: 'support',
      label: 'Core Support',
      description:
        'A connected spring unit. Linked coils give a bouncy, responsive feel and good airflow, but tend to transfer more motion than wrapped coils.',
      summary: 'A connected spring unit: bouncy, airy and responsive, but it passes on more motion than wrapped coils.',
      material: 'bonnell-coils',
    },
  ],
  foam: [
    COVER,
    {
      id: 'comfort',
      label: 'Comfort Layer',
      description:
        'Slow-recovering foam (often memory foam) that molds to the body and spreads pressure. Dense foams can hold heat, so many are infused or perforated to breathe.',
      summary: 'Slow-recovering foam that molds to the body and spreads pressure. Dense foams can hold heat.',
      material: 'foam',
    },
    {
      id: 'transition',
      label: 'Transition Layer',
      description:
        'A medium-firm foam that bridges the soft top and the firm base, so the sleeper is cradled without bottoming out.',
      summary: 'A medium-firm foam bridging the soft top and the firm base, so you are cradled without bottoming out.',
      material: 'dense-foam',
    },
    {
      id: 'support',
      label: 'Core Support',
      description:
        'A thick base of high-density foam. Its density and firmness largely set how supportive the bed feels and how well it resists sagging over time.',
      summary: 'A thick base of high-density foam. Its density largely sets support and how well it resists sagging.',
      material: 'foam-core',
    },
  ],
  latex: [
    COVER,
    {
      id: 'comfort',
      label: 'Comfort Layer',
      description:
        'A softer latex layer that contours with a quicker, more buoyant response than memory foam, so moving around takes less effort.',
      summary: 'Softer latex that contours with a quicker, more buoyant response than memory foam.',
      material: 'latex',
    },
    {
      id: 'transition',
      label: 'Transition Layer',
      description:
        'A medium latex or foam layer that steps firmness up gradually between the comfort layer and the core.',
      summary: 'Medium latex or foam that steps the firmness up gradually towards the core.',
      material: 'latex',
    },
    {
      id: 'support',
      label: 'Core Support',
      description:
        'A firm latex core. Pinhole cores like the one illustrated are molded with channels that let air move through the material and fine-tune firmness.',
      summary: 'A firm latex core. Pinhole channels let air move through it and fine-tune the firmness.',
      material: 'latex-core',
    },
  ],
};

/** Maps any catalog `type` string to one of MATTRESS_TYPES (hybrid by default). */
export function normalizeMattressType(type: string | null | undefined): MattressType {
  const t = String(type || '').toLowerCase();
  if (t.includes('latex')) return 'latex';
  if (t.includes('inner') || t.includes('spring')) return 'innerspring';
  if (t.includes('hybrid')) return 'hybrid';
  if (t.includes('foam')) return 'foam';
  return 'hybrid';
}

/** Default layers for a mattress type (returns a fresh array of fresh objects). */
export function getDefaultLayers(mattressType: string | null | undefined): MattressLayer[] {
  return LAYER_SETS[normalizeMattressType(mattressType)].map((l) => ({ ...l }));
}

export const DEFAULT_LAYERS: readonly MattressLayer[] = LAYER_SETS.hybrid;
