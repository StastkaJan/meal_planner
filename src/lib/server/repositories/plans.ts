import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import { db } from '$lib/database'
import {
  plans,
  weekSlots,
  meals,
  bonusItems,
  mealIngredients,
  ingredients,
  slotRepeats,
  slotLeftovers,
  mealTranslations,
} from '$lib/database/schema'
import type { Plan } from '$lib/database/schema'
import type { SlotWithMeal, PlanDetail } from '$lib/types'
import { addDays, groupWindow } from '$lib/utils/date-time'
import type { Locale } from '$lib/i18n'

type OwnedPlan = Plan & { userId: number }

export async function listPlans(userId: number) {
  return db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(plans.id)
}

export async function createPlan(
  userId: number,
  values: {
    weekStart: string
    cuisinePrefs: string[]
    dietaryRestrictions: string[]
  },
) {
  const [plan] = await db
    .insert(plans)
    .values({ userId, ...values })
    .returning()
  return plan
}

export async function deletePlan(id: number) {
  await db.delete(plans).where(eq(plans.id, id))
}

export async function updatePlanPortions(id: number, portions: number) {
  const [plan] = await db
    .update(plans)
    .set({ portions })
    .where(eq(plans.id, id))
    .returning()
  return plan
}

export async function updatePlanMealSlots(id: number, mealSlots: string[]) {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .update(plans)
      .set({ mealSlots })
      .where(eq(plans.id, id))
      .returning()
    const disabled = notInArray(weekSlots.mealType, mealSlots)
    await tx.delete(weekSlots).where(and(eq(weekSlots.planId, id), disabled))
    await tx
      .delete(slotRepeats)
      .where(
        and(
          eq(slotRepeats.planId, id),
          notInArray(slotRepeats.mealType, mealSlots),
        ),
      )
    return plan
  })
}

export async function setSlotRepeat(
  planId: number,
  mealType: string,
  groupBreaks: boolean[] | null,
) {
  if (groupBreaks === null) {
    await db
      .delete(slotRepeats)
      .where(
        and(eq(slotRepeats.planId, planId), eq(slotRepeats.mealType, mealType)),
      )
    return
  }
  await db
    .insert(slotRepeats)
    .values({ planId, mealType, groupBreaks })
    .onConflictDoUpdate({
      target: [slotRepeats.planId, slotRepeats.mealType],
      set: { groupBreaks },
    })
}

export async function ownedPlan(
  id: number,
  userId: number,
): Promise<OwnedPlan | null> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .limit(1)
  return (plan as OwnedPlan | undefined) ?? null
}

export function inWeek(planId: number, week: string) {
  return and(
    eq(weekSlots.planId, planId),
    gte(weekSlots.date, week),
    lt(weekSlots.date, addDays(week, 7)),
  )
}

function bonusInWeek(planId: number, week: string) {
  return and(
    eq(bonusItems.planId, planId),
    gte(bonusItems.date, week),
    lt(bonusItems.date, addDays(week, 7)),
  )
}

export async function getPlanDetail(
  plan: Plan,
  week: string,
  locale: Locale = 'en',
): Promise<PlanDetail> {
  const [rows, bonus, repeats] = await Promise.all([
    db
      .select({
        planId: weekSlots.planId,
        date: weekSlots.date,
        mealType: weekSlots.mealType,
        mealId: weekSlots.mealId,
        mealName: sql<
          string | null
        >`coalesce(${mealTranslations.name}, ${meals.name})`,
        calories: meals.calories,
        proteinG: meals.proteinG,
        carbsG: meals.carbsG,
        fatG: meals.fatG,
        fiberG: meals.fiberG,
        sugarG: meals.sugarG,
        saturatedFatG: meals.saturatedFatG,
        saltG: meals.saltG,
        leftoverSourceDate: slotLeftovers.sourceDate,
        leftoverSourceMealType: slotLeftovers.sourceMealType,
      })
      .from(weekSlots)
      .leftJoin(meals, eq(weekSlots.mealId, meals.id))
      .leftJoin(
        mealTranslations,
        and(
          eq(mealTranslations.mealId, meals.id),
          eq(mealTranslations.locale, locale),
        ),
      )
      .leftJoin(
        slotLeftovers,
        and(
          eq(slotLeftovers.planId, weekSlots.planId),
          eq(slotLeftovers.date, weekSlots.date),
          eq(slotLeftovers.mealType, weekSlots.mealType),
        ),
      )
      .where(inWeek(plan.id, week)),
    db.select().from(bonusItems).where(bonusInWeek(plan.id, week)),
    getSlotRepeats(plan.id),
  ])

  return { ...plan, slots: rows as SlotWithMeal[], bonus, slotRepeats: repeats }
}

