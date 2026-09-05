import { error, json } from '@sveltejs/kit'
import { requireEditableMeal, requireVisibleMeal } from '$lib/server/guards'
import {
  deleteMealImage,
  InvalidRecipeImageError,
  MAX_RECIPE_IMAGE_BYTES,
  readConditionalMealImage,
  saveMealImage,
} from '$lib/server/meal-images'
import type { RequestHandler } from './$types'

export const _MAX_RECIPE_IMAGE_BYTES = MAX_RECIPE_IMAGE_BYTES

const ACCEPTED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const GET: RequestHandler = async ({ params, locals, request }) => {
  const id = Number(params.id)
  await requireVisibleMeal(locals, id)
  const result = await readConditionalMealImage(
    id,
    request.headers.get('if-none-match'),
  )
  if (!result) error(404, 'Image not found')
  const { image, etag } = result
  return new Response(image ? new Uint8Array(image) : null, {
    status: image ? 200 : 304,
    headers: {
      'content-type': 'image/webp',
      ...(image ? { 'content-length': String(image.length) } : {}),
      'cache-control': 'private, no-cache',
      etag,
      'x-content-type-options': 'nosniff',
    },
  })
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)

  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > _MAX_RECIPE_IMAGE_BYTES)
    error(413, 'Image must be 5 MB or smaller')

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!ACCEPTED_CONTENT_TYPES.has(contentType))
    error(415, 'Use a JPEG, PNG, WebP, or GIF image')

  const data = Buffer.from(await request.arrayBuffer())
  if (!data.length) error(400, 'Choose an image')
  if (data.length > _MAX_RECIPE_IMAGE_BYTES)
    error(413, 'Image must be 5 MB or smaller')
  try {
    await saveMealImage(id, data)
  } catch (cause) {
    if (cause instanceof InvalidRecipeImageError)
      error(415, 'Use a JPEG, PNG, WebP, or GIF image')
    throw cause
  }
  return json({ imageUrl: `/meals/${id}/image` })
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  await deleteMealImage(id)
  return json({ hasUploadedImage: false })
}
