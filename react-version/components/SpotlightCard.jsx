'use client';

/**
 * Wraps children in the .spotlight-card / .border-beam CSS treatment
 * (see globals.css) and drives the cursor-tracked highlight via CSS
 * custom properties set on pointermove. No animation library - the
 * actual motion is CSS (radial-gradient position + conic-gradient
 * rotation), this component only supplies the two numbers.
 *
 * Safe without JS: --mx/--my default to 50%/50% in CSS, so the card
 * still renders a centered, static glow rather than nothing.
 */
export default function SpotlightCard({ as: Tag = 'div', className = '', beam = false, onLight = false, children, ...rest }) {
  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }

  const classes = ['spotlight-card', beam ? 'border-beam' : '', onLight ? 'on-light' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} onPointerMove={handleMove} {...rest}>
      {children}
    </Tag>
  );
}
