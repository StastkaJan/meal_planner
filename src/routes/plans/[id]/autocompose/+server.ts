import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots, meals } from '$lib/schema';
import { DAYS, MEAL_TYPES, NUTRITION_TARGETS } from '$lib/types';
import type { RequestHandler } from './$types';

type Meal = { id: number; calories: number | null; tags: string[] };

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function _candidateMeals(allMeals: Meal[], budget: number): Meal[] {
  const fits = allMeals.filter(m => (m.calories ?? 0) <= budget * 1.3);
  return fits.length
    ? fits
    : [...allMeals].sort((a, b) => (a.calories ?? 0) - (b.calories ?? 0)).slice(0, 3);
}

// cuisinePrefs = OR match; dietaryRestrictions = AND match; falls back to allMeals if nothing passes
export function _filterByPrefs(allMeals: Meal[], cuisinePrefs: string[], dietaryRestrictions: string[]): Meal[] {
  let filtered = allMeals;
  if (cuisinePrefs.length) filtered = filtered.filter(m => m.tags.some(t => cuisinePrefs.includes(t)));
  if (dietaryRestrictions.length) filtered = filtered.filter(m => dietaryRestrictions.every(r => m.tags.includes(r)));
  return filtered.length ? filtered : allMeals; // ponytail: fallback keeps plan from stalling on untagged meals
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const planId = Number(params.id);
  const { week } = await request.json().catch(() => ({})) as { week?: string };
  const [plan] = await db.select({
    id: plans.id,
    weekStart: plans.weekStart,
    cuisinePrefs: plans.cuisinePrefs,
    dietaryRestrictions: plans.dietaryRestrictions,
  }).from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, locals.user!.id))).limit(1);
  if (!plan) error(404, 'Plan not found');

  const slotWeek = week ?? plan.weekStart;

  const [allMeals, existingSlots] = await Promise.all([
    db.select({ id: meals.id, calories: meals.calories, tags: meals.tags }).from(meals),
    db.select({ dayOfWeek: weekSlots.dayOfWeek, mealType: weekSlots.mealType, calories: meals.calories })
      .from(weekSlots)
      .leftJoin(meals, eq(weekSlots.mealId, meals.id))
      .where(and(eq(weekSlots.planId, planId), eq(weekSlots.week, slotWeek))),
  ]);

  if (!allMeals.length) return new Response(null, { status: 204 });

  const prefilteredMeals = _filterByPrefs(allMeals, plan.cuisinePrefs, plan.dietaryRestrictions);
  const filled = new Set(existingSlots.map(s => `${s.dayOfWeek}-${s.mealType}`));
  const toInsert = [];

  for (const day of DAYS) {
    const dayFilled = existingSlots.filter(s => s.dayOfWeek === day);
    let consumed = dayFilled.reduce((sum, s) => sum + (s.calories ?? 0), 0);
    const emptySlots = MEAL_TYPES.filter(mt => !filled.has(`${day}-${mt}`));
    let remaining = emptySlots.length;

    for (const mealType of emptySlots) {
      const budget = (NUTRITION_TARGETS.calories - consumed) / remaining;
      // ponytail: calories-only greedy; add macro tracking if needed
      const chosen = pick(_candidateMeals(prefilteredMeals, budget));
      toInsert.push({ planId, week: slotWeek, dayOfWeek: day, mealType, mealId: chosen.id });
      consumed += chosen.calories ?? 0;
      remaining--;
    }
  }

  if (toInsert.length) await db.insert(weekSlots).values(toInsert);

  return new Response(null, { status: 204 });
};
