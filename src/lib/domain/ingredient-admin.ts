import { z } from 'zod'
import { normalizeIngredientName } from './ingredients'

const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((value) => value.replace(/\s+/g, ' '))
const locale = z
  .string()
  .trim()
  .max(35)
  .transform((value, ctx) => {
    try {
      return Intl.getCanonicalLocales(value)[0].toLowerCase()
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid language code' })
      return z.NEVER
    }
  })

export const ingredientAdminInput = z
  .object({
    name,
    translations: z
      .array(
        z.object({
          locale,
          name,
          aliases: z
            .array(name)
            .max(100)
            .transform((values) => [
              ...new Set(values.map(normalizeIngredientName)),
            ]),
        }),
      )
      .max(20),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.translations.map((row) => row.locale)).size !==
      value.translations.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Each language can appear only once',
      })
  })

export type IngredientAdminInput = z.infer<typeof ingredientAdminInput>
