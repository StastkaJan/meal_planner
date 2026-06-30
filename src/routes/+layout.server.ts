import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user && !url.pathname.startsWith('/auth')) {
    redirect(303, '/auth/login');
  }
  return { user: locals.user };
};
