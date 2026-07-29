import { error } from '@sveltejs/kit'
import { and, eq, gte, lt, sql, inArray } from 'drizzle-orm'
import { db } from '$lib/db'
import {
  plans,
  weekSlots,
  meals,
  bonusItems,
  mealIngredients,
  ingredients,
  slotRepeats,
} from '$lib/schema'
import type { Plan } from '$lib/schema'
import { DAYS, MEAL_TYPES } from '$lib/constants'
import type { SlotWithMeal, PlanDetail, NutritionTargets } from '$lib/types'
import { requireUser } from '$lib/auth'
import { addDays, groupWindow, mondayOf } from '$lib/date'
import { visibleToUser, favoriteMealIds } from './meals'
import { getSettings } from './accounts'
import {
  fillDaySlots,
  filterByPrefs,
  sumNutrition,
} from '../domain/plan-generation'
import type { CandidateMeal } from '../domain/plan-generation'

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
    name: string
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

export async function updatePlan(
  id: number,
  values: {
    name?: string
    cuisinePrefs?: string[]
    dietaryRestrictions?: string[]
  },
) {
  const [plan] = await db
    .update(plans)
    .set(values)
    .where(eq(plans.id, id))
    .returning()
  return plan
}

export async function deletePlan(id: number) {
  await db.delete(plans).where(eq(plans.id, id))
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
): Promise<OwnedPlan> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .limit(1)
  if (!plan) error(404, 'Plan not found')
  return plan as OwnedPlan
}

export async function requireOwnedPlan(
  locals: App.Locals,
  id: number | string,
): Promise<OwnedPlan> {
  const user = requireUser(locals)
  return ownedPlan(Number(id), user.id)
}

export async function getUserSettings(userId: number) {
  return getSettings(userId)
}

export function validDateStr(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) error(400, 'Invalid date')
  return d
}

// slots whose date falls in the Mon–Sun window starting at `week` (a Monday)
export function inWeek(planId: number, week: string) {
  return and(
    eq(weekSlots.planId, planId),
    gte(weekSlots.date, week),
    lt(weekSlots.date, addDays(week, 7)),
  )
}

// same Mon–Sun window as inWeek, for the bonusItems table
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
): Promise<PlanDetail> {
  const [rows, bonus, repeats] = await Promise.all([
    db
      .select({
        planId: weekSlots.planId,
        date: weekSlots.date,
        mealType: weekSlots.mealType,
        mealId: weekSlots.mealId,
        mealName: meals.name,
        calories: meals.calories,
        proteinG: meals.proteinG,
        carbsG: meals.carbsG,
        fatG: meals.fatG,
      })
      .from(weekSlots)
      .leftJoin(meals, eq(weekSlots.mealId, meals.id))
      .where(inWeek(plan.id, week)),
    db.select().from(bonusItems).where(bonusInWeek(plan.id, week)),
    db
      .select({
        mealType: slotRepeats.mealType,
        groupBreaks: slotRepeats.groupBreaks,
      })
      .from(slotRepeats)
      .where(eq(slotRepeats.planId, plan.id)),
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
  },
) {
  const [row] = await db
    .insert(bonusItems)
    .values({
      planId,
      date,
      name: fields.name,
      calories: fields.calories,
      // numeric columns are string-typed in drizzle
      proteinG: fields.proteinG?.toString() ?? null,
      carbsG: fields.carbsG?.toString() ?? null,
      fatG: fields.fatG?.toString() ?? null,
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

// Setting or clearing a slot that belongs to a repeat group applies to every date in that
// group, not just the one given (see groupWindow in $lib/date) — this is how a manual edit
// "repeats" across the days the user configured for this meal type.
export async function upsertSlot(
  planId: number,
  date: string,
  mealType: string,
  mealId: number | null,
) {
  const groupBreaks = await getGroupBreaks(planId, mealType)
  const dates = groupBreaks ? groupWindow(date, groupBreaks) : [date]

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
    .values(dates.map((d) => ({ planId, date: d, mealType, mealId })))
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
      set: { mealId },
    })
}

// Copy every slot from one week into another (overwriting the target week's slots).
// Each slot's date shifts by the same offset between the two Mondays.
export async function copyWeek(planId: number, from: string, to: string) {
  const rows = await db
    .select({
      date: weekSlots.date,
      mealType: weekSlots.mealType,
      mealId: weekSlots.mealId,
    })
    .from(weekSlots)
    .where(inWeek(planId, from))
  if (!rows.length) return

  const shift = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
  await db
    .insert(weekSlots)
    .values(
      rows.map((r) => ({
        planId,
        date: addDays(r.date, shift),
        mealType: r.mealType,
        mealId: r.mealId,
      })),
    )
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
      set: { mealId: sql`excluded.meal_id` },
    })
}

