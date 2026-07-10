import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userSettings } from '$lib/schema';
import type { RequestHandler } from './$types';

// Chip-picker mutation (cuisine/dietary defaults). Targets are saved via the ?/targets form
// action instead. Upsert so a user without a settings row yet is handled, not an error.
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if ('cuisinePrefs' in body) patch.cuisinePrefs = body.cuisinePrefs;
  if ('dietaryRestrictions' in body) patch.dietaryRestrictions = body.dietaryRestrictions;

  if (!Object.keys(patch).length) return json({}); // nothing recognized to update

  const [s] = await db.insert(userSettings)
    .values({ userId: locals.user!.id, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch })
    .returning({ cuisinePrefs: userSettings.cuisinePrefs, dietaryRestrictions: userSettings.dietaryRestrictions });
  return json(s);
};
