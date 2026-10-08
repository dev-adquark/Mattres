'use client';

import dynamic from 'next/dynamic';

// Loaded on demand (after hydration) so neither package sits in the root
// layout's first-load JS; they only measure and report, nothing renders.
const Analytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), { ssr: false });
const SpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights), { ssr: false });

/** Vercel Web Analytics + Speed Insights. Mount only on a Vercel deployment (their scripts live under /_vercel/*). */
export function VercelInsights() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
