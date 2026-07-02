import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}));

vi.mock('$lib/db', () => ({ db: mockDb }));

import { POST } from './+server';

function makeEvent(body: object, userId = 1) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any;
}

describe('POST /plans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a plan with weekStart snapped to Monday', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 1, name: 'test', weekStart: '2026-06-29' }]);
    await POST(makeEvent({ name: 'test' }));
    const inserted = mockDb.values.mock.calls[0][0];
    const ws = new Date(inserted.weekStart);
    // Monday = 1 in local, but we stored UTC ISO so check via UTC day
    expect(ws.getUTCDay()).toBe(1); // 1 = Monday
  });

  it('ignores client-supplied weekStart', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 1, name: 'test', weekStart: '2026-06-29' }]);
    await POST(makeEvent({ name: 'test', weekStart: '2026-01-01' }));
    const inserted = mockDb.values.mock.calls[0][0];
    expect(inserted.weekStart).not.toBe('2026-01-01');
  });
});
