import rules from '@/lib/rules/0.2.json';
import { RenderStillImage } from '@/components/ui/render-stills/RenderStillImage';
import { MATERIAL_ALT, getMaterialStill, getRenderStill, stillAlt, type RenderStill } from '@/components/ui/render-stills/stills';
import { cx } from '@/components/ui/cx';
import { loadCatalogEntries } from '@/lib/content/catalog';
import { guideNumber } from '@/lib/content/guides';
import type { Guide, MattressEntry } from '@/lib/types';
import type { RangeRow } from '@/lib/content/types';
import { bandRowsForPosition, bandRowsForWeight } from '@/lib/content/bands';
import { cssVars } from '@/components/ui/cssVars';
import { RangeChart } from './RangeChart';
import { BandsDiagram, CoolingDotPlot, EdgeDiagram, HeatDiagram, MaterialsDiagram, MotionDiagram, NightTemperatureDiagram, PressureDiagram, TypesDiagram } from './Diagrams';
import styles from './GuideCover.module.css';

/**
 * 'tile' (carousel/list, decorative) | 'feature' (hub cover story) |
 * 'lead' (home guides spread, decorative) | 'hero' (guide page, diagram announced).
 */
export type GuideCoverVariant = 'tile' | 'hero' | 'feature' | 'lead';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `sizes` for the still half (50% of the cover). The still is cropped with
 * object-fit: cover into a pane that can be as narrow as 0.8:1 and then
 * zoomed, so the browser needs a wider source than the pane itself:
 * factor = (still aspect / narrowest pane aspect) x zoom.
 *
 * That factor can push the slot past 2x the viewport, which would make the
 * browser fetch 2048w/3840w variants of a 1920px source. So every slot is
 * capped at 120vw and at half the source width in CSS px: at DPR 2 that resolves to the
 * source itself, at DPR 1 to the ~1080w variant. The cap is expressed as an
 * extra pixel breakpoint (not CSS min()) so every browser parses it.
 */
const PANE_VW: Record<GuideCoverVariant, [minWidth: number, vw: number][]> = {
  tile: [[1200, 15], [640, 30], [0, 46]],
  hero: [[1000, 46], [0, 50]],
  feature: [[1000, 50], [0, 50]],
  lead: [[900, 24], [0, 40]],
};
/** Hard ceiling in vw so high-DPR phones stop at ~the 1920w source. */
const MAX_SLOT_VW = 120;
function sizesFor(variant: GuideCoverVariant, still: RenderStill, zoom: number): string {
  const aspect = still.width && still.height ? still.width / still.height : 1.5;
  const factor = Math.max(1, aspect / 0.8) * Math.max(1, zoom);
  const capPx = Math.round((still.width || 1920) / 2);
  const out: string[] = [];
  let upper = Infinity; // exclusive upper viewport bound of the current rule
  for (const [min, vw] of PANE_VW[variant]) {
    const slotVw = Math.min(vw * factor, MAX_SLOT_VW);
    // Viewport width at which this rule's slot reaches the cap.
    const capFrom = Math.ceil((capPx * 100) / slotVw);
    if (capFrom < upper) {
      out.push(`(min-width: ${Math.max(capFrom, min)}px) ${capPx}px`);
    }
    if (capFrom > min) {
      const v = `${Math.round(slotVw)}vw`;
      out.push(min ? `(min-width: ${min}px) ${v}` : v);
    }
    upper = min;
  }
  // The last rule must be unconditional.
  const last = out[out.length - 1];
  if (last?.startsWith('(')) out[out.length - 1] = last.replace(/^\([^)]*\)\s*/, '');
  return out.join(', ');
}

function stillFor(cover: Guide['cover']): { still: RenderStill | null; alt: string } | null {
  const s = cover.still;
  if (s.material) return { still: getMaterialStill(s.material), alt: MATERIAL_ALT[s.material] ?? '' };
  if (s.type) {
    const aspect = s.aspect || 'cutaway';
    return { still: getRenderStill({ type: s.type, aspect }), alt: stillAlt(s.type, aspect) };
  }
  return null;
}

/**
 * Comfort-window cover chart. Tiles keep the SVG as pure line art. Larger
 * covers print the labels as an HTML chart (real type sizes at any width);
 * when the pane is too narrow for it (container query in the CSS), the SVG
 * line art shows instead. Only one of the two is ever displayed.
 */
