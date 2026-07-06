import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans as plansTable, meals as mealsTable } from '$lib/schema';
import { getPlanDetail, validWeek, ownedPlan, upsertSlot, autocomposeSlots } from '$lib/server/plans';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user!.id;
  const [plans, meals] = await Promise.all([
    db.select().from(plansTable).where(eq(plansTable.userId, userId)).orderBy(plansTable.id),
    db.select().from(mealsTable).orderBy(mealsTable.name),
  ]);

  const requestedId = Number(url.searchParams.get('plan'));
  const activePlan = plans.find((p) => p.id === requestedId) ?? plans.at(-1);

  if (!activePlan) {
    return { plans, meals, plan: null, activePlanId: 0, viewWeek: '' };
  }

  const viewWeek = validWeek(url.searchParams.get('week') || activePlan.weekStart);
  const plan = await getPlanDetail(activePlan, viewWeek);

  return { plans, meals, plan, activePlanId: activePlan.id, viewWeek };
};

export const actions: Actions = {
  createPlan: async ({ request, locals }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    if (!name) return;

    const d = new Date();
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // snap to Monday
    const weekStart = d.toISOString().slice(0, 10);
    const [plan] = await db.insert(plansTable).values({ name, weekStart, userId: locals.user!.id }).returning();
    redirect(303, `/?plan=${plan.id}&week=${plan.weekStart}`);
  },

  deletePlan: async ({ request, locals }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));
    await ownedPlan(id, locals.user!.id);
    await db.delete(plansTable).where(eq(plansTable.id, id));
    redirect(303, '/');
  },

  slotChange: async ({ request, locals }) => {
    const data = await request.formData();
    const planId = Number(data.get('planId'));
    await ownedPlan(planId, locals.user!.id);
    const week = validWeek(data.get('week')!.toString());
    const dayOfWeek = Number(data.get('dayOfWeek'));
    const mealType = data.get('mealType')!.toString();
    const mealIdRaw = data.get('mealId')?.toString();
    const mealId = mealIdRaw ? Number(mealIdRaw) : null;
    await upsertSlot(planId, week, dayOfWeek, mealType, mealId);
  },

  autocompose: async ({ request, locals }) => {
    const data = await request.formData();
    const planId = Number(data.get('planId'));
    const plan = await ownedPlan(planId, locals.user!.id);
    const week = validWeek(data.get('week')!.toString());
    await autocomposeSlots(plan, week);
  },

  settingsChange: async ({ request, locals }) => {
    const data = await request.formData();
    const planId = Number(data.get('planId'));
    await ownedPlan(planId, locals.user!.id);
    const cuisinePrefs = data.getAll('cuisinePrefs').map(String);
    const dietaryRestrictions = data.getAll('dietaryRestrictions').map(String);
    await db.update(plansTable).set({ cuisinePrefs, dietaryRestrictions }).where(eq(plansTable.id, planId));
  },
};
