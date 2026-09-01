import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateUserAdmin = vi.hoisted(() => vi.fn())
const updateUserPro = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/accounts', () => ({
  updateUserAdmin,
  updateUserPro,
}))

import { PATCH } from './[id]/+server'

const event = (id: string, body: unknown, isAdmin = true, userId = 7) =>
  ({
    params: { id },
    locals: {
      user: { id: userId, email: 'admin@example.com', isAdmin },
    },
    request: { json: () => Promise.resolve(body) },
  }) as any

describe('admin user API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-admin users', async () => {
    await expect(
      PATCH(event('8', { isAdmin: true }, false)),
    ).rejects.toMatchObject({ status: 403 })
    expect(updateUserAdmin).not.toHaveBeenCalled()
    expect(updateUserPro).not.toHaveBeenCalled()
  })

  it('rejects invalid role changes and self-demotion', async () => {
    await expect(
      PATCH(event('2147483648', { isAdmin: true })),
    ).rejects.toMatchObject({ status: 400 })
    await expect(PATCH(event('1e3', { isAdmin: true }))).rejects.toMatchObject({
      status: 400,
    })
    await expect(PATCH(event('8', null))).rejects.toMatchObject({ status: 400 })
    await expect(PATCH(event('8', { isAdmin: 'yes' }))).rejects.toMatchObject({
      status: 400,
    })
    await expect(
      PATCH({
        ...event('8', { isAdmin: true }),
        request: { json: () => Promise.reject(new SyntaxError('bad JSON')) },
      }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(PATCH(event('7', { isAdmin: false }))).rejects.toMatchObject({
      status: 400,
    })
    expect(updateUserAdmin).not.toHaveBeenCalled()
    expect(updateUserPro).not.toHaveBeenCalled()
  })

  it('updates Pro access', async () => {
    updateUserPro.mockResolvedValueOnce({
      id: 8,
      email: 'cook@example.com',
      isAdmin: false,
      isPro: true,
    })

    const response = await PATCH(event('8', { isPro: true }))

    expect(updateUserPro).toHaveBeenCalledWith(7, 8, true)
    await expect(response.json()).resolves.toMatchObject({
      id: 8,
      isPro: true,
    })
  })

  it('rejects ambiguous access changes', async () => {
    await expect(
      PATCH(event('8', { isAdmin: true, isPro: true })),
    ).rejects.toMatchObject({ status: 400 })
    expect(updateUserAdmin).not.toHaveBeenCalled()
    expect(updateUserPro).not.toHaveBeenCalled()
  })

  it('updates another user role', async () => {
    updateUserAdmin.mockResolvedValueOnce({
      id: 8,
      email: 'cook@example.com',
      isAdmin: true,
    })

    const response = await PATCH(event('8', { isAdmin: true }))

    expect(response.status).toBe(200)
    expect(updateUserAdmin).toHaveBeenCalledWith(7, 8, true)
    await expect(response.json()).resolves.toMatchObject({
      id: 8,
      isAdmin: true,
    })
  })

  it('returns 404 for an unknown user', async () => {
    updateUserAdmin.mockResolvedValueOnce(null)
    await expect(PATCH(event('999', { isAdmin: false }))).rejects.toMatchObject(
      {
        status: 404,
      },
    )
  })

  it('rejects a role change when the acting admin was concurrently demoted', async () => {
    updateUserAdmin.mockResolvedValueOnce(false)
    await expect(PATCH(event('8', { isAdmin: false }))).rejects.toMatchObject({
      status: 403,
    })
  })

  it('rejects a Pro change when the acting admin was concurrently demoted', async () => {
    updateUserPro.mockResolvedValueOnce(false)
    await expect(PATCH(event('8', { isPro: true }))).rejects.toMatchObject({
      status: 403,
    })
  })
})
