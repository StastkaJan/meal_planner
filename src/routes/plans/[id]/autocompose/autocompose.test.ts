import { vi, describe, it, expect, beforeEach } from 'vitest';
import { candidateMeals } from './+server';

// --- pure logic ---

describe('candidateMeals', () => {
  const meals = [
    { id: 1, calories: 100 },
    { id: 2, calories: 400 },
    { id: 3, calories: 700 },
    { id: 4, calories: 900 },
  ];

  it('returns meals within budget (calories <= budget * 1.3)', () => {
    const result = candidateMeals(meals, 310); // threshold: 403, includes 100 and 400
    expect(result.map(m => m.id)).toEqual([1, 2]);
  });

  it('falls back to 3 lightest when nothing fits', () => {
    const result = candidateMeals(meals, 50); // threshold: 65, nothing fits
    expect(result.map(m => m.id)).toEqual([1, 2, 3]);
  });

  it('treats null calories as 0 (always fits)', () => {
    const withNull = [{ id: 5, calories: null }, { id: 6, calories: 999 }];
    const result = candidateMeals(withNull, 100);
    expect(result.map(m => m.id)).toContain(5);
  });

  it('does not mutate the input array when falling back', () => {
    const input = [...meals];
    candidateMeals(input, 50);
    expect(input.map(m => m.id)).toEqual([1, 2, 3, 4]);
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
  return { params: { id: planId }, locals: { user: { id: userId } } } as any;
}

describe('POST /plans/:id/autocompose', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when plan is not owned by the user', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    await expect(POST(makeEvent())).rejects.toMatchObject({ status: 404 });
  });
});
