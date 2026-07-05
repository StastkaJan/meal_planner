import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { Meal } from "$lib/schema";

function getRequiredString(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

function parseNullableInt(data: FormData, key: string): number | null {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw error(400, `${key} must be an integer`);
  return value;
}

function parseNullableFloat(data: FormData, key: string): number | null {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) throw error(400, `${key} must be a number`);
  return value;
}

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch("/meals");
  if (!res.ok) error(res.status, "Failed to load meals");
  return { meals: (await res.json()) as Meal[] };
};

export const actions: Actions = {
  createMeal: async ({ request, fetch }) => {
    const data = await request.formData();
    const name = getRequiredString(data, "name");
    if (!name) return fail(400, { error: "Meal name is required" });

    const createRes = await fetch("/meals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        calories: parseNullableInt(data, "calories"),
        proteinG: parseNullableFloat(data, "proteinG"),
        carbsG: parseNullableFloat(data, "carbsG"),
        fatG: parseNullableFloat(data, "fatG"),
      }),
    });

    if (!createRes.ok)
      return fail(createRes.status, { error: "Failed to create meal" });
    return { success: true };
  },
  updateMeal: async ({ request, fetch }) => {
    const data = await request.formData();
    const id = Number(data.get("id"));
    if (!Number.isInteger(id) || id <= 0)
      return fail(400, { error: "Invalid meal id" });

    const name = getRequiredString(data, "name");
    if (!name) return fail(400, { error: "Meal name is required" });

    const updateRes = await fetch(`/meals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        calories: parseNullableInt(data, "calories"),
        proteinG: parseNullableFloat(data, "proteinG"),
        carbsG: parseNullableFloat(data, "carbsG"),
        fatG: parseNullableFloat(data, "fatG"),
      }),
    });

    if (!updateRes.ok)
      return fail(updateRes.status, { error: "Failed to update meal" });
    return { success: true };
  },
  deleteMeal: async ({ request, fetch }) => {
    const data = await request.formData();
    const id = Number(data.get("id"));
    if (!Number.isInteger(id) || id <= 0)
      return fail(400, { error: "Invalid meal id" });

    const deleteRes = await fetch(`/meals/${id}`, { method: "DELETE" });
    if (!deleteRes.ok)
      return fail(deleteRes.status, { error: "Failed to delete meal" });
    return { success: true };
  },
};
