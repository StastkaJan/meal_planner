import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
const repositories = vi.hoisted(() => ({
  listPlans: vi.fn(),
  getSettings: vi.fn(),
  listMealPickerItems: vi.fn(),
  getPlanDetail: vi.fn(async (plan, week) => ({
    ...plan,
    slots: [],
    bonus: [],
    week,
  })),
}))
vi.mock('$lib/server/repositories/plans', () => repositories)
vi.mock('$lib/server/repositories/accounts', () => repositories)
vi.mock('$lib/server/repositories/meals', () => repositories)
import { load as loadImpl } from './+page.server'
const load = loadImpl as (event: unknown) => Promise<any>
const plans = [
  { id: 1, mealSlots: ['lunch'] },
  { id: 2, mealSlots: ['lunch'] },
]
function event(query = '') {
  return {
    locals: { user: { id: 7 }, locale: 'cs' },
    url: new URL('http://localhost/?' + query),
  }
}
describe('load /', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repositories.listPlans.mockResolvedValue(plans)
    repositories.getSettings.mockResolvedValue(null)
    repositories.listMealPickerItems.mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())
  it('defaults to the last plan and current week without loading the catalogue', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'))
    expect(await load(event())).toMatchObject({
      activePlanId: 2,
      viewWeek: '2026-07-27',
      picker: null,
    })
    expect(repositories.listMealPickerItems).not.toHaveBeenCalled()
  })
  it('uses the requested owned plan and week', async () => {
    expect(await load(event('plan=1&week=2026-06-15'))).toMatchObject({
      activePlanId: 1,
      viewWeek: '2026-06-15',
    })
    expect(repositories.listMealPickerItems).not.toHaveBeenCalled()
  })
  it('falls back to an owned plan for a foreign plan ID', async () => {
    expect(await load(event('plan=999'))).toMatchObject({ activePlanId: 2 })
  })
  it('returns no active plan when the user has none', async () => {
    repositories.listPlans.mockResolvedValueOnce([])
    expect(await load(event())).toMatchObject({
      activePlanId: 0,
      plan: null,
      picker: null,
    })
  })
  it('loads auto-compose preferences', async () => {
    repositories.getSettings.mockResolvedValueOnce({
      cuisinePrefs: ['Italian'],
      dietaryRestrictions: ['Vegan'],
    })
    expect(await load(event())).toMatchObject({
      preferences: {
        cuisinePrefs: ['Italian'],
        dietaryRestrictions: ['Vegan'],
      },
    })
  })
  it('loads at most 30 picker results and passes filters to SQL', async () => {
    repositories.listMealPickerItems.mockResolvedValueOnce(
      Array.from({ length: 31 }, (_, id) => ({ id })),
    )
    const result = await load(
      event(
        'week=2026-06-15&pickDate=2026-06-16&pickSlot=lunch&pickQuery=soup&pickMine=1&pickPage=2',
      ),
    )
    expect(repositories.listMealPickerItems).toHaveBeenCalledWith(7, 'cs', {
      mealType: 'lunch',
      query: 'soup',
      mine: true,
      page: 2,
    })
    expect(result.picker.meals).toHaveLength(30)
    expect(result.picker.hasMore).toBe(true)
  })
  it.each([
    'pickDate=2026-06-22&pickSlot=lunch',
    'pickDate=2026-06-16&pickSlot=dinner',
  ])('ignores unavailable picker targets: %s', async (query) => {
    expect(await load(event('week=2026-06-15&' + query))).toMatchObject({
      picker: null,
    })
    expect(repositories.listMealPickerItems).not.toHaveBeenCalled()
  })
})
