import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteAccountRecord = vi.hoisted(() => vi.fn())
const findUserById = vi.hoisted(() => vi.fn())
const getAccountExport = vi.hoisted(() => vi.fn())
const verifyPassword = vi.hoisted(() => vi.fn())

vi.mock('../repositories/accounts', () => ({
  deleteAccount: deleteAccountRecord,
  findUserById,
  getAccountExport,
  saveSettings: vi.fn(),
  updatePassword: vi.fn(),
}))
vi.mock('./auth', () => ({ hashPassword: vi.fn(), verifyPassword }))
vi.mock('../observability', () => ({
  monitorService: (_service: string, _operation: string, task: () => unknown) =>
    task(),
}))

import { deleteAccount, exportAccountData, toPantryStaples } from './profile'

beforeEach(() => vi.clearAllMocks())

describe('toPantryStaples', () => {
  it('parses, trims, and deduplicates pantry ingredient names', () => {
    expect(toPantryStaples(' Salt\nTomatoes, canned\nsalt \n')).toEqual([
      'Salt',
      'Tomatoes, canned',
    ])
  })
})

describe('exportAccountData', () => {
  it('returns only the repository export for the authenticated user', async () => {
    const data = { version: 1, recipes: [], plans: [] }
    getAccountExport.mockResolvedValueOnce(data)
    await expect(exportAccountData(42)).resolves.toBe(data)
    expect(getAccountExport).toHaveBeenCalledWith(42)
  })
})

describe('deleteAccount', () => {
  it('requires the account email as an exact confirmation', async () => {
    findUserById.mockResolvedValueOnce({
      email: 'cook@example.com',
      passwordHash: 'hash',
    })
    await expect(
      deleteAccount(42, 'secret', 'other@example.com'),
    ).resolves.toBe('invalid')
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(deleteAccountRecord).not.toHaveBeenCalled()
  })

  it('requires the current password', async () => {
    findUserById.mockResolvedValueOnce({
      email: 'cook@example.com',
      passwordHash: 'hash',
    })
    verifyPassword.mockResolvedValueOnce(false)
    await expect(deleteAccount(42, 'wrong', 'cook@example.com')).resolves.toBe(
      'invalid',
    )
    expect(deleteAccountRecord).not.toHaveBeenCalled()
  })

  it('deletes the account after both confirmations pass', async () => {
    findUserById.mockResolvedValueOnce({
      email: 'cook@example.com',
      passwordHash: 'hash',
    })
    verifyPassword.mockResolvedValueOnce(true)
    deleteAccountRecord.mockResolvedValueOnce(true)
    await expect(deleteAccount(42, 'secret', 'cook@example.com')).resolves.toBe(
      'deleted',
    )
    expect(deleteAccountRecord).toHaveBeenCalledWith(42)
  })

  it('reports when the final administrator cannot be deleted', async () => {
    findUserById.mockResolvedValueOnce({
      email: 'admin@example.com',
      passwordHash: 'hash',
    })
    verifyPassword.mockResolvedValueOnce(true)
    deleteAccountRecord.mockResolvedValueOnce(false)

    await expect(
      deleteAccount(42, 'secret', 'admin@example.com'),
    ).resolves.toBe('last-admin')
  })
})
