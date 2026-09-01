import { error, json } from '@sveltejs/kit'
import { requireEditableMeal, requireVisibleMeal } from '$lib/server/guards'
import {
  deleteMealImage,
  findMealImage,
  saveMealImage,
} from '$lib/server/repositories/meal-images'
import type { RequestHandler } from './$types'

export const _MAX_RECIPE_IMAGE_BYTES = 5 * 1024 * 1024

function hasImageSignature(contentType: string, data: Buffer) {
  if (contentType === 'image/jpeg')
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  if (contentType === 'image/png')
    return data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  if (contentType === 'image/webp')
    return (
      data.subarray(0, 4).toString('ascii') === 'RIFF' &&
      data.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  return (
    contentType === 'image/gif' &&
    ['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString('ascii'))
  )
}

export const GET: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireVisibleMeal(locals, id)
  const image = await findMealImage(id)
  if (!image) error(404, 'Image not found')
  return new Response(new Uint8Array(image.data), {
    headers: {
      'content-type': image.contentType,
      'content-length': String(image.data.length),
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
  const data = Buffer.from(await request.arrayBuffer())
  if (!data.length) error(400, 'Choose an image')
  if (data.length > _MAX_RECIPE_IMAGE_BYTES)
    error(413, 'Image must be 5 MB or smaller')
  if (!hasImageSignature(contentType, data))
    error(415, 'Use a JPEG, PNG, WebP, or GIF image')

  await saveMealImage(id, contentType, data)
  return json({ imageUrl: `/meals/${id}/image` })
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  await deleteMealImage(id)
  return json({ hasUploadedImage: false })
}
