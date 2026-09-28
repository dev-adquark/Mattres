import Link from 'next/link';

export const metadata = {
  title: 'Mattress Guides — Mattress Match Score',
  description: 'Real, sourced guides on what actually affects pressure relief, back support and cooling — and how the real scoring engine weighs each one.',
};

const GUIDES = [
  {
    href: '/guides/pressure-relief-for-side-sleepers',
    title: 'Pressure Relief for Side Sleepers',
    desc: 'What actually matters, and how it’s scored — not general wellness advice.',
  },
  {
    href: '/guides/back-support-for-heavier-sleepers',
    title: 'Back Support for Heavier Sleepers',
    desc: 'How body weight changes the firmness a back sleeper actually needs.',
  },
  {
    href: '/guides/cooling-mattress-comparison',
    title: 'Cooling Mattress Comparison',
    desc: 'What "sleeps cool" really means, and its real limits as a proxy for lab-measured heat data.',
  },
];

export default function GuidesIndexPage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">Guides</span>
          <h1 className="ph-title">Mattress guides</h1>
          <p className="ph-sub">Real, sourced guidance tied to the same scoring model your results use — not generic wellness content.</p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap disc-wrap">
          {GUIDES.map((g) => (
            <Link href={g.href} className="disc-block guide-index-card" key={g.href}>
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
