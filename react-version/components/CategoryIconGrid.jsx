import Link from 'next/link';

const CATEGORIES = [
  { label: 'Memory Foam', sub: 'Pressure-relieving comfort', href: '/mattresses?type=memory-foam', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=85' },
  { label: 'Hybrid', sub: 'The best of both worlds', href: '/mattresses?type=hybrid', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85' },
  { label: 'Innerspring', sub: 'Classic, responsive support', href: '/mattresses?type=innerspring', image: 'https://images.unsplash.com/photo-1631049035182-249067d7618e?auto=format&fit=crop&w=900&q=85' },
  { label: 'Latex', sub: 'Naturally breathable feel', href: '/mattresses?type=latex', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=85' },
  { label: 'Adjustable', sub: 'Comfort that moves with you', href: '/mattresses?type=adjustable', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85' },
];

export default function CategoryIconGrid({ onLight = false }) {
  return (
    <div className={`cat-photo-grid${onLight ? ' on-light' : ''}`}>
      {CATEGORIES.map((cat, index) => (
        <Link href={cat.href} className="cat-photo-card" key={cat.label}>
          <img src={cat.image} alt="" loading="lazy" />
          <span className="cat-photo-shade" aria-hidden="true" />
          <span className="cat-photo-index">0{index + 1}</span>
          <span className="cat-photo-copy">
            <strong>{cat.label}</strong>
            <small>{cat.sub}</small>
          </span>
          <span className="cat-photo-arrow" aria-hidden="true">↗</span>
        </Link>
      ))}
    </div>
  );
}
