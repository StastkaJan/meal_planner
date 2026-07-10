import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, userSettings } from '$lib/schema';
import { autocomposeSlots } from '$lib/server/plans';
import { resolveTargets } from '$lib/types';
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

  const [u] = await db.select({
    calorieTarget: userSettings.calorieTarget,
    proteinTarget: userSettings.proteinTarget,
    carbsTarget: userSettings.carbsTarget,
    fatTarget: userSettings.fatTarget,
  }).from(userSettings).where(eq(userSettings.userId, locals.user!.id)).limit(1);

  await autocomposeSlots(plan, week ?? plan.weekStart, resolveTargets(u), locals.user!.id);
  return new Response(null, { status: 204 });
};
