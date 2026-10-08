import Link from 'next/link';
import MattressViewer from '@/components/three/MattressViewer';
import { MattressRender } from '@/components/ui/MattressRender';
import { DIMENSIONS } from '@/lib/explain';
import styles from '../Content.module.css';
import type { ArticleContext, ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import type { MattressType } from '@/lib/types';
import { TableScroll } from '@/components/ui/TableScroll';

const TYPES: { id: MattressType; label: string }[] = [
  { id: 'foam', label: 'All-foam' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'innerspring', label: 'Innerspring' },
  { id: 'latex', label: 'Latex' },
];

function TypeCounts({ catalog }: Pick<ArticleContext, 'catalog'>) {
  const counts = TYPES.map((t) => ({ ...t, n: catalog.filter((e) => e.type === t.id).length }));
  // Largest group; ties go to the earlier type, as a stable sort would.
  const largest = counts.reduce<(typeof counts)[number] | null>((best, c) => (!best || c.n > best.n ? c : best), null);
  return (
    <p>
      In our current catalog of {catalog.length} mattresses,{' '}
      {counts
        .map((c) => `${c.n} ${c.n === 1 ? 'is' : 'are'} ${c.label.toLowerCase()}`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1')}
      {largest ? `. ${largest.label} is the largest group.` : '.'}
    </p>
  );
}

function BaselineTable({ rules }: Pick<ArticleContext, 'rules'>) {
  const cap = rules.estimateCap;
  return (
    <TableScroll label="Construction-type assumptions table">
      <table>
        <caption className="sr-only">Construction-type assumptions used only when no independent rating is on file</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            {TYPES.map((t) => (
              <th scope="col" key={t.id}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.label}</th>
              {TYPES.map((t) => {
                const raw = rules.typeBaselines[t.id][d.id];
                const used = Math.min(raw, cap);
                return (
                  <td key={t.id} className="tabular">
                    {used}
                    {raw > cap ? <span className="muted"> (from {raw})</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export const takeaways: string[] = [
  'All-foam, hybrid, innerspring and latex describe the support core and comfort layers, not how firm a mattress is.',
  'Each type has tendencies: foam absorbs motion, coils move air and firm up the edge, latex is springy and resilient.',
  'Tendencies are not ratings. Where an independent rating exists, the engine uses it instead of the type.',
  'When no rating exists, the engine falls back to a cautious type-based estimate, capped so it never outranks a rated mattress.',
];

export const sections: ArticleSection[] = [
  {
    id: 'what-type-means',
    title: 'What “type” actually describes',
    render: ({ catalog }) => (
      <>
        <p>
          A mattress type describes how it is built: what the support core is made of, and what sits on top of it.
          It says nothing directly about firmness. You can buy a soft innerspring and a very firm all-foam mattress.
        </p>
        <p>
          Most mattresses follow the same basic stack: a cover, one or more comfort layers that shape the feel, sometimes
          a transition layer, and a support core that carries the load. The type is named after that core.
        </p>
        <TypeCounts catalog={catalog} />
      </>
    ),
  },
  {
    id: 'inside',
    title: 'Look inside a typical hybrid',
    render: () => (
      <>
        <p>
          The layers below are a generic hybrid, not any brand’s design. Select a layer to see what it does and how it
          relates to the way you sleep.
        </p>
        <div className={styles.proseWide}>
          <MattressViewer variant="xray" mattressType="hybrid" tone="light" />
        </div>
      </>
    ),
  },
  {
    id: 'four-types',
    title: 'The four types, side by side',
    render: () => (
      <>
        <div className={styles.typeGrid}>
          {TYPES.map((t) => (
            <MattressRender key={t.id} type={t.id} seed={`types-${t.id}`} size="fluid" caption={`${t.label}: typical construction (illustration).`} />
          ))}
        </div>
        <h3>All-foam</h3>
        <p>
          Layers of polyurethane foam, often with memory foam near the top, over a dense foam base. Foam contours
          closely and tends to absorb movement, which suits side sleepers and light-sleeping couples. Dense foam has no
          open channel for air, so some all-foam mattresses hold more heat, and the edges are usually softer than on a
          coil mattress.
        </p>
        <h3>Hybrid</h3>
        <p>
          Foam or latex comfort layers over a core of individually pocketed coils. Hybrids try to combine contouring on
          top with the bounce, airflow and edge firmness of coils below. That balance is why they suit a wide range of
          sleepers, but the comfort layers vary a lot: a hybrid with a thin top can feel closer to an innerspring.
        </p>
        <h3>Innerspring</h3>
        <p>
          A coil unit with a comparatively thin comfort layer. Innersprings tend to feel bouncy and sleep cool, and their
          perimeter is usually firm. With less foam on top they cushion less, and connected coil designs tend to carry
          motion across the bed.
        </p>
        <h3>Latex</h3>
        <p>
          Latex foam, natural or synthetic, in the comfort layers or throughout. Latex is springy rather than slow, so you
          sit on top of it more than in it, and it has a reputation for keeping its shape. Its exact feel depends heavily
          on how it is made and layered.
        </p>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How type affects the Match Score',
    render: ({ rules }) => (
      <>
        <p>
          The engine prefers evidence over assumptions. Cooling, motion isolation, edge support and durability come from
          independent review ratings when the catalog has one. Support and pressure relief are calculated from the
          mattress’s firmness against your comfort window, with a small adjustment for the type of core.
        </p>
        <p>
          When a rating is missing, the engine falls back to a construction-type assumption and marks that dimension{' '}
          <strong>Estimated</strong> in your results. These assumptions are capped at {rules.estimateCap}/10, so a guess
          never beats a mattress that was actually rated as average or better:
        </p>
        <BaselineTable rules={rules} />
        <p>
          The table shows the tendencies described above in numbers: foam high on motion, low on cooling and edge;
          innerspring the reverse. You will only ever see these values for a dimension that has no rating. The full rule
          set is on <Link href="/methodology">How It Works</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'choosing',
    title: 'Choosing between them',
    render: () => (
      <>
        <p>
          Start from what you need rather than the type. If you sleep hot, look at cooling ratings first and treat
          construction as a hint (our <Link href="/guides/mattresses-for-hot-sleepers">guide for hot sleepers</Link>{' '}
          goes further). If a partner’s movement wakes you, look at motion isolation ratings. If you sit on the edge of
          the bed every morning, read our <Link href="/guides/edge-support-explained">edge support guide</Link>.
        </p>
        <p>
          Then check firmness against your window. A well-chosen type at the wrong firmness is still the wrong mattress.
        </p>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Which mattress type is best?',
    a: 'None is best for everyone. Each type has tendencies, and firmness matters at least as much as type. Decide what you need most, such as cooling, motion isolation or edge support, then compare ratings for those dimensions rather than choosing by type.',
  },
  {
    q: 'Is a hybrid always better than all-foam?',
    a: 'No. Hybrids tend to sleep cooler and have firmer edges, while all-foam tends to absorb motion better. Which matters more depends on you. The engine scores each mattress on its own ratings where they exist.',
  },
  {
    q: 'What does “Estimated” mean on a score?',
    a: 'It means no independent rating was on file for that dimension, so the engine used an assumption based on construction type. Estimates are capped at 6.5 out of 10 and never appear as a reason a mattress matches you.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: Mattress types', href: 'https://www.sleepfoundation.org/mattress-information/mattress-types' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Well-rounded picks across types',
  intro: 'For a combination sleeper of average weight, these rank highest across all four construction types.',
};