function BandsCover({ title, rows, rowHeader, variant }: { title: string; rows: RangeRow[]; rowHeader: string; variant: GuideCoverVariant }) {
  if (variant === 'tile') return <BandsDiagram title={title} rows={rows} />;
  return (
    <>
      <div className={styles.bandsHtml}>
        <RangeChart caption={title} rows={rows} rowHeader={rowHeader} className={styles.bandsChart} />
      </div>
      <div className={styles.bandsSvg}>
        <BandsDiagram title={title} rows={rows} />
      </div>
    </>
  );
}

function CoverDiagram({ guide, catalog, variant }: { guide: Guide; catalog: readonly MattressEntry[]; variant: GuideCoverVariant }) {
  switch (guide.cover.diagram) {
    case 'firmness-scale':
      return <BandsCover variant={variant} rowHeader="Sleep position" title="Comfort window by position, 130–179 lb" rows={bandRowsForWeight(rules, '130-180')} />;
    case 'bands-back':
      return <BandsCover variant={variant} rowHeader="Body weight" title="Back sleepers: window by body weight" rows={bandRowsForPosition(rules, 'back')} />;
    case 'types':
      return <TypesDiagram />;
    case 'pressure':
      return <PressureDiagram caption={false} />;
    case 'heat':
      return <HeatDiagram caption={false} />;
    case 'motion':
      return <MotionDiagram caption={false} />;
    case 'edge':
      return <EdgeDiagram caption={false} />;
    case 'materials':
      return <MaterialsDiagram caption={false} />;
    case 'night-temperature':
      return <NightTemperatureDiagram caption={false} />;
    case 'cooling-data':
      return <CoolingDotPlot entries={catalog} caption={false} compact />;
    case 'checklist':
      return guide.hero.kind === 'numeral' ? (
        <div className={styles.numeral} role="img" aria-label={`${guide.hero.value} ${guide.hero.label}`}>
          <span className={styles.numeralValue}>{guide.hero.value}</span>
          <span className={styles.numeralLabel}>{guide.hero.label}</span>
        </div>
      ) : null;
    default:
      return null;
  }
}

interface GuideCoverProps {
  guide: Guide | null | undefined;
  variant?: GuideCoverVariant;
  /** Catalog entries; fetched via the repository when omitted and the cover plots data. */
  catalog?: MattressEntry[];
  /** Preload the still (use only for the LCP cover). */
  preload?: boolean;
  /** Print "No. 03" on the cover. */
  showNumber?: boolean;
  className?: string;
}

/**
 * Editorial cover for a guide: the guide's own concept diagram on linen,
 * split 50/50 with a close-up crop of an ORIGINAL code-rendered still
 * (labelled "Illustration"). Same art everywhere a guide appears - home
 * carousel, guides hub, related carousel, guide hero - so a guide is
 * recognisable by its cover.
 *
 * Async server component (the cooling cover plots the live catalog).
 */
export async function GuideCover({ guide, variant = 'tile', catalog, preload = false, showNumber = true, className }: GuideCoverProps) {
  if (!guide) return null;
  let entries = catalog;
  if (!entries && guide.cover.diagram === 'cooling-data') entries = await loadCatalogEntries();
  const still = stillFor(guide.cover);
  const decorative = variant !== 'hero';
  const focus = guide.cover.focus || '50% 50%';
  const zoom = guide.cover.zoom || 1;
  const number = guideNumber(guide.slug);

  return (
    <div
      className={cx(styles.cover, styles[variant], className)}
      data-diagram={guide.cover.diagram || 'none'}
      style={cssVars({ '--cover-focus': focus, '--cover-zoom': zoom })}
    >
      <div className={styles.diagram} aria-hidden={decorative ? 'true' : undefined}>
        {showNumber && number > 0 ? (
          <span className={styles.number} aria-hidden="true">
            No. {pad(number)}
          </span>
        ) : null}
        <div className={styles.diagramArt}>
          <CoverDiagram guide={guide} catalog={entries ?? []} variant={variant} />
        </div>
      </div>
      <div className={styles.still}>
        {still?.still ? (
          <RenderStillImage
            still={still.still}
            alt={decorative ? '' : still.alt}
            sizes={sizesFor(variant, still.still, zoom)}
            preload={preload}
            className={styles.img}
          />
        ) : null}
        <span className={cx('illus-tag', styles.tag)}>Illustration</span>
      </div>
    </div>
  );
}
