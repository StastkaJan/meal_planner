import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { users, userSettings } from '$lib/schema';
import { hashPassword, verifyPassword } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

const TARGET_FIELDS = ['calorieTarget', 'proteinTarget', 'carbsTarget', 'fatTarget'] as const;

// blank/invalid clears the target (NULL → falls back to the global default)
function toTarget(v: FormDataEntryValue | null): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const load: PageServerLoad = async ({ locals }) => {
  const [s] = await db
    .select({
      cuisinePrefs: userSettings.cuisinePrefs,
      dietaryRestrictions: userSettings.dietaryRestrictions,
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, locals.user!.id))
    .limit(1);
  // no settings row yet → empty prefs / null targets (resolveTargets falls back to defaults)
  return {
    email: locals.user!.email,
    cuisinePrefs: s?.cuisinePrefs ?? [],
    dietaryRestrictions: s?.dietaryRestrictions ?? [],
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
  };
};

export const actions: Actions = {
  password: async ({ request, locals }) => {
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

  targets: async ({ request, locals }) => {
    const d = await request.formData();
    const vals = Object.fromEntries(TARGET_FIELDS.map((f) => [f, toTarget(d.get(f))]));
    const userId = locals.user!.id;
    // upsert — creates the settings row on first save, so a missing row is never an error
    await db.insert(userSettings).values({ userId, ...vals })
      .onConflictDoUpdate({ target: userSettings.userId, set: vals });
    return { targetsSaved: true };
  },
};
