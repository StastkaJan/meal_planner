import { db } from '$lib/db'
import { meals, mealIngredients, ingredients } from '$lib/schema'
import { canAccessMeal } from '$lib/server/meals'
import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const mealId = Number(params.id)
  const [meal] = await db.select().from(meals).where(eq(meals.id, mealId))
  // hide another user's personal meal — indistinguishable from "not found"
  if (!meal || !canAccessMeal(meal, locals.user?.id))
    error(404, 'Meal not found')

  const rows = await db
    .select({
      name: ingredients.name,
      qty: mealIngredients.qty,
      unit: mealIngredients.unit,
    })
    .from(mealIngredients)
    .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(eq(mealIngredients.mealId, mealId))
    .orderBy(mealIngredients.position)

  return {
    meal,
    ingredients: rows.map((r) => ({
      ...r,
      qty: r.qty !== null ? Number(r.qty) : null,
    })),
  }
}
