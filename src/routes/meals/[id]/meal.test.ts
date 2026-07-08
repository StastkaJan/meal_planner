import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  update: vi.fn().mockReturnThis(),
  set:    vi.fn().mockReturnThis(),
  where:  vi.fn().mockResolvedValue(undefined),
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
  beforeEach(() => vi.clearAllMocks());

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
});
