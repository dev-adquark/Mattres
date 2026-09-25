import FaqAccordion from '@/components/FaqAccordion';

export const metadata = {
  title: 'FAQ — Mattress Match Score',
  description: 'Firmness tradeoffs, trial periods, durability, motion isolation, heat, and edge support — explained honestly.',
};

export default function FaqPage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">FAQ</span>
          <h1 className="ph-title">Frequently asked questions</h1>
          <p className="ph-sub">
            What the real scoring engine can and can&apos;t tell you — no unsupported certainty claims.
          </p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap">
          <FaqAccordion onLight />
        </div>
      </section>
    </div>
  );
}
