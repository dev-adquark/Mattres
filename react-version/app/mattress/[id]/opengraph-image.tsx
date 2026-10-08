import { ImageResponse } from 'next/og';
import { getMattressById } from '@/lib/db/mattressRepo';
import { displayTitle } from '@/lib/format';
import { firmnessFor, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import type { MattressEntry, MattressType } from '@/lib/types';
import { getPublishedEvidence } from '@/lib/rtings/evidence';
import { contentsPhrase, independentEvidenceFor } from '@/components/product/productPageModel';

export const alt = 'Mattress Match Score product card: an illustration, not a product photo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Layer bands for the flat illustration - a generic build per type, matching
// MattressRender's "typical construction" framing (not this product's).
const BANDS: Record<MattressType, readonly string[]> = {
  foam: ['#efe9de', '#d6e6e9', '#bfd1d8', '#9db1c2'],
  hybrid: ['#efe9de', '#d6e6e9', '#bfd1d8', '#29314d'],
  innerspring: ['#efe9de', '#d6e6e9', '#29314d', '#6c7d92'],
  latex: ['#efe9de', '#efe3c4', '#e0cfa2', '#9db1c2'],
};

const TYPE_LABEL: Readonly<Record<string, string | undefined>> = MATTRESS_TYPE_LABEL;

// Inline styles throughout: ImageResponse (Satori) only reads the style prop.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // lib/db/mattressRepo is CommonJS; its records are catalog entries.
  const entry = (await getMattressById(id)) as MattressEntry | null;
  const name: string = entry ? displayTitle(entry) : 'Mattress';
  const type = entry ? TYPE_LABEL[entry.type] || entry.type : '';
  const firm = entry ? firmnessFor(entry) : null;
  const bands = (entry ? BANDS[entry.type] : undefined) || BANDS.hybrid;
  // Claim independent ratings only when some are on file for this entry.
  const contents = contentsPhrase(entry ? independentEvidenceFor(entry, await getPublishedEvidence(entry.id)) : 'none', { short: true });
  const meta = [entry?.brand, type, firm ? (firm.multi ? 'Several firmness options' : `${firm.label} firmness`) : null].filter(Boolean).join('  ·  ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 76px',
          background: 'radial-gradient(70% 60% at 85% 0%, #2b3a67 0%, #050b16 70%)',
          color: '#f6f3ed',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 5, color: '#9fa7b8' }}>
          MATTRESS MATCH SCORE
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 660 }}>
            <div style={{ fontSize: name.length > 22 ? 64 : 82, lineHeight: 1.02, letterSpacing: -2 }}>{name}</div>
            <div style={{ marginTop: 26, fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#e4dfd5' }}>{meta}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: 360, borderRadius: 6, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            {bands.map((c, i) => (
              <div key={i} style={{ display: 'flex', height: i === 0 ? 34 : i === 3 ? 70 : 30, background: c }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif', fontSize: 18, color: '#9fa7b8', borderTop: '1px solid rgba(228,223,213,0.2)', paddingTop: 20 }}>
          <span>{contents}</span>
          <span>Illustration, not a product photo</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