export async function addBonusItem(
  planId: number,
  date: string,
  fields: {
    name: string
    calories: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    fiberG: number | null
    sugarG: number | null
    saturatedFatG: number | null
    saltG: number | null
  },
) {
  const [row] = await db
    .insert(bonusItems)
    .values({
      planId,
      date,
      name: fields.name,
      calories: fields.calories,
      proteinG: fields.proteinG?.toString() ?? null,
      carbsG: fields.carbsG?.toString() ?? null,
      fatG: fields.fatG?.toString() ?? null,
      fiberG: fields.fiberG?.toString() ?? null,
      sugarG: fields.sugarG?.toString() ?? null,
      saturatedFatG: fields.saturatedFatG?.toString() ?? null,
      saltG: fields.saltG?.toString() ?? null,
    })
    .returning()
  return row
}

export async function deleteBonusItem(planId: number, bonusId: number) {
  await db
    .delete(bonusItems)
    .where(and(eq(bonusItems.id, bonusId), eq(bonusItems.planId, planId)))
}

async function getGroupBreaks(
  planId: number,
  mealType: string,
): Promise<boolean[] | null> {
  const [row] = await db
    .select({ groupBreaks: slotRepeats.groupBreaks })
    .from(slotRepeats)
    .where(
      and(eq(slotRepeats.planId, planId), eq(slotRepeats.mealType, mealType)),
    )
    .limit(1)
  return row?.groupBreaks ?? null
}

export async function upsertSlot(
  planId: number,
  date: string,
  mealType: string,
  mealId: number | null,
) {
  const groupBreaks = await getGroupBreaks(planId, mealType)
  const dates = groupBreaks ? groupWindow(date, groupBreaks) : [date]

  await db
    .delete(slotLeftovers)
    .where(
      and(
        eq(slotLeftovers.planId, planId),
        or(
          and(
            inArray(slotLeftovers.date, dates),
            eq(slotLeftovers.mealType, mealType),
          ),
          and(
            inArray(slotLeftovers.sourceDate, dates),
            eq(slotLeftovers.sourceMealType, mealType),
          ),
        ),
      ),
    )

  if (mealId === null) {
    await db
      .delete(weekSlots)
      .where(
        and(
          eq(weekSlots.planId, planId),
          inArray(weekSlots.date, dates),
          eq(weekSlots.mealType, mealType),
        ),
      )
    return
  }

  await db
    .insert(weekSlots)
    .values(dates.map((date) => ({ planId, date, mealType, mealId })))
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
      set: { mealId },
    })
}

export async function getSlotMeal(
  planId: number,
  date: string,
  mealType: string,
) {
  const [slot] = await db
    .select({ mealId: weekSlots.mealId })
    .from(weekSlots)
    .where(
      and(
        eq(weekSlots.planId, planId),
        eq(weekSlots.date, date),
        eq(weekSlots.mealType, mealType),
      ),
    )
    .limit(1)
  return slot ?? null
}

export async function setSlotLeftover(
  planId: number,
  date: string,
  mealType: string,
  source: { date: string; mealType: string } | null,
) {
  const target = and(
    eq(slotLeftovers.planId, planId),
    eq(slotLeftovers.date, date),
    eq(slotLeftovers.mealType, mealType),
  )
  if (!source) {
    await db.delete(slotLeftovers).where(target)
    return
  }
  await db
    .insert(slotLeftovers)
    .values({
      planId,
      date,
      mealType,
      sourceDate: source.date,
      sourceMealType: source.mealType,
    })
    .onConflictDoUpdate({
      target: [
        slotLeftovers.planId,
        slotLeftovers.date,
        slotLeftovers.mealType,
      ],
      set: {
        sourceDate: source.date,
        sourceMealType: source.mealType,
      },
    })
}

export async function copyWeek(planId: number, from: string, to: string) {
  const [rows, leftovers] = await Promise.all([
    db
      .select({
        date: weekSlots.date,
        mealType: weekSlots.mealType,
        mealId: weekSlots.mealId,
      })
      .from(weekSlots)
      .where(inWeek(planId, from)),
    db
      .select({
        date: slotLeftovers.date,
        mealType: slotLeftovers.mealType,
        sourceDate: slotLeftovers.sourceDate,
        sourceMealType: slotLeftovers.sourceMealType,
      })
      .from(slotLeftovers)
      .where(
        and(
          eq(slotLeftovers.planId, planId),
          gte(slotLeftovers.date, from),
          lt(slotLeftovers.date, addDays(from, 7)),
        ),
      ),
  ])
  if (!rows.length) return

  const shift = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
  await db
    .delete(slotLeftovers)
    .where(
      and(
        eq(slotLeftovers.planId, planId),
        or(
          and(
            gte(slotLeftovers.date, to),
            lt(slotLeftovers.date, addDays(to, 7)),
          ),
          and(
            gte(slotLeftovers.sourceDate, to),
            lt(slotLeftovers.sourceDate, addDays(to, 7)),
          ),
        ),
      ),
    )
  await db
    .insert(weekSlots)
    .values(
      rows.map((row) => ({
        planId,
        date: addDays(row.date, shift),
        mealType: row.mealType,
        mealId: row.mealId,
      })),
    )
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
      set: { mealId: sql`excluded.meal_id` },
    })

  if (leftovers.length)
    await db
      .insert(slotLeftovers)
      .values(
        leftovers.map((row) => ({
          planId,
          date: addDays(row.date, shift),
          mealType: row.mealType,
          sourceDate: addDays(row.sourceDate, shift),
          sourceMealType: row.sourceMealType,
        })),
      )
      .onConflictDoUpdate({
        target: [
          slotLeftovers.planId,
          slotLeftovers.date,
          slotLeftovers.mealType,
        ],
        set: {
          sourceDate: sql`excluded.source_date`,
          sourceMealType: sql`excluded.source_meal_type`,
        },
      })
}

