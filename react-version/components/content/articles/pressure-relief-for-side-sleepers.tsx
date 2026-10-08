import Link from 'next/link';
import { RangeChart, bandRowsForPosition } from '../RangeChart';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'On your side, the shoulder and hip carry most of the load over a small area, so the surface needs enough give there.',
  'How much give depends on your weight: the side-sleeper comfort window moves up the firmness scale as weight rises.',
  'Softer is not always better. Past your window the hip sinks further than the shoulder and alignment suffers.',
  'For side sleepers and anyone reporting shoulder or hip discomfort, the engine counts pressure relief for more and flags low scores.',
];

export const sections: ArticleSection[] = [
  {
    id: 'why-side',
    title: 'Why side sleeping needs more give',
    render: () => (
      <>
        <p>
          Lying on your side puts your weight onto a much smaller area than lying on your back. Most of it lands on two
          places: the point of the shoulder and the hip. Your waist bridges the gap between them.
        </p>
        <p>
          A surface that does not give at those two points pushes back hard there. That is what people usually mean by
          pressure points: the shoulder that feels squashed by morning, the hip you keep turning off. A surface with
          enough give lets the shoulder and hip settle in until more of your side is in contact and the load is spread
          more evenly.
        </p>
      </>
    ),
  },
  {
    id: 'how-much',
    title: 'How much give you need',
    render: ({ rules }) => (
      <>
        <p>
          The answer depends mostly on your weight. A lighter body sinks less into the same materials, so it needs a
          softer surface to get the same contact. A heavier body sinks further and needs a firmer one to stop the hip
          bottoming out.
        </p>
        <figure>
          <RangeChart caption="Side sleepers: comfort window by body weight" rowHeader="Body weight" rows={bandRowsForPosition(rules, 'side')} />
          <figcaption>From scoring rules v{rules.version}: the firmness range (1–10) the engine treats as comfortable for a side sleeper.</figcaption>
        </figure>
        <p>
          The depth of the comfort layers matters as well as the firmness number. A thin soft layer over a hard core can
          let the shoulder reach the core, so a mattress with a modest firmness rating can still feel hard at the
          shoulder. Check what the brand publishes about its comfort layers to spot this.
        </p>
      </>
    ),
  },
  {
    id: 'too-soft',
    title: 'Where softer stops helping',
    render: () => (
      <>
        <p>
          Your hips and pelvis usually carry more weight than your shoulder. On a surface that is too soft for your weight, the hip keeps sinking after
          the shoulder has settled, and your spine bends down towards the mattress at the waist. You trade shoulder
          comfort for an awkward line through the lower back.
        </p>
        <p>
          That is why the engine scores pressure relief and support separately. A mattress softer than your window can
          still score well on pressure relief while losing points on support, and your results will show both. When it
          falls outside your window, you will also see a watch-out explaining which way it misses.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How the engine scores it',
    render: ({ rules }) => {
      const side = weightRule(rules, 'WEIGHT_POSITION_SIDE');
      const shoulders = weightRule(rules, 'WEIGHT_PAIN_SHOULDERS');
      const hips = weightRule(rules, 'WEIGHT_PAIN_HIPS');
      return (
        <>
          <p>
            Pressure relief starts from a value for the construction type and is then adjusted by where the mattress’s
            firmness sits in your window: softer within the window adds more, firmer than the window takes points away
            for each point it is over.
          </p>
          <ul>
            <li>
              As a side sleeper, pressure relief counts {side.multiply.pressureRelief}× its default weight in your overall
              score.
            </li>
            <li>
              If you report shoulder discomfort, it counts a further {shoulders.multiply.pressureRelief}×. Hip discomfort
              raises both pressure relief ({hips.multiply.pressureRelief}×) and support ({hips.multiply.support}×),
              because hips need cushioning and a level line.
            </li>
            <li>
              If pressure relief scores below {rules.thresholds.pressurePointMinScore}/10 for you, your results show a
              watch-out, with a suggestion such as a softer comfort layer or a topper.
            </li>
          </ul>
          <p>
            Weights are then re-balanced so they always add up to 100%, and your results explain which of your answers
            changed the weighting. The full model is on <Link href="/methodology">How It Works</Link>.
          </p>
        </>
      );
    },
  },
  {
    id: 'checklist',
    title: 'What to check before you buy',
    render: () => (
      <>
        <ul>
          <li>Find your comfort window for your weight, then look for mattresses whose firmness falls inside it.</li>
          <li>Look at what the comfort layers are made of and how thick they are, not just the overall firmness label.</li>
          <li>If you share the bed, check motion isolation too, especially if either of you changes position often.</li>
          <li>
            Use the trial properly. Shoulder comfort in the first nights is not the full picture; see our{' '}
            <Link href="/guides/mattress-buying-checklist">buying checklist</Link>.
          </li>
        </ul>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'What is the best mattress firmness for side sleepers?',
    a: 'It depends on weight. In our scoring rules a side sleeper’s comfort window runs from 2–5/10 under 130 lb up to 6–9/10 at 230 lb and up. Within your window, your own preference decides the rest.',
  },
  {
    q: 'Why does my shoulder hurt on my mattress?',
    a: 'A common reason is that the surface is too firm for you, or the soft layer on top is too thin, so the shoulder presses against firmer material underneath. A mattress inside your comfort window or a topper can help. Persistent pain is worth discussing with a clinician; a mattress is not a treatment.',
  },
  {
    q: 'Do I need memory foam for pressure relief?',
    a: 'No. Memory foam contours closely, but latex, other foams and well-padded hybrids can all relieve pressure. What matters is enough give at the shoulder and hip for your weight, without the hip sinking out of line.',
  },
  {
    q: 'Does a topper fix a mattress that is too firm?',
    a: 'Often, partly. A soft topper adds give at the surface and is a reasonable first step for a mattress that is slightly too firm. It cannot add support to a mattress that is too soft or sagging.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Side sleeping', href: 'https://www.sleepfoundation.org/sleeping-positions/side-sleeping' },
  { label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Strong pressure relief for side sleepers',
  intro: 'For a 150 lb side sleeper with shoulder discomfort who prefers medium-soft, these rank highest in the current catalog.',
};

export const cta: NonNullable<ArticleModule['cta']> = {
  title: 'Your weight changes how much give you need.',
  body: 'Tell us your position, weight and where you feel it, and the engine ranks every mattress for that combination.',
};
