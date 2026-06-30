import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { sessions } from '$lib/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session');
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
    cookies.delete('session', { path: '/' });
  }
  redirect(303, '/auth/login');
};
