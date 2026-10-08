import Link from 'next/link';
import { MaterialsDiagram } from '../Diagrams';
import { TableScroll } from '@/components/ui/TableScroll';
import type { ArticleContext, ArticleModule, ArticleSection, FaqItem, SourceLink } from '@/lib/content/types';
import type { MattressEntry } from '@/lib/types';

/**
 * Materials named in the catalog's recorded layer descriptions
 * (coreMaterialNotes, copied from brand and retailer product pages).
 * The counts are computed live and only say what a description names,
 * not how much of a material a mattress contains.
 */
const MATERIALS: { id: string; label: string; test: RegExp; href: string | null; hrefLabel: string | null }[] = [
  { id: 'memory', label: 'Memory foam', test: /memory[\s-]?(plus[\s-]?)?foam/i, href: '/mattresses/memory-foam', hrefLabel: 'Memory foam mattresses' },
  { id: 'latex', label: 'Latex', test: /latex/i, href: '/mattresses/latex', hrefLabel: 'Mattresses with latex' },
  { id: 'coils', label: 'Coils or springs', test: /coil|spring/i, href: '/mattresses/hybrid', hrefLabel: 'Hybrid mattresses' },
  { id: 'grid', label: 'A polymer grid', test: /\bgrid\b/i, href: null, hrefLabel: null },
];

const notesOf = (e: MattressEntry): string => (typeof e.coreMaterialNotes === 'string' ? e.coreMaterialNotes : '');

function MaterialMentions({ catalog }: Pick<ArticleContext, 'catalog'>) {
  const described = catalog.filter((e) => notesOf(e).trim().length > 0);
  const rows = MATERIALS.map((m) => ({ ...m, n: described.filter((e) => m.test.test(notesOf(e))).length }));
  return (
    <>
      <p>
        Of the {catalog.length} mattresses in our catalog, {described.length} have a recorded layer description. This
        is how many of those descriptions name each material. A mattress usually names several, so the rows overlap.
      </p>
      <TableScroll label="Materials named in recorded layer descriptions">
        <table>
          <caption className="sr-only">Materials named in the catalog’s recorded layer descriptions</caption>
          <thead>
            <tr>
              <th scope="col">Material named</th>
              <th scope="col">Mattresses</th>
              <th scope="col">Browse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.label}</th>
                <td className="tabular">
                  {r.n} of {described.length}
                </td>
                <td>{r.href && r.hrefLabel ? <Link href={r.href}>{r.hrefLabel}</Link> : <span className="muted">No dedicated list</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="muted">
        Counts come from the words in each description, not from lab analysis. A description that says “proprietary foam”
        without naming the type is not counted as memory foam, even if it is one.
      </p>
    </>
  );
}

function DensityOnFile({ catalog, rules }: ArticleContext) {
  const withDensity = catalog.filter((e) => typeof e.topFoamDensityLbFt3 === 'number').length;
  const d = rules.durability;
  return (
    <p>
      Foam density is the one material figure the engine can use. If the top foam is below {d.lowDensityThresholdLbFt3}{' '}
      lb/ft³ and you weigh {d.lowDensityHighWeightLb} lb or more, durability loses {d.lowDensityPenalty} points.{' '}
      {withDensity === 0
        ? 'No mattress in the catalog has a top-foam density on file yet, so today that check never fires. Some brands print densities in their layer lists; we have not yet recorded them as a field.'
        : `${withDensity} of ${catalog.length} mattresses have a top-foam density on file; for the rest the check cannot run.`}
    </p>
  );
}

export const takeaways: string[] = [
  'Construction type names the core. The materials in the comfort layers decide most of how a mattress feels.',
  'Memory foam contours slowly and absorbs motion but can hold heat. Polyfoam is springier and is the workhorse of most foam layers.',
  'Latex pushes back quickly and is known for durability. Dunlop is denser; Talalay is lighter and more breathable.',
  'Pocketed coils move one at a time, so they isolate motion better than linked coils and leave room for air.',
  'The Match Score does not read material names. It uses construction type, stated firmness and independent ratings.',
];

