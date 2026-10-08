import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

export const alt = 'Mattress Match Score: find the mattress that fits the way you sleep.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Inline styles below are required: ImageResponse (Satori) renders only
// inline style objects, not stylesheets or class names.

// Fonts are bundled locally (SIL OFL 1.1, see assets/og/OFL.txt) so the
// image renders identically at build time without a network fetch.
type OgFont = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];

async function loadFonts(): Promise<NonNullable<OgFont>> {
  const dir = join(process.cwd(), 'assets', 'og');
  const [light, italic, sans] = await Promise.all([
    readFile(join(dir, 'Fraunces-Light.ttf')),
    readFile(join(dir, 'Fraunces-LightItalic.ttf')),
    readFile(join(dir, 'InstrumentSans-Medium.ttf')),
  ]);
  return [
    { name: 'Fraunces', data: light, weight: 300, style: 'normal' },
    { name: 'Fraunces', data: italic, weight: 300, style: 'italic' },
    { name: 'Instrument Sans', data: sans, weight: 500, style: 'normal' },
  ];
}

const INK = '#050b16';
const LINEN = '#e9e4da';
const MOON_MUTED = '#9fa7b8';
const CYAN = '#8adfe9';

export default async function OpenGraphImage() {
  const fonts = await loadFonts();
  const host = SITE_URL.replace(/^https?:\/\//, '');
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
          background: INK,
          backgroundImage: 'radial-gradient(60% 70% at 88% 0%, rgba(43,58,103,0.75), rgba(5,11,22,0) 72%)',
          color: LINEN,
          fontFamily: 'Fraunces',
          position: 'relative',
        }}
      >
        <svg width="470" height="470" viewBox="0 0 100 100" style={{ position: 'absolute', right: -70, top: 18 }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke={LINEN} strokeOpacity="0.08" strokeWidth="0.6" />
          <path d="M50 6a44 44 0 1 1-44 44" fill="none" stroke={CYAN} strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
          <rect x="30" y="38" width="40" height="7" rx="3.5" fill={LINEN} fillOpacity="0.16" />
          <rect x="30" y="48" width="40" height="5.5" rx="2.75" fill={LINEN} fillOpacity="0.1" />
          <rect x="30" y="56.5" width="40" height="5.5" rx="2.75" fill={LINEN} fillOpacity="0.06" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13.5" fill="none" stroke={LINEN} strokeOpacity="0.22" strokeWidth="1.5" />
            <path d="M16 2.5a13.5 13.5 0 1 1-13.5 13.5" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" />
            <rect x="9" y="11" width="14" height="3" rx="1.5" fill={LINEN} />
            <rect x="9" y="15.5" width="14" height="2.4" rx="1.2" fill={LINEN} fillOpacity="0.6" />
            <rect x="9" y="19.4" width="14" height="2.4" rx="1.2" fill={LINEN} fillOpacity="0.35" />
          </svg>
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: -0.5 }}>
            <span>Mattress Match&nbsp;</span>
            <span style={{ fontStyle: 'italic', color: MOON_MUTED }}>Score</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, lineHeight: 0.98, letterSpacing: -4.5, maxWidth: 980 }}>
          <span>Find the mattress</span>
          <span>that fits the way</span>
          <span style={{ display: 'flex' }}>
            you&nbsp;<span style={{ fontStyle: 'italic', color: CYAN }}>sleep.</span>
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(233,228,218,0.18)',
            paddingTop: 22,
            fontFamily: 'Instrument Sans',
            fontSize: 22,
            color: MOON_MUTED,
          }}
        >
          <span>Personal Match Score · transparent method · real mattresses</span>
          <span>{host}</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
