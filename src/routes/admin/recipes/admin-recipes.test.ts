import { beforeEach, describe, expect, it, vi } from 'vitest'

const importCatalogueBatch = vi.hoisted(() => vi.fn())
const reviewRecipeImport = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/services/catalogue-imports', () => ({
  importCatalogueBatch,
}))
vi.mock('$lib/server/repositories/recipe-imports', () => ({
  reviewRecipeImport,
}))

import { POST } from './+server'
import { PATCH } from './[id]/+server'

const event = (body: unknown, isAdmin = true) =>
  ({
    params: { id: '4' },
    locals: { user: { id: 7, email: 'admin@example.com', isAdmin } },
    request: { json: () => Promise.resolve(body) },
  }) as any

describe('admin recipe catalogue API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-admin users', async () => {
    await expect(POST(event([], false))).rejects.toMatchObject({ status: 403 })
    expect(importCatalogueBatch).not.toHaveBeenCalled()
  })

  it('queues an admin batch', async () => {
    importCatalogueBatch.mockResolvedValueOnce({
      accepted: 1,
      duplicates: 0,
      errors: [],
    })
    const response = await POST(event([{ recipe: {} }]))
    expect(response.status).toBe(201)
    expect(importCatalogueBatch).toHaveBeenCalledWith(7, [{ recipe: {} }])
  })

  it('reviews only pending entries with a valid decision', async () => {
    await expect(PATCH(event({ status: 'maybe' }))).rejects.toMatchObject({
      status: 400,
    })
    reviewRecipeImport.mockResolvedValueOnce({ id: 4, status: 'approved' })
    expect((await PATCH(event({ status: 'approved' }))).status).toBe(200)
    expect(reviewRecipeImport).toHaveBeenCalledWith(4, 'approved')
  })
})
