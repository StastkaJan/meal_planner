import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { Meal, Plan } from "$lib/schema";
import type { PlanDetail } from "$lib/types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeek(value: string | null): value is string {
  return value !== null && ISO_DATE_RE.test(value);
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const [plansRes, mealsRes] = await Promise.all([
    fetch("/plans"),
    fetch("/meals"),
  ]);
  if (!plansRes.ok) error(plansRes.status, "Failed to load plans");
  if (!mealsRes.ok) error(mealsRes.status, "Failed to load meals");

  const [plans, meals] = (await Promise.all([
    plansRes.json(),
    mealsRes.json(),
  ])) as [Plan[], Meal[]];

  if (plans.length === 0) {
    return { plans, meals, activePlanId: 0, viewWeek: "", plan: null };
  }

  const requestedPlanId = Number(url.searchParams.get("plan"));
  const activePlan =
    plans.find((p) => p.id === requestedPlanId) ?? plans[plans.length - 1];
  const requestedWeek = url.searchParams.get("week");
  const viewWeek = isValidWeek(requestedWeek)
    ? requestedWeek
    : activePlan.weekStart;

  const detailRes = await fetch(`/plans/${activePlan.id}?week=${viewWeek}`);
  if (!detailRes.ok) error(detailRes.status, "Failed to load active plan");
  const plan = (await detailRes.json()) as PlanDetail;

  return {
    plans,
    meals,
    activePlanId: activePlan.id,
    viewWeek,
    plan,
  };
};

export const actions: Actions = {
  createPlan: async ({ request, fetch }) => {
    const data = await request.formData();
    const name = String(data.get("name") ?? "").trim();

    if (!name) return fail(400, { error: "Plan name is required" });

    const createRes = await fetch("/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!createRes.ok)
      return fail(createRes.status, { error: "Failed to create plan" });

    const created = (await createRes.json()) as Plan;
    redirect(303, `/?plan=${created.id}&week=${created.weekStart}`);
  },
  deletePlan: async ({ request, fetch }) => {
    const data = await request.formData();
    const id = Number(data.get("id"));
    if (!Number.isInteger(id) || id <= 0)
      return fail(400, { error: "Invalid plan id" });

    const deleteRes = await fetch(`/plans/${id}`, { method: "DELETE" });
    if (!deleteRes.ok)
      return fail(deleteRes.status, { error: "Failed to delete plan" });

    const plansRes = await fetch("/plans");
    if (!plansRes.ok)
      return fail(plansRes.status, { error: "Failed to refresh plans" });
    const plans = (await plansRes.json()) as Plan[];

    if (plans.length === 0) redirect(303, "/");

    const last = plans[plans.length - 1];
    redirect(303, `/?plan=${last.id}&week=${last.weekStart}`);
  },
};
