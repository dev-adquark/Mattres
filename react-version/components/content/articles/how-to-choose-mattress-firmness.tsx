import Link from 'next/link';
import { RangeChart, bandRowsForPosition } from '../RangeChart';
import type { ArticleContext, ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';

function MidScaleNote({ catalog }: Pick<ArticleContext, 'catalog'>) {
  const mids: number[] = [];
  for (const e of catalog) {
    const range = e.firmnessRange;
    if (range && typeof range.min === 'number' && typeof range.max === 'number') mids.push((range.min + range.max) / 2);
  }
  const middle = mids.filter((m) => m >= 5 && m <= 7).length;
  return (
    <p>
      The middle of the scale is crowded. Of the {mids.length} mattresses in our catalog with a firmness on file,{' '}
      {middle} sit between 5 and 7. That is why two mattresses with the same label can still feel different, and why a
      gap of a point or two is worth paying attention to.
    </p>
  );
}

export const takeaways: string[] = [
  'Firmness labels are not standardized between brands. Compare numbers on a 1–10 scale, and check who measured them.',
  'Your sleep position sets roughly where on the scale you belong; your body weight moves that window up or down.',
  'Inside your window, your own preference is a fair tie-breaker. Outside it, comfort usually costs you support or pressure relief.',
  'A firmer mattress is not automatically more supportive. Too firm for your window is a fit problem, just like too soft.',
];

export const sections: ArticleSection[] = [
  {
    id: 'labels',
    title: 'Why firmness labels mislead',
    render: () => (
      <>
        <p>
          There is no industry standard for what “medium-firm” means. One brand’s medium-firm is another’s medium, and
          the same word can describe very different mattresses inside a single catalog. Labels are written by the people
          selling the mattress, so they tend to describe the feel the brand is aiming for rather than a measurement.
        </p>
        <p>
          A 1–10 scale is more useful, as long as you know where the number came from. Our catalog records for each
          mattress whether its firmness figure is the manufacturer’s own number, a brand label we mapped onto the scale,
          or an independent reviewer’s rating. When a brand sells several firmness options, we keep the whole range
          rather than picking one.
        </p>
      </>
    ),
  },
  {
    id: 'the-scale',
    title: 'Reading the 1–10 scale',
    render: ({ rules, catalog }) => (
      <>
        <p>
          On the scale our scoring engine uses, 1 is the softest surface you could sleep on and 10 the firmest. The
          firmness words in our quiz map onto it at fixed points: soft at {rules.firmnessLabelScale.soft}, medium-soft
          at {rules.firmnessLabelScale['medium-soft']}, medium at {rules.firmnessLabelScale.medium}, medium-firm at{' '}
          {rules.firmnessLabelScale['medium-firm']}, firm at {rules.firmnessLabelScale.firm} and extra-firm at{' '}
          {rules.firmnessLabelScale['extra-firm']}.
        </p>
        <MidScaleNote catalog={catalog} />
      </>
    ),
  },
  {
    id: 'position-and-weight',
    title: 'Position and weight set your window',
    render: ({ rules }) => (
      <>
        <p>
          Your sleep position decides where your weight lands. Side sleepers press a narrow shoulder and hip into the
          surface and need give there. Back and stomach sleepers spread their weight more widely but need the hips held
          level. That is why the comfort window starts lower for side sleepers and higher for stomach sleepers.
        </p>
        <p>
          Body weight then moves the window. A heavier body compresses the same foam further, so the firmness that feels
          medium to a lighter sleeper can feel soft to a heavier one. In our scoring rules, every position’s window moves
          up the scale across four weight bands. Here is the side-sleeper window as an example:
        </p>
        <figure>
          <RangeChart caption="Side sleepers: comfort window by body weight" rowHeader="Body weight" rows={bandRowsForPosition(rules, 'side')} />
          <figcaption>From scoring rules v{rules.version}. Every position follows the same upward pattern.</figcaption>
        </figure>
        <p>
          You can see the window for your own position on the{' '}
          <Link href="/sleep-position/side">side</Link>, <Link href="/sleep-position/back">back</Link>,{' '}
          <Link href="/sleep-position/stomach">stomach</Link> and{' '}
          <Link href="/sleep-position/combination">combination</Link> sleeper pages.
        </p>
      </>
    ),
  },
  {
    id: 'preference',
    title: 'When your preference should win',
    render: ({ rules }) => (
      <>
        <p>
          Comfort windows are a starting point, not a verdict. Two people with the same position and weight can like
          quite different surfaces, and someone used to a firm bed may find a soft one unsettling even if it is in their
          window.
        </p>
        <p>
          The engine treats your stated preference as its own signal. Inside a tolerance of half a point there is no
          effect. Beyond that, the overall score loses {rules.preferenceFit.pointsPerFirmnessPoint} points for each
          firmness point between the mattress and your preference, up to a maximum of {rules.preferenceFit.maxPenalty}.
          When the gap reaches {rules.thresholds.preferredFirmnessMismatchPoints} points, your results also show a
          watch-out so you can judge it yourself.
        </p>
        <p>
          A useful rule of thumb: if your preference sits inside your window, trust it. If it sits outside, ask why.
          Sometimes it is a genuine taste; sometimes it is a memory of a mattress that had worn out.
        </p>
      </>
    ),
  },
  {
    id: 'too-firm',
    title: 'Too firm is a problem too',
    render: () => (
      <>
        <p>
          It is common to assume firmer means more supportive. Support is really about alignment: keeping your spine in
          a natural line for the way you lie. A surface that is much firmer than your window can push back at the
          shoulders and hips and leave gaps elsewhere, which is not better support.
        </p>
        <p>
          That is why our support score peaks at the center of your comfort window and falls away on both sides. Softer
          than the window loses support a little faster than firmer than the window, because a sinking midsection is the
          bigger alignment risk, but neither side wins.
        </p>
      </>
    ),
  },
  {
    id: 'testing',
    title: 'Testing firmness at home',
    render: () => (
      <>
        <p>
          The first nights on a new mattress are not a reliable guide. Bodies take time to adjust to a different surface,
          and many brands build an adjustment period into their trial for that reason. Use the whole trial, and notice
          how you feel in the morning more than how the bed feels when you first lie down.
        </p>
        <p>
          If a mattress is close but not right, a topper can move the feel softer. Making a soft mattress firmer is much
          harder, so if you are torn between two firmness options, the firmer of the two is usually easier to adjust.
          Our <Link href="/guides/mattress-buying-checklist">buying checklist</Link> covers what to check about trials
          and returns.
        </p>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Is medium-firm the best firmness for most people?',
    a: 'Medium-firm lands inside the comfort window for many back, stomach and combination sleepers of average weight, which is why it is common. It is too firm for many lighter side sleepers and too soft for many heavier stomach sleepers, so it is a reasonable default rather than a best choice.',
  },
  {
    q: 'Does a heavier person need a firmer mattress?',
    a: 'Usually, yes. A heavier body compresses the same materials further, so the same mattress feels softer. In our scoring rules every sleep position’s comfort window moves up the scale as body weight rises.',
  },
  {
    q: 'Can I trust a brand’s own firmness rating?',
    a: 'Treat it as a description of intent. Brands do not share a standard, so compare numbers from the same independent reviewer where you can, and use the trial period to judge the feel yourself.',
  },
  {
    q: 'What if my partner and I need different firmness?',
    a: 'Look for models sold with split firmness options, or consider two twin XL mattresses on a king frame. Otherwise, a mattress in the overlap of both comfort windows is the usual compromise; run the quiz for each of you and compare.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' },
  { label: 'Sleep Foundation: Mattress trial periods', href: 'https://www.sleepfoundation.org/mattress-information/mattress-trial-periods' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Mid-scale mattresses that rank well',
  intro: 'For a combination sleeper of average weight who prefers medium, these are the highest-ranked mattresses in the current catalog.',
};
