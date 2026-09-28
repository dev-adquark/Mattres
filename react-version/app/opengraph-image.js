import { ImageResponse } from 'next/og';

export const alt = 'Mattress Match Score — Find your perfect mattress match';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 82px',
          background: '#f1f1e9',
          color: '#29372d',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 12, height: 12, borderRadius: 99, background: '#718568' }} />
          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 5, color: '#687763' }}>
            MATTRESS MATCH SCORE
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 930 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 78, lineHeight: 1.04, letterSpacing: -3 }}>
            <span>Your sleep.</span>
            <span> Your perfect <span style={{ color: '#718568', fontStyle: 'italic' }}>match.</span></span>
          </div>
          <div style={{ marginTop: 30, fontFamily: 'Arial, sans-serif', fontSize: 25, lineHeight: 1.5, color: '#687365' }}>
            A transparent scoring engine for finding the mattress that fits you.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #d7ddcf', paddingTop: 22, fontFamily: 'Arial, sans-serif', fontSize: 17, color: '#71806c' }}>
          <span>Find your fit. Sleep with confidence.</span>
          <span>mattres-liart.vercel.app</span>
        </div>
        <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: 300, border: '1px solid #dce2d5', right: -130, top: 95 }} />
      </div>
    ),
    { ...size }
  );
}
