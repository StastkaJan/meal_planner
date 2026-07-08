import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { plans as plansTable, meals as mealsTable, users } from '$lib/schema';
import { getPlanDetail, validWeek } from '$lib/server/plans';
import { resolveTargets } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user!.id;
  const [plans, meals, [u]] = await Promise.all([
    db.select().from(plansTable).where(eq(plansTable.userId, userId)).orderBy(plansTable.id),
    db.select().from(mealsTable).orderBy(mealsTable.name),
    db.select({
      calorieTarget: users.calorieTarget,
      proteinTarget: users.proteinTarget,
      carbsTarget: users.carbsTarget,
      fatTarget: users.fatTarget,
    }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  const targets = resolveTargets(u);

  const requestedId = Number(url.searchParams.get('plan'));
  const activePlan = plans.find((p) => p.id === requestedId) ?? plans.at(-1);

  if (!activePlan) {
    return { plans, meals, plan: null, activePlanId: 0, viewWeek: '', targets };
  }

  const viewWeek = validWeek(url.searchParams.get('week') || activePlan.weekStart);
  const plan = await getPlanDetail(activePlan, viewWeek);

  return { plans, meals, plan, activePlanId: activePlan.id, viewWeek, targets };
};
