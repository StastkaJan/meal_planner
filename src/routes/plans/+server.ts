import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { plans } from '$lib/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const rows = await db.select().from(plans).orderBy(plans.id);
  return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
  const { name, weekStart } = await request.json();
  const [plan] = await db.insert(plans).values({ name, weekStart }).returning();
  return json(plan, { status: 201 });
};
