import {
  createMeal,
  findMeal,
  getMealIngredients,
  updateMeal,
} from '../repositories/meals'
import { monitorService } from '../observability'

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
  return monitorService('meals', 'create', async () => {
    const values = pickMealFields(body)
    values.userId = body.scope === 'personal' ? userId : null
    return createMeal(values as { name: string })
  })
}

export async function updateUserMeal(
  id: number,
  body: Record<string, unknown>,
) {
  return monitorService('meals', 'update', () =>
    updateMeal(id, pickMealFields(body)),
  )
}

export async function duplicateGlobalMeal(userId: number, id: number) {
  return monitorService('meals', 'duplicate', async () => {
    const source = await findMeal(id, userId)
    if (!source || source.userId !== null) return null
    return createMeal({
      ...pickMealFields(source),
      name: source.name,
      userId,
      ingredients: await getMealIngredients(id),
    })
  })
}
