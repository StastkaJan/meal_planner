import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { meals } from '$lib/schema';
import { visibleToUser, canAccessMeal } from '$lib/server/meals';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const rows = await db.select().from(meals).where(visibleToUser(locals.user?.id)).orderBy(meals.name);
  return { meals: rows };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401);
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    if (!name) return;
    // scope=personal → owned by me; anything else → global/shared (NULL owner)
    const userId = data.get('scope') === 'personal' ? locals.user.id : null;
    await db.insert(meals).values({ name, userId });
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401);
    const data = await request.formData();
    const id = Number(data.get('id'));
    const [meal] = await db.select({ userId: meals.userId }).from(meals).where(eq(meals.id, id)).limit(1);
    if (!meal || !canAccessMeal(meal, locals.user.id)) return fail(403);
    await db.delete(meals).where(eq(meals.id, id));
  },
};
