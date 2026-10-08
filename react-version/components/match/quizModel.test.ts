import { describe, expect, it } from 'vitest';
import { validateProfile } from '@/lib/profileValidation';
import {
  EMPTY_ANSWERS,
  WEIGHT_BANDS,
  answersFromSearch,
  answersToProfile,
  bandForWeight,
  budgetStopIndex,
  countEligible,
  firmnessFromParam,
  firstInvalidStep,
  parseExactWeight,
  profileChips,
  sanitiseAnswers,
  validateStep,
  type QuizAnswers,
  type QuizCatalogItem,
} from './quizModel';

const complete: QuizAnswers = {
  ...EMPTY_ANSWERS,
  position: 'side',
  weightBand: '130-180',
  firmness: 'medium-soft',
  temperature: 'hot',
};

describe('quizModel', () => {
  it('maps minimal answers to a valid profile with optional fields omitted', () => {
    const profile = answersToProfile(complete);
    expect(profile).toEqual({ sleepPosition: 'side', weightLb: 155, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'hot' });
    expect(validateProfile(profile)).toBeNull();
  });

  it('maps every optional answer and passes server validation', () => {
    const profile = answersToProfile({
      ...complete,
      weightExact: '212',
      painFocus: 'lower-back',
      sharing: 'couple-high',
      edge: 'high',
      types: ['latex', 'hybrid'],
      budgetMax: 2000,
    });
    expect(profile.weightLb).toBe(212);
    expect(profile.painFocus).toBe('lower-back');
    expect(profile.motionSensitivity).toBe('couple-high');
    expect(profile.edgeImportance).toBe('high');
    expect(profile.mattressTypePreference).toEqual(['latex', 'hybrid']);
    expect(profile.budgetUsd).toEqual({ min: 0, max: 2000 });
    expect(validateProfile(profile)).toBeNull();
  });

  it('band weights stay inside the engine bands they represent', () => {
    for (const band of WEIGHT_BANDS) expect(bandForWeight(band.weightLb)).toBe(band.value);
  });

  it('validates steps inline', () => {
    expect(validateStep('sleep', EMPTY_ANSWERS)).toHaveProperty('position');
    expect(validateStep('body', EMPTY_ANSWERS)).toHaveProperty('weightBand');
    expect(validateStep('body', { ...EMPTY_ANSWERS, weightExact: '20' })).toHaveProperty('weightExact');
    expect(validateStep('body', { ...EMPTY_ANSWERS, weightExact: '180' })).toEqual({});
    expect(validateStep('comfort', EMPTY_ANSWERS)).toHaveProperty('firmness');
    expect(validateStep('environment', EMPTY_ANSWERS)).toHaveProperty('temperature');
    expect(validateStep('priorities', EMPTY_ANSWERS)).toEqual({});
    expect(firstInvalidStep(EMPTY_ANSWERS)).toBe(0);
    expect(firstInvalidStep(complete)).toBe(-1);
  });

  it('parses exact weight honestly', () => {
    expect(parseExactWeight('')).toEqual({ value: null, error: null });
    expect(parseExactWeight('abc').error).toBeTruthy();
    expect(parseExactWeight('175.6').value).toBe(176);
  });

  it('prefills from URL params and ignores junk', () => {
    expect(answersFromSearch('?position=side&firmness=medium-firm')).toEqual({ position: 'side', firmness: 'medium-firm' });
    expect(answersFromSearch('?position=upside-down&firmness=99')).toEqual({});
    expect(firmnessFromParam('7')).toBe('medium-firm');
    expect(firmnessFromParam('1')).toBe('soft');
  });

  it('sanitises stored answers', () => {
    const a = sanitiseAnswers({ position: 'side', types: ['foam', 'bogus', 'foam'], budgetMax: 1234, edge: 'max' });
    expect(a.position).toBe('side');
    expect(a.types).toEqual(['foam']);
    expect(a.budgetMax).toBeNull();
    expect(a.edge).toBeNull();
    expect(budgetStopIndex(null)).toBeGreaterThan(0);
  });

  it('counts eligible mattresses like filterCatalog (unpriced excluded under a budget)', () => {
    const catalog: QuizCatalogItem[] = [{ type: 'foam', priceUsd: 900 }, { type: 'hybrid', priceUsd: null }, { type: 'hybrid', priceUsd: 2500 }];
    expect(countEligible(catalog, EMPTY_ANSWERS)).toBe(3);
    expect(countEligible(catalog, { ...EMPTY_ANSWERS, types: ['hybrid'] })).toBe(2);
    expect(countEligible(catalog, { ...EMPTY_ANSWERS, budgetMax: 2000 })).toBe(1);
  });

  it('builds profile chips with an edit step for each', () => {
    const chips = profileChips(complete);
    expect(chips.map((c) => c.label)).toContain('Side sleeper');
    expect(chips.every((c) => typeof c.step === 'number')).toBe(true);
  });
});
