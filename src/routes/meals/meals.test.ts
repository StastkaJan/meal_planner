import { vi, describe, it, expect, beforeEach } from 'vitest'

const createMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/meals', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createMeal,
}))

import { POST } from './+server'

function makeEvent(body: object, userId = 1) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
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
      ingredients: ['2 carrots'],
    })
    const res = await POST(
      makeEvent({
        name: 'Soup',
        ingredients: ['2 carrots'],
        scope: 'personal',
      }),
    )
    expect(res.status).toBe(201)
    expect(createMeal).toHaveBeenCalledWith({
      name: 'Soup',
      ingredients: ['2 carrots'],
      userId: 1,
    })
  })

  it('creates a global meal when scope is not personal', async () => {
    createMeal.mockResolvedValueOnce({ id: 2, name: 'Stew', ingredients: [] })
    await POST(makeEvent({ name: 'Stew' }))
    expect(createMeal).toHaveBeenCalledWith({ name: 'Stew', userId: null })
  })
})
