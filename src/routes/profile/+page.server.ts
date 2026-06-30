import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { users } from '$lib/schema';
import { hashPassword, verifyPassword } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  return { email: locals.user!.email };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const d = await request.formData();
    const current = String(d.get('current'));
    const next = String(d.get('next'));

    if (next.length < 8) return fail(400, { error: 'New password must be at least 8 characters' });

    const [user] = await db.select().from(users).where(eq(users.id, locals.user!.id)).limit(1);
    if (!user || !(await verifyPassword(current, user.passwordHash))) {
      return fail(400, { error: 'Current password is incorrect' });
    }

    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
    return { success: true };
  },
};
