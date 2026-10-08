import Link from 'next/link';
import { MedianSentence } from '../CatalogStats';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'Motion isolation is how little of one person’s movement reaches the other side of the bed.',
  'Foam and foam-heavy hybrids tend to absorb movement; springy, connected coil systems tend to carry it.',
  'It only matters if you share the bed, and matters most if you are a light sleeper. The engine weights it accordingly.',
  'Bed size, a sturdy base and two separate mattresses can help as much as the mattress itself.',
];

export const sections: ArticleSection[] = [
  {
    id: 'what-it-is',
    title: 'What motion isolation means',
    render: () => (
      <>
        <p>
          When someone turns over, gets up or climbs into bed, the mattress moves under them. Motion isolation describes
          how much of that movement travels across the surface to the other sleeper. A mattress with strong isolation
          absorbs the movement close to where it happens; one with weak isolation lets it ripple across the bed.
        </p>
        <p>
          It is one of the few mattress traits that depends entirely on your situation. If you sleep alone, it barely
          matters. If you share a bed and wake easily, it can matter more than almost anything else.
        </p>
      </>
    ),
  },
  {
    id: 'construction',
    title: 'Which constructions absorb movement',
    render: ({ catalog }) => (
      <>
        <p>
          Slow, dense foams, especially memory foam, absorb energy and dampen movement. Pocketed coils, where each spring
          is wrapped and moves on its own, isolate motion far better than older connected coil units, where a push in one
          place pulls on its neighbors. Thick foam over pocketed coils narrows the gap with all-foam. Springy latex sits
          in between.
        </p>
        <MedianSentence catalog={catalog} field="motionIsolationRatingOutOf10" dimension="motion isolation" />
        <p>
          The trade-off is responsiveness. The same slow foam that absorbs your partner’s movement can make it harder to
          change position yourself. Combination sleepers who turn often may prefer a slightly springier surface.
        </p>
      </>
    ),
  },
  {
    id: 'beyond-the-mattress',
    title: 'Beyond the mattress',
    render: () => (
      <>
        <ul>
          <li>A bigger bed puts more distance between you; moving from a queen to a king gives each person more space.</li>
          <li>A solid, stable base stops the frame itself from transmitting movement.</li>
          <li>
            Two twin XL mattresses on a king frame isolate motion almost completely and let each person choose their own
            firmness.
          </li>
        </ul>
        <p>
          If you also want to use the whole surface, check <Link href="/guides/edge-support-explained">edge support</Link>
          : soft edges effectively shrink the bed for two people.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How the engine weighs it',
    render: ({ rules }) => {
      const high = weightRule(rules, 'WEIGHT_MOTION_COUPLE_HIGH');
      const single = weightRule(rules, 'WEIGHT_MOTION_SINGLE');
      return (
        <>
          <p>
            The motion score comes from an independent motion isolation rating where the catalog has one, and otherwise
            from a capped estimate for the construction type, marked Estimated. Your answer about sharing the bed
            changes how much it counts:
          </p>
          <ul>
            <li>Sleep alone: motion counts {single.multiply.motion}× its default weight. It is reduced, not removed.</li>
            <li>Share the bed and rarely wake: it keeps its default weight.</li>
            <li>
              Share the bed and wake easily: it counts {high.multiply.motion}×, and any mattress scoring below{' '}
              {rules.thresholds.motionTransferMinScore}/10 on motion gets a watch-out.
            </li>
          </ul>
          <p>
            See the full weights on <Link href="/methodology">How It Works</Link>.
          </p>
        </>
      );
    },
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'What type of mattress is best for couples?',
    a: 'For motion isolation, all-foam and foam-heavy hybrids with pocketed coils tend to do best. Couples also need to agree on firmness and may value edge support, so the best choice depends on both people’s answers.',
  },
  {
    q: 'Do hybrid mattresses transfer motion?',
    a: 'Some do, but individually pocketed coils move independently, so most modern hybrids isolate motion reasonably well. Hybrids with thick foam comfort layers tend to isolate better than those with thin ones.',
  },
  {
    q: 'My partner and I need different firmness. What can we do?',
    a: 'Look for models sold with split firmness, or use two twin XL mattresses on a king frame. Either also isolates motion very well.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Motion isolation', href: 'https://www.sleepfoundation.org/mattress-information/motion-isolation' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Strong motion isolation for light sleepers',
  intro: 'Motion is weighted double here. For a 170 lb side sleeper who shares the bed and wakes easily, these rank highest in the current catalog.',
};

export const cta: NonNullable<ArticleModule['cta']> = {
  title: 'Two sleepers, two sets of answers.',
  body: 'Run the quiz for each of you. Mattresses that rank well for both are the ones worth trying together.',
};
