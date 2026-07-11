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

vi.mock('$lib/db', () => ({ db: mockDb }))

import { PATCH, DELETE } from './+server'

function makeApiEvent(body: object, id = '1', user: object | null = { id: 1 }) {
  return {
    params: { id },
    locals: { user },
    request: { json: () => Promise.resolve(body) },
  } as any
}

describe('PATCH /meals/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.returning.mockResolvedValue([{ id: 1, name: 'Updated' }])
  })

  it('throws 401 when unauthenticated', async () => {
    await expect(
      PATCH(makeApiEvent({ name: 'x' }, '1', null)),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('throws 404 when the meal does not exist', async () => {
    mockDb.returning.mockResolvedValueOnce([])
    await expect(PATCH(makeApiEvent({ name: 'x' }))).rejects.toMatchObject({
      status: 404,
    })
  })

  it('updates a meal', async () => {
    const res = await PATCH(makeApiEvent({ name: 'Updated' }))
    expect(res.status).toBe(200)
    expect(mockDb.set.mock.calls[0][0]).toEqual({ name: 'Updated' })
  })
})

describe('DELETE /meals/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 401 when unauthenticated', async () => {
    await expect(DELETE(makeApiEvent({}, '1', null))).rejects.toMatchObject({
      status: 401,
    })
  })

  it('deletes a meal and returns 204', async () => {
    const res = await DELETE(makeApiEvent({}))
    expect(res.status).toBe(204)
    expect(mockDb.delete).toHaveBeenCalled()
  })
})
