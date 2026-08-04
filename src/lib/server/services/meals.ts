import { createMeal, updateMeal } from '../repositories/meals'

const WRITABLE = [
  'name',
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'tags',
  'allowedSlots',
  'imageUrl',
  'description',
  'ingredients',
  'instructions',
  'timeMinutes',
  'difficulty',
  'servings',
] as const

const NULLABLE_NUMBERS = new Set([
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'timeMinutes',
  'servings',
])

export function pickMealFields(body: Record<string, unknown>) {
  const values: Record<string, unknown> = {}
  for (const field of WRITABLE) {
    if (body[field] !== undefined)
      values[field] =
        body[field] === '' && NULLABLE_NUMBERS.has(field) ? null : body[field]
  }
  return values
}

export async function createUserMeal(
  userId: number,
  body: Record<string, unknown>,
) {
  const values = pickMealFields(body)
  values.userId = body.scope === 'personal' ? userId : null
  return createMeal(values as { name: string })
}

export async function updateUserMeal(
  id: number,
  body: Record<string, unknown>,
) {
  return updateMeal(id, pickMealFields(body))
}
