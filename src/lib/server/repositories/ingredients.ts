import { and, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  ingredients,
  ingredientTranslations,
  userIngredients,
} from '$lib/database/schema'
import type { IngredientAdminInput } from '$lib/domain/ingredient-admin'
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

export async function listManagedIngredients(
  query: string,
  requestedPage: number,
  missing = false,
) {
  const pattern = `%${normalizeIngredientName(query).replace(/[\\%_]/g, '\\$&')}%`
  const filter = and(
    sql`(
    ${ingredients.name} ilike ${pattern} or exists (
      select 1 from ingredient_translations t where t.ingredient_id = ${ingredients.id}
      and (t.name ilike ${pattern} or exists (select 1 from unnest(t.aliases) alias where alias ilike ${pattern}))
    )
  )`,
    missing
      ? sql`(
      not exists (select 1 from ingredient_translations t where t.ingredient_id = ${ingredients.id} and t.locale = 'en')
      or not exists (select 1 from ingredient_translations t where t.ingredient_id = ${ingredients.id} and t.locale = 'cs')
    )`
      : undefined,
  )
  const [result] = await db
    .select({ total: count() })
    .from(ingredients)
    .where(and(eq(ingredients.isCatalog, true), filter))
  const totalPages = Math.max(1, Math.ceil(result.total / 10))
  const page = Math.min(requestedPage, totalPages)
  const rows = await ingredientOptionsQuery(db, null, filter)
    .limit(10)
    .offset((page - 1) * 10)
  return { ingredients: rows, totalPages, page }
}

export async function getManagedIngredient(id: number) {
  const [option] = await ingredientOptionsQuery(
    db,
    null,
    eq(ingredients.id, id),
  ).limit(1)
  return option
}

export function saveManagedIngredient(
  input: IngredientAdminInput,
  id?: number,
) {
  return db.transaction(async (tx) => {
    // Serialize infrequent catalogue edits to enforce normalized name uniqueness.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('ingredient-catalogue-admin'))`,
    )
    if (id !== undefined) {
      const [existing] = await ingredientOptionsQuery(
        tx,
        null,
        eq(ingredients.id, id),
      ).limit(1)
      if (!existing) return null
    }
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${normalizeIngredientName(input.name)}))`,
    )
    const [duplicate] = await tx
      .select({
        id: ingredients.id,
        name: ingredients.name,
        isCatalog: ingredients.isCatalog,
      })
      .from(ingredients)
      .where(
        sql`
      lower(regexp_replace(trim(${ingredients.name}), '\\s+', ' ', 'g')) = ${normalizeIngredientName(input.name)}
      ${id === undefined ? sql`` : sql`and ${ingredients.id} <> ${id}`}
    `,
      )
      .orderBy(desc(ingredients.isCatalog), ingredients.id)
      .limit(1)
    if (duplicate && (id !== undefined || duplicate.isCatalog)) return false
    const existingId = id ?? duplicate?.id
    const [row] =
      existingId === undefined
        ? await tx
            .insert(ingredients)
            .values({ name: input.name, isCatalog: true })
            .returning({ id: ingredients.id })
        : await tx
            .update(ingredients)
            // Reuse the private original name; rollback rows may reserve case variants.
            .set({
              name: id === undefined ? duplicate!.name : input.name,
              isCatalog: true,
            })
            .where(eq(ingredients.id, existingId))
            .returning({ id: ingredients.id })
    await tx
      .delete(ingredientTranslations)
      .where(eq(ingredientTranslations.ingredientId, row.id))
    if (input.translations.length)
      await tx.insert(ingredientTranslations).values(
        input.translations.map((translation) => ({
          ...translation,
          ingredientId: row.id,
        })),
      )
    const [option] = await ingredientOptionsQuery(
      tx,
      null,
      eq(ingredients.id, row.id),
    ).limit(1)
    return option
  })
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
