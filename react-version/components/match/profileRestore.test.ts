import { describe, expect, it } from 'vitest';
import { sanitizeProfileForStorage } from '@/lib/deviceStorage';
import { getGuide } from '@/lib/content/guides';
import { getCategoryPage } from '@/lib/categoryPages';
import { EMPTY_ANSWERS, answersKey, answersToProfile, firstInvalidStep, profileToAnswers, type QuizAnswers } from './quizModel';
import { readingFor, rankingsFor } from './nextSteps';

const full: QuizAnswers = {
  ...EMPTY_ANSWERS,
  position: 'side',
  weightBand: '180-230',
  firmness: 'medium-soft',
  painFocus: 'shoulders',
  temperature: 'hot',
  sharing: 'couple-high',
  edge: 'high',
  types: ['hybrid', 'foam'],
  budgetMax: 1500,
};

describe('profileToAnswers (remembered profile -> quiz answers)', () => {
  it('round-trips band answers through the stored, sanitised profile', () => {
    const stored = sanitizeProfileForStorage(answersToProfile(full), '0.2');
    const back = profileToAnswers(stored);
    expect(answersKey(back ?? EMPTY_ANSWERS)).toBe(answersKey(full));
    expect(back?.weightBand).toBe('180-230');
    expect(back?.weightExact).toBe('');
    expect(firstInvalidStep(back ?? EMPTY_ANSWERS)).toBe(-1);
  });

  it('keeps an exact weight as the exact-weight answer', () => {
    const answers: QuizAnswers = { ...full, weightBand: null, weightExact: '172' };
    const back = profileToAnswers(sanitizeProfileForStorage(answersToProfile(answers), '0.2'));
    expect(back?.weightExact).toBe('172');
    expect(answersToProfile(back ?? EMPTY_ANSWERS).weightLb).toBe(172);
  });

  it('returns null for nothing stored and drops unknown values', () => {
    expect(profileToAnswers(null)).toBeNull();
    const back = profileToAnswers({ sleepPosition: 'upside-down', weightLb: 155, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' });
    expect(back?.position).toBeNull();
    expect(back?.weightBand).toBe('130-180');
  });
});

describe('next steps after results', () => {
  it('links only to guides and categories that exist', () => {
    const profile = answersToProfile({ ...full, weightBand: '230-plus' });
    for (const r of readingFor(profile, 10)) {
      if (r.kind === 'Guide') expect(getGuide(r.href.split('/').pop() ?? '')).toBeTruthy();
      else expect(r.href).toMatch(/^\/sleep-position\/(side|back|stomach|combination)$/);
    }
    for (const r of rankingsFor(profile)) {
      const slug = (r.href.split('?')[0] ?? '').split('/').pop() ?? '';
      expect(getCategoryPage(slug)).toBeTruthy();
      expect(r.href).toContain('sort=match');
    }
  });

  it('tailors reading to the answers', () => {
    const hotCouple = readingFor(answersToProfile(full), 10).map((r) => r.href);
    expect(hotCouple).toContain('/sleep-position/side');
    expect(hotCouple).toContain('/guides/mattresses-for-hot-sleepers');
    expect(hotCouple).toContain('/guides/motion-isolation-for-couples');
    const cool = readingFor(answersToProfile({ ...full, temperature: 'cold', sharing: 'single', edge: 'low' }), 10).map((r) => r.href);
    expect(cool).not.toContain('/guides/mattresses-for-hot-sleepers');
    expect(cool).not.toContain('/guides/motion-isolation-for-couples');
    expect(readingFor(answersToProfile(full)).length).toBeLessThanOrEqual(4);
  });

  it('sends combination sleepers to the full ranking and others to their position ranking', () => {
    expect(rankingsFor(answersToProfile(full))[0]?.href).toBe('/mattresses/side-sleepers?sort=match');
    expect(rankingsFor(answersToProfile({ ...full, position: 'combination' }))[0]?.href).toBe('/mattresses/best?sort=match');
  });
});
