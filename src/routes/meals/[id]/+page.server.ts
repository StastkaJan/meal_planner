import { db } from '$lib/db';
import { meals } from '$lib/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [meal] = await db.select().from(meals).where(eq(meals.id, Number(params.id)));
  if (!meal) error(404, 'Meal not found');
  return { meal };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    if (!locals.user) return fail(401);
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    if (!name) return fail(400, { error: 'Name required' });
    const ingredients = (data.get('ingredients')?.toString() ?? '').split('\n').filter(s => s.trim());
    await db.update(meals).set({
      name,
      calories:    data.get('calories')    ? Number(data.get('calories'))    : null,
      proteinG:    data.get('proteinG')?.toString()    || null,
      carbsG:      data.get('carbsG')?.toString()      || null,
      fatG:        data.get('fatG')?.toString()         || null,
      imageUrl:    data.get('imageUrl')?.toString()    || null,
      description: data.get('description')?.toString() || null,
      ingredients,
      instructions: data.get('instructions')?.toString() || null,
      timeMinutes: data.get('timeMinutes') ? Number(data.get('timeMinutes')) : null,
      difficulty:  data.get('difficulty')?.toString()  || null,
      tags:        data.getAll('tags').map(String),
    }).where(eq(meals.id, Number(params.id)));
  },
  delete: async ({ params, locals }) => {
    if (!locals.user) return fail(401);
    await db.delete(meals).where(eq(meals.id, Number(params.id)));
    redirect(303, '/meals');
  },
};
