import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots, meals } from '$lib/schema';
import type { RequestHandler } from './$types';
import type { SlotWithMeal, PlanDetail } from '$lib/types';

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id);
  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  if (!plan) error(404, 'Plan not found');

  const rows = await db
    .select({
      planId:    weekSlots.planId,
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
    .where(eq(weekSlots.planId, id));

  const result: PlanDetail = { ...plan, slots: rows as SlotWithMeal[] };
  return json(result);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  const [updated] = await db.update(plans).set(body).where(eq(plans.id, id)).returning();
  if (!updated) error(404, 'Plan not found');
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id);
  await db.delete(plans).where(eq(plans.id, id));
  return new Response(null, { status: 204 });
};
