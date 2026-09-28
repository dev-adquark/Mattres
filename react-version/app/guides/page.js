import Link from 'next/link';

export const metadata = {
  title: 'Mattress Guides — Mattress Match Score',
  description: 'Real, sourced guides on what actually affects pressure relief, back support and cooling — and how the real scoring engine weighs each one.',
};

const GUIDES = [
  {
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    alt: 'Soft, layered bedroom interior illustrating pressure relief',
    href: '/guides/pressure-relief-for-side-sleepers',
    title: 'Pressure Relief for Side Sleepers',
    desc: 'What actually matters, and how it’s scored — not general wellness advice.',
  },
  {
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    alt: 'Supportive mattress and bed frame in a calm bedroom',
    href: '/guides/back-support-for-heavier-sleepers',
    title: 'Back Support for Heavier Sleepers',
    desc: 'How body weight changes the firmness a back sleeper actually needs.',
  },
  {
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80',
    alt: 'Airy bedroom with light bedding illustrating a cooling topic',
    href: '/guides/cooling-mattress-comparison',
    title: 'Cooling Mattress Comparison',
    desc: 'What "sleeps cool" really means, and its real limits as a proxy for lab-measured heat data.',
  },
];

export default function GuidesIndexPage() {
  return (
    <main className="guides-library-page">
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
              <img className="guide-index-image" src={g.image} alt={g.alt} loading="lazy" decoding="async" />
              <div className="guide-index-copy">
                <h3>{g.title}</h3>
                <p>{g.desc}</p>
                <span className="guide-index-disclosure">Illustrative bedroom image · Not a product photo</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
