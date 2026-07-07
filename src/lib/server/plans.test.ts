import { describe, it, expect } from 'vitest';
import { candidateMeals, filterByPrefs } from './plans';

const meals = [
  { id: 1, calories: 100, tags: ['Italian', 'no_gluten'] },
  { id: 2, calories: 400, tags: ['Chinese', 'Vegan'] },
  { id: 3, calories: 700, tags: ['Mediterranean'] },
  { id: 4, calories: 900, tags: [] },
];

describe('candidateMeals', () => {
  it('returns meals within budget (calories <= budget * 1.3)', () => {
    const result = candidateMeals(meals, 310); // threshold: 403, includes 100 and 400
    expect(result.map(m => m.id)).toEqual([1, 2]);
  });

  it('falls back to 3 lightest when nothing fits', () => {
    const result = candidateMeals(meals, 50); // threshold: 65, nothing fits
    expect(result.map(m => m.id)).toEqual([1, 2, 3]);
  });

  it('treats null calories as 0 (always fits)', () => {
    const withNull = [{ id: 5, calories: null, tags: [] }, { id: 6, calories: 999, tags: [] }];
    const result = candidateMeals(withNull, 100);
    expect(result.map(m => m.id)).toContain(5);
  });

  it('does not mutate the input array when falling back', () => {
    const input = [...meals];
    candidateMeals(input, 50);
    expect(input.map(m => m.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('filterByPrefs', () => {
  it('filters by cuisinePrefs (OR logic)', () => {
    const result = filterByPrefs(meals, ['Italian'], []);
    expect(result.map(m => m.id)).toEqual([1]);
  });

  it('filters by dietaryRestrictions (AND logic)', () => {
    const result = filterByPrefs(meals, [], ['no_gluten']);
    expect(result.map(m => m.id)).toEqual([1]);
  });

  it('applies both filters together', () => {
    const result = filterByPrefs(meals, ['Chinese', 'Italian'], ['Vegan']);
    expect(result.map(m => m.id)).toEqual([2]); // Chinese + Vegan
  });

  it('falls back to all meals when nothing matches', () => {
    const result = filterByPrefs(meals, ['Thai'], []);
    expect(result).toEqual(meals);
  });

  it('returns all meals when prefs are empty', () => {
    const result = filterByPrefs(meals, [], []);
    expect(result).toEqual(meals);
  });
});
