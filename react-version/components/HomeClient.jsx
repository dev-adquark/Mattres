'use client';

import Link from 'next/link';
import BrandCarouselRow from '@/components/BrandCarouselRow';
import CategoryIconGrid from '@/components/CategoryIconGrid';
import FaqAccordion from '@/components/FaqAccordion';
import HowItWorks from '@/components/HowItWorks';
import HomeOptionSlider from '@/components/HomeOptionSlider';
import Hero from '@/components/Hero';
import TrustBadgeRow from '@/components/TrustBadgeRow';

/**
 * Homepage is intentionally a short, guided landing page: cinematic hero,
 * swipeable paths, a compact explanation, browse shortcuts and FAQs.
 * Full scoring, catalog exploration, comparison and X-Ray tools remain
 * available on their dedicated pages instead of stacking every tool here.
 */
export default function HomeClient({ catalog, heroExample }) {
  const brandCount = new Set(catalog.map((m) => m.brand)).size;

  return (
    <main className="home-short">
      <Hero catalogCount={catalog.length} brandCount={brandCount} heroExample={heroExample} />
      <HomeOptionSlider />
      <section className="home-editorial-showcase" aria-label="A closer look at better sleep">
        <div className="wrap">
          <div className="showcase-heading"><span className="eyebrow-dark">Designed around your nights</span><h2>Make room for <em>better sleep.</em></h2><p>Explore the materials, details and rituals that turn a mattress into your own sleep sanctuary.</p></div>
          <div className="showcase-mosaic">
            <Link href="/mattresses" className="showcase-tile showcase-tile-large"><img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=90" alt="Calm luxury bedroom with layered bedding" loading="lazy" /><span className="showcase-shade" /><span className="showcase-illustrative">Illustrative</span><span className="showcase-tile-copy"><small>01 / THE SANCTUARY</small><strong>Your best nights<br/>start here.</strong><b>Explore mattresses ↗</b></span></Link>
            <Link href="/mattresses?type=memory-foam" className="showcase-tile showcase-tile-top"><img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=85" alt="Close-up of a plush mattress and bedding" loading="lazy" /><span className="showcase-shade" /><span className="showcase-illustrative">Illustrative</span><span className="showcase-tile-copy"><small>02 / PRESSURE RELIEF</small><strong>Sink into comfort.</strong><b>Discover foam ↗</b></span></Link>
            <Link href="/mattresses?type=hybrid" className="showcase-tile showcase-tile-bottom"><img src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85" alt="Contemporary bedroom with a refined mattress setup" loading="lazy" /><span className="showcase-shade" /><span className="showcase-illustrative">Illustrative</span><span className="showcase-tile-copy"><small>03 / BALANCED SUPPORT</small><strong>Comfort meets support.</strong><b>Explore hybrid ↗</b></span></Link>
          </div>
          <div className="showcase-footnote"><span>THE ART OF REST</span><span>Thoughtfully matched. Personally yours.</span></div>
        </div>
      </section>

      <section className="home-simple-section home-how-section" aria-labelledby="home-how-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Simple by design</span>
            <h2 id="home-how-title">Your mattress, without the guesswork.</h2>
            <p>Tell us how you sleep. We compare real mattresses against what matters to you.</p>
          </div>
          <HowItWorks />
          <div className="home-centered-action">
            <Link href="/find-match" className="btn btn-primary">Find my mattress <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="home-simple-section home-trust-section" aria-labelledby="home-trust-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Shop with clarity</span>
            <h2 id="home-trust-title">Explore what works for you.</h2>
            <p>Start with a mattress type, or browse brands and compare your shortlist.</p>
          </div>
          <TrustBadgeRow />
          <div className="home-browse-block" id="home-categories">
            <CategoryIconGrid />
          </div>
          <div className="home-brand-block">
            <div className="home-inline-heading">
              <h3>Brands in our catalog</h3>
              <Link href="/mattresses">Browse all mattresses <span aria-hidden="true">↗</span></Link>
            </div>
            <BrandCarouselRow />
          </div>
        </div>
      </section>

      <section className="home-simple-section home-faq-section" aria-labelledby="home-faq-title">
        <div className="wrap home-faq-wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Need a hand?</span>
            <h2 id="home-faq-title">Frequently asked questions</h2>
            <p>Quick answers to help you choose with confidence.</p>
          </div>
          <FaqAccordion onLight />
          <div className="home-centered-action">
            <Link href="/methodology" className="btn btn-ghost-dark">How our scores work <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-title">
        <div className="wrap">
          <span className="eyebrow-dark">Better sleep starts here</span>
          <h2 id="home-final-title">Find the mattress that fits your sleep.</h2>
          <p>A free, quick quiz. Personalized scores. No signup required.</p>
          <Link href="/find-match" className="btn btn-primary">Find my mattress <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="mobile-sticky-cta">
        <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
