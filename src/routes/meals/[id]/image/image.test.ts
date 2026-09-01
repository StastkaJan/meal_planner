import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireEditableMeal = vi.hoisted(() => vi.fn())
const requireVisibleMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({
  requireEditableMeal,
  requireVisibleMeal,
}))

const deleteMealImage = vi.hoisted(() => vi.fn())
const findMealImage = vi.hoisted(() => vi.fn())
const saveMealImage = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/meal-images', () => ({
  deleteMealImage,
  findMealImage,
  saveMealImage,
}))

import { DELETE, GET, PUT, _MAX_RECIPE_IMAGE_BYTES } from './+server'

const event = (request?: Request) =>
  ({ params: { id: '7' }, locals: { user: { id: 1 } }, request }) as any

describe('REST /meals/:id/image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serves a visible meal image without caching or sniffing', async () => {
    findMealImage.mockResolvedValueOnce({
      contentType: 'image/png',
      data: Buffer.from('89504e470d0a1a0a', 'hex'),
    })

    const response = await GET(event())

    expect(requireVisibleMeal).toHaveBeenCalledWith(event().locals, 7)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('stores a valid image for an editable meal', async () => {
    const data = Buffer.from('89504e470d0a1a0a', 'hex')
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: data,
    })

    const response = await PUT(event(request))

    expect(requireEditableMeal).toHaveBeenCalledWith(event().locals, 7)
    expect(saveMealImage).toHaveBeenCalledWith(7, 'image/png', data)
    await expect(response.json()).resolves.toEqual({
      imageUrl: '/meals/7/image',
    })
  })

  it('rejects files whose bytes do not match the declared image type', async () => {
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: 'not an image',
    })

    await expect(PUT(event(request))).rejects.toMatchObject({ status: 415 })
    expect(saveMealImage).not.toHaveBeenCalled()
  })

  it('rejects an oversized request before reading it', async () => {
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: {
        'content-type': 'image/jpeg',
        'content-length': String(_MAX_RECIPE_IMAGE_BYTES + 1),
      },
      body: Buffer.from([0xff, 0xd8, 0xff]),
    })

    await expect(PUT(event(request))).rejects.toMatchObject({ status: 413 })
    expect(saveMealImage).not.toHaveBeenCalled()
  })

  it('removes an editable meal image', async () => {
    const response = await DELETE(event())

    expect(requireEditableMeal).toHaveBeenCalledWith(event().locals, 7)
    expect(deleteMealImage).toHaveBeenCalledWith(7)
    await expect(response.json()).resolves.toEqual({ hasUploadedImage: false })
  })
})
