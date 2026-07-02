import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans } from '$lib/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const rows = await db.select().from(plans).where(eq(plans.userId, locals.user!.id)).orderBy(plans.id);
  return json(rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const { name } = await request.json();
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // snap to Monday
  const weekStart = d.toISOString().slice(0, 10);
  const [plan] = await db.insert(plans).values({ name, weekStart, userId: locals.user!.id }).returning();
  return json(plan, { status: 201 });
};