export const sections: ArticleSection[] = [
  {
    id: 'type-vs-material',
    title: 'Type and material are different questions',
    render: () => (
      <>
        <p>
          “Hybrid” or “all-foam” tells you what carries the load at the bottom of the mattress. It does not tell you what
          you lie on. Two hybrids can feel completely different because one puts thick memory foam over the coils and the
          other puts a thin layer of latex there.
        </p>
        <p>
          That is why it is worth reading the layer list. Our{' '}
          <Link href="/guides/mattress-types-explained">guide to mattress types</Link> covers the four constructions.
          This one covers the materials inside them.
        </p>
      </>
    ),
  },
  {
    id: 'under-load',
    title: 'The same weight, three materials',
    render: () => (
      <>
        <p>
          The quickest way to tell the materials apart is how each one responds to weight and how it behaves when the
          weight moves.
        </p>
        <MaterialsDiagram />
      </>
    ),
  },
  {
    id: 'memory-foam',
    title: 'Memory foam',
    render: () => (
      <>
        <p>
          Memory foam is viscoelastic polyurethane foam. It was first designed in the 1960s for NASA spacecraft seating and
          moved into mattresses in the 1990s. It softens as it warms, so it slowly molds to your shape and then takes a
          moment to recover when you move.
        </p>
        <p>
          That slow, close contour is why memory foam is good at relieving pressure at the shoulders and hips and at
          absorbing a partner’s movement. It is also why some people feel “stuck” in it, and why dense memory foam can
          hold heat near your body. Open-cell foams, gel and copper infusions are all attempts to reduce that heat, and
          how much they help varies from mattress to mattress.
        </p>
        <p>
          Density, in pounds per cubic foot, is the best single clue to quality. Denser foam tends to keep its shape
          longer but also tends to hold more heat.
        </p>
      </>
    ),
  },
  {
    id: 'polyfoam',
    title: 'Polyfoam',
    render: () => (
      <>
        <p>
          Conventional polyurethane foam, usually called polyfoam, is commonly used for the base of all-foam
          mattresses, for the transition layers of hybrids and in many comfort layers. Brands often give it their own
          names, such as “support foam”, “responsive foam” or “base foam”.
        </p>
        <p>
          Polyfoam responds faster than memory foam and contours less. Like memory foam, how long it keeps its shape
          depends on its density, which brands do not always publish.
        </p>
      </>
    ),
  },
  {
    id: 'latex',
    title: 'Latex',
    render: () => (
      <>
        <p>
          Natural latex is made from the sap of rubber trees; synthetic and blended latex also exist, and product pages
          usually say which they use. Latex is springy rather than slow: it gives under pressure and pushes back
          straight away, so you lie more on top of it than in it.
        </p>
        <p>
          There are two common ways to make it. Dunlop latex is denser and is often used in support layers; Talalay latex
          is lighter and more breathable and is favored for comfort layers. Both have a reputation for durability, with
          Dunlop generally considered the more durable of the two.
        </p>
        <p>
          If you have a latex allergy, ask the brand how the latex is covered and talk to your doctor before buying.
        </p>
      </>
    ),
  },
  {
    id: 'coils',
    title: 'Coils',
    render: () => (
      <>
        <p>Coils come in four main designs:</p>
        <ul>
          <li>
            <strong>Bonnell</strong> coils are hourglass-shaped and wired together, so they move as a unit and tend to
            carry motion and noise.
          </li>
          <li>
            <strong>Offset</strong> coils are linked too, but hinge so they respond to movement with less transfer.
          </li>
          <li>
            <strong>Continuous wire</strong> coils are formed from one long wire and can still carry some movement.
          </li>
          <li>
            <strong>Pocketed</strong> coils are wrapped individually in fabric, so each one moves only when it is pressed.
            They are what most hybrids use.
          </li>
        </ul>
        <p>
          Wire thickness is given as a gauge, usually between 13 and 17. A lower number means thicker wire, which feels
          firmer and tends to last longer. Whatever the design, a coil core is mostly open space, which is why coil
          mattresses tend to sleep cooler than all-foam ones.
        </p>
      </>
    ),
  },
  {
    id: 'in-the-catalog',
    title: 'Materials in our catalog',
    render: ({ catalog }) => <MaterialMentions catalog={catalog} />,
  },
  {
    id: 'reading-a-layer-list',
    title: 'How to read a layer list',
    render: () => (
      <>
        <ol>
          <li>
            Read it from the top. The first few inches decide the feel: memory foam on top means a slower, closer
            contour; latex or polyfoam means more bounce.
          </li>
          <li>Look for thickness. A thin memory foam layer over coils feels very different from several inches of it.</li>
          <li>
            Find the core. Pocketed coils suggest better motion isolation and airflow than linked coils or a dense foam
            base.
          </li>
          <li>
            Treat brand names with care. “Proprietary” or trademarked foam names describe a product, not a material
            type. If it matters to you, ask the brand what the foam is and its density.
          </li>
          <li>
            Check certifications on the brand’s own page. Labels such as CertiPUR-US for foam or GOLS for organic latex
            are claims you can look up with the certifier.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: 'how-scored',
    title: 'How materials reach the Match Score',
    render: ({ rules, catalog }) => (
      <>
        <p>
          They mostly do not, and that is deliberate. Material names are marketing as often as they are specification,
          so the engine scores what it can check: construction type, stated firmness and independent ratings for
          cooling, motion isolation, edge support and durability.
        </p>
        <DensityOnFile rules={rules} catalog={catalog} />
        <p>
          The full rule set is on <Link href="/methodology">How It Works</Link>.
        </p>
      </>
    ),
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Is memory foam or latex better?',
    a: 'Neither is better for everyone. Memory foam contours closely and absorbs motion, which many side sleepers and couples like. Latex is springier, easier to move on and tends to sleep cooler. If you are unsure, pick by the ratings that matter to you, not by the material.',
  },
  {
    q: 'What is the difference between memory foam and polyfoam?',
    a: 'Both are polyurethane foams. Memory foam is viscoelastic: it softens with warmth and responds slowly. Conventional polyfoam responds quickly and contours less. Most foam mattresses use both.',
  },
  {
    q: 'Does a higher coil count mean a better mattress?',
    a: 'Not on its own. Coil design and wire gauge matter as much as the count, and the comfort layers above the coils decide most of the feel.',
  },
  {
    q: 'Why does the Match Score ignore materials?',
    a: 'Because a material name does not tell you how a specific mattress performs. The engine uses independent ratings where they exist and a capped, clearly marked estimate by construction type where they do not.',
  },
];

export const sources: SourceLink[] = [
  { label: 'Sleep Foundation: What is memory foam?', href: 'https://www.sleepfoundation.org/mattress-information/what-is-memory-foam' },
  { label: 'Sleep Foundation: Dunlop vs. Talalay latex', href: 'https://www.sleepfoundation.org/mattress-information/dunlop-vs-talalay-latex' },
  { label: 'Sleep Foundation: Mattress coil types', href: 'https://www.sleepfoundation.org/mattress-construction/mattress-coil-types' },
  { label: 'Sleep Foundation: Mattress types', href: 'https://www.sleepfoundation.org/mattress-information/mattress-types' },
];

export const ranking: NonNullable<ArticleModule['ranking']> = {
  title: 'Strong all-rounders, whatever they are made of',
  intro: 'For a 170 lb combination sleeper who prefers medium, these rank highest in the current catalog, across every material.',
};
