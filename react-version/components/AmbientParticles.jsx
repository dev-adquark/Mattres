'use client';

import { useEffect, useRef } from 'react';
import { makeVisibilityGate, prefersReducedMotion } from '@/lib/threeUtils';

/**
 * Lightweight plain-Canvas2D ambient particle field (not Three.js/WebGL - a
 * page can only host so many WebGL contexts, and this effect is simple
 * enough that 2D canvas is both cheaper and plenty). One instance per dark
 * section; pauses off-screen, adapts particle count to viewport width, and
 * renders a single static frame under prefers-reduced-motion instead of
 * animating. Ported as-is from the original project's createAmbientParticles.
 */
export default function AmbientParticles({ color = '127,233,255', max = 46, className = 'ambient-canvas' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const gate = makeVisibilityGate(canvas);
    const reducedMotion = prefersReducedMotion();
    let particles = [];
    let w = 0;
    let h = 0;
    let rafId = null;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let count = Math.min(max, Math.max(10, Math.round((w * h) / 26000)));
      if (window.innerWidth < 640) count = Math.round(count * 0.45);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.3 + 0.4,
          vy: -(Math.random() * 0.12 + 0.02),
          vx: (Math.random() - 0.5) * 0.04,
          tw: Math.random() * Math.PI * 2,
          o: Math.random() * 0.45 + 0.15,
        });
      }
    }

    function paint() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        const alpha = p.o * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function frame() {
      rafId = requestAnimationFrame(frame);
      if (!gate() || document.hidden || !w || !h) return;
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.tw += 0.015;
        if (p.y < -4) p.y = h + 4;
        if (p.x < -4) p.x = w + 4;
        else if (p.x > w + 4) p.x = -4;
      });
      paint();
    }

    window.addEventListener('resize', resize);
    resize();
    if (reducedMotion) {
      paint();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
      gate.disconnect();
    };
  }, [color, max]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
