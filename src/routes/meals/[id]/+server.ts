import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { meals } from '$lib/schema';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  const [updated] = await db.update(meals).set(body).where(eq(meals.id, id)).returning();
  if (!updated) error(404, 'Meal not found');
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id);
  await db.delete(meals).where(eq(meals.id, id));
  return new Response(null, { status: 204 });
};
