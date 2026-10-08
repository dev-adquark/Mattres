import Link from 'next/link';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'For back sleepers, support means keeping the hips level with the shoulders. The firmness that does that rises with body weight.',
  'Support and durability are different questions: one is about tonight, the other is whether tonight’s support lasts.',
  'At 230 lb and above, the engine gives durability and support more weight, and all-foam construction loses a durability point.',
  'A durability warning only appears when an independent durability rating is on file. An estimate never raises the alarm.',
];

export const sections: ArticleSection[] = [
  {
    id: 'weight',
    title: 'Why weight changes the answer',
    render: ({ rules }) => {
      const back = rules.firmnessComfortBands.back;
      return (
        <>
          <p>
            On your back, your weight is spread widely, but your hips and pelvis still carry a large share of it. The job
            of the mattress is to stop them sinking below the line of your shoulders. The heavier you are, the further
            the same materials compress, so the firmness needed to hold that line goes up.
          </p>
          <p>
            In our scoring rules, the comfort window for a back sleeper under 130 lb is {back['under-130'][0]}–
            {back['under-130'][1]}/10. At 230 lb and above it is {back['over-230'][0]}–{back['over-230'][1]}/10. The chart
            above shows every step in between. A mattress that is perfect for a lighter partner can be noticeably too soft
            for a heavier one, even though it is the same mattress.
          </p>
        </>
      );
    },
  },
  {
    id: 'support-vs-durability',
    title: 'Support and durability are not the same thing',
    render: () => (
      <>
        <p>
          Support is how level you lie on the mattress as it is today. Durability is whether it will still hold you that
          way after a few years. Higher loads tend to compress comfort layers and foam cores faster, so a mattress can be
          supportive for a heavier sleeper now and lose that support sooner than it would for a lighter one.
        </p>
        <p>
          That is why it is worth reading the support and durability scores together, and reading any watch-outs before
          the headline number. A strong overall score with a durability warning is still a durability warning.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How the engine handles heavier sleepers',
    render: ({ rules }) => {
      const heavy = weightRule(rules, 'WEIGHT_HEAVIER_SLEEPER');
      const back = weightRule(rules, 'WEIGHT_POSITION_BACK');
      const lower = weightRule(rules, 'WEIGHT_PAIN_LOWER_BACK');
      return (
        <>
          <p>A few rules change when you tell us you weigh {rules.durability.heavierSleeperLb} lb or more:</p>
          <ul>
            <li>
              Durability counts {heavy.multiply.durability}× its default weight and support {heavy.multiply.support}×.
              As a back sleeper, support gets a further {back.multiply.support}×; reporting lower-back discomfort adds{' '}
              {lower.multiply.support}× more.
            </li>
            <li>
              All-foam mattresses lose {rules.durability.heavierSleeperFoamPenalty} point of durability, because foam
              cores tend to compress faster under higher sustained loads than coil cores.
            </li>
            <li>
              If a mattress’s independent durability rating is below {rules.thresholds.durabilityHeavierSleeperMinScore}
              /10, your results show a sag-risk watch-out with a suggestion to check the warranty’s sag terms.
            </li>
          </ul>
          <p>
            The engine never raises that warning from an estimate. If no durability rating is on file, the dimension is
            marked Estimated instead, so you know the gap exists. See the full rules on{' '}
            <Link href="/methodology">How It Works</Link>.
          </p>
        </>
      );
    },
  },
  {
    id: 'what-to-check',
    title: 'What to check before you buy',
    render: () => (
      <>
        <ul>
          <li>Find your comfort window for your weight, and look for a firmness near its center rather than at the soft edge.</li>
          <li>Prefer a supportive core: pocketed coils or a dense foam or latex base, rather than a thin core under thick soft layers.</li>
          <li>
            Read the warranty’s definition of a sag: the depth that counts as a defect, and how it must be measured. Our{' '}
            <Link href="/guides/mattress-buying-checklist">buying checklist</Link> explains what to look for.
          </li>
          <li>
            If you sit on the edge to get up, check edge support too; see{' '}
            <Link href="/guides/edge-support-explained">edge support explained</Link>.
          </li>
        </ul>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'What firmness should a heavier back sleeper choose?',
    a: 'In our scoring rules, a back sleeper at 230 lb and up has a comfort window of 7–10/10. Mattresses near the middle of that window score best on support; your own preference decides between them.',
  },
  {
    q: 'Are hybrids better than foam for heavier sleepers?',
    a: 'Often, because a coil core tends to resist deep sinking and compression better than a foam core. The engine reflects this with a small support adjustment and a durability penalty for all-foam at 230 lb and above, but a mattress’s own ratings matter more than its type.',
  },
  {
    q: 'Why does my mattress feel softer than it did?',
    a: 'Comfort layers soften with use, and heavier loads speed that up. If you can see or measure a dip where you sleep, check the warranty’s sag threshold, which is the depth the manufacturer counts as a defect.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Supportive picks for heavier back sleepers',
  intro: 'For a 250 lb back sleeper with lower-back discomfort who prefers firm, these rank highest in the current catalog.',
};

export const cta: NonNullable<ArticleModule['cta']> = {
  title: 'Support depends on your weight. So should your shortlist.',
  body: 'Tell us how you sleep and the engine applies the heavier-sleeper rules only where they apply to you.',
};
