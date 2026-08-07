import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMeals = vi.hoisted(() => vi.fn())
const favoriteMealIds = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/meals', () => ({
  listMeals,
  favoriteMealIds,
}))

import { load } from './+page.server'

const meal = (id: number, difficulty = 'easy') => ({
  id,
  name: `Recipe ${id}`,
  description: id === 12 ? 'Tomato soup' : null,
  tags: id === 13 ? ['Italian'] : [],
  difficulty,
})

describe('recipe library load', () => {
  beforeEach(() => {
    listMeals.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => meal(i + 1)),
    )
    favoriteMealIds.mockResolvedValue(new Set([12]))
  })

  it('searches visible recipe text and applies filters', async () => {
    const result = await load({
      locals: { user: { id: 1 } },
      url: new URL('http://localhost/meals?q=tomato&favorites=1'),
    } as any)
    expect(result).toMatchObject({
      totalResults: 1,
      favoritesOnly: true,
      query: 'tomato',
    })
    expect((result as any).meals[0].id).toBe(12)
  })

  it('returns a bounded page of recipes', async () => {
    const result = await load({
      locals: { user: { id: 1 } },
      url: new URL('http://localhost/meals?page=3'),
    } as any)
    expect(result).toMatchObject({ page: 3, totalPages: 3, totalResults: 25 })
    expect((result as any).meals.map((item: any) => item.id)).toEqual([
      21, 22, 23, 24, 25,
    ])
  })
})
