import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots, meals } from '$lib/schema';
import type { Plan } from '$lib/schema';
import { DAYS, MEAL_TYPES, NUTRITION_TARGETS } from '$lib/types';
import type { SlotWithMeal, PlanDetail } from '$lib/types';

export async function ownedPlan(id: number, userId: number): Promise<Plan> {
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)));
  if (!plan) error(404, 'Plan not found');
  return plan;
}

export function validWeek(w: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) error(400, 'Invalid week');
  return w;
}

export async function getPlanDetail(plan: Plan, week: string): Promise<PlanDetail> {
  const rows = await db
    .select({
      planId:    weekSlots.planId,
      week:      weekSlots.week,
      dayOfWeek: weekSlots.dayOfWeek,
      mealType:  weekSlots.mealType,
      mealId:    weekSlots.mealId,
      mealName:  meals.name,
      calories:  meals.calories,
      proteinG:  meals.proteinG,
      carbsG:    meals.carbsG,
      fatG:      meals.fatG,
    })
    .from(weekSlots)
    .leftJoin(meals, eq(weekSlots.mealId, meals.id))
    .where(and(eq(weekSlots.planId, plan.id), eq(weekSlots.week, week)));

  return { ...plan, slots: rows as SlotWithMeal[] };
}

export async function upsertSlot(planId: number, week: string, dayOfWeek: number, mealType: string, mealId: number | null) {
  if (mealId === null) {
    await db.delete(weekSlots).where(
      and(eq(weekSlots.planId, planId), eq(weekSlots.week, week), eq(weekSlots.dayOfWeek, dayOfWeek), eq(weekSlots.mealType, mealType))
    );
    return;
  }

  await db.insert(weekSlots)
    .values({ planId, week, dayOfWeek, mealType, mealId })
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.week, weekSlots.dayOfWeek, weekSlots.mealType],
      set: { mealId }
    });
}

type CandidateMeal = { id: number; calories: number | null; tags: string[] };

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function candidateMeals(allMeals: CandidateMeal[], budget: number): CandidateMeal[] {
  const fits = allMeals.filter(m => (m.calories ?? 0) <= budget * 1.3);
  return fits.length
    ? fits
    : [...allMeals].sort((a, b) => (a.calories ?? 0) - (b.calories ?? 0)).slice(0, 3);
}

// cuisinePrefs = OR match; dietaryRestrictions = AND match; falls back to allMeals if nothing passes
export function filterByPrefs(allMeals: CandidateMeal[], cuisinePrefs: string[], dietaryRestrictions: string[]): CandidateMeal[] {
  let filtered = allMeals;
  if (cuisinePrefs.length) filtered = filtered.filter(m => m.tags.some(t => cuisinePrefs.includes(t)));
  if (dietaryRestrictions.length) filtered = filtered.filter(m => dietaryRestrictions.every(r => m.tags.includes(r)));
  return filtered.length ? filtered : allMeals; // ponytail: fallback keeps plan from stalling on untagged meals
}

type PlanPrefs = { id: number; cuisinePrefs: string[]; dietaryRestrictions: string[] };

export async function autocomposeSlots(plan: PlanPrefs, week: string) {
  const [allMeals, existingSlots] = await Promise.all([
    db.select({ id: meals.id, calories: meals.calories, tags: meals.tags }).from(meals),
    db.select({ dayOfWeek: weekSlots.dayOfWeek, mealType: weekSlots.mealType, calories: meals.calories })
      .from(weekSlots)
      .leftJoin(meals, eq(weekSlots.mealId, meals.id))
      .where(and(eq(weekSlots.planId, plan.id), eq(weekSlots.week, week))),
  ]);

  if (!allMeals.length) return;

  const prefilteredMeals = filterByPrefs(allMeals, plan.cuisinePrefs, plan.dietaryRestrictions);
  const filled = new Set(existingSlots.map(s => `${s.dayOfWeek}-${s.mealType}`));
  const toInsert: { planId: number; week: string; dayOfWeek: number; mealType: string; mealId: number }[] = [];

  for (const day of DAYS) {
    const dayFilled = existingSlots.filter(s => s.dayOfWeek === day);
    let consumed = dayFilled.reduce((sum, s) => sum + (s.calories ?? 0), 0);
    const emptySlots = MEAL_TYPES.filter(mt => !filled.has(`${day}-${mt}`));
    let remaining = emptySlots.length;

    for (const mealType of emptySlots) {
      const budget = (NUTRITION_TARGETS.calories - consumed) / remaining;
      // ponytail: calories-only greedy; add macro tracking if needed
      const chosen = pick(candidateMeals(prefilteredMeals, budget));
      toInsert.push({ planId: plan.id, week, dayOfWeek: day, mealType, mealId: chosen.id });
      consumed += chosen.calories ?? 0;
      remaining--;
    }
  }

  if (toInsert.length) await db.insert(weekSlots).values(toInsert);
}