// Sums a week's structured meal-ingredient links into one deduped shopping list, grouped by
// (name, unit) in SQL — two ingredients with the same name but different units (e.g. "tbsp
// olive oil" vs "ml olive oil") stay separate line items rather than being summed together
// incorrectly. count = how many meal-ingredient rows share this name+unit; qty = their summed
// quantity, or null if any of them lacked one (e.g. "salt and pepper") — a plain count then.
export async function getShoppingList(planId: number, week: string) {
  const rows = await db
    .select({
      name: ingredients.name,
      unit: mealIngredients.unit,
      qty: sql<
        string | null
      >`case when bool_or(${mealIngredients.qty} is null) then null else sum(${mealIngredients.qty}) end`,
      count: sql<number>`count(*)::int`,
    })
    .from(weekSlots)
    .innerJoin(meals, eq(weekSlots.mealId, meals.id))
    .innerJoin(mealIngredients, eq(mealIngredients.mealId, meals.id))
    .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(inWeek(planId, week))
    .groupBy(ingredients.name, mealIngredients.unit)
    .orderBy(ingredients.name)

  return rows.map((r) => ({
    ...r,
    qty: r.qty !== null ? Number(r.qty) : null,
  }))
}

const toNum = (v: unknown) => Number(v ?? 0) || 0 // numeric columns come back as strings/null

type PlanPrefs = {
  id: number
  cuisinePrefs: string[]
  dietaryRestrictions: string[]
}

// Returns the number of slots filled, so callers can tell "nothing to fill" (already full,
// or no favourites when favoritesOnly) from an unremarkable no-op.
export async function autocomposeSlots(
  plan: PlanPrefs,
  week: string,
  targets: NutritionTargets,
  ownerId: number,
  favoritesOnly = false,
): Promise<number> {
  const [allMealsRaw, existingSlots, favIds, weekBonus, repeatRows] =
    await Promise.all([
      db
        .select({
          id: meals.id,
          calories: meals.calories,
          tags: meals.tags,
          allowedSlots: meals.allowedSlots,
          proteinG: meals.proteinG,
          carbsG: meals.carbsG,
          fatG: meals.fatG,
        })
        .from(meals)
        .where(visibleToUser(ownerId)),
      db
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
        .where(inWeek(plan.id, week))
        .orderBy(weekSlots.date),
      favoritesOnly ? favoriteMealIds(ownerId) : Promise.resolve(null),
      db
        .select({
          date: bonusItems.date,
          calories: bonusItems.calories,
          proteinG: bonusItems.proteinG,
          carbsG: bonusItems.carbsG,
          fatG: bonusItems.fatG,
        })
        .from(bonusItems)
        .where(bonusInWeek(plan.id, week)),
      db
        .select({
          mealType: slotRepeats.mealType,
          groupBreaks: slotRepeats.groupBreaks,
        })
        .from(slotRepeats)
        .where(eq(slotRepeats.planId, plan.id)),
    ])

  if (!allMealsRaw.length) return 0

  let allMeals: CandidateMeal[] = allMealsRaw.map((m) => ({
    id: m.id,
    calories: m.calories,
    tags: m.tags,
    allowedSlots: m.allowedSlots,
    proteinG: toNum(m.proteinG),
    carbsG: toNum(m.carbsG),
    fatG: toNum(m.fatG),
  }))
  const visibleMealsById = new Map(allMeals.map((m) => [m.id, m]))
  if (favIds) allMeals = allMeals.filter((m) => favIds.has(m.id))

  const prefilteredMeals = filterByPrefs(
    allMeals,
    plan.cuisinePrefs,
    plan.dietaryRestrictions,
  )
  const filled = new Set(existingSlots.map((s) => `${s.date}-${s.mealType}`))
  // seed with meals already on the plan this week so we don't duplicate them
  const used = new Set<number>(
    existingSlots
      .map((s) => s.mealId)
      .filter((id): id is number => id !== null),
  )

  // A repeat group never crosses a week boundary (see groupWindow), so seeding the
  // group→meal map from this week's existingSlots is sufficient — no need to look outside it.
  const breaksByType = new Map(
    repeatRows.map((r) => [r.mealType, r.groupBreaks]),
  )
  const groupKey = (date: string, mealType: string) => {
    const breaks = breaksByType.get(mealType)
    return breaks ? `${mealType}|${groupWindow(date, breaks)[0]}` : null
  }
  const groupMealId = new Map<string, number>()
  for (const s of existingSlots) {
    if (s.mealId === null) continue
    const key = groupKey(s.date, s.mealType)
    if (key && !groupMealId.has(key)) groupMealId.set(key, s.mealId)
  }
  const toInsert: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[] = []

  for (const day of DAYS) {
    const date = addDays(week, day)
    const dayFilled = existingSlots.filter((s) => s.date === date)
    const dayBonus = weekBonus.filter((b) => b.date === date)
    const consumed = sumNutrition([...dayFilled, ...dayBonus])
    const emptySlots = MEAL_TYPES.filter((mt) => !filled.has(`${date}-${mt}`))

    // Slots whose meal type already has a chosen meal for this group (from an existing
    // slot elsewhere in the group, or a fresh pick made on an earlier day of this same
    // run) reuse that meal directly rather than going through fillDaySlots.
    const freshSlots: string[] = []
    for (const mealType of emptySlots) {
      const key = groupKey(date, mealType)
      const groupChosen = key
        ? visibleMealsById.get(groupMealId.get(key) ?? -1)
        : undefined
      if (!groupChosen) {
        freshSlots.push(mealType)
        continue
      }
      used.add(groupChosen.id)
      toInsert.push({ planId: plan.id, date, mealType, mealId: groupChosen.id })
      consumed.calories += groupChosen.calories ?? 0
      consumed.proteinG += groupChosen.proteinG ?? 0
      consumed.carbsG += groupChosen.carbsG ?? 0
      consumed.fatG += groupChosen.fatG ?? 0
    }

    const freshlyFilled = fillDaySlots(
      plan.id,
      date,
      freshSlots,
      prefilteredMeals,
      targets,
      consumed,
      used,
    )
    for (const row of freshlyFilled) {
      const key = groupKey(row.date, row.mealType)
      if (key) groupMealId.set(key, row.mealId)
    }
    toInsert.push(...freshlyFilled)
  }

  if (toInsert.length)
    await db.insert(weekSlots).values(toInsert).onConflictDoNothing()
  return toInsert.length
}

