import { asc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  bonusItems,
  ingredients,
  legalDocumentEvents,
  mealFavorites,
  mealIngredients,
  mealTranslations,
  meals,
  plans,
  recipeImports,
  slotRepeats,
  users,
  userSettings,
  weekSlots,
} from '$lib/database/schema'
import type { LegalNotice } from '$lib/legal'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const { userId: _mealOwnerId, ...accountRecipeColumns } = getTableColumns(meals)
const { userId: _planOwnerId, ...accountPlanColumns } = getTableColumns(plans)

async function lockAdminIds(tx: Tx) {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .orderBy(asc(users.id))
    .for('update')
  return admins.map((admin) => admin.id)
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

export async function findUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      isPro: users.isPro,
    })
    .from(users)
    .orderBy(asc(users.email))
}

export async function updateUserAdmin(
  actingUserId: number,
  id: number,
  isAdmin: boolean,
) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (!adminIds.includes(actingUserId)) return false

    const [user] = await tx
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isPro: users.isPro,
      })
    return user ?? null
  })
}

export async function updateUserPro(
  actingUserId: number,
  id: number,
  isPro: boolean,
) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (!adminIds.includes(actingUserId)) return false

    const [user] = await tx
      .update(users)
      .set({ isPro })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isPro: users.isPro,
      })
    return user ?? null
  })
}

export async function createUser(
  email: string,
  passwordHash: string,
  legalNotices: readonly LegalNotice[],
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash })
      .returning()
    await tx.insert(legalDocumentEvents).values(
      legalNotices.map(({ document, version, action }) => ({
        userId: user.id,
        document,
        version,
        action,
      })),
    )
    return user
  })
}

export async function updatePassword(id: number, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

export async function getSettings(userId: number) {
  const [settings] = await db
    .select({
      locale: userSettings.locale,
      cuisinePrefs: userSettings.cuisinePrefs,
      dietaryRestrictions: userSettings.dietaryRestrictions,
      pantryStaples: userSettings.pantryStaples,
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)
  return settings ?? null
}

export async function saveSettings(
  userId: number,
  patch: Record<string, unknown>,
) {
  const [settings] = await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch })
    .returning()
  return settings
}

export async function getAccountExport(userId: number) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ email: users.email, isPro: users.isPro })
      .from(users)
      .where(eq(users.id, userId))
    const [settingsRow] = await tx
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
    const recipeRows = await tx
      .select({
        ...accountRecipeColumns,
        ingredients: sql<
          { name: string; qty: number | null; unit: string | null }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'name', ${ingredients.name},
              'qty', ${mealIngredients.qty}::float,
              'unit', ${mealIngredients.unit}
            ) order by ${mealIngredients.position}
          )
          from ${mealIngredients}
          inner join ${ingredients}
            on ${ingredients.id} = ${mealIngredients.ingredientId}
          where ${mealIngredients.mealId} = ${meals.id}
        ), '[]'::jsonb)`,
        translations: sql<
          {
            locale: string
            name: string | null
            description: string | null
            instructions: string | null
          }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'locale', ${mealTranslations.locale},
              'name', ${mealTranslations.name},
              'description', ${mealTranslations.description},
              'instructions', ${mealTranslations.instructions}
            ) order by ${mealTranslations.locale}
          )
          from ${mealTranslations}
          where ${mealTranslations.mealId} = ${meals.id}
        ), '[]'::jsonb)`,
      })
      .from(meals)
      .where(eq(meals.userId, userId))
    const planRows = await tx
      .select({
        ...accountPlanColumns,
        slots: sql<
          { date: string; mealType: string; mealId: number }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'date', ${weekSlots.date},
              'mealType', ${weekSlots.mealType},
              'mealId', ${weekSlots.mealId}
            ) order by ${weekSlots.date}, ${weekSlots.mealType}
          )
          from ${weekSlots}
          where ${weekSlots.planId} = ${plans.id}
        ), '[]'::jsonb)`,
        bonusItems: sql<
          Omit<typeof bonusItems.$inferSelect, 'planId'>[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ${bonusItems.id},
              'date', ${bonusItems.date},
              'name', ${bonusItems.name},
              'calories', ${bonusItems.calories},
              'proteinG', ${bonusItems.proteinG}::text,
              'carbsG', ${bonusItems.carbsG}::text,
              'fatG', ${bonusItems.fatG}::text,
              'fiberG', ${bonusItems.fiberG}::text,
              'sugarG', ${bonusItems.sugarG}::text,
              'saturatedFatG', ${bonusItems.saturatedFatG}::text,
              'saltG', ${bonusItems.saltG}::text
            ) order by ${bonusItems.date}, ${bonusItems.id}
          )
          from ${bonusItems}
          where ${bonusItems.planId} = ${plans.id}
        ), '[]'::jsonb)`,
        slotRepeats: sql<
          Omit<typeof slotRepeats.$inferSelect, 'planId'>[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'mealType', ${slotRepeats.mealType},
              'groupBreaks', ${slotRepeats.groupBreaks}
            ) order by ${slotRepeats.mealType}
          )
          from ${slotRepeats}
          where ${slotRepeats.planId} = ${plans.id}
        ), '[]'::jsonb)`,
      })
      .from(plans)
      .where(eq(plans.userId, userId))
    const [{ mealIds: favoriteMealIds }] = await tx
      .select({
        mealIds: sql<
          number[]
        >`coalesce(array_agg(${mealFavorites.mealId} order by ${mealFavorites.mealId}), array[]::integer[])`,
      })
      .from(mealFavorites)
      .where(eq(mealFavorites.userId, userId))
    const imports = await tx
      .select({
        id: recipeImports.id,
        recipe: recipeImports.recipe,
        status: recipeImports.status,
        mealId: recipeImports.mealId,
        createdAt: recipeImports.createdAt,
        reviewedAt: recipeImports.reviewedAt,
      })
      .from(recipeImports)
      .where(eq(recipeImports.submittedBy, userId))
    const legalEvents = await tx
      .select({
        document: legalDocumentEvents.document,
        version: legalDocumentEvents.version,
        action: legalDocumentEvents.action,
        occurredAt: legalDocumentEvents.occurredAt,
      })
      .from(legalDocumentEvents)
      .where(eq(legalDocumentEvents.userId, userId))

    const settings = settingsRow
      ? (({ userId: _userId, ...value }) => value)(settingsRow)
      : null
    return {
      version: 1,
      account: { email: account?.email, isPro: account?.isPro, settings },
      recipes: recipeRows,
      plans: planRows,
      favoriteMealIds,
      recipeImports: imports,
      legalDocumentEvents: legalEvents,
    }
  })
}

export async function deleteAccount(userId: number) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (adminIds.length === 1 && adminIds[0] === userId) return false
    await tx.delete(users).where(eq(users.id, userId))
    return true
  })
}
