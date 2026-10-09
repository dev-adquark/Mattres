import { MattressRender } from '@/components/ui/MattressRender';
import { Chapter } from '@/components/motion';
import { HeroStage } from './HeroStage';
import type { HomeFacts } from './types';
import { HomeCtas } from './HomeCtas';
import type { HeroBuild } from './HeroBuildSwitcher';
import styles from './Hero.module.css';

/**
 * The still shown below 900px. The 16:9 cutaway (each construction's four
 * layers on night ink) carries the same story as the desktop scene, whose bed
 * separates into those layers on scroll. The dressed-bedroom 'hero' stills are
 * not used here: their bedding geometry does not hold up at phone size.
 */
const MOBILE_HERO_ASPECT = 'cutaway' as const;

/**
 * Matches Hero.module.css: `.mobileVisual` is shown below 900px only, and has
 * no explicit width, so it is 100% of the viewport regardless of its (taller
 * than 16:9) aspect ratio - the still inside it is `fill` + object-fit cover,
 * which crops to that box rather than needing extra resolution for it.
 *
 * This was previously 215vw / 125vw (treating the frame's own aspect ratio
 * as if it changed the box's CSS width): that told next/image this, the
 * mobile LCP element, was over twice as wide as it is, which made it request
 * the actual-pixels largest srcset candidate (w=1920) for an ~420px-wide box
 * - confirmed as the PageSpeed Insights LCP element and the oversized
 * request behind it. 100vw is what the box actually measures.
 */
const MOBILE_HERO_SIZES = '(max-width: 899px) 100vw, 1vw';

/** The hero visual slider's constructions, in the order the catalog's Inspect chapter uses. */
const HERO_BUILDS: HeroBuild[] = [
  { type: 'hybrid', label: 'Hybrid' },
  { type: 'foam', label: 'Foam' },
  { type: 'latex', label: 'Latex' },
  { type: 'innerspring', label: 'Innerspring' },
];

/**
 * Chapter 01 - Discover. A two-layer pinned scene (brief v3 s7-s8):
 * a tall section with a sticky 100svh stage. Scroll progress (0..1,
 * written as --progress by useScrollProgress) drives CSS transforms and
 * opacity only:
 *   0.00-0.55  headline group rises 8vh and fades; the CTA pair settles up toward the header pill
 *   0.00-1.00  the bed drifts left and scales up; the night deepens and an indigo glow follows it
 *   0.35-0.70  the four layers separate (the 3D scene eases its own explode) and a
 *              one-line teaser hands off to chapter 04, the single layer explainer
 * A visual slider (HeroBuildSwitcher) switches the illustration between the
 * four constructions; the layers that separate are the selected build's.
 * Under 900px there is no pin: a composed poster (image first, headline
 * overlapping its lower edge) with a light scroll-linked exit (--hero-exit):
 * the still drifts slower than the page and dims, the headline eases up and
 * fades as chapter 02 arrives. Under reduced motion it stays fully static.
 *
 * The copy renders on the server; HeroStage (client) owns the scroll phase.
 */
export function HomeHero({ facts }: { facts: HomeFacts }) {
  const intro = (
    <>
      <Chapter index={1} label="Discover" className={styles.marker} />
      <h1 id="home-hero-title" className={styles.title}>
        <span className={styles.line}>Find the mattress</span> <span className={styles.line}>that fits the way</span>{' '}
        <span className={styles.line}>
          <em>you sleep.</em>
        </span>
      </h1>
      <p className={styles.lead}>
        Tell us how you sleep. We score {facts.total} real mattresses against your answers and show why each one fits, where the
        data runs thin and what to watch for.
      </p>
      <div className={styles.actions}>
        <HomeCtas ghostClassName={styles.secondary} />
      </div>
    </>
  );

  const teaser = (
    <>
      <p className={styles.teaserTitle}>
        Four layers decide how it <em>sleeps.</em>
      </p>
      <p className={styles.teaserLead}>Each one drives a different part of your Match Score.</p>
      <a href="#inspect" className={`link ${styles.teaserLink}`}>
        Inspect the layers
      </a>
    </>
  );

  // One mobile still per build; HeroStage mounts only the selected one, so
  // only the first (the LCP image) is ever preloaded.
  const mobileVisuals = HERO_BUILDS.map((b, i) => (
    <MattressRender
      key={b.type}
      type={b.type}
      aspect={MOBILE_HERO_ASPECT}
      fill
      objectPosition="40% 52%"
      sizes={MOBILE_HERO_SIZES}
      preload={i === 0}
    />
  ));

  const stats = [
    { id: 'total', label: 'mattresses scored', value: facts.total },
    { id: 'brands', label: 'brands', value: facts.brands },
    { id: 'sponsored', label: 'paid placements', value: facts.sponsoredCount },
  ];

  const base = (
    <div className={`container container--max ${styles.base}`}>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.id}>
            <dt>{s.label}</dt>
            <dd className="tabular">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return <HeroStage intro={intro} teaser={teaser} builds={HERO_BUILDS} mobileVisuals={mobileVisuals} base={base} />;
}