export async function getShoppingList(
  planId: number,
  week: string,
  pantryStaples: string[] = [],
) {
  const rows = await db
    .select({
      name: ingredients.name,
      unit: mealIngredients.unit,
      qty: sql<
        string | null
      >`case when bool_or(${mealIngredients.qty} is null) then null else sum(${mealIngredients.qty} * ${plans.portions} / greatest(${meals.servings}, 1)) end`,
      count: sql<number>`sum(${plans.portions}::numeric / greatest(${meals.servings}, 1))::float`,
    })
    .from(weekSlots)
    .innerJoin(plans, eq(weekSlots.planId, plans.id))
    .innerJoin(meals, eq(weekSlots.mealId, meals.id))
    .innerJoin(mealIngredients, eq(mealIngredients.mealId, meals.id))
    .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .leftJoin(
      slotLeftovers,
      and(
        eq(slotLeftovers.planId, weekSlots.planId),
        eq(slotLeftovers.date, weekSlots.date),
        eq(slotLeftovers.mealType, weekSlots.mealType),
      ),
    )
    .where(
      and(
        inWeek(planId, week),
        isNull(slotLeftovers.planId),
        pantryStaples.length
          ? notInArray(
              sql`lower(${ingredients.name})`,
              pantryStaples.map((name) => name.toLocaleLowerCase()),
            )
          : undefined,
      ),
    )
    .groupBy(ingredients.name, mealIngredients.unit)
    .orderBy(ingredients.name)

  return rows.map((row) => ({
    ...row,
    qty: row.qty !== null ? Number(row.qty) : null,
  }))
}

export async function getWeekSlotsWithNutrition(planId: number, week: string) {
  return db
    .select({
      date: weekSlots.date,
      mealType: weekSlots.mealType,
      mealId: weekSlots.mealId,
      calories: meals.calories,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(weekSlots)
    .leftJoin(meals, eq(weekSlots.mealId, meals.id))
    .where(inWeek(planId, week))
    .orderBy(weekSlots.date)
}

export async function getDaySlotsWithNutrition(planId: number, date: string) {
  return db
    .select({
      mealType: weekSlots.mealType,
      mealId: weekSlots.mealId,
      calories: meals.calories,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(weekSlots)
    .leftJoin(meals, eq(weekSlots.mealId, meals.id))
    .where(and(eq(weekSlots.planId, planId), eq(weekSlots.date, date)))
}

export async function getWeekBonusNutrition(planId: number, week: string) {
  return db
    .select({
      date: bonusItems.date,
      calories: bonusItems.calories,
      proteinG: bonusItems.proteinG,
      carbsG: bonusItems.carbsG,
      fatG: bonusItems.fatG,
    })
    .from(bonusItems)
    .where(bonusInWeek(planId, week))
}

export async function getDayBonusNutrition(planId: number, date: string) {
  return db
    .select({
      calories: bonusItems.calories,
      proteinG: bonusItems.proteinG,
      carbsG: bonusItems.carbsG,
      fatG: bonusItems.fatG,
    })
    .from(bonusItems)
    .where(and(eq(bonusItems.planId, planId), eq(bonusItems.date, date)))
}

export async function getSlotRepeats(planId: number) {
  return db
    .select({
      mealType: slotRepeats.mealType,
      groupBreaks: slotRepeats.groupBreaks,
    })
    .from(slotRepeats)
    .where(eq(slotRepeats.planId, planId))
}

export async function getWeekMealIds(planId: number, week: string) {
  return db
    .select({ mealId: weekSlots.mealId })
    .from(weekSlots)
    .where(inWeek(planId, week))
}

export async function insertSlots(
  rows: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[],
) {
  if (rows.length) await db.insert(weekSlots).values(rows).onConflictDoNothing()
}