// Re-fills one day's empty slots to fit whatever budget is left after that day's already
// filled slots and logged bonus items (e.g. an off-plan lunch) — the "recalculate" a user
// reaches for after going off-plan earlier in the day. Returns the number of slots filled,
// so callers can tell "nothing to fill" (day already full) from an unremarkable no-op.
export async function recalcDaySlots(
  plan: PlanPrefs,
  date: string,
  targets: NutritionTargets,
  ownerId: number,
): Promise<number> {
  // Cheap, single-table check first — most "Recalculate" clicks land on an already-full
  // day, so this avoids the full meal-library fetch below when there's nothing to do.
  const daySlots = await db
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
    .where(and(eq(weekSlots.planId, plan.id), eq(weekSlots.date, date)))

  const filled = new Set(daySlots.map((s) => s.mealType))
  const emptySlots = MEAL_TYPES.filter((mt) => !filled.has(mt))
  if (!emptySlots.length) return 0

  const [allMealsRaw, dayBonus, weekSlotsForDedup] = await Promise.all([
    db
      .select({
        id: meals.id,
        calories: meals.calories,
        tags: meals.tags,
        allowedSlots: meals.allowedSlots,
        proteinG: meals.proteinG,
        carbsG: meals.carbsG,
        fatG: meals.fatG,
      })
      .from(meals)
      .where(visibleToUser(ownerId)),
    db
      .select({
        calories: bonusItems.calories,
        proteinG: bonusItems.proteinG,
        carbsG: bonusItems.carbsG,
        fatG: bonusItems.fatG,
      })
      .from(bonusItems)
      .where(and(eq(bonusItems.planId, plan.id), eq(bonusItems.date, date))),
    // whole week (not just this day) so recalculate doesn't duplicate a meal already
    // used elsewhere that week — matching autocomposeSlots's variety guarantee
    db
      .select({ mealId: weekSlots.mealId })
      .from(weekSlots)
      .where(inWeek(plan.id, mondayOf(date))),
  ])

  if (!allMealsRaw.length) return 0

  const allMeals: CandidateMeal[] = allMealsRaw.map((m) => ({
    id: m.id,
    calories: m.calories,
    tags: m.tags,
    allowedSlots: m.allowedSlots,
    proteinG: toNum(m.proteinG),
    carbsG: toNum(m.carbsG),
    fatG: toNum(m.fatG),
  }))
  const prefilteredMeals = filterByPrefs(
    allMeals,
    plan.cuisinePrefs,
    plan.dietaryRestrictions,
  )

  const used = new Set<number>(
    weekSlotsForDedup
      .map((s) => s.mealId)
      .filter((id): id is number => id !== null),
  )
  const consumed = sumNutrition([...daySlots, ...dayBonus])

  const toInsert = fillDaySlots(
    plan.id,
    date,
    emptySlots,
    prefilteredMeals,
    targets,
    consumed,
    used,
  )
  if (toInsert.length)
    await db.insert(weekSlots).values(toInsert).onConflictDoNothing()
  return toInsert.length
}
