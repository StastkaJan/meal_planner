import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { users } from '$lib/schema';
import type { RequestHandler } from './$types';

const TARGET_FIELDS = ['calorieTarget', 'proteinTarget', 'carbsTarget', 'fatTarget'] as const;

// blank/invalid clears the target (NULL → falls back to the global default)
function toTarget(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if ('cuisinePrefs' in body) patch.cuisinePrefs = body.cuisinePrefs;
  if ('dietaryRestrictions' in body) patch.dietaryRestrictions = body.dietaryRestrictions;
  for (const f of TARGET_FIELDS) if (f in body) patch[f] = toTarget(body[f]);

  const [u] = await db.update(users)
    .set(patch)
    .where(eq(users.id, locals.user!.id))
    .returning({
      cuisinePrefs: users.cuisinePrefs,
      dietaryRestrictions: users.dietaryRestrictions,
      calorieTarget: users.calorieTarget,
      proteinTarget: users.proteinTarget,
      carbsTarget: users.carbsTarget,
      fatTarget: users.fatTarget,
    });
  return json(u);
};
