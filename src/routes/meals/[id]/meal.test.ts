import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from:   vi.fn().mockReturnThis(),
  where:  vi.fn().mockReturnThis(),
  limit:  vi.fn(),          // resolves the ownership lookup row
  update: vi.fn().mockReturnThis(),
  set:    vi.fn().mockReturnThis(),
}));

vi.mock('$lib/db', () => ({ db: mockDb }));

import { actions } from './+page.server';

function makeFormEvent(fields: Record<string, string | string[]>, id = '1') {
  const formData = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (Array.isArray(val)) val.forEach(v => formData.append(key, v));
    else formData.append(key, val);
  }
  return { params: { id }, locals: { user: { id: 1 } }, request: { formData: () => Promise.resolve(formData) } } as any;
}

describe('meals/[id] update action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.limit.mockResolvedValue([{ userId: null }]); // global meal → editable by anyone
  });

  it('passes checked tags through to db.update as an array', async () => {
    await actions.update(makeFormEvent({ name: 'Test', tags: ['Vegan', 'no_gluten'] }));
    const patched = mockDb.set.mock.calls[0][0];
    expect(patched.tags).toEqual(['Vegan', 'no_gluten']);
  });

  it('defaults tags to an empty array when none are checked', async () => {
    await actions.update(makeFormEvent({ name: 'Test' }));
    const patched = mockDb.set.mock.calls[0][0];
    expect(patched.tags).toEqual([]);
  });

  it("rejects editing another user's personal meal with 403", async () => {
    mockDb.limit.mockResolvedValueOnce([{ userId: 2 }]); // owned by someone else
    await expect(actions.update(makeFormEvent({ name: 'Test' }))).rejects.toMatchObject({ status: 403 });
    expect(mockDb.set).not.toHaveBeenCalled();
  });
});
