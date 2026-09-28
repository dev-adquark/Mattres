'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Mattress Match Score root error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f1f1e9', color: '#29372d', fontFamily: 'Inter, Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'grid', placeItems: 'center', padding: '64px 24px' }}>
          <section style={{ width: 'min(100%, 680px)' }}>
            <span style={{ color: '#77816e', fontSize: 10, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase' }}>
              Mattress Match Score · System error
            </span>
            <div aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, margin: '34px 0 22px', border: '1px solid #d5ddcf', borderRadius: '50%', background: '#e8ece2', color: '#718568', fontFamily: 'Georgia, serif', fontSize: 28 }}>
              !
            </div>
            <h1 style={{ margin: '0 0 22px', color: '#2c3a2e', fontFamily: 'Georgia, Times New Roman, serif', fontSize: 'clamp(42px, 6.4vw, 72px)', fontWeight: 400, letterSpacing: '-.055em', lineHeight: 1.03 }}>
              A brief pause.<br /><em style={{ color: '#718568', fontWeight: 400 }}>We’ll get you back.</em>
            </h1>
            <p style={{ maxWidth: 470, margin: '0 0 30px', color: '#6c7569', fontSize: 14, lineHeight: 1.9 }}>
              The site hit an unexpected error. Please try again; your next step is just one click away.
            </p>
            <button type="button" onClick={() => reset()} style={{ cursor: 'pointer', border: '1px solid #29372d', background: '#29372d', color: '#fff', padding: '15px 22px', font: '600 12px Inter, Arial, sans-serif', letterSpacing: '.04em' }}>
              Try again <span aria-hidden="true">↻</span>
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
