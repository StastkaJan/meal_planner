import { vi, describe, it, expect, beforeEach } from 'vitest';

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
