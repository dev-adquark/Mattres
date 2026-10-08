import Link from 'next/link';
import { NightTemperatureDiagram } from '../Diagrams';
import { RangeChart, bandRowsForWeight } from '../RangeChart';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'Your core body temperature falls in the evening and keeps falling after you drop off. Sleep comes most easily while it is falling.',
  'In research on heat exposure, a hot, humid bedroom increased time awake and cut deep and REM sleep, mostly early in the night.',
  'The room and your bedding are the biggest levers. A mattress changes how warm the bed is, not how your body regulates heat.',
  'Position matters for more than comfort: back sleeping tends to worsen sleep apnea, and the left side is often easier for reflux.',
  'Your position sets your firmness window in the Match Score; telling us you sleep hot doubles the weight of cooling.',
];

export const sections: ArticleSection[] = [
  {
    id: 'two-levers',
    title: 'Two things that shape a night',
    render: () => (
      <>
        <p>
          Before the mattress does anything, two things are already shaping how you sleep: how warm you are and how you
          lie. This guide summarizes what public sleep research and the Sleep Foundation say about each, then shows how
          the Match Score uses both.
        </p>
        <p>
          It is general information, not medical advice. Loud snoring, pauses in breathing, frequent heartburn at night
          or waking hot and sweating are worth raising with a doctor; no mattress treats them.
        </p>
      </>
    ),
  },
  {
    id: 'body-cools',
    title: 'Your body cools down to sleep',
    render: () => (
      <>
        <p>
          Core body temperature follows a daily rhythm: it decreases during the night and increases while you are
          awake. According to the Sleep Foundation, the drop starts about two hours before you go to sleep, around the
          time your body releases the sleep hormone melatonin.
        </p>
        <p>
          A 2012 review of thermal environment and sleep found that sleep is most likely to begin while core temperature
          is falling and rarely begins while it is rising. Once you are asleep, it keeps falling.
        </p>
        <NightTemperatureDiagram />
      </>
    ),
  },
  {
    id: 'heat-costs-sleep',
    title: 'What heat does to sleep',
    render: () => (
      <>
        <p>
          The same review reports that heat exposure increases wakefulness and reduces slow-wave (deep) sleep and REM
          sleep, and that these effects are concentrated in the early part of the night. Humid heat is worse than dry
          heat, because sweat cannot evaporate as easily.
        </p>
        <p>
          REM sleep is a particularly exposed stage: during REM the body largely stops regulating its temperature by
          sweating or shivering, so the room has more influence. The Sleep Foundation notes that very hot rooms appear to
          shorten REM sleep, and that a higher core temperature has been linked with less slow-wave sleep.
        </p>
        <p>
          Cold behaves differently. In the studies the review describes, people with adequate bedding and clothing slept
          through cool rooms with their sleep stages largely unaffected.
        </p>
      </>
    ),
  },
  {
    id: 'bedroom',
    title: 'The room and the bed',
    render: () => (
      <>
        <p>
          The Sleep Foundation recommends a bedroom between 65 and 68°F (18.3–20°C), with about 65°F (18.3°C) as a good
          target for most adults. What matters to your skin is the small climate under the covers: the review describes
          it as staying around 32–34°C (about 90–93°F) and 40–60% relative humidity when people sleep normally.
        </p>
        <p>
          A mattress is one part of that climate. The review cites research in which a mattress with less thermal
          insulation lowered core temperature without changing sleep stages. In plain terms: the mattress can make the
          bed warmer or cooler, but the evidence that it changes how well you sleep is thinner than for the room itself.
        </p>
        <p>
          So fix the cheap things first: room temperature, lighter or more breathable bedding, and nothing thick and
          insulating between you and the mattress. Our <Link href="/guides/mattresses-for-hot-sleepers">guide for hot
          sleepers</Link> covers which constructions breathe better.
        </p>
      </>
    ),
  },
  {
    id: 'position',
    title: 'What your sleep position changes',
    render: () => (
      <>
        <p>The Sleep Foundation’s guidance on positions goes beyond comfort:</p>
        <ul>
          <li>
            <strong>Back.</strong> It can keep the spine in line with good pillow support, but it is the worst position
            for obstructive sleep apnea and can make reflux worse.
          </li>
          <li>
            <strong>Side.</strong> Side sleeping is typically better for sleep apnea, and the left side is usually the
            easiest for heartburn and reflux; the right side can make reflux worse. The left side is also the position
            commonly advised during pregnancy.
          </li>
          <li>
            <strong>Stomach.</strong> It may reduce snoring, but it gives the least back support of any position and is
            generally not recommended.
          </li>
        </ul>
        <p>
          If you snore loudly or have been told you stop breathing in your sleep, see a doctor rather than relying on a
          change of position or mattress.
        </p>
      </>
    ),
  },
  {
    id: 'position-and-score',
    title: 'How position changes the Match Score',
    render: ({ rules }) => {
      const side = weightRule(rules, 'WEIGHT_POSITION_SIDE');
      const back = weightRule(rules, 'WEIGHT_POSITION_BACK');
      const stomach = weightRule(rules, 'WEIGHT_POSITION_STOMACH');
      return (
        <>
          <p>
            Position is the first thing the quiz asks, because it moves the firmness range the engine treats as
            comfortable. For a sleeper between 130 and 179 lb, the published rules set these windows:
          </p>
          <RangeChart caption="Comfort window by position, 130–179 lb" rowHeader="Sleep position" rows={bandRowsForWeight(rules, '130-180')} />
          <p>It also shifts what counts most:</p>
          <ul>
            <li>Side: pressure relief counts {side.multiply.pressureRelief}× its default weight.</li>
            <li>Back: support counts {back.multiply.support}×.</li>
            <li>
              Stomach: support counts {stomach.multiply.support}× and pressure relief {stomach.multiply.pressureRelief}×,
              because sinking at the hips matters more than cushioning.
            </li>
          </ul>
          <p>
            Each position has its own page with the windows at every body weight:{' '}
            <Link href="/sleep-position/side">side</Link>, <Link href="/sleep-position/back">back</Link>,{' '}
            <Link href="/sleep-position/stomach">stomach</Link> and <Link href="/sleep-position/combination">combination</Link>.
          </p>
        </>
      );
    },
  },
  {
    id: 'temperature-and-score',
    title: 'How temperature changes the Match Score',
    render: ({ rules }) => {
      const hot = weightRule(rules, 'WEIGHT_TEMPERATURE_HOT');
      const cold = weightRule(rules, 'WEIGHT_TEMPERATURE_COLD');
      return (
        <>
          <p>
            The quiz asks whether you sleep hot, cold or neither. Sleep hot and cooling counts {hot.multiply.heat}× its
            default weight; sleep cold and it counts {cold.multiply.heat}×. If you sleep hot and a mattress scores{' '}
            {rules.thresholds.heatRetentionMaxHeatScore}/10 or lower on cooling, your results show a watch-out.
          </p>
          <p>
            A mattress’s cooling score comes from an independent rating where one exists, and otherwise from a capped
            estimate for its construction type, marked Estimated. See the{' '}
            <Link href="/guides/cooling-mattress-comparison">ratings we have on file</Link> and the full model on{' '}
            <Link href="/methodology">How It Works</Link>.
          </p>
        </>
      );
    },
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'What is the best bedroom temperature for sleep?',
    a: 'The Sleep Foundation recommends 65 to 68°F (18.3 to 20°C), with about 65°F as a good target for most adults. Bedding and sleepwear matter too, because what your skin feels is the climate under the covers.',
  },
  {
    q: 'Why do I sleep worse when it is hot?',
    a: 'Your body needs to shed heat to fall and stay asleep. Research on heat exposure found that warm, humid conditions increase time awake and reduce deep and REM sleep, especially early in the night.',
  },
  {
    q: 'What is the healthiest sleep position?',
    a: 'There is no single answer. Side sleeping is typically better for snoring and sleep apnea, the left side is usually easier for reflux, and back sleeping can support the spine well but tends to worsen apnea. Stomach sleeping gives the least back support.',
  },
  {
    q: 'Can a mattress fix sleep apnea or reflux?',
    a: 'No. A mattress can make a position more comfortable, but loud snoring, pauses in breathing or frequent night-time heartburn need a doctor’s assessment.',
  },
];

export const sources: SourceLink[] = [
  {
    label: 'Okamoto-Mizuno K, Mizuno K. Effects of thermal environment on sleep and circadian rhythm. Journal of Physiological Anthropology, 2012',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3427038/',
  },
  { label: 'Sleep Foundation: Best temperature for sleep', href: 'https://www.sleepfoundation.org/bedroom-environment/best-temperature-for-sleep' },
  { label: 'Sleep Foundation: What is the best sleeping position?', href: 'https://www.sleepfoundation.org/sleeping-positions' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Starting points for side sleepers',
  intro: 'For a 160 lb side sleeper who prefers medium-soft and sleeps neither hot nor cold, these rank highest in the current catalog.',
};
