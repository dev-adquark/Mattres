import { brandPartners } from '@/lib/brandCollab';

/**
 * Two duplicated copies of the partner list render side by side; the
 * CSS animation only ever needs to translate by -50% (exactly one
 * copy's width) to loop seamlessly, so the seam is invisible. All
 * names are generic placeholders (see brandPartners) - swapping in
 * real partners later means editing that array, not this component.
 */
export default function BrandMarquee({ onLight = false }) {
  const track = [...brandPartners, ...brandPartners];

  return (
    <div className={`brand-marquee${onLight ? ' on-light' : ''}`} aria-label="Partner brands">
      <div className="brand-marquee-track" aria-hidden="true">
        {track.map((p, i) => (
          <span className="brand-chip" key={`${p.name}-${i}`}>
            <span className="brand-chip-dot" />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
