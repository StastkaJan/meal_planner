import { vi, describe, it, expect, beforeEach } from 'vitest'

const createMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/meals', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createMeal,
}))

import { POST } from './+server'

function makeEvent(body: object, userId = 1, isAdmin = false) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId, isAdmin } },
  } as any
}

describe('POST /meals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated requests', async () => {
    await expect(
      POST({
        request: { json: () => Promise.resolve({}) },
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('rejects a missing name', async () => {
    await expect(POST(makeEvent({}))).rejects.toMatchObject({ status: 400 })
  })

  it('delegates to createMeal with server-set ownership', async () => {
    createMeal.mockResolvedValueOnce({
      id: 1,
      name: 'Soup',
    })
    const res = await POST(
      makeEvent({
        name: 'Soup',
        ingredients: [{ name: 'carrots', qty: 2, unit: null }],
        scope: 'personal',
      }),
    )
    expect(res.status).toBe(201)
    expect(createMeal).toHaveBeenCalledWith({
      name: 'Soup',
      ingredients: [{ name: 'carrots', qty: 2, unit: null }],
      userId: 1,
    })
  })

  it('defaults new meals to personal ownership', async () => {
    createMeal.mockResolvedValueOnce({ id: 2, name: 'Stew' })
    await POST(makeEvent({ name: 'Stew' }))
    expect(createMeal).toHaveBeenCalledWith({ name: 'Stew', userId: 1 })
  })

  it('allows only admins to create a global meal', async () => {
    await expect(
      POST(makeEvent({ name: 'Stew', scope: 'global' })),
    ).rejects.toMatchObject({ status: 403 })

    createMeal.mockResolvedValueOnce({ id: 2, name: 'Stew' })
    await POST(makeEvent({ name: 'Stew', scope: 'global' }, 1, true))
    expect(createMeal).toHaveBeenCalledWith({ name: 'Stew', userId: null })
  })
})
