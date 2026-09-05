import { beforeEach, describe, expect, it, vi } from 'vitest'
import { error } from '@sveltejs/kit'

const { findMeal, requireUser } = vi.hoisted(() => ({
  findMeal: vi.fn(),
  requireUser: vi.fn(),
}))
vi.mock('$lib/server/guards', () => ({ requireUser }))
vi.mock('$lib/server/repositories/meals', () => ({
  findMeal,
  getMealIngredients: vi.fn().mockResolvedValue([{ name: 'Carrot' }]),
  getMealTranslations: vi.fn().mockResolvedValue([]),
}))
vi.mock('$lib/server/meal-images', () => ({
  hasMealImage: vi.fn().mockResolvedValue(false),
}))
vi.mock('$lib/server/services/meals', () => ({
  localizeMeal: (meal: unknown) => meal,
}))

import { load as edit } from './+page.server'
import { load as translate } from '../translate/+page.server'

describe.each([
  ['edit', edit],
  ['translate', translate],
] as const)('%s page access', (_name, load) => {
  const event = (user = { id: 7, isAdmin: false }) =>
    ({ params: { id: '12' }, locals: { user, locale: 'en' } }) as any

  beforeEach(() => {
    vi.clearAllMocks()
    requireUser.mockImplementation((locals) => {
      if (!locals.user) error(401, 'Not authenticated')
      return locals.user
    })
    findMeal.mockResolvedValue({ id: 12, userId: 7, name: 'Soup' })
  })

  it('loads the owner’s recipe and form data', async () => {
    await expect(load(event())).resolves.toMatchObject({
      sourceMeal: { id: 12, name: 'Soup' },
      ingredients: [{ name: 'Carrot' }],
      translations: [],
      hasUploadedImage: false,
      editable: true,
    })
    expect(findMeal).toHaveBeenCalledWith(12, 7)
  })

  it('allows admins to edit shared recipes', async () => {
    findMeal.mockResolvedValue({ id: 12, userId: null, name: 'Soup' })
    await expect(load(event({ id: 7, isAdmin: true }))).resolves.toMatchObject({
      editable: true,
    })
  })

  it('hides shared recipe forms from non-admins', async () => {
    findMeal.mockResolvedValue({ id: 12, userId: null, name: 'Soup' })
    await expect(load(event())).rejects.toMatchObject({ status: 404 })
  })

  it('hides missing or inaccessible recipes', async () => {
    findMeal.mockResolvedValue(undefined)
    await expect(load(event())).rejects.toMatchObject({ status: 404 })
  })

  it('requires sign-in before loading recipe data', async () => {
    await expect(
      load({ ...event(), locals: { locale: 'en' } }),
    ).rejects.toMatchObject({
      status: 401,
    })
    expect(findMeal).not.toHaveBeenCalled()
  })
})
