import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots, meals } from '$lib/schema';
import { DAYS, MEAL_TYPES, NUTRITION_TARGETS } from '$lib/types';
import type { RequestHandler } from './$types';

type Meal = { id: number; calories: number | null };

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function candidateMeals(allMeals: Meal[], budget: number): Meal[] {
  const fits = allMeals.filter(m => (m.calories ?? 0) <= budget * 1.3);
  return fits.length
    ? fits
    : [...allMeals].sort((a, b) => (a.calories ?? 0) - (b.calories ?? 0)).slice(0, 3);
}

export const POST: RequestHandler = async ({ params, locals }) => {
  const planId = Number(params.id);
  const [plan] = await db.select({ id: plans.id }).from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, locals.user!.id))).limit(1);
  if (!plan) error(404, 'Plan not found');

  const [allMeals, existingSlots] = await Promise.all([
    db.select({ id: meals.id, calories: meals.calories }).from(meals),
    db.select({ dayOfWeek: weekSlots.dayOfWeek, mealType: weekSlots.mealType, calories: meals.calories })
      .from(weekSlots)
      .leftJoin(meals, eq(weekSlots.mealId, meals.id))
      .where(eq(weekSlots.planId, planId)),
  ]);

  if (!allMeals.length) return new Response(null, { status: 204 });

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
      const chosen = pick(candidateMeals(allMeals, budget));
      toInsert.push({ planId, dayOfWeek: day, mealType, mealId: chosen.id });
      consumed += chosen.calories ?? 0;
      remaining--;
    }
  }

  if (toInsert.length) await db.insert(weekSlots).values(toInsert);

  return new Response(null, { status: 204 });
};
