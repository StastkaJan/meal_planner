import {
  createMeal,
  findMeal,
  getMealIngredients,
  getMealTranslations,
  updateMeal,
} from '../repositories/meals'
import { monitorService } from '../observability'
import { copyMealImage } from '../meal-images'
import { parseLocale, type Locale } from '$lib/i18n'
import type { Meal, MealTranslation } from '$lib/database/schema'

const WRITABLE = [
  'name',
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'fiberG',
  'sugarG',
  'saturatedFatG',
  'saltG',
  'tags',
  'allowedSlots',
  'imageUrl',
  'description',
  'ingredients',
  'instructions',
  'timeMinutes',
  'difficulty',
  'servings',
  'sourceLocale',
] as const

const NULLABLE_NUMBERS = new Set([
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'fiberG',
  'sugarG',
  'saturatedFatG',
  'saltG',
  'timeMinutes',
  'servings',
])

export function pickMealFields(body: Record<string, unknown>) {
  const values: Record<string, unknown> = {}
  for (const field of WRITABLE) {
    if (field === 'sourceLocale' && body[field] !== undefined) {
      const locale = parseLocale(body[field])
      if (locale) values[field] = locale
    } else if (body[field] !== undefined)
      values[field] =
        body[field] === '' && NULLABLE_NUMBERS.has(field) ? null : body[field]
  }
  return values
}

export async function createUserMeal(
  userId: number,
  body: Record<string, unknown>,
  locale: Locale = 'en',
) {
  return monitorService('meals', 'create', async () => {
    const values = pickMealFields(body)
    values.sourceLocale ??= locale
    values.userId = body.scope === 'global' ? null : userId
    return createMeal(values as { name: string })
  })
}

export function localizeMeal(
  meal: Meal,
  translation: MealTranslation | undefined,
): Meal {
  if (!translation) return meal
  return {
    ...meal,
    name: translation.name ?? meal.name,
    description: translation.description ?? meal.description,
    instructions: translation.instructions ?? meal.instructions,
  }
}

export async function updateUserMeal(
  id: number,
  body: Record<string, unknown>,
) {
  const { sourceLocale: _sourceLocale, ...values } = pickMealFields(body)
  return monitorService('meals', 'update', () => updateMeal(id, values))
}

export async function duplicateGlobalMeal(userId: number, id: number) {
  return monitorService('meals', 'duplicate', async () => {
    const source = await findMeal(id, userId)
    if (!source || source.userId !== null) return null
    const [ingredients, translations] = await Promise.all([
      getMealIngredients(id),
      getMealTranslations(id),
    ])
    const duplicate = await createMeal({
      ...pickMealFields(source),
      name: source.name,
      userId,
      ingredients,
      translations,
    })
    await copyMealImage(id, duplicate.id)
    return duplicate
  })
}
