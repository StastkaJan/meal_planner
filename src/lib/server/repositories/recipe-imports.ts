import { and, desc, eq } from 'drizzle-orm'
import { db } from '$lib/database'
import { meals, recipeImports } from '$lib/database/schema'
import type { CatalogueRecipe } from '$lib/database/schema'
import type { IngredientInput } from '$lib/types'
import { syncMealIngredients } from './meals'

export type QueuedRecipe = {
  submittedBy: number
  contentHash: string
  recipe: CatalogueRecipe
}

export async function queueRecipeImports(values: QueuedRecipe[]) {
  if (!values.length) return []
  return db
    .insert(recipeImports)
    .values(values)
    .onConflictDoNothing()
    .returning()
}

export async function listRecipeImports(status = 'pending') {
  return db
    .select()
    .from(recipeImports)
    .where(eq(recipeImports.status, status))
    .orderBy(desc(recipeImports.createdAt))
}

export async function reviewRecipeImport(
  id: number,
  decision: 'approved' | 'rejected',
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(recipeImports)
      .set({ status: decision, reviewedAt: new Date() })
      .where(and(eq(recipeImports.id, id), eq(recipeImports.status, 'pending')))
      .returning()
    if (!entry) return null

    let mealId: number | null = null
    if (decision === 'approved') {
      const { ingredients, ...recipe } = entry.recipe
      const [meal] = await tx
        .insert(meals)
        .values({ ...recipe, userId: null } as typeof meals.$inferInsert)
        .returning({ id: meals.id })
      await syncMealIngredients(
        tx,
        meal.id,
        (ingredients as IngredientInput[] | undefined) ?? [],
      )
      mealId = meal.id
    }

    if (mealId === null) return entry
    const [reviewed] = await tx
      .update(recipeImports)
      .set({ mealId })
      .where(eq(recipeImports.id, id))
      .returning()
    return reviewed
  })
}
