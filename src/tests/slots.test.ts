import { vi, describe, it, expect, beforeEach } from 'vitest';

// ponytail: vi.hoisted needed so mockDb is available when vi.mock factory runs (hoisting order)
const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockReturnThis(),
}));

vi.mock('$lib/db', () => ({ db: mockDb }));

import { PUT } from '../routes/plans/[id]/slots/+server';

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any;
}

describe('PUT /plans/:id/slots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when plan is not owned by the user', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    await expect(
      PUT(makeEvent({ dayOfWeek: 0, mealType: 'lunch', mealId: 1 }))
    ).rejects.toMatchObject({ status: 404 });
  });

  it('deletes the slot and returns 204 when mealId is null', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }]);
    const res = await PUT(makeEvent({ dayOfWeek: 0, mealType: 'lunch', mealId: null }));
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('upserts the slot and returns 204 when mealId is provided', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }]);
    const res = await PUT(makeEvent({ dayOfWeek: 0, mealType: 'lunch', mealId: 5 }));
    expect(res.status).toBe(204);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.delete).not.toHaveBeenCalled();
  });
});
