import { UNIT_OPTIONS } from '$lib/constants'
import type { IngredientInput } from '$lib/types'

export class InvalidMealInputError extends Error {}

const units = new Set<string>(UNIT_OPTIONS)

const numericFields = [
  ['calories', 0, 2_147_483_647, true],
  ['proteinG', 0, 99_999.9, false],
  ['carbsG', 0, 99_999.9, false],
  ['fatG', 0, 99_999.9, false],
  ['fiberG', 0, 99_999.99, false],
  ['sugarG', 0, 99_999.99, false],
  ['saturatedFatG', 0, 99_999.99, false],
  ['saltG', 0, 99_999.99, false],
  ['timeMinutes', 0, 2_147_483_647, true],
  ['servings', 1, 2_147_483_647, true],
] as const

function numberValue(
  value: unknown,
  min: number,
  max: number,
  integer: boolean,
) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !value.trim())
  )
    throw new InvalidMealInputError('Invalid meal numeric value')

  const number = Number(value)
  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max ||
    (integer && !Number.isInteger(number))
  )
    throw new InvalidMealInputError('Invalid meal numeric value')
  return number
}

function ingredientsValue(value: unknown): IngredientInput[] {
  if (!Array.isArray(value))
    throw new InvalidMealInputError('Ingredients must be a list')

  return value.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw new InvalidMealInputError('Invalid ingredient')
    const ingredient = candidate as Record<string, unknown>
    if (typeof ingredient.name !== 'string' || !ingredient.name.trim())
      throw new InvalidMealInputError('Ingredient name is required')

    const quantityBlank =
      ingredient.qty === null ||
      ingredient.qty === undefined ||
      (typeof ingredient.qty === 'string' && !ingredient.qty.trim())
    const qty = quantityBlank
      ? null
      : numberValue(ingredient.qty, 0, 9_999_999.999, false)
    const unitBlank =
      ingredient.unit === null ||
      ingredient.unit === undefined ||
      ingredient.unit === ''
    const unit = unitBlank ? null : ingredient.unit
    if (unit !== null && (typeof unit !== 'string' || !units.has(unit)))
      throw new InvalidMealInputError('Invalid ingredient unit')
    if (unit !== null && qty === null)
      throw new InvalidMealInputError(
        'Ingredient quantity is required when a unit is set',
      )

    return { name: ingredient.name.trim(), qty, unit }
  })
}

export function validateMealFields(
  fields: Record<string, unknown>,
  requireName = false,
) {
  const values = { ...fields }
  if (requireName || 'name' in values) {
    if (typeof values.name !== 'string' || !values.name.trim())
      throw new InvalidMealInputError('Name is required')
    values.name = values.name.trim()
  }

  for (const [field, min, max, integer] of numericFields) {
    if (!(field in values)) continue
    const value = values[field]
    if (value === null || value === undefined || value === '') {
      if (field === 'servings')
        throw new InvalidMealInputError('Invalid meal numeric value')
      values[field] = null
    } else {
      values[field] = numberValue(value, min, max, integer)
    }
  }

  if ('ingredients' in values)
    values.ingredients = ingredientsValue(values.ingredients)
  return values
}
