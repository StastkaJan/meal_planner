import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots, meals } from '$lib/schema';
import type { RequestHandler } from './$types';
import type { SlotWithMeal, PlanDetail } from '$lib/types';

async function ownedPlan(id: number, userId: number) {
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)));
  if (!plan) error(404, 'Plan not found');
  return plan;
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const id = Number(params.id);
  const plan = await ownedPlan(id, locals.user!.id);
  const week = url.searchParams.get('week') ?? plan.weekStart;

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
    .where(and(eq(weekSlots.planId, id), eq(weekSlots.week, week)));

  const result: PlanDetail = { ...plan, slots: rows as SlotWithMeal[] };
  return json(result);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id);
  await ownedPlan(id, locals.user!.id);
  const { name, cuisinePrefs, dietaryRestrictions } = await request.json();
  const [updated] = await db.update(plans).set({ name, cuisinePrefs, dietaryRestrictions }).where(eq(plans.id, id)).returning();
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id);
  await ownedPlan(id, locals.user!.id);
  await db.delete(plans).where(eq(plans.id, id));
  return new Response(null, { status: 204 });
};
