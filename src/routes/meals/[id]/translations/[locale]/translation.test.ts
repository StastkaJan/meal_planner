import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireEditableMeal = vi.hoisted(() => vi.fn())
const findMeal = vi.hoisted(() => vi.fn())
const saveMealTranslation = vi.hoisted(() => vi.fn())
const deleteMealTranslation = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({ requireEditableMeal }))
vi.mock('$lib/server/repositories/meals', () => ({
  findMeal,
  saveMealTranslation,
  deleteMealTranslation,
}))

import { DELETE, PATCH } from './+server'

const event = (locale = 'cs', body: object = {}) =>
  ({
    params: { id: '1', locale },
    request: { json: async () => body },
    locals: { user: { id: 7 } },
  }) as any

describe('meal translation endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findMeal.mockResolvedValue({ id: 1, sourceLocale: 'en' })
  })

  it('trims translated fields and stores blanks as fallback nulls', async () => {
    saveMealTranslation.mockResolvedValue({ mealId: 1, locale: 'cs' })
    await PATCH(
      event('cs-CZ', {
        name: '  Polévka ',
        description: '',
        instructions: ' Vařit ',
      }),
    )
    expect(saveMealTranslation).toHaveBeenCalledWith(1, 'cs', {
      name: 'Polévka',
      description: null,
      ingredients: null,
      instructions: 'Vařit',
    })
  })

  it('rejects a translation in the source language', async () => {
    await expect(PATCH(event('en'))).rejects.toMatchObject({ status: 400 })
    expect(saveMealTranslation).not.toHaveBeenCalled()
  })

  it('trims translated ingredient names and leaves blank names as fallbacks', async () => {
    saveMealTranslation.mockResolvedValue({ mealId: 1, locale: 'cs' })

    await PATCH(event('cs', { ingredients: [' Mrkev ', ''] }))

    expect(saveMealTranslation).toHaveBeenCalledWith(1, 'cs', {
      name: null,
      description: null,
      ingredients: ['Mrkev', ''],
      instructions: null,
    })
  })

  it('deletes one locale without touching the recipe', async () => {
    expect((await DELETE(event())).status).toBe(204)
    expect(deleteMealTranslation).toHaveBeenCalledWith(1, 'cs')
  })
})
