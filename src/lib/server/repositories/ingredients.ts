import { and, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  ingredients,
  ingredientTranslations,
  userIngredients,
  mealIngredients,
  userSettings,
} from '$lib/database/schema'
import type { IngredientAdminInput } from '$lib/domain/ingredient-admin'
import {
  normalizeIngredientName,
  ingredientNames,
  type IngredientOption,
} from '$lib/domain/ingredients'
import { InvalidMealInputError } from '$lib/domain/meal-input'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const ingredientOptionColumns = {
  id: ingredients.id,
  name: ingredients.name,
  translations: sql<IngredientOption['translations']>`coalesce((
    select jsonb_object_agg(t.locale, jsonb_build_object('name', t.name, 'aliases', t.aliases))
    from ingredient_translations t where t.ingredient_id = "ingredients"."id" and t.locale <> 'und'
  ), '{}'::jsonb)`,
  // Read older unknown-language buckets as general aliases until the next save/merge.
  aliases: sql<string[]>`array(
    select distinct lower(regexp_replace(trim(alias), '\\s+', ' ', 'g'))
    from unnest(${ingredients.aliases} || coalesce((
      select array[t.name] || t.aliases from ingredient_translations t
      where t.ingredient_id = "ingredients"."id" and t.locale = 'und'
    ), '{}'::text[])) alias where trim(alias) <> '' order by 1
  )`,
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
      or i.aliases @> array[${normalized}]::text[]
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
    ${ingredients.name} ilike ${pattern} or exists (select 1 from unnest(${ingredients.aliases}) alias where alias ilike ${pattern}) or exists (
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
            .values({
              name: input.name,
              aliases: input.aliases ?? [],
              isCatalog: true,
            })
            .returning({ id: ingredients.id })
        : await tx
            .update(ingredients)
            // Reuse the private original name; rollback rows may reserve case variants.
            .set({
              name: id === undefined ? duplicate!.name : input.name,
              isCatalog: true,
              aliases: input.aliases ?? ingredientOptionColumns.aliases,
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

// Admin-only discovery includes private names, without exposing their owners.
export function listMergeSources(query: string) {
  const pattern = `%${normalizeIngredientName(query).replace(/[\\%_]/g, '\\$&')}%`
  return db
    .select(ingredientOptionColumns)
    .from(ingredients)
    .where(
      sql`${ingredients.name} ilike ${pattern} or exists (select 1 from unnest(${ingredients.aliases}) alias where alias ilike ${pattern}) or exists (
      select 1 from ingredient_translations t where t.ingredient_id = ${ingredients.id}
      and (t.name ilike ${pattern} or exists (select 1 from unnest(t.aliases) alias where alias ilike ${pattern}))
    )`,
    )
    .orderBy(ingredients.name, ingredients.id)
    .limit(30)
}

export function mergeIngredients(sourceId: number, targetId: number) {
  return db.transaction(async (tx) => {
    if (sourceId === targetId) return false
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('ingredient-catalogue-admin'))`,
    )
    const rows = await tx
      .select({ ...ingredientOptionColumns, isCatalog: ingredients.isCatalog })
      .from(ingredients)
      .where(inArray(ingredients.id, [sourceId, targetId]))
      .orderBy(ingredients.id)
      .for('update')
    const source = rows.find((row) => row.id === sourceId)
    const target = rows.find((row) => row.id === targetId)
    if (!source || !target?.isCatalog) return null

    const translations = structuredClone(target.translations)
    const addAliases = (locale: string, name: string, aliases: string[]) => {
      const row = (translations[locale] ??= { name, aliases: [] })
      row.aliases = [
        ...new Set(
          [...row.aliases, name, ...aliases].map(normalizeIngredientName),
        ),
      ]
    }
    const aliases = [
      ...new Set(
        [...(target.aliases ?? []), ...(source.aliases ?? []), source.name].map(
          normalizeIngredientName,
        ),
      ),
    ]
    for (const [locale, row] of Object.entries(source.translations))
      addAliases(locale, row.name, row.aliases)

    // Do not create an ambiguous shared alias that would resolve differently by user.
    const names = [
      ...new Set(ingredientNames(source).map(normalizeIngredientName)),
    ]
    const namesArray = sql`array[${sql.join(
      names.map((name) => sql`${name}`),
      sql`, `,
    )}]::text[]`
    const [conflict] = await tx
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        sql`
      ${ingredients.isCatalog} and ${ingredients.id} not in (${sourceId}, ${targetId}) and (
        lower(regexp_replace(trim(${ingredients.name}), '\\s+', ' ', 'g')) = any(${namesArray})
        or ${ingredients.aliases} && ${namesArray}
        or exists (select 1 from ingredient_translations t where t.ingredient_id = ${ingredients.id}
          and (lower(regexp_replace(trim(t.name), '\\s+', ' ', 'g')) = any(${namesArray}) or t.aliases && ${namesArray}))
      )`,
      )
      .limit(1)
    if (conflict) return false

    await tx
      .update(ingredients)
      .set({ aliases })
      .where(eq(ingredients.id, targetId))
    await tx
      .delete(ingredientTranslations)
      .where(
        and(
          eq(ingredientTranslations.ingredientId, targetId),
          eq(ingredientTranslations.locale, 'und'),
        ),
      )

    for (const [locale, row] of Object.entries(translations))
      await tx
        .insert(ingredientTranslations)
        .values({ ingredientId: targetId, locale, ...row })
        .onConflictDoUpdate({
          target: [
            ingredientTranslations.ingredientId,
            ingredientTranslations.locale,
          ],
          set: row,
        })
    await tx
      .update(mealIngredients)
      .set({ ingredientId: targetId })
      .where(eq(mealIngredients.ingredientId, sourceId))
    await tx.execute(sql`
      insert into user_ingredients (user_id, ingredient_id)
      select user_id, ${targetId} from user_ingredients where ingredient_id = ${sourceId}
      on conflict do nothing
    `)
    await tx
      .delete(userIngredients)
      .where(eq(userIngredients.ingredientId, sourceId))
    await tx.update(userSettings).set({
      pantryIngredientIds: sql`array(
        select replaced from (
          select case when id = ${sourceId} then ${targetId} else id end as replaced, min(position) as position
          from unnest(${userSettings.pantryIngredientIds}) with ordinality as p(id, position)
          group by replaced
        ) ids order by position
      )`,
      pantryStaples: sql`array(
        select distinct case when lower(regexp_replace(trim(name), '\\s+', ' ', 'g')) = any(${namesArray})
          then ${target.name} else name end from unnest(${userSettings.pantryStaples}) name
      )`,
    })
      .where(sql`${sourceId} = any(${userSettings.pantryIngredientIds}) or exists (
      select 1 from unnest(${userSettings.pantryStaples}) name
      where lower(regexp_replace(trim(name), '\\s+', ' ', 'g')) = any(${namesArray})
    )`)
    await tx.delete(ingredients).where(eq(ingredients.id, sourceId))
    return { id: target.id, name: target.name, aliases, translations }
  })
}
