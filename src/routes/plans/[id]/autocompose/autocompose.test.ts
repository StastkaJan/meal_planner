import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from:   vi.fn().mockReturnThis(),
  where:  vi.fn().mockReturnThis(),
  limit:  vi.fn(),
}));

vi.mock('$lib/db', () => ({ db: mockDb }));

const autocomposeSlots = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/plans', () => ({ autocomposeSlots }));

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

  it("passes the owner's resolved calorie target to autocompose", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 1, weekStart: '2026-06-29', cuisinePrefs: [], dietaryRestrictions: [] }]) // plan
      .mockResolvedValueOnce([{ calorieTarget: 1800, proteinTarget: null, carbsTarget: null, fatTarget: null }]); // user
    await POST(makeEvent());
    expect(autocomposeSlots).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      '2026-06-29',
      expect.objectContaining({ calories: 1800 }),
    );
  });

  it('falls back to the default calorie target when the user has none set', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 1, weekStart: '2026-06-29', cuisinePrefs: [], dietaryRestrictions: [] }])
      .mockResolvedValueOnce([{ calorieTarget: null, proteinTarget: null, carbsTarget: null, fatTarget: null }]);
    await POST(makeEvent());
    expect(autocomposeSlots).toHaveBeenCalledWith(expect.anything(), '2026-06-29', expect.objectContaining({ calories: 2000 }));
  });
});
