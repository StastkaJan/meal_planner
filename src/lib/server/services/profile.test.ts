import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteAccountRecord = vi.hoisted(() => vi.fn())
const findUserById = vi.hoisted(() => vi.fn())
const getAccountExport = vi.hoisted(() => vi.fn())
const listUserMealIds = vi.hoisted(() => vi.fn())
const verifyPassword = vi.hoisted(() => vi.fn())
const deleteMealImages = vi.hoisted(() => vi.fn())
const readMealImage = vi.hoisted(() => vi.fn())
const saveSettings = vi.hoisted(() => vi.fn())

vi.mock('../repositories/accounts', () => ({
  deleteAccount: deleteAccountRecord,
  findUserById,
  getAccountExport,
  listUserMealIds,
  saveSettings,
  updatePassword: vi.fn(),
}))
vi.mock('$lib/server/meal-images', () => ({
  deleteMealImages,
  readMealImage,
}))
vi.mock('./auth', () => ({ hashPassword: vi.fn(), verifyPassword }))
vi.mock('../observability', () => ({
  monitorService: (_service: string, _operation: string, task: () => unknown) =>
    task(),
}))

import {
  deleteAccount,
  exportAccountData,
  toPantryStaples,
  updateProfileSettings,
} from './profile'

beforeEach(() => {
  vi.clearAllMocks()
  listUserMealIds.mockResolvedValue([])
})

describe('toPantryStaples', () => {
  it('parses, trims, and deduplicates pantry ingredient names', () => {
    expect(toPantryStaples(' Salt\nTomatoes, canned\nsalt \n')).toEqual([
      'Salt',
      'Tomatoes, canned',
    ])
  })
})

describe('nutrition settings', () => {
  it('saves decimal display goals without changing omitted settings', async () => {
    await updateProfileSettings(42, {
      fiberTarget: '25.5',
      sugarTarget: 60,
      saturatedFatTarget: '15',
      saltTarget: '5.5',
    })
    expect(saveSettings).toHaveBeenCalledWith(42, {
      fiberTarget: 25.5,
      sugarTarget: 60,
      saturatedFatTarget: 15,
      saltTarget: 5.5,
    })
  })

  it('clears blank and invalid goals, preserving whole-number macro settings', async () => {
    await updateProfileSettings(42, {
      proteinTarget: '40.6',
      fiberTarget: '',
      sugarTarget: -1,
      saturatedFatTarget: 'Infinity',
      saltTarget: null,
    })
    expect(saveSettings).toHaveBeenCalledWith(42, {
      proteinTarget: 41,
      fiberTarget: null,
      sugarTarget: null,
      saturatedFatTarget: null,
      saltTarget: null,
    })
    await updateProfileSettings(42, { saltTarget: true })
    expect(saveSettings).toHaveBeenLastCalledWith(42, { saltTarget: null })
  })
})

describe('exportAccountData', () => {
  it('adds caller-owned recipe images from file storage', async () => {
    const data = { version: 1, recipes: [{ id: 7, name: 'Soup' }], plans: [] }
    getAccountExport.mockResolvedValueOnce(data)
    readMealImage.mockResolvedValueOnce(Buffer.from('image'))
    await expect(exportAccountData(42)).resolves.toEqual({
      ...data,
      recipes: [
        {
          id: 7,
          name: 'Soup',
          image: { contentType: 'image/webp', data: 'aW1hZ2U=' },
        },
      ],
    })
    expect(getAccountExport).toHaveBeenCalledWith(42)
    expect(readMealImage).toHaveBeenCalledWith(7)
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
    listUserMealIds.mockResolvedValueOnce([7, 8])
    deleteAccountRecord.mockResolvedValueOnce(true)
    await expect(deleteAccount(42, 'secret', 'cook@example.com')).resolves.toBe(
      'deleted',
    )
    expect(deleteAccountRecord).toHaveBeenCalledWith(42)
    expect(deleteMealImages).toHaveBeenCalledWith([7, 8])
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
