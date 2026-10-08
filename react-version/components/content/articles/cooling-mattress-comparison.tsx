import Link from 'next/link';
import { displayTitle } from '@/lib/format';
import type { MattressEntry, MattressType } from '@/lib/types';
import { formatRating, median } from '../CatalogStats';
import type { ArticleContext, ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import { TableScroll } from '@/components/ui/TableScroll';

const TYPES: { id: MattressType; label: string }[] = [
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'foam', label: 'All-foam' },
  { id: 'latex', label: 'Latex' },
  { id: 'innerspring', label: 'Innerspring' },
];

type CatalogProps = Pick<ArticleContext, 'catalog'>;

interface RatedEntry {
  entry: MattressEntry;
  rating: number;
}

/** Entries with an independent cooling rating on file, paired with that rating. */
function rated(catalog: readonly MattressEntry[]): RatedEntry[] {
  const out: RatedEntry[] = [];
  for (const entry of catalog) if (typeof entry.coolingRatingOutOf10 === 'number') out.push({ entry, rating: entry.coolingRatingOutOf10 });
  return out;
}

const fmt = formatRating;

function TypeSummaryTable({ catalog }: CatalogProps) {
  const rows = TYPES.map((t) => {
    const all = catalog.filter((e) => e.type === t.id);
    const values = rated(all).map((r) => r.rating);
    return { ...t, total: all.length, values, median: median(values) };
  }).filter((r) => r.total > 0);
  return (
    <TableScroll label="Cooling ratings by type table">
      <table>
        <caption className="sr-only">Independent cooling ratings by construction type</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Rated</th>
            <th scope="col">Median</th>
            <th scope="col">Range</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.label}</th>
              <td className="tabular">
                {r.values.length} of {r.total}
              </td>
              <td className="tabular">{r.median !== null ? `${fmt(r.median)}/10` : 'Not yet rated'}</td>
              <td className="tabular">
                {r.values.length ? `${fmt(Math.min(...r.values))}–${fmt(Math.max(...r.values))}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function TopRated({ catalog, count = 5 }: CatalogProps & { count?: number }) {
  const sorted = rated(catalog).sort((a, b) => b.rating - a.rating || String(a.entry.id).localeCompare(String(b.entry.id)));
  // Never cut a list mid-tie: everything rated at the cutoff value is shown.
  const cutoff = sorted.length > count ? (sorted[count - 1]?.rating ?? -Infinity) : -Infinity;
  const top = sorted.filter((x) => x.rating >= cutoff);
  return (
    <ol>
      {top.map(({ entry: e, rating }) => (
        <li key={e.id}>
          <Link href={`/mattress/${encodeURIComponent(e.id)}`}>{displayTitle(e)}</Link> ({e.type === 'foam' ? 'all-foam' : e.type}):{' '}
          <strong className="tabular">{fmt(rating)}/10</strong>
        </li>
      ))}
    </ol>
  );
}

function PatternNote({ catalog }: CatalogProps) {
  const r = rated(catalog);
  if (!r.length) return null;
  const ratingsOf = (type: MattressType) => r.filter((x) => x.entry.type === type).map((x) => x.rating);
  const best = Math.max(...r.map((x) => x.rating));
  const coilAtTop = r.filter((x) => x.rating === best).every((x) => x.entry.type === 'hybrid' || x.entry.type === 'innerspring');
  const foamMax = Math.max(-1, ...ratingsOf('foam'));
  const hybridMin = Math.min(11, ...ratingsOf('hybrid'));
  const overlap = foamMax >= hybridMin;
  return (
    <p>
      {coilAtTop
        ? 'The pattern matches how mattresses are built: coil cores leave room for air to move, and the highest cooling rating in the catalog belongs to a coil-based mattress.'
        : 'Construction is only part of the story: the highest cooling rating in the catalog does not belong to a coil-based mattress.'}{' '}
      {overlap
        ? `The ranges overlap, though: the best-rated all-foam mattress (${fmt(foamMax)}/10) out-rates the lowest-rated hybrid (${fmt(hybridMin)}/10), so a rating beats the type whenever you have one.`
        : 'Even so, a rating beats the type whenever you have one.'}
    </p>
  );
}

export const takeaways: string[] = [
  'Every number here is an independent review rating recorded in our catalog. Nothing is estimated or adjusted.',
  'Coil-based mattresses tend to rate higher on cooling, but the ranges overlap: type is a hint, not a verdict.',
  'Many mattresses have no cooling rating on file. For those, the engine uses a capped estimate and labels it.',
  'A cooling rating only matters as much as you need it: it counts double for hot sleepers and half for cold ones.',
];

export const sections: ArticleSection[] = [
  {
    id: 'the-data',
    title: 'The data',
    render: ({ catalog }) => {
      const r = rated(catalog);
      return (
        <>
          <p>
            Of the {catalog.length} mattresses in our catalog, {r.length} have an independent cooling rating on file:
            a 0–10 score from a third-party reviewer, recorded with its source. We have not run our own heat tests.
            The table groups those ratings by construction type.
          </p>
          <TypeSummaryTable catalog={catalog} />
          <PatternNote catalog={catalog} />
        </>
      );
    },
  },
  {
    id: 'highest-rated',
    title: 'Highest cooling ratings on file',
    render: ({ catalog }) => (
      <>
        <p>These are the top cooling ratings in the catalog today; mattresses tied at the lowest listed rating are all included. Cooling is one dimension of six; these are not overall recommendations.</p>
        <TopRated catalog={catalog} />
        <p>
          Each is worth checking against your comfort window and other needs. A cool mattress at the wrong firmness is
          still the wrong mattress, which is why your Match Score weighs all six dimensions together.
        </p>
      </>
    ),
  },
  {
    id: 'the-gaps',
    title: 'What the blanks mean',
    render: ({ catalog, rules }) => {
      const missing = catalog.length - rated(catalog).length;
      return (
        <>
          <p>
            {missing} mattresses in the catalog have no independent cooling rating. That does not mean they sleep hot; it
            means we do not have evidence either way.
          </p>
          <p>
            For those mattresses, the engine falls back to an assumption based on construction type, capped at{' '}
            {rules.estimateCap}/10, and labels the cooling score <strong>Estimated</strong> in your results. An estimate
            never appears as a reason a mattress suits you, and a “may sleep warm” watch-out based on an estimate is shown
            as a caution rather than a warning.
          </p>
        </>
      );
    },
  },
  {
    id: 'reading-ratings',
    title: 'How to read a cooling rating',
    render: ({ rules }) => (
      <>
        <ul>
          <li>Compare ratings from the same reviewer where possible; different reviewers use different methods.</li>
          <li>
            Treat differences of half a point as small. The engine only flags a likely heat problem for hot sleepers at{' '}
            {rules.thresholds.heatRetentionMaxHeatScore}/10 or below.
          </li>
          <li>
            Remember your bedding. A thick protector or foam topper can cancel much of a mattress’s airflow. Our{' '}
            <Link href="/guides/mattresses-for-hot-sleepers">guide for hot sleepers</Link> covers the rest of the bed.
          </li>
        </ul>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Where do these cooling ratings come from?',
    a: 'They are independent third-party review ratings recorded in our catalog with their source. We have not lab-tested mattresses ourselves, and we never adjust or estimate a rating and present it as measured.',
  },
  {
    q: 'Why does a mattress I like have no cooling rating?',
    a: 'We only record a rating when an independent source has published one. Where none exists, the engine uses a capped estimate based on construction type and labels it Estimated, so the gap is visible.',
  },
  {
    q: 'Is the highest-rated cooling mattress the best choice for a hot sleeper?',
    a: 'Not necessarily. Cooling is one of six dimensions. A hot sleeper’s score counts cooling twice as much as default, but firmness fit, support and pressure relief still matter. Take the quiz to see how they balance for you.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Best temperature for sleep', href: 'https://www.sleepfoundation.org/bedroom-environment/best-temperature-for-sleep' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Ranked for a hot back sleeper',
  intro: 'Cooling is weighted double here. For a 190 lb back sleeper who sleeps hot and prefers medium-firm, these rank highest in the current catalog.',
};

