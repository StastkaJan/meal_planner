import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteAccount = vi.hoisted(() => vi.fn())
const exportAccountData = vi.hoisted(() => vi.fn())
const updateProfileSettings = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/services/profile', () => ({
  changePassword: vi.fn(),
  deleteAccount,
  exportAccountData,
  updateProfileSettings,
}))

import { DELETE, PATCH } from './+server'
import { GET } from './export/+server'

function deleteEvent(body: object, userId?: number) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: userId ? { user: { id: userId } } : {},
    cookies: { delete: vi.fn() },
  } as any
}

function patchEvent(body: object, locale: App.Locale = 'cs') {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: 42 }, locale },
    cookies: { set: vi.fn() },
  } as any
}

beforeEach(() => vi.clearAllMocks())

describe('GET /profile/export', () => {
  it('rejects unauthenticated requests', async () => {
    await expect(GET({ locals: {} } as any)).rejects.toMatchObject({
      status: 401,
    })
  })

  it('downloads a non-cacheable JSON export scoped to the user', async () => {
    exportAccountData.mockResolvedValueOnce({
      version: 1,
      account: { email: 'cook@example.com' },
      recipes: [
        {
          id: 7,
          translations: [{ locale: 'cs', name: 'Polévka' }],
        },
      ],
      plans: [],
    })
    const response = await GET({ locals: { user: { id: 42 } } } as any)
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({
      version: 1,
      account: { email: 'cook@example.com' },
      recipes: [
        {
          id: 7,
          translations: [{ locale: 'cs', name: 'Polévka' }],
        },
      ],
      exportedAt: expect.any(String),
    })
    expect(exportAccountData).toHaveBeenCalledWith(42)
  })
})

describe('PATCH /profile', () => {
  it('preserves the resolved locale when creating settings implicitly', async () => {
    updateProfileSettings.mockResolvedValueOnce({
      locale: 'cs',
      calorieTarget: 2_000,
    })
    const event = patchEvent({ calorieTarget: 2_000 })

    await PATCH(event)

    expect(updateProfileSettings).toHaveBeenCalledWith(42, {
      locale: 'cs',
      calorieTarget: 2_000,
    })
    expect(event.cookies.set).toHaveBeenCalledWith(
      'locale',
      'cs',
      expect.objectContaining({ path: '/' }),
    )
  })

  it('uses an explicitly selected locale', async () => {
    updateProfileSettings.mockResolvedValueOnce({ locale: 'en' })
    const event = patchEvent({ locale: 'en' })

    await PATCH(event)

    expect(updateProfileSettings).toHaveBeenCalledWith(42, { locale: 'en' })
  })
})

describe('DELETE /profile', () => {
  it('rejects unauthenticated requests', async () => {
    await expect(DELETE(deleteEvent({}))).rejects.toMatchObject({ status: 401 })
  })

  it('rejects missing confirmation without deleting', async () => {
    const response = await DELETE(deleteEvent({ password: 'secret' }, 42))
    expect(response.status).toBe(400)
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('keeps the session when confirmation fails', async () => {
    deleteAccount.mockResolvedValueOnce('invalid')
    const event = deleteEvent(
      { password: 'wrong', confirmation: 'cook@example.com' },
      42,
    )
    const response = await DELETE(event)
    expect(response.status).toBe(400)
    expect(event.cookies.delete).not.toHaveBeenCalled()
  })

  it('rejects deletion of the final administrator', async () => {
    deleteAccount.mockResolvedValueOnce('last-admin')
    const event = deleteEvent(
      { password: 'secret', confirmation: 'admin@example.com' },
      42,
    )

    const response = await DELETE(event)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Promote another administrator before deleting your account',
    })
    expect(event.cookies.delete).not.toHaveBeenCalled()
  })

  it('clears the session cookie after permanent deletion', async () => {
    deleteAccount.mockResolvedValueOnce('deleted')
    const event = deleteEvent(
      { password: 'secret', confirmation: 'cook@example.com' },
      42,
    )
    const response = await DELETE(event)
    expect(response.status).toBe(200)
    expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
  })
})
