import { error, json } from '@sveltejs/kit'
import { requireEditableMeal, requireVisibleMeal } from '$lib/server/guards'
import {
  deleteMealImage,
  InvalidRecipeImageError,
  MAX_RECIPE_IMAGE_BYTES,
  readMealImage,
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

export const GET: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireVisibleMeal(locals, id)
  const image = await readMealImage(id)
  if (!image) error(404, 'Image not found')
  return new Response(new Uint8Array(image), {
    headers: {
      'content-type': 'image/webp',
      'content-length': String(image.length),
      'cache-control': 'private, no-store',
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
