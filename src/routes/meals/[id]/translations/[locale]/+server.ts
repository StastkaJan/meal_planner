import { error, json } from '@sveltejs/kit'
import { parseLocale } from '$lib/i18n'
import { requireEditableMeal } from '$lib/server/guards'
import {
  deleteMealTranslation,
  findMeal,
  saveMealTranslation,
} from '$lib/server/repositories/meals'
import type { RequestHandler } from './$types'

const fields = ['name', 'description', 'instructions'] as const

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const mealId = Number(params.id)
  await requireEditableMeal(locals, mealId)
  const locale = parseLocale(params.locale)
  if (!locale) error(400, 'Unsupported locale')

  const meal = await findMeal(mealId, locals.user!.id)
  if (!meal) error(404, 'Meal not found')
  if (locale === meal.sourceLocale)
    error(400, 'Edit the original recipe for its source language')

  const body = await request.json()
  const values = Object.fromEntries(
    fields.map((field) => {
      const value = body[field]
      return [
        field,
        typeof value === 'string' && value.trim() ? value.trim() : null,
      ]
    }),
  )
  return json(await saveMealTranslation(mealId, locale, values))
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const mealId = Number(params.id)
  await requireEditableMeal(locals, mealId)
  const locale = parseLocale(params.locale)
  if (!locale) error(400, 'Unsupported locale')
  await deleteMealTranslation(mealId, locale)
  return new Response(null, { status: 204 })
}
