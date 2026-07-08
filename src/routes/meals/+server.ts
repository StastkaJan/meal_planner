import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { meals } from '$lib/schema';
import { pickMealFields } from '$lib/server/meals';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const rows = await db.select().from(meals).orderBy(meals.name);
  return json(rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated');
  const values = pickMealFields(await request.json());
  if (!values.name) error(400, 'Name is required');
  const [meal] = await db.insert(meals).values(values as { name: string }).returning();
  return json(meal, { status: 201 });
};
