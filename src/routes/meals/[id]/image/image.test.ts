import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireEditableMeal = vi.hoisted(() => vi.fn())
const requireVisibleMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({
  requireEditableMeal,
  requireVisibleMeal,
}))

const InvalidRecipeImageError = vi.hoisted(
  () => class InvalidRecipeImageError extends Error {},
)
const deleteMealImage = vi.hoisted(() => vi.fn())
const readConditionalMealImage = vi.hoisted(() => vi.fn())
const saveMealImage = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/meal-images', () => ({
  InvalidRecipeImageError,
  MAX_RECIPE_IMAGE_BYTES: 5 * 1024 * 1024,
  deleteMealImage,
  readConditionalMealImage,
  saveMealImage,
}))

import { DELETE, GET, PUT, _MAX_RECIPE_IMAGE_BYTES } from './+server'

const event = (request = new Request('http://localhost/meals/7/image')) =>
  ({ params: { id: '7' }, locals: { user: { id: 1 } }, request }) as any

describe('REST /meals/:id/image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serves an image with private mandatory revalidation', async () => {
    readConditionalMealImage.mockResolvedValueOnce({
      image: Buffer.from('webp'),
      etag: 'W/"v1"',
    })

    const response = await GET(event())

    expect(requireVisibleMeal).toHaveBeenCalledWith(event().locals, 7)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('cache-control')).toBe('private, no-cache')
    expect(response.headers.get('etag')).toBe('W/"v1"')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('returns 404 when a visible meal has no uploaded image', async () => {
    readConditionalMealImage.mockResolvedValueOnce(null)

    await expect(GET(event())).rejects.toMatchObject({ status: 404 })
  })

  it('returns a bodyless 304 only after checking meal visibility', async () => {
    readConditionalMealImage.mockResolvedValueOnce({
      image: null,
      etag: 'W/"v1"',
    })
    const response = await GET(
      event(
        new Request('http://localhost/meals/7/image', {
          headers: { 'if-none-match': 'W/"v1"' },
        }),
      ),
    )
    expect(response.status).toBe(304)
    expect(await response.text()).toBe('')
    expect(readConditionalMealImage).toHaveBeenCalledWith(7, 'W/"v1"')
    expect(requireVisibleMeal.mock.invocationCallOrder[0]).toBeLessThan(
      readConditionalMealImage.mock.invocationCallOrder[0],
    )
  })

  it('does not validate or serve cached images for an unauthorized user', async () => {
    requireVisibleMeal.mockRejectedValueOnce({ status: 404 })
    await expect(GET(event())).rejects.toMatchObject({ status: 404 })
    expect(readConditionalMealImage).not.toHaveBeenCalled()
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
    expect(saveMealImage).toHaveBeenCalledWith(7, data)
    await expect(response.json()).resolves.toEqual({
      imageUrl: '/meals/7/image',
    })
  })

  it('rejects files that the image processor cannot decode', async () => {
    saveMealImage.mockRejectedValueOnce(new InvalidRecipeImageError())
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: 'not an image',
    })

    await expect(PUT(event(request))).rejects.toMatchObject({ status: 415 })
    expect(saveMealImage).toHaveBeenCalledWith(7, Buffer.from('not an image'))
  })

  it('rejects unsupported declared content types before reading the image', async () => {
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/svg+xml' },
      body: '<svg />',
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

  it('rejects an oversized body when content-length is unavailable', async () => {
    const request = new Request('http://localhost/meals/7/image', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: Buffer.alloc(_MAX_RECIPE_IMAGE_BYTES + 1),
    })
    request.headers.delete('content-length')

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
