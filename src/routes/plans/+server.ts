import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans, userSettings } from '$lib/schema';
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
  const [s] = await db
    .select({ cuisinePrefs: userSettings.cuisinePrefs, dietaryRestrictions: userSettings.dietaryRestrictions })
    .from(userSettings)
    .where(eq(userSettings.userId, locals.user!.id))
    .limit(1);
  const [plan] = await db.insert(plans).values({
    name,
    weekStart,
    userId: locals.user!.id,
    cuisinePrefs: s?.cuisinePrefs ?? [],
    dietaryRestrictions: s?.dietaryRestrictions ?? [],
  }).returning();
  return json(plan, { status: 201 });
};
