import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { meals } from '$lib/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const rows = await db.select().from(meals).orderBy(meals.name);
  return { meals: rows };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401);
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    if (!name) return;
    await db.insert(meals).values({ name });
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401);
    const data = await request.formData();
    const id = Number(data.get('id'));
    await db.delete(meals).where(eq(meals.id, id));
  },
};
