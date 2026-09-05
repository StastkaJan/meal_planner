import * as z from 'zod'
import { MEAL_TYPES, UNIT_OPTIONS } from '$lib/constants'

export class InvalidMealInputError extends Error {}

const numericError = 'Invalid meal numeric value'

function numberValue(min: number, max: number, integer = false) {
  let number = z
    .number({ error: numericError })
    .min(min, { error: numericError })
    .max(max, { error: numericError })
  if (integer) number = number.int({ error: numericError })
  return z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() ? Number(value) : value,
    number,
  )
}

const nullableNumber = (min: number, max: number, integer = false) =>
  z
    .preprocess(
      (value) => (value === null || value === '' ? null : value),
      numberValue(min, max, integer).nullable(),
    )
    .optional()

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, { error: 'Name is required' })

const nullableText = z
  .string({ error: 'Invalid meal text value' })
  .nullable()
  .optional()

const ingredient = z
  .object(
    {
      name: z
        .string({ error: 'Ingredient name is required' })
        .trim()
        .min(1, { error: 'Ingredient name is required' }),
      qty: z.preprocess(
        (value) =>
          value === null ||
          value === undefined ||
          (typeof value === 'string' && !value.trim())
            ? null
            : value,
        numberValue(0, 9_999_999.999).nullable(),
      ),
      unit: z.preprocess(
        (value) =>
          value === null || value === undefined || value === '' ? null : value,
        z.enum(UNIT_OPTIONS, { error: 'Invalid ingredient unit' }).nullable(),
      ),
    },
    { error: 'Invalid ingredient' },
  )
  .refine(({ qty, unit }) => unit === null || qty !== null, {
    error: 'Ingredient quantity is required when a unit is set',
    path: ['qty'],
  })

const mealFields = z.looseObject({
  name: name.optional(),
  calories: nullableNumber(0, 2_147_483_647, true),
  proteinG: nullableNumber(0, 99_999.9),
  carbsG: nullableNumber(0, 99_999.9),
  fatG: nullableNumber(0, 99_999.9),
  fiberG: nullableNumber(0, 99_999.99),
  sugarG: nullableNumber(0, 99_999.99),
  saturatedFatG: nullableNumber(0, 99_999.99),
  saltG: nullableNumber(0, 99_999.99),
  tags: z
    .array(z.string({ error: 'Invalid tags' }), { error: 'Invalid tags' })
    .optional(),
  allowedSlots: z
    .array(z.enum(MEAL_TYPES, { error: 'Invalid allowed slots' }), {
      error: 'Invalid allowed slots',
    })
    .optional(),
  imageUrl: nullableText,
  description: nullableText,
  ingredients: z
    .array(ingredient, { error: 'Ingredients must be a list' })
    .optional(),
  instructions: nullableText,
  timeMinutes: nullableNumber(0, 2_147_483_647, true),
  difficulty: z
    .preprocess(
      (value) => (value === '' ? null : value),
      z
        .enum(['easy', 'medium', 'hard'], {
          error: 'Invalid difficulty',
        })
        .nullable(),
    )
    .optional(),
  servings: numberValue(1, 2_147_483_647, true).optional(),
})

const namedMealFields = mealFields.safeExtend({ name })

export function validateMealFields(
  fields: Record<string, unknown>,
  requireName = false,
) {
  const result = (requireName ? namedMealFields : mealFields).safeParse(fields)
  if (!result.success)
    throw new InvalidMealInputError(result.error.issues[0].message)
  return result.data
}
