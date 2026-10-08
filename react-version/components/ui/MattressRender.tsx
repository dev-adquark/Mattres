import type { CSSProperties } from 'react';
import { cx } from './cx';
import { RenderStillImage } from './render-stills/RenderStillImage';
import { RtingsPhoto } from './render-stills/RtingsPhoto';
import type { EntryPhoto } from '@/lib/rtings/photo';
import { DEFAULT_SIZES, getRenderStill, stillAlt, type StillAspect } from './render-stills/stills';
import { MattressIllustration, TYPE_WORD, knownTypeOf, layersFor, type IllustrationProps } from './MattressIllustration';
import { mattressRender as s, renderStill as styles } from '@/components/ui/systemStyles';

/**
 * Mattress imagery. Two ORIGINAL, code-generated sources - never product
 * photography and never a depiction of a specific brand's construction:
 *
 * 1. Rendered stills (default): campaign-style renders produced offline by
 *    scripts/render-stills.mts from a procedural three.js studio, served
 *    through next/image (responsive srcset, blur placeholder, explicit
 *    width/height so nothing shifts). Chosen by mattress `type` + `aspect`;
 *    per-mattress variation is only a brand-neutral side-panel colourway
 *    seeded from `seed`.
 * 2. The isometric SVG illustration below: used for unknown types, when
 *    `aspect="illustration"`, and as the fallback if a still fails to load.
 *
 * Props: type ('foam'|'hybrid'|'innerspring'|'latex'), seed (use entry.id),
 * size ('sm'|'md'|'lg'|'fluid'), caption (true = default caption, string =
 * custom), legend (show layer key), className, style,
 * aspect ('card' 1:1 default | 'product' 4:3 | 'hero' 3:2 | 'cutaway' 16:9 |
 * 'illustration' = SVG only), colourway ('linen'|'mist'|'sand'|'dusk'
 * override), sizes (next/image sizes override), preload (LCP image only),
 * fill (cover a positioned parent edge to edge - fixes letterboxing of a
 * square still in a wide tile; caption/legend are not rendered visibly inside,
 * put the 'Illustration' label on the tile instead), objectPosition (CSS
 * object-position for fill, e.g. '50% 65%').
 * Server-safe: the only client piece is the image's onError fallback, which
 * loads the SVG illustration lazily in the browser (it is never serialized
 * into the page's RSC payload).
 *
 * Rule-free hooks for parents: .mattress-render, .mattress-render--still,
 * .mattress-render--fill, .mattress-render__caption. Inline styles here are
 * runtime values only (palette swatches, a still's intrinsic aspect ratio,
 * the caller's object-position).
 */

interface MattressRenderProps extends IllustrationProps {
  /** 'card' 1:1 (default) | 'product' 4:3 | 'hero' 3:2 | 'cutaway' 16:9 | 'detail' 4:5 | 'illustration' = SVG only. */
  aspect?: StillAspect | 'illustration';
  colourway?: string;
  /** next/image sizes override. */
  sizes?: string;
  /** LCP image only. */
  preload?: boolean;
  /** Cover a positioned parent edge to edge. */
  fill?: boolean;
  /** CSS object-position for fill, e.g. '50% 65%'. */
  objectPosition?: string;
  /**
   * Credited RTINGS product photo for this exact mattress (entry.photo). When present it
   * replaces the render (never for 'cutaway' / 'illustration', which are construction diagrams).
   */
  photo?: EntryPhoto | null;
  /** Photo credit as a link to the RTINGS review (default) or plain text when the render sits inside another link. */
  photoCreditLink?: boolean;
  /** Set false when the parent prints the photo credit itself (a visible caption under a small thumbnail). */
  photoCredit?: boolean;
}

export function MattressRender({ type, seed, size = 'md', caption = false, legend = false, className, style, aspect = 'card', colourway, sizes, preload = false, fill = false, objectPosition, photo = null, photoCreditLink = true, photoCredit = true }: MattressRenderProps) {
  if (photo && aspect !== 'cutaway' && aspect !== 'illustration') {
    return (
      <figure
        className={cx('mattress-render', 'mattress-render--photo', fill && 'mattress-render--fill', s.render, !fill && size !== 'fluid' && s[size], styles.still, fill && styles.fill, className)}
        style={objectPosition ? ({ ...style, '--still-position': objectPosition } as CSSProperties) : style}
        data-aspect={aspect}
      >
        <div className={cx(styles.frame, styles.photoFrame)}>
          <RtingsPhoto photo={photo} sizes={sizes || DEFAULT_SIZES[aspect] || DEFAULT_SIZES.card} preload={preload} creditLink={photoCreditLink} showCredit={photoCredit} fallbackIllustration={{ type: type ?? null, seed: seed ?? null }} imageClassName={cx(styles.img, styles.photo)} creditClassName={styles.credit} />
        </div>
      </figure>
    );
  }
  const still = aspect === 'illustration' ? null : getRenderStill({ type, aspect, seed, colourway });
  if (!still) return <MattressIllustration type={type} seed={seed} size={size} caption={caption} legend={legend} className={className} style={style} />;

  const knownType = knownTypeOf(type);
  const layers = legend ? layersFor(knownType || 'foam', seed || type) : null;
  const captionText =
    caption === true
      ? `Rendered illustration of a typical ${knownType ? TYPE_WORD[knownType] : 'mattress'} ${aspect === 'cutaway' ? 'construction' : 'mattress'} — not a product photo.`
      : caption;

  return (
    <figure
      className={cx('mattress-render', 'mattress-render--still', fill && 'mattress-render--fill', s.render, !fill && size !== 'fluid' && s[size], styles.still, fill && styles.fill, className)}
      style={objectPosition ? ({ ...style, '--still-position': objectPosition } as CSSProperties) : style}
      data-aspect={aspect}
      data-colourway={still.colourway || undefined}
    >
      <div className={styles.frame} style={fill ? undefined : { aspectRatio: `${still.width} / ${still.height}` }}>
        <RenderStillImage still={still} alt={stillAlt(type, aspect)} sizes={sizes || DEFAULT_SIZES[aspect] || DEFAULT_SIZES.card} preload={preload} className={styles.img} fallbackIllustration={{ type: type ?? null, seed: seed ?? null }} />
      </div>
      {captionText ? <figcaption className={cx('mattress-render__caption', s.caption)}>{captionText}</figcaption> : null}
      {layers ? (
        <ul className={s.legend} aria-label="Typical layers, top to bottom">
          {layers.map((l, i) => (
            <li key={i}>
              <span className={s.swatch} style={{ background: l.fill }} aria-hidden="true" />
              {l.name}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
