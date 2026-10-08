import Link from 'next/link';
import type { ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { weightRule } from '@/lib/content/bands';

export const takeaways: string[] = [
  'A mattress cannot cool you down. The best it can do is avoid trapping the heat your body gives off.',
  'Open coil cores tend to let air move; dense foam tends to hold heat near the surface. Covers and gels help less than the core.',
  'Room temperature and bedding matter as much as the mattress. Fix the cheap things first.',
  'If you tell us you sleep hot, cooling counts twice as much in your score, and low-rated mattresses get a watch-out.',
];

export const sections: ArticleSection[] = [
  {
    id: 'what-a-mattress-can-do',
    title: 'What a mattress can and cannot do',
    render: () => (
      <>
        <p>
          Your body temperature naturally drops as you fall asleep and through the night. Heat has to go somewhere, and
          the mattress is the surface it meets most. A mattress that lets heat and air move away keeps the area around
          you closer to the room. One that holds heat lets the surface warm up underneath you.
        </p>
        <p>
          That is the whole job. No mattress is a cooling device, whatever the product page says. The question to ask is
          whether it adds to the problem.
        </p>
      </>
    ),
  },
  {
    id: 'construction',
    title: 'Construction matters more than features',
    render: () => (
      <>
        <p>
          The biggest difference is the core. Coil cores, in hybrids and innersprings, are mostly open space, so air can
          move through the mattress. Dense foam cores have no such channel. That is why, as a group, coil mattresses
          tend to sleep cooler than all-foam ones, and why our{' '}
          <Link href="/guides/cooling-mattress-comparison">comparison of real cooling ratings</Link> shows how much
          the types overlap in practice.
        </p>
        <p>
          The comfort layers come next. Thick, slow memory foam lets you sink in, which increases the area of you that is
          wrapped in material. Firmer or springier layers, including latex, let you sit more on top.
        </p>
        <p>
          Features such as gel infusions, phase-change covers and “cooling” fabrics can make the surface feel cool to the
          touch when you lie down. Whether they make a lasting difference through the night varies a great deal, which
          is why we rely on independent cooling ratings rather than feature lists.
        </p>
      </>
    ),
  },
  {
    id: 'whole-bed',
    title: 'The rest of the bed',
    render: () => (
      <>
        <p>
          A mattress is one layer of several. A few cheaper changes can matter as much:
        </p>
        <ul>
          <li>
            Room temperature. The Sleep Foundation suggests a cool bedroom, around 65°F (18.3°C), suits most people,
            give or take a few degrees.
          </li>
          <li>
            Sheets and bedding. Breathable natural fibers and a lighter duvet are an easy first step. A thick mattress
            protector or a foam topper can undo the airflow of a coil mattress.
          </li>
          <li>
            Pillows. Your head gives off heat too, and dense foam pillows can hold it.
          </li>
        </ul>
        <p>
          If you regularly wake up hot or sweating whatever you change, that is worth mentioning to a doctor. A mattress
          will not solve it.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How your answer changes the score',
    render: ({ rules }) => {
      const hot = weightRule(rules, 'WEIGHT_TEMPERATURE_HOT');
      const cold = weightRule(rules, 'WEIGHT_TEMPERATURE_COLD');
      return (
        <>
          <p>
            A mattress’s cooling score is the same for everyone: it comes from an independent cooling rating where the
            catalog has one, and otherwise from a capped estimate for its construction type, marked Estimated. What
            changes is how much that score counts for you.
          </p>
          <ul>
            <li>Tell us you sleep hot and cooling counts {hot.multiply.heat}× its default weight.</li>
            <li>
              Tell us you sleep cold and it counts {cold.multiply.heat}×, because airflow is not a benefit if you already
              feel the cold.
            </li>
            <li>
              If you sleep hot and a mattress scores {rules.thresholds.heatRetentionMaxHeatScore}/10 or lower on cooling,
              your results show a “may sleep warm” watch-out with practical mitigations.
            </li>
          </ul>
          <p>
            Weights are re-balanced to add up to 100%, so doubling cooling means the other five dimensions each count for
            a little less. The full model is on <Link href="/methodology">How It Works</Link>.
          </p>
        </>
      );
    },
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Which mattress type sleeps coolest?',
    a: 'As a group, mattresses with coil cores (hybrids and innersprings) tend to sleep cooler than all-foam, because air can move through the core. Individual models vary, so compare independent cooling ratings rather than relying on type.',
  },
  {
    q: 'Do cooling gels and covers work?',
    a: 'They can make the surface feel cooler when you first lie down. How much difference they make across a whole night varies between products, so we use independent cooling ratings, not feature claims, in the score.',
  },
  {
    q: 'Is memory foam always hot?',
    a: 'Not always. Some foam mattresses use more open foams and score reasonably well on cooling. Dense, slow memory foam that you sink into deeply tends to hold more heat than springier materials.',
  },
  {
    q: 'What else can I do if I sleep hot?',
    a: 'Keep the bedroom cool, use breathable sheets and a lighter duvet, and avoid thick foam toppers or protectors that block airflow. If you often wake hot or sweating regardless, speak to a doctor.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Best temperature for sleep', href: 'https://www.sleepfoundation.org/bedroom-environment/best-temperature-for-sleep' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Cooler-sleeping picks',
  intro: 'For a 170 lb side sleeper who sleeps hot and prefers medium, these rank highest in the current catalog.',
};

export const cta: NonNullable<ArticleModule['cta']> = {
  title: 'Sleep hot? Let cooling count for more.',
  body: 'Tell us you run warm and the engine doubles the weight of cooling for you, then shows which mattresses may still sleep warm.',
};
