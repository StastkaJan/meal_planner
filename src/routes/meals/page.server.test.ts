import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMealLibrary = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/meals', () => ({ queryMealLibrary }))

import { load } from './+page.server'

const meals = [
  {
    id: 12,
    userId: null,
    name: 'Tomato soup',
    difficulty: 'easy',
    timeMinutes: 30,
    isFavorite: true,
  },
]

describe('recipe library load', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMealLibrary.mockResolvedValue({
      meals,
      page: 1,
      totalPages: 1,
      totalResults: 1,
    })
  })

  it('delegates search, filters, and pagination to SQL', async () => {
    const result = await load({
      locals: { user: { id: 7 }, locale: 'cs' },
      url: new URL(
        'http://localhost/meals?q=%20tomato%20&difficulty=easy&favorites=1&mine=1&page=3',
      ),
    } as any)

    expect(queryMealLibrary).toHaveBeenCalledWith(7, 'cs', {
      query: 'tomato',
      difficulty: 'easy',
      favoritesOnly: true,
      myRecipesOnly: true,
      page: 3,
      pageSize: 10,
    })
    expect(result).toMatchObject({
      meals,
      totalResults: 1,
      favoritesOnly: true,
      myRecipesOnly: true,
      query: 'tomato',
    })
  })

  it('uses the bounded page returned by the repository', async () => {
    queryMealLibrary.mockResolvedValueOnce({
      meals: [],
      page: 3,
      totalPages: 3,
      totalResults: 25,
    })

    const result = await load({
      locals: { user: { id: 1 }, locale: 'en' },
      url: new URL('http://localhost/meals?page=99'),
    } as any)

    expect(result).toMatchObject({ page: 3, totalPages: 3, totalResults: 25 })
  })

  it('normalizes fractional requested pages before querying', async () => {
    await load({
      locals: { user: { id: 1 }, locale: 'en' },
      url: new URL('http://localhost/meals?page=2.9'),
    } as any)

    expect(queryMealLibrary).toHaveBeenCalledWith(
      1,
      'en',
      expect.objectContaining({ page: 2 }),
    )
  })
})
