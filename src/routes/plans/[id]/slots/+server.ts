import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, weekSlots } from '$lib/schema';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const planId = Number(params.id);
  const [plan] = await db.select({ id: plans.id }).from(plans).where(and(eq(plans.id, planId), eq(plans.userId, locals.user!.id))).limit(1);
  if (!plan) error(404, 'Plan not found');

  const { dayOfWeek, mealType, mealId } = await request.json();

  if (mealId === null) {
    await db.delete(weekSlots).where(
      and(eq(weekSlots.planId, planId), eq(weekSlots.dayOfWeek, dayOfWeek), eq(weekSlots.mealType, mealType))
    );
    return new Response(null, { status: 204 });
  }

  await db.insert(weekSlots)
    .values({ planId, dayOfWeek, mealType, mealId })
    .onConflictDoUpdate({
      target: [weekSlots.planId, weekSlots.dayOfWeek, weekSlots.mealType],
      set: { mealId }
    });

  return new Response(null, { status: 204 });
};
