import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteAccount = vi.hoisted(() => vi.fn())
const exportAccountData = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/services/profile', () => ({
  changePassword: vi.fn(),
  deleteAccount,
  exportAccountData,
  updateProfileSettings: vi.fn(),
}))

import { DELETE } from './+server'
import { GET } from './export/+server'

function deleteEvent(body: object, userId?: number) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: userId ? { user: { id: userId } } : {},
    cookies: { delete: vi.fn() },
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
      recipes: [],
      plans: [],
    })
    const response = await GET({ locals: { user: { id: 42 } } } as any)
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({
      version: 1,
      account: { email: 'cook@example.com' },
      exportedAt: expect.any(String),
    })
    expect(exportAccountData).toHaveBeenCalledWith(42)
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
    deleteAccount.mockResolvedValueOnce(false)
    const event = deleteEvent(
      { password: 'wrong', confirmation: 'cook@example.com' },
      42,
    )
    const response = await DELETE(event)
    expect(response.status).toBe(400)
    expect(event.cookies.delete).not.toHaveBeenCalled()
  })

  it('clears the session cookie after permanent deletion', async () => {
    deleteAccount.mockResolvedValueOnce(true)
    const event = deleteEvent(
      { password: 'secret', confirmation: 'cook@example.com' },
      42,
    )
    const response = await DELETE(event)
    expect(response.status).toBe(200)
    expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
  })
})
