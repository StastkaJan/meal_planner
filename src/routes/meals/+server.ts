import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { meals } from '$lib/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const rows = await db.select().from(meals).orderBy(meals.name);
  return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const [meal] = await db.insert(meals).values(body).returning();
  return json(meal, { status: 201 });
};
