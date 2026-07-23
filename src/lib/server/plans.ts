import { error } from '@sveltejs/kit'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '$lib/db'
import { plans, weekSlots, meals, userSettings } from '$lib/schema'
import type { Plan } from '$lib/schema'
import { DAYS, MEAL_TYPES, mealFitsSlot } from '$lib/constants'
import type { SlotWithMeal, PlanDetail, NutritionTargets } from '$lib/types'
import { requireUser } from '$lib/auth'
import { addDays } from '$lib/date'
import { visibleToUser, favoriteMealIds } from './meals'

export async function ownedPlan(id: number, userId: number): Promise<Plan> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .limit(1)
  if (!plan) error(404, 'Plan not found')
  return plan
}

export async function requireOwnedPlan(
  locals: App.Locals,
  id: number | string,
): Promise<Plan> {
  const user = requireUser(locals)
  return ownedPlan(Number(id), user.id)
}

export async function getUserSettings(userId: number) {
  const [u] = await db
    .select({
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)
  return u ?? null
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

export async function getPlanDetail(
  plan: Plan,
  week: string,
): Promise<PlanDetail> {
  const rows = await db
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
    .where(inWeek(plan.id, week))

  return { ...plan, slots: rows as SlotWithMeal[] }
}

export async function upsertSlot(
  planId: number,
  date: string,
  mealType: string,
  mealId: number | null,
) {
  if (mealId === null) {
    await db
      .delete(weekSlots)
      .where(
        and(
          eq(weekSlots.planId, planId),
          eq(weekSlots.date, date),
          eq(weekSlots.mealType, mealType),
        ),
      )
    return
  }

  await db
    .insert(weekSlots)
    .values({ planId, date, mealType, mealId })
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

// Sums each week's structured meal-ingredient links (mealIngredients.qty, joined via
// ingredients.name — see src/lib/server/meals.ts for how those get populated from a meal's
// free-text ingredient lines) into one deduped shopping list. count = how many meal-ingredient
// rows share this name; qty = their summed quantity, or null if any of them lacked one
// (e.g. "salt and pepper" has no leading number) — falls back to a plain count in that case.
export function sumIngredients(
  rows: { name: string; qty: string | null }[],
): { name: string; count: number; qty: number | null }[] {
  const map = new Map<
    string,
    { name: string; count: number; qty: number | null }
  >()
  for (const { name, qty: qtyStr } of rows) {
    const qty = qtyStr === null ? null : Number(qtyStr)
    const key = name.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count++
      existing.qty =
        qty !== null && existing.qty !== null ? existing.qty + qty : null
    } else {
      map.set(key, { name, count: 1, qty })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

type CandidateMeal = {
  id: number
  calories: number | null
  tags: string[]
  allowedSlots: string[]
  proteinG?: number
  carbsG?: number
  fatG?: number
}
const toNum = (v: unknown) => Number(v ?? 0) || 0 // numeric columns come back as strings/null

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Prefer a meal not already used this week; fall back to the full list once every
// candidate has been used, so a small library never stalls.
export function pickUnused(
  candidates: CandidateMeal[],
  used: Set<number>,
): CandidateMeal {
  const fresh = candidates.filter((m) => !used.has(m.id))
  return pick(fresh.length ? fresh : candidates)
}

export function candidateMeals(
  allMeals: CandidateMeal[],
  budget: number,
): CandidateMeal[] {
  const fits = allMeals.filter((m) => (m.calories ?? 0) <= budget * 1.3)
  return fits.length
    ? fits
    : [...allMeals]
        .sort((a, b) => (a.calories ?? 0) - (b.calories ?? 0))
        .slice(0, 3)
}

export type MacroBudget = { proteinG: number; carbsG: number; fatG: number }

// Sum of relative deviations from the slot's macro budget; 0 = perfect fit, higher = worse.
export function macroDistance(m: CandidateMeal, b: MacroBudget): number {
  const rel = (v: number, t: number) => (t > 0 ? Math.abs(v - t) / t : 0)
  return (
    rel(m.proteinG ?? 0, b.proteinG) +
    rel(m.carbsG ?? 0, b.carbsG) +
    rel(m.fatG ?? 0, b.fatG)
  )
}

// Among (already calorie-fitting) candidates, keep the K closest to the macro budget, so the
// random pickUnused still has variety instead of always locking onto the single best fit.
export function rankByMacros(
  candidates: CandidateMeal[],
  budget: MacroBudget,
  k = 3,
): CandidateMeal[] {
  return [...candidates]
    .sort((a, b) => macroDistance(a, budget) - macroDistance(b, budget))
    .slice(0, Math.max(1, k))
}

// cuisinePrefs = OR match; dietaryRestrictions = AND match; falls back to allMeals if nothing passes
export function filterByPrefs(
  allMeals: CandidateMeal[],
  cuisinePrefs: string[],
  dietaryRestrictions: string[],
): CandidateMeal[] {
  let filtered = allMeals
  if (cuisinePrefs.length)
    filtered = filtered.filter((m) =>
      m.tags.some((t) => cuisinePrefs.includes(t)),
    )
  if (dietaryRestrictions.length)
    filtered = filtered.filter((m) =>
      dietaryRestrictions.every((r) => m.tags.includes(r)),
    )
  return filtered.length ? filtered : allMeals // ponytail: fallback keeps plan from stalling on untagged meals
}

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
  const [allMealsRaw, existingSlots, favIds] = await Promise.all([
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
      .where(inWeek(plan.id, week)),
    favoritesOnly ? favoriteMealIds(ownerId) : Promise.resolve(null),
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
  if (favIds) allMeals = allMeals.filter((m) => favIds.has(m.id))
  if (!allMeals.length) return 0

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
  const toInsert: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[] = []

  for (const day of DAYS) {
    const date = addDays(week, day)
    const dayFilled = existingSlots.filter((s) => s.date === date)
    const consumed = {
      calories: dayFilled.reduce((sum, s) => sum + (s.calories ?? 0), 0),
      proteinG: dayFilled.reduce((sum, s) => sum + toNum(s.proteinG), 0),
      carbsG: dayFilled.reduce((sum, s) => sum + toNum(s.carbsG), 0),
      fatG: dayFilled.reduce((sum, s) => sum + toNum(s.fatG), 0),
    }
    const emptySlots = MEAL_TYPES.filter((mt) => !filled.has(`${date}-${mt}`))
    let remaining = emptySlots.length

    for (const mealType of emptySlots) {
      const slotMeals = prefilteredMeals.filter((m) =>
        mealFitsSlot(m.allowedSlots, mealType),
      )
      if (!slotMeals.length) {
        remaining--
        continue
      }
      // calorie ceiling first, then prefer meals whose macros land closest to the remaining budget
      const fits = candidateMeals(
        slotMeals,
        (targets.calories - consumed.calories) / remaining,
      )
      const macroBudget = {
        proteinG: (targets.proteinG - consumed.proteinG) / remaining,
        carbsG: (targets.carbsG - consumed.carbsG) / remaining,
        fatG: (targets.fatG - consumed.fatG) / remaining,
      }
      const chosen = pickUnused(rankByMacros(fits, macroBudget), used)
      used.add(chosen.id)
      toInsert.push({
        planId: plan.id,
        date,
        mealType,
        mealId: chosen.id,
      })
      consumed.calories += chosen.calories ?? 0
      consumed.proteinG += chosen.proteinG ?? 0
      consumed.carbsG += chosen.carbsG ?? 0
      consumed.fatG += chosen.fatG ?? 0
      remaining--
    }
  }

  if (toInsert.length) await db.insert(weekSlots).values(toInsert)
  return toInsert.length
}
