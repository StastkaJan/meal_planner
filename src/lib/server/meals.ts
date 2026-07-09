import { or, isNull, eq } from 'drizzle-orm';
import { meals } from '$lib/schema';

// A meal is visible to a user if it's global (no owner) or owned by them. An anonymous
// caller (no userId) sees only global meals. Visibility and edit-permission are the same
// set: if you can see a meal, it's yours to edit/delete.
export const visibleToUser = (userId?: number) =>
  userId == null ? isNull(meals.userId) : or(isNull(meals.userId), eq(meals.userId, userId));

export const canAccessMeal = (meal: { userId: number | null }, userId?: number) =>
  meal.userId === null || meal.userId === userId;

// Whitelist of columns a client may write on a meal. Prevents mass-assignment
// from a raw request body (id is server-owned).
const WRITABLE = [
  'name', 'calories', 'proteinG', 'carbsG', 'fatG', 'tags',
  'imageUrl', 'description', 'ingredients', 'instructions',
  'timeMinutes', 'difficulty',
] as const;

export function pickMealFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}
