/**
 * Editorial copy for the /sleep-position/[position] landing pages. Numbers
 * (comfort bands, weights) are NOT written here - the pages read them from
 * lib/rules/0.2.json and the engine so the copy can never drift from the
 * model. Copy describes mechanics in general terms; no medical claims and
 * no statistics we cannot source.
 */

import type { SleepPosition } from '@/lib/types';
import type { PositionContent } from './types';

export const POSITION_UPDATED = '2026-10-06';
export const POSITION_PUBLISHED = '2026-10-06';

export const POSITIONS: Record<SleepPosition, PositionContent> = {
  side: {
    slug: 'side',
    label: 'Side sleepers',
    noun: 'side sleeper',
    title: 'Mattresses for side sleepers',
    headline: ['Mattresses for', 'side', 'sleepers'],
    description:
      'What side sleepers need from a mattress: enough give at the shoulders and hips, enough support to keep the spine level, and the firmness window for your weight.',
    lead: 'Your shoulder and hip carry most of the load. The right mattress lets them sink in just far enough, and no further.',
    profileKey: 'side-160',
    sources: [{ label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' }],
    meaning: [
      'Side sleeping means lying mostly on one side, often with knees bent. The Sleep Foundation describes it as the most common sleep position.',
      'The defining feature for a mattress is the contact area. On your side, a narrow strip of shoulder and hip presses into the surface while your waist bridges the gap between them. A surface that is too firm pushes back hard at those two points; one that is too soft lets the hip sink further than the shoulder and bends the spine sideways.',
    ],
    matters: [
      {
        dimension: 'pressureRelief',
        title: 'Pressure relief comes first',
        text: 'Comfort layers need enough depth and give for the shoulder and hip to settle in. For a side sleeper the engine weights pressure relief more heavily than for any other position.',
      },
      {
        dimension: 'support',
        title: 'Support still matters',
        text: 'Give without support lets the heavier hip sink out of line. Look for a supportive core under the comfort layers, especially above about 180 lb, where the firmness window moves up.',
      },
      {
        dimension: 'motion',
        title: 'Motion isolation, if you share',
        text: 'Side sleepers often change sides through the night. If a partner is a light sleeper, a surface that absorbs movement matters more.',
      },
    ],
    firmness: [
      'Side sleepers sit at the softer end of the scale, but the window moves with weight. A lighter side sleeper can be comfortable on a mattress that would let a heavier one bottom out at the hip.',
      'If you are between two firmness options, the deciding question is usually your weight and whether you spend part of the night on your back, which needs a little more support.',
    ],
    faqs: [
      {
        q: 'What firmness is best for side sleepers?',
        a: 'There is no single answer, because the comfort window moves with body weight. In our scoring model the window for a side sleeper runs from 2–5/10 under 130 lb to 6–9/10 at 230 lb and up. Within that window, your own stated preference decides the rest.',
      },
      {
        q: 'Is a soft mattress always better for side sleeping?',
        a: 'No. Softer helps the shoulder and hip sink in, but past a point the hip sinks further than the shoulder and the spine bends. The engine checks both: pressure relief and support are scored separately, and a mattress softer than your comfort window loses support points.',
      },
      {
        q: 'Which mattress type suits side sleepers?',
        a: 'Any type can work if the comfort layers are deep enough and the firmness lands in your window. All-foam and hybrids with thick foam comfort layers tend to cushion well; traditional innersprings usually have the thinnest comfort layer. Where an independent rating exists, the engine uses the rating rather than the type.',
      },
    ],
  },
  back: {
    slug: 'back',
    label: 'Back sleepers',
    noun: 'back sleeper',
    title: 'Mattresses for back sleepers',
    headline: ['Mattresses for', 'back', 'sleepers'],
    description:
      'What back sleepers need from a mattress: a level spine, support under the lower back, and the firmness window for your weight from our scoring rules.',
    lead: 'Lying on your back spreads your weight widely. What matters is keeping your hips from sinking below your shoulders.',
    profileKey: 'back-180',
    sources: [{ label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' }],
    meaning: [
      'The Sleep Foundation lists back sleeping as the second most popular position. It spreads your weight over the widest area of any position, so pressure points are less of a concern than on your side. Your hips and pelvis still carry a large share of your weight, though, and they decide how level you lie.',
      'On a surface that is too soft the hips sink and the lower back arches downward. On one that is too firm the small of the back can be left unsupported. The aim is a gentle, even contact from shoulders to heels.',
    ],
    matters: [
      {
        dimension: 'support',
        title: 'Support and alignment',
        text: 'The engine weights support more heavily for back sleepers. Support is scored from how close the mattress firmness sits to the center of your comfort window.',
      },
      {
        dimension: 'pressureRelief',
        title: 'A little contouring',
        text: 'Some give at the surface lets the lower back meet the mattress rather than hover above it. A thin comfort layer over a supportive core is often enough.',
      },
      {
        dimension: 'durability',
        title: 'Durability over time',
        text: 'A mattress that softens unevenly develops a dip under the hips, the exact spot back sleepers need held up. At higher body weights durability gets more weight in the score.',
      },
    ],
    firmness: [
      'Back sleepers usually land in the middle to firmer part of the scale, and the window moves up with weight. A heavier back sleeper needs noticeably more support than a lighter one to keep the hips level.',
      'Because back sleepers spread their weight, they are often comfortable across a slightly wider range than side sleepers. Your own preference within the window is a fair tie-breaker.',
    ],
    faqs: [
      {
        q: 'What firmness is best for back sleepers?',
        a: 'In our scoring model the comfort window for a back sleeper runs from 4–7/10 under 130 lb to 7–10/10 at 230 lb and up. Inside your window, mattresses closest to the center score best on support.',
      },
      {
        q: 'Can a mattress be too firm for back sleeping?',
        a: 'Yes. A very firm surface can leave the small of the back unsupported and press on the shoulder blades and tailbone. The engine treats firmness above your window as a fit problem, not as extra support.',
      },
      {
        q: 'Do back sleepers need a special mattress type?',
        a: 'No type is required. Hybrids and latex tend to combine a supportive core with some surface give, which suits many back sleepers, but a well-matched foam mattress can work too. Check each mattress’s support score for your profile rather than its type.',
      },
    ],
  },
  stomach: {
    slug: 'stomach',
    label: 'Stomach sleepers',
    noun: 'stomach sleeper',
    title: 'Mattresses for stomach sleepers',
    headline: ['Mattresses for', 'stomach', 'sleepers'],
    description:
      'What stomach sleepers need from a mattress: a firm, even surface that keeps the hips from sinking, and the firmness window for your weight.',
    lead: 'Face down, your midsection is the low point. A mattress for stomach sleeping has to stop it from sagging.',
    profileKey: 'stomach-170',
    sources: [{ label: 'Sleep Foundation: Best sleeping positions', href: 'https://www.sleepfoundation.org/sleeping-positions' }],
    meaning: [
      'Stomach sleeping means lying face down, usually with the head turned to one side. The Sleep Foundation describes it as the least common position, and it is the one where a mattress has the most direct effect on how the lower back is held.',
      'Face down, your hips and midsection, which carry much of your weight, sit in the middle of the mattress. If the surface lets it sink, the lower back curves the wrong way. Deep, cradling comfort layers that suit side sleepers tend to work against stomach sleepers.',
    ],
    matters: [
      {
        dimension: 'support',
        title: 'Support above all',
        text: 'The engine gives stomach sleepers the strongest boost to support of any position, because a sagging midsection is the main risk.',
      },
      {
        dimension: 'pressureRelief',
        title: 'Less cushioning, not none',
        text: 'Deep cushioning matters less face down, so pressure relief counts for less in the score. A thin comfort layer still helps at the chest and knees.',
      },
      {
        dimension: 'heat',
        title: 'Airflow at the surface',
        text: 'Face down, more of your body is in contact with the top layer. If you also sleep hot, a breathable cover and a firmer surface that you sink into less both help.',
      },
    ],
    firmness: [
      'Stomach sleepers have the firmest comfort window of any position, and it rises with weight until it reaches the top of the scale.',
      'If you mix stomach sleeping with time on your side, you may want the lower end of your stomach window rather than the top, so the side-sleeping part of the night is not uncomfortable.',
    ],
    faqs: [
      {
        q: 'What firmness is best for stomach sleepers?',
        a: 'In our scoring model the comfort window for a stomach sleeper runs from 5–8/10 under 130 lb to 8–10/10 at 230 lb and up, the firmest of any position.',
      },
      {
        q: 'Are memory foam mattresses bad for stomach sleepers?',
        a: 'Not automatically, but soft, deep memory foam lets the midsection sink, which is what stomach sleepers need to avoid. A firm foam mattress can work. What matters is where its firmness lands against your window, which the engine checks for you.',
      },
      {
        q: 'Should stomach sleepers care about pressure relief?',
        a: 'Less than other sleepers. The engine reduces the weight on pressure relief for stomach sleepers and increases the weight on support, because sinking at the hips is the bigger risk face down.',
      },
    ],
  },
  combination: {
    slug: 'combination',
    label: 'Combination sleepers',
    noun: 'combination sleeper',
    title: 'Mattresses for combination sleepers',
    headline: ['Mattresses for', 'combination', 'sleepers'],
    description:
      'What combination sleepers need from a mattress: a balanced feel that works on your side and back, easy movement, and the firmness window for your weight.',
    lead: 'If you change position through the night, you need a mattress that is good at everything and bad at nothing.',
    profileKey: 'combination-170',
    sources: [],
    meaning: [
      'Combination sleepers move between positions during the night, most often side and back, sometimes stomach. If you often wake in a different position from the one you fell asleep in, this is probably you.',
      'The challenge is that each position wants something slightly different. A mattress that suits only one of them will feel wrong for part of the night, so balance matters more than any single strength.',
    ],
    matters: [
      {
        dimension: 'support',
        title: 'Balanced support',
        text: 'The engine uses the same comfort window for combination sleepers as for back sleepers and applies no position boost, so every dimension keeps its default weight.',
      },
      {
        dimension: 'pressureRelief',
        title: 'Enough give for side time',
        text: 'The side-sleeping part of the night still needs some cushioning at the shoulder and hip, so a very firm surface can be a poor fit.',
      },
      {
        dimension: 'motion',
        title: 'Responsiveness and motion',
        text: 'Changing position is easier on a surface that springs back quickly. If you share the bed, frequent movement makes motion isolation more important for your partner.',
      },
    ],
    firmness: [
      'Combination sleepers usually do best near the middle of the scale, the overlap between what side and back sleeping need. The window moves up with weight like every other position.',
      'If one position clearly dominates your night, tell the quiz that position instead. A more specific answer gives a more specific comfort window.',
    ],
    faqs: [
      {
        q: 'What firmness is best for combination sleepers?',
        a: 'In our scoring model the comfort window for a combination sleeper is the same as for a back sleeper: 4–7/10 under 130 lb, rising to 7–10/10 at 230 lb and up. Medium to medium-firm mattresses often land inside it.',
      },
      {
        q: 'How do I know if I am a combination sleeper?',
        a: 'If you often wake in a different position from the one you fell asleep in, or regularly turn from side to back, you are likely a combination sleeper. If one position clearly dominates, answering with that position gives a more specific result.',
      },
      {
        q: 'Which mattress types suit combination sleepers?',
        a: 'Responsive constructions such as hybrids and latex make it easier to change position than slow-response foam. That is a general tendency, not a rule; the engine scores each mattress on its own ratings where they exist.',
      },
    ],
  },
};

export const POSITION_SLUGS = Object.keys(POSITIONS) as SleepPosition[];

/** True when `slug` is one of the four sleep positions with a page. */
export function isPositionSlug(slug: string): slug is SleepPosition {
  return (POSITION_SLUGS as string[]).includes(slug);
}

export function getPosition(slug: string): PositionContent | null {
  return isPositionSlug(slug) ? POSITIONS[slug] : null;
}

/**
 * Page title for /sleep-position/<slug>. Distinct from the ranked category
 * page title ("Mattresses for side sleepers" on /mattresses/side-sleepers),
 * because this page is the guide, not the ranking.
 */
export function positionPageTitle(slugOrContent: string | PositionContent | null): string {
  const content = typeof slugOrContent === 'string' ? getPosition(slugOrContent) : slugOrContent;
  return content ? `${content.label}: what your mattress needs to do` : '';
}
