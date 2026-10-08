/**
 * Questions and answers for /faq. Answers are plain text (they are emitted
 * verbatim in FAQPage JSON-LD), and every number in them is read from the
 * scoring rules or the live catalog at render time, never typed in.
 */

import rules from '@/lib/rules/0.2.json';
import { VERIFICATION_DISPLAY } from '@/components/ui/Badge';
import type { FaqItem } from './types';

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

/** Live catalog facts quoted in the answers. */
export interface FaqCatalogFacts {
  mattressCount: number;
  brandCount: number;
}

export function buildFaqGroups({ mattressCount, brandCount }: FaqCatalogFacts): FaqGroup[] {
  const w = rules.baseWeights;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    {
      id: 'score',
      title: 'The Match Score',
      items: [
        {
          q: 'Is the Match Score a real calculation?',
          a: `Yes. It is a deterministic, rules-based calculation: the same answers and the same catalog always give the same result. Each mattress gets six sub-scores (pressure relief, support and alignment, cooling, motion isolation, edge support and durability), which are combined with weights that start at ${pct(w.pressureRelief)}, ${pct(w.support)}, ${pct(w.heat)}, ${pct(w.motion)}, ${pct(w.edge)} and ${pct(w.durability)} and shift with your answers. The full method, weights and limitations are on the How It Works page.`,
        },
        {
          q: 'Is every sub-score measured?',
          a: `No, and we label the difference. Cooling, motion isolation, edge support and durability use an independent review rating when the catalog has one. Support and pressure relief are calculated from the mattress’s stated firmness against your comfort window. When a rating or firmness is missing, the engine uses a cautious estimate based on construction type, capped at ${rules.estimateCap} out of 10, and marks that dimension “Estimated”. Estimates never appear as a reason a mattress matches you.`,
        },
        {
          q: 'Why might my score for a mattress differ from someone else’s?',
          a: 'Because the score is about fit, not quality. Your sleep position and weight set your comfort window, your stated firmness preference adds or removes points, and answers about temperature, a partner, pain and edge support change how much each dimension counts. The same mattress can be a strong match for one person and a fair one for another.',
        },
        {
          q: 'Does a high score guarantee the mattress will feel right?',
          a: 'No. The score narrows the field using the information we have; it cannot feel the mattress for you. Use the brand’s home trial to judge comfort, and read the watch-outs on your results before the headline number.',
        },
        {
          q: 'Can I see why a mattress scored the way it did?',
          a: 'Yes. Your results list the strongest reasons a mattress fits, the watch-outs for your profile and which dimensions are estimated. All of it is generated from the scoring engine’s output, not written by hand for each mattress.',
        },
      ],
    },
    {
      id: 'data',
      title: 'Data and honesty',
      items: [
        {
          q: 'Where does the mattress data come from?',
          a: 'Specifications come from each manufacturer’s official product pages (or, where a mattress page says so, a retailer listing), cross-checked against independent review sources where available. Ratings such as cooling or motion isolation come from independent third-party reviews, recorded with their source. Any field we have not been able to confirm is left empty and shown as “Not yet verified” or “Data unavailable” rather than guessed.',
        },
        {
          q: 'How many mattresses are in the catalog?',
          a: `${mattressCount} mattresses from ${brandCount} brands at the moment. The catalog is intentionally smaller than a retailer’s so each entry can be checked, and some entries still have gaps, which are labeled on every page where they matter.`,
        },
        {
          q: 'What do the verification labels mean?',
          a: `${VERIFICATION_DISPLAY.verified.label}: ${VERIFICATION_DISPLAY.verified.description} ${VERIFICATION_DISPLAY.partially_verified.label}: ${VERIFICATION_DISPLAY.partially_verified.description} ${VERIFICATION_DISPLAY.unverified.label}: ${VERIFICATION_DISPLAY.unverified.description} ${VERIFICATION_DISPLAY.unknown.label}: ${VERIFICATION_DISPLAY.unknown.description}`,
        },
        {
          q: 'Are the mattress pictures real photos?',
          a: 'Some are. For mattresses that RTINGS has reviewed and we have matched to that review, we show RTINGS’ own photo of the mattress, credited “Photo: RTINGS” and linked to their review; we don’t own those photos. Every other image on this site is an original illustration of a typical construction for its type, labeled as an illustration, and does not show any specific product.',
        },
        {
          q: 'Have you tested these mattresses yourselves?',
          a: 'No. We have not lab-tested or slept on the mattresses in the catalog. Ratings come from independent reviewers and are labeled as such; we never present an estimate as a measurement.',
        },
      ],
    },
    {
      id: 'money',
      title: 'Money and independence',
      items: [
        {
          q: 'Do you earn money from this site?',
          a: 'Not today. There is no affiliate program and no paid or sponsored placement. Links to brands go to the manufacturer’s own product page (or the retailer listing named on the mattress page) and earn us nothing. If that ever changes, it will be disclosed on the Disclosures page before it goes live.',
        },
        {
          q: 'Could a brand pay to improve its score?',
          a: 'No. Scores come only from the published rules and the catalog data. Our disclosure policy says any future paid placement would be clearly labeled as sponsored, scored by the same rules, would keep the rank its score earns, would never be shown as your top match, and would never change a mattress’s score.',
        },
      ],
    },
    {
      id: 'buying',
      title: 'Buying basics',
      items: [
        {
          q: 'What are the firmness trade-offs I should know about?',
          a: 'Softer surfaces generally help pressure relief but can let heavier bodies sink out of line and tend to have weaker edges; firmer surfaces do the reverse. The engine checks your comfort window for your position and weight and, separately, your stated preference. They can disagree, and your results show both.',
        },
        {
          q: 'How should I use a trial period?',
          a: 'Use the whole trial, not just the first few nights. Bodies take time to adjust to a new surface, and many brands set a minimum adjustment period before a return. Check the return costs and the trial start date before you buy.',
        },
        {
          q: 'What does the durability score predict?',
          a: `It reflects an independent durability rating where one exists, adjusted for heavier sleepers on all-foam construction. It is not a prediction of how many years a particular mattress will last. A sag-risk watch-out only appears for sleepers of ${rules.durability.heavierSleeperLb} lb or more when a real durability rating is below ${rules.thresholds.durabilityHeavierSleeperMinScore} out of 10, never from an estimate.`,
        },
        {
          q: 'Why does the same mattress get a different cooling weight for different people?',
          a: 'The cooling sub-score is the same for everyone, because it describes the mattress. What changes is how much it counts: double if you sleep hot, half if you sleep cold. If you sleep hot and a mattress scores low on cooling, your results add a “may sleep warm” watch-out.',
        },
        {
          q: 'When does motion isolation matter?',
          a: 'Mostly when you share a bed with someone whose movement wakes you. If you say so, motion isolation counts double; if you sleep alone it counts for much less. Foam and foam-heavy hybrids tend to absorb movement better than springy coil systems.',
        },
        {
          q: 'When does edge support matter?',
          a: 'If you sit on the edge of the bed often, sleep near it, or share a smaller bed. Coil mattresses, especially with a reinforced perimeter, tend to have firmer edges than all-foam. Tell the quiz how much it matters and the weight changes to match.',
        },
      ],
    },
  ];
}
