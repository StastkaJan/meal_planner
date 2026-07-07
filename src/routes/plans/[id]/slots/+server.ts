import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans } from '$lib/schema';
import { upsertSlot } from '$lib/server/plans';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const planId = Number(params.id);
  const [plan] = await db.select({ id: plans.id }).from(plans).where(and(eq(plans.id, planId), eq(plans.userId, locals.user!.id))).limit(1);
  if (!plan) error(404, 'Plan not found');

  const { week, dayOfWeek, mealType, mealId } = await request.json();
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) error(400, 'Invalid week');

  await upsertSlot(planId, week, dayOfWeek, mealType, mealId);
  return new Response(null, { status: 204 });
};
