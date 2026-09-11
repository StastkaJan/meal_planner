import { eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '$lib/database'
import { ingredients, userIngredients } from '$lib/database/schema'
import {
  matchIngredient,
  normalizeIngredientName,
} from '$lib/domain/ingredients'
import { InvalidMealInputError } from '$lib/domain/meal-input'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function listIngredientOptions(
  userId: number | null,
  tx: Tx | typeof db = db,
) {
  return tx
    .select({
      id: ingredients.id,
      name: ingredients.name,
      nameCs: ingredients.nameCs,
      aliases: ingredients.aliases,
    })
    .from(ingredients)
    .where(
      or(
        eq(ingredients.isCatalog, true),
        userId === null
          ? undefined
          : inArray(
              ingredients.id,
              tx
                .select({ id: userIngredients.ingredientId })
                .from(userIngredients)
                .where(eq(userIngredients.userId, userId)),
            ),
      ),
    )
    .orderBy(ingredients.name)
}

export async function resolveIngredient(
  tx: Tx,
  name: string,
  userId: number | null,
  ingredientId?: number,
) {
  const options = await listIngredientOptions(userId, tx)
  if (ingredientId !== undefined) {
    const selected = options.find((option) => option.id === ingredientId)
    if (!selected) throw new InvalidMealInputError('Unknown ingredient')
    return selected
  }
  const match = matchIngredient(name, options)
  if (match) return match
  const normalized = normalizeIngredientName(name)
  // Advisory lock prevents case/whitespace variants being created concurrently.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${normalized}))`)
  let [row] = await tx
    .select()
    .from(ingredients)
    .where(
      sql`lower(regexp_replace(trim(${ingredients.name}), '\\s+', ' ', 'g')) = ${normalized}`,
    )
    .limit(1)
  if (!row)
    [row] = await tx
      .insert(ingredients)
      .values({
        name: name.trim().replace(/\s+/g, ' '),
        isCatalog: userId === null,
      })
      .returning()
  if (userId !== null)
    await tx
      .insert(userIngredients)
      .values({ userId, ingredientId: row.id })
      .onConflictDoNothing()
  else if (!row.isCatalog)
    await tx
      .update(ingredients)
      .set({ isCatalog: true })
      .where(eq(ingredients.id, row.id))
  return row
}

export function createIngredientOption(userId: number, name: string) {
  return db.transaction((tx) => resolveIngredient(tx, name, userId))
}

export async function pantryIngredientSelection(userId: number, ids: number[]) {
  const options = await listIngredientOptions(userId)
  const selected = ids.map((id) => options.find((option) => option.id === id))
  if (selected.some((option) => !option))
    throw new InvalidMealInputError('Unknown pantry ingredient')
  return selected.map((option) => option!)
}
