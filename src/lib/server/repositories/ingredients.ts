import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '$lib/database'
import { ingredients, userIngredients } from '$lib/database/schema'
import {
  normalizeIngredientName,
  type IngredientOption,
} from '$lib/domain/ingredients'
import { InvalidMealInputError } from '$lib/domain/meal-input'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const ingredientOptionColumns = {
  id: ingredients.id,
  name: ingredients.name,
  translations: sql<IngredientOption['translations']>`coalesce((
    select jsonb_object_agg(t.locale, jsonb_build_object('name', t.name, 'aliases', t.aliases))
    from ingredient_translations t where t.ingredient_id = "ingredients"."id"
  ), '{}'::jsonb)`,
}

function ingredientOptionsQuery(
  tx: Tx | typeof db,
  userId: number | null,
  filter?: SQL,
) {
  return tx
    .select(ingredientOptionColumns)
    .from(ingredients)
    .where(
      and(
        filter,
        or(
          eq(ingredients.isCatalog, true),
          userId === null
            ? undefined
            : sql`exists (select 1 from user_ingredients u where u.ingredient_id = "ingredients"."id" and u.user_id = ${userId})`,
        ),
      ),
    )
    .orderBy(ingredients.name)
}

export function listIngredientOptions(
  userId: number | null,
  tx: Tx | typeof db = db,
) {
  return ingredientOptionsQuery(tx, userId)
}

export async function resolveIngredient(
  tx: Tx,
  name: string,
  userId: number | null,
  ingredientId?: number,
) {
  if (ingredientId !== undefined) {
    const [selected] = await ingredientOptionsQuery(
      tx,
      userId,
      eq(ingredients.id, ingredientId),
    ).limit(1)
    if (!selected) throw new InvalidMealInputError('Unknown ingredient')
    return selected
  }
  const normalized = normalizeIngredientName(name)
  const matches = await ingredientOptionsQuery(
    tx,
    userId,
    sql`${ingredients.id} in (
      select i.id from ingredients i
      where lower(regexp_replace(trim(i.name), '\\s+', ' ', 'g')) = ${normalized}
      union
      select t.ingredient_id from ingredient_translations t
      where lower(regexp_replace(trim(t.name), '\\s+', ' ', 'g')) = ${normalized}
      or t.aliases @> array[${normalized}]::text[])`,
  ).limit(2)
  // Never pick an arbitrary identity when an alias matches multiple ingredients.
  if (matches.length === 1) return matches[0]
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
  const [option] = await ingredientOptionsQuery(
    tx,
    userId,
    eq(ingredients.id, row.id),
  ).limit(1)
  return option
}

export function createIngredientOption(userId: number, name: string) {
  return db.transaction((tx) => resolveIngredient(tx, name, userId))
}

export async function pantryIngredientSelection(userId: number, ids: number[]) {
  if (!ids.length) return []
  const options = await ingredientOptionsQuery(
    db,
    userId,
    inArray(ingredients.id, ids),
  )
  const selected = ids.map((id) => options.find((option) => option.id === id))
  if (selected.some((option) => !option))
    throw new InvalidMealInputError('Unknown pantry ingredient')
  return selected.map((option) => option!)
}
