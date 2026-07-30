import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  delete: vi.fn().mockReturnThis(),
}))

vi.mock('$lib/database', () => ({ db: mockDb }))

const updateMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/meals', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateMeal,
}))

import { PATCH, DELETE } from './+server'

function makeEvent(body?: object, id = '1', userId = 1) {
  return {
    params: { id },
    request: body
      ? { json: () => Promise.resolve(body) }
      : { json: () => Promise.resolve({}) },
    locals: { user: { id: userId } },
  } as any
}

describe('REST /meals/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('PATCH', () => {
    it('hides non-owner meals with 404', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      await expect(PATCH(makeEvent({ name: 'x' }))).rejects.toMatchObject({
        status: 404,
      })
    })

    it('returns 404 for non-existent meal', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      await expect(PATCH(makeEvent({ name: 'x' }))).rejects.toMatchObject({
        status: 404,
      })
    })

    it('returns 404 when updateMeal finds nothing to update', async () => {
      mockDb.limit.mockResolvedValueOnce([{ userId: 1, archivedAt: null }])
      updateMeal.mockResolvedValueOnce(undefined)
      await expect(PATCH(makeEvent({ name: 'x' }))).rejects.toMatchObject({
        status: 404,
      })
    })

    it('delegates to updateMeal for an own meal', async () => {
      mockDb.limit.mockResolvedValueOnce([{ userId: 1, archivedAt: null }])
      updateMeal.mockResolvedValueOnce({ id: 1, name: 'updated' })
      await PATCH(makeEvent({ name: 'updated' }))
      expect(updateMeal).toHaveBeenCalledWith(1, { name: 'updated' })
    })

    it('does not allow editing a global meal', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      updateMeal.mockResolvedValueOnce({ id: 1, name: 'updated' })
      await expect(PATCH(makeEvent({ name: 'updated' }))).rejects.toMatchObject(
        {
          status: 404,
        },
      )
      expect(updateMeal).not.toHaveBeenCalled()
    })

    it('hides archived meals with 404', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      await expect(PATCH(makeEvent({ name: 'x' }))).rejects.toMatchObject({
        status: 404,
      })
    })
  })

  describe('DELETE', () => {
    it('hides non-owner meals with 404', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      await expect(DELETE(makeEvent())).rejects.toMatchObject({
        status: 404,
      })
    })

    it('returns 404 for non-existent meal', async () => {
      mockDb.limit.mockResolvedValueOnce([{ userId: 1, archivedAt: null }])
      mockDb.returning.mockResolvedValueOnce([])
      await expect(DELETE(makeEvent())).rejects.toMatchObject({
        status: 404,
      })
    })

    it('soft-deletes own meal and returns 204', async () => {
      mockDb.limit.mockResolvedValueOnce([{ userId: 1, archivedAt: null }])
      mockDb.returning.mockResolvedValueOnce([{ id: 1 }])
      const res = await DELETE(makeEvent())
      expect(res.status).toBe(204)
      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('unauthenticated', () => {
    it('PATCH returns 401', async () => {
      await expect(
        PATCH({ params: { id: '1' }, locals: {} } as any),
      ).rejects.toMatchObject({ status: 401 })
    })

    it('DELETE returns 401', async () => {
      await expect(
        DELETE({ params: { id: '1' }, locals: {} } as any),
      ).rejects.toMatchObject({ status: 401 })
    })
  })
})
