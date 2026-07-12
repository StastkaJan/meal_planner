import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('$lib/db', () => ({ db: mockDb }))
vi.mock('$lib/server/plans', () => ({
  getPlanDetail: vi.fn(async (plan: any, week: string) => ({
    ...plan,
    slots: [],
    week,
  })),
  validDateStr: (w: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) throw new Error('Invalid date')
    return w
  },
  getUserSettings: vi.fn(async () => null),
}))

import { load as loadImpl } from './+page.server'
const load = loadImpl as (event: unknown) => Promise<any>

function makeEvent(params: Record<string, string> = {}, userId = 1) {
  return {
    locals: { user: { id: userId } },
    url: { searchParams: new URLSearchParams(params) },
    depends: () => {},
  } as any
}

describe('load /', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // user nutrition-targets lookup (Promise.all's third query)
    mockDb.limit.mockResolvedValue([])
  })

  it('defaults to the last plan and its weekStart when no params given', async () => {
    mockDb.orderBy
      .mockResolvedValueOnce([
        { id: 1, weekStart: '2026-06-22' },
        { id: 2, weekStart: '2026-06-29' },
      ])
      .mockResolvedValueOnce([])
    const result = await load(makeEvent())
    expect(result.activePlanId).toBe(2)
    expect(result.viewWeek).toBe('2026-06-29')
  })

  it('uses ?plan= and ?week= when both are provided', async () => {
    mockDb.orderBy
      .mockResolvedValueOnce([
        { id: 1, weekStart: '2026-06-22' },
        { id: 2, weekStart: '2026-06-29' },
      ])
      .mockResolvedValueOnce([])
    const result = await load(makeEvent({ plan: '1', week: '2026-06-15' }))
    expect(result.activePlanId).toBe(1)
    expect(result.viewWeek).toBe('2026-06-15')
  })

  it('falls back to the default plan when ?plan= does not belong to the user', async () => {
    mockDb.orderBy
      .mockResolvedValueOnce([{ id: 1, weekStart: '2026-06-22' }])
      .mockResolvedValueOnce([])
    const result = await load(makeEvent({ plan: '999' }))
    expect(result.activePlanId).toBe(1)
  })

  it('returns no active plan when the user has none', async () => {
    mockDb.orderBy.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const result = await load(makeEvent())
    expect(result.activePlanId).toBe(0)
    expect(result.plan).toBeNull()
  })
})
