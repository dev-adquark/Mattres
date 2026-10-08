import Link from 'next/link';
import type { ArticleContext, ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';

type CatalogProps = Pick<ArticleContext, 'catalog'>;

function TrialStats({ catalog }: CatalogProps) {
  const trials = catalog.map((e) => e.trialDays).filter((v): v is number => typeof v === 'number' && v > 0);
  if (!trials.length) return null;
  const lengths = [...new Set(trials)].sort((a, b) => a - b);
  return (
    <p>
      Across our catalog, {trials.length} of {catalog.length} mattresses have a published trial length on file, ranging
      from {lengths[0]} to {lengths.at(-1)} nights (the lengths we see are {lengths.join(', ')} nights). The rest show
      “Not yet verified” until we confirm them.
    </p>
  );
}

function WarrantyStats({ catalog }: CatalogProps) {
  const years = catalog.filter((e) => typeof e.warrantyYears === 'number').length;
  const lifetime = catalog.filter((e) => e.warrantyLifetime === true).length;
  return (
    <p>
      In our catalog, {years} mattresses have a warranty length in years on file and {lifetime} are sold with a
      “lifetime” warranty. Lifetime warranties in particular are worth reading closely, because the terms often change
      after the first years.
    </p>
  );
}

export const takeaways: string[] = [
  'Check when the trial starts, whether there is a minimum adjustment period, and what a return actually costs.',
  'A warranty is only as good as its definition of a defect. Find the sag depth it covers and how it must be measured.',
  'Confirm the size, height and what the advertised price includes before you compare prices.',
  'Our catalog shows “Not yet verified” wherever we have not confirmed a trial, warranty or price. Check those on the brand’s own site.',
];

export const sections: ArticleSection[] = [
  {
    id: 'trial',
    title: '1. Trial length, and when it starts',
    render: ({ catalog }) => (
      <>
        <p>
          A home trial lets you return a mattress after sleeping on it. Check the length, and check when it starts:
          usually on delivery, sometimes on order. A long trial is only useful if the return conditions are reasonable.
        </p>
        <TrialStats catalog={catalog} />
      </>
    ),
  },
  {
    id: 'adjustment',
    title: '2. The minimum adjustment period',
    render: () => (
      <>
        <p>
          Many trials include a break-in or adjustment period, a minimum number of nights before you can start a return.
          Some brands in our catalog state one explicitly; others say there is none. It exists because the first nights
          on any new mattress are a poor guide to how it will feel after your body adjusts.
        </p>
        <p>
          Plan to use the whole adjustment period, and put a reminder in your calendar for the last day of the trial.
        </p>
      </>
    ),
  },
  {
    id: 'returns',
    title: '3. What a return costs',
    render: () => (
      <>
        <p>
          “Free returns” does not always mean free. Look for pickup or processing fees, extra charges for some regions,
          non-refundable charges for things like expedited shipping or old-mattress removal, and whether the refund is
          full or partial. Check too whether there is a limit on how many returns you can make, and how the mattress
          leaves your home: collected, donated, or something you must arrange.
        </p>
      </>
    ),
  },
  {
    id: 'warranty-length',
    title: '4. Warranty length and type',
    render: ({ catalog }) => (
      <>
        <p>
          Warranties cover manufacturing defects, not comfort. A non-prorated period means the manufacturer repairs or
          replaces at no cost; a prorated period means you pay a growing share as the mattress ages. Many long warranties
          combine the two.
        </p>
        <WarrantyStats catalog={catalog} />
      </>
    ),
  },
  {
    id: 'sag',
    title: '5. What counts as a sag',
    render: () => (
      <>
        <p>
          This is the line that matters most. Warranties define a sag or impression as a defect only beyond a stated
          depth, measured in a specific way, often with no weight on the mattress. A dip you can feel may be shallower
          than the threshold and not covered. Heavier sleepers in particular should compare these thresholds; see our
          guide to <Link href="/guides/back-support-for-heavier-sleepers">back support for heavier sleepers</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'conditions',
    title: '6. Conditions that can void cover',
    render: () => (
      <>
        <p>
          Read the small print on the base and care. Warranties commonly require a supportive foundation of a stated
          type and often exclude stains or physical damage. Read your brand’s list of exclusions before the mattress
          arrives; a mattress protector is a cheap way to avoid a stain becoming a problem.
        </p>
      </>
    ),
  },
  {
    id: 'size-height',
    title: '7. Size and height',
    render: () => (
      <>
        <p>
          Check the dimensions of the exact size you are buying and the mattress height. A tall mattress on a tall frame
          can make getting in and out awkward, and deep mattresses need fitted sheets with deep pockets. Our catalog shows
          the height where the brand publishes it, and “Not yet verified” where we have not confirmed it.
        </p>
      </>
    ),
  },
  {
    id: 'price',
    title: '8. What the price includes',
    render: () => (
      <>
        <p>
          Compare like with like: the same size, and the same extras. Check whether delivery, setup, old-mattress removal
          and a foundation are included or extra. Prices change often; our catalog records the queen price with the date
          it was checked, and shows “Not yet verified” rather than guessing.
        </p>
        <p>
          Once you have a shortlist, put up to three side by side on <Link href="/compare">Compare</Link>.
        </p>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'How long should a mattress trial be?',
    a: 'Long enough to get past any adjustment period with time to spare. A trial of several months gives you room to judge the mattress after your body has adjusted, but the return conditions matter as much as the length.',
  },
  {
    q: 'Is a lifetime warranty better than a ten-year one?',
    a: 'Not automatically. Lifetime warranties are often non-prorated for the first years and prorated after that, and they still only cover defects as the warranty defines them. Compare the sag threshold and the conditions, not just the headline length.',
  },
  {
    q: 'Can I return a mattress if it just does not feel right?',
    a: 'That is what a home trial is for. Outside a trial, a mattress that is uncomfortable but not defective is usually not covered by the warranty.',
  },
  {
    q: 'Do you earn money if I buy through your links?',
    a: 'No. We have no affiliate program and no paid placements today. Links to brands go to the manufacturer’s own product page, and we earn nothing from them. Our Disclosures page has the details.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Mattress trial periods', href: 'https://www.sleepfoundation.org/mattress-information/mattress-trial-periods' },
  { label: 'FTC Consumer Advice: Online shopping', href: 'https://consumer.ftc.gov/articles/online-shopping' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'A starting shortlist',
  intro: 'For a 180 lb back sleeper who prefers medium-firm, these rank highest in the current catalog. Run each through the checklist before buying.',
};

export const cta: NonNullable<ArticleModule['cta']> = {
  title: 'Know what you’re buying.',
  body: 'Start with a shortlist built around how you sleep, then check the fine print on the three that fit best.',
};
