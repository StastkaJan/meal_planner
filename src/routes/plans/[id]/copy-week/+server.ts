import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans } from '$lib/schema';
import { copyWeek } from '$lib/server/plans';
import type { RequestHandler } from './$types';

const isWeek = (w: unknown): w is string => typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w);

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const planId = Number(params.id);
  const [plan] = await db.select({ id: plans.id }).from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, locals.user!.id))).limit(1);
  if (!plan) error(404, 'Plan not found');

  const { from, to } = await request.json();
  if (!isWeek(from) || !isWeek(to)) error(400, 'Invalid week');
  if (from === to) error(400, 'Source and target week are the same');

  await copyWeek(planId, from, to);
  return new Response(null, { status: 204 });
};
