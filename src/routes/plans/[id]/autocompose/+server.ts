import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans } from '$lib/schema';
import { autocomposeSlots } from '$lib/server/plans';
import type { RequestHandler } from './$types';

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

  await autocomposeSlots(plan, week ?? plan.weekStart);
  return new Response(null, { status: 204 });
};
