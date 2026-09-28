import Link from 'next/link';

const options = [
  { eyebrow: 'Personalized', title: 'Find your match', copy: 'Answer 6 quick questions and get mattresses scored for your sleep.', href: '/find-match', action: 'Start the quiz', tone: 'match' },
  { eyebrow: 'Explore', title: 'Shop by mattress type', copy: 'Browse foam, hybrid and innerspring options in one place.', href: '/mattresses', action: 'Explore mattresses', tone: 'browse' },
  { eyebrow: 'Compare', title: 'Compare your shortlist', copy: 'See real differences in price, trial period and match scores.', href: '/compare', action: 'Compare mattresses', tone: 'compare' },
  { eyebrow: 'Transparent', title: 'How scores work', copy: 'Understand the six dimensions behind every recommendation.', href: '/methodology', action: 'See our method', tone: 'method' },
];

export default function HomeOptionSlider() {
  return (
    <section className="home-options" aria-label="Explore Mattress">
      <div className="home-options-heading">
        <div>
          <span className="eyebrow-dark">A simpler way to shop</span>
          <h2>Where would you like to start?</h2>
        </div>
        <span className="home-slider-hint" aria-hidden="true">Swipe to explore <span>→</span></span>
      </div>
      <div className="home-options-track" role="list">
        {options.map((option, index) => (
          <article className={`home-option-card home-option-${option.tone}`} key={option.tone} role="listitem">
            <span className="home-option-number">0{index + 1}</span>
            <span className="home-option-eyebrow">{option.eyebrow}</span>
            <h3>{option.title}</h3>
            <p>{option.copy}</p>
            <Link href={option.href} className="home-option-link">{option.action}<span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
