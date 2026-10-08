import Link from 'next/link';
import { MedianSentence } from '../CatalogStats';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'Edge support is how firm and stable the perimeter stays when you sit or lie near it.',
  'It matters if you sit on the edge to dress or get up, sleep near the edge, or share a smaller bed.',
  'Coil mattresses, especially with a reinforced perimeter, tend to have firmer edges than all-foam.',
  'Tell us how much it matters and the engine doubles, halves or keeps its weight, and flags weak edges when it counts.',
];

export const sections: ArticleSection[] = [
  {
    id: 'what-it-is',
    title: 'What edge support is',
    render: () => (
      <>
        <p>
          The middle of a mattress is supported on all sides by more mattress. The edge is not. When you sit on the side
          of the bed, your weight lands on a small area with nothing beside it, and on a soft perimeter it rolls down and
          outward. Lying near the edge can give a similar sense of tipping off.
        </p>
        <p>
          Good edge support keeps the perimeter close to level under that load, so the whole surface is usable and it is
          easier to sit, stand and get in and out.
        </p>
      </>
    ),
  },
  {
    id: 'who-cares',
    title: 'Who should care',
    render: () => (
      <>
        <ul>
          <li>People who sit on the edge every day, to dress, put on shoes or as a seat in a small room.</li>
          <li>Anyone who finds getting in and out of bed hard; a firm edge gives a stable place to push from.</li>
          <li>
            Couples on a full or queen, where each person ends up close to an edge. A soft perimeter shrinks the usable
            width.
          </li>
          <li>People who naturally sleep near the side of the bed.</li>
        </ul>
        <p>If none of these sound like you, edge support is a reasonable thing to trade for something you do need.</p>
      </>
    ),
  },
  {
    id: 'construction',
    title: 'What makes an edge firm',
    render: ({ catalog }) => (
      <>
        <p>
          Coils hold their shape at the perimeter better than foam, and many hybrids and innersprings add a band of
          firmer coils or a dense foam rail around the edge. All-foam mattresses usually rely on the foam alone, so their
          edges tend to be softer, especially in softer models.
        </p>
        <MedianSentence catalog={catalog} field="edgeSupportRatingOutOf10" dimension="edge support" />
        <p>
          Product pages often describe a “reinforced perimeter” without saying how much firmer it is. An independent
          rating is a better guide than the claim.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How the engine weighs it',
    render: ({ rules }) => {
      const high = weightRule(rules, 'WEIGHT_EDGE_HIGH');
      const low = weightRule(rules, 'WEIGHT_EDGE_LOW');
      return (
        <>
          <p>
            The edge score comes from an independent edge support rating when the catalog has one, and otherwise from a
            capped estimate for the construction type, marked Estimated. The quiz asks how much edge support matters to
            you:
          </p>
          <ul>
            <li>
              A lot: edge counts {high.multiply.edge}× its default weight, and any mattress below{' '}
              {rules.thresholds.edgeSupportMinScoreWhenImportant}/10 gets a watch-out.
            </li>
            <li>
              Somewhat, or no answer: default weight, with a watch-out below {rules.thresholds.edgeSupportMinScore}/10.
            </li>
            <li>Not much: edge counts {low.multiply.edge}× and the engine does not flag weak edges for you.</li>
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
    q: 'Do memory foam mattresses have bad edge support?',
    a: 'They tend to have softer edges than coil mattresses because the perimeter is the same foam as the rest of the bed. Some firmer foam models hold up well. Check the independent edge rating rather than assuming from the type.',
  },
  {
    q: 'Does edge support affect durability?',
    a: 'Edges take concentrated load every time you sit on them, so a weak edge is often where a mattress first shows wear. Rotating the mattress, if the manufacturer allows it, spreads that wear.',
  },
  {
    q: 'Can I add edge support to a mattress?',
    a: 'Not in any meaningful way. A firm, well-fitting base helps the whole mattress, but the edge firmness comes from how the mattress is built.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Edge support', href: 'https://www.sleepfoundation.org/mattress-information/edge-support' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Firm edges for people who use them',
  intro: 'Edge support is weighted double here. For a 190 lb back sleeper who says edge support matters a lot, these rank highest in the current catalog.',
};
