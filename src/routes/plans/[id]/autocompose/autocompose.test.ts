import { vi, describe, it, expect, beforeEach } from 'vitest';
import { _candidateMeals as candidateMeals, _filterByPrefs as filterByPrefs } from './+server';

// --- pure logic ---

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

// --- handler: 404 ownership check ---

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from:   vi.fn().mockReturnThis(),
  where:  vi.fn().mockReturnThis(),
  limit:  vi.fn(),
}));

vi.mock('$lib/db', () => ({ db: mockDb }));

import { POST } from './+server';

function makeEvent(planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve({}) },
    locals: { user: { id: userId } },
  } as any;
}

describe('POST /plans/:id/autocompose', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when plan is not owned by the user', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    await expect(POST(makeEvent())).rejects.toMatchObject({ status: 404 });
  });
});
