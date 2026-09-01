import { eq } from 'drizzle-orm'
import { db } from '$lib/database'
import { mealImages } from '$lib/database/schema'

export async function findMealImage(mealId: number) {
  const [image] = await db
    .select({ contentType: mealImages.contentType, data: mealImages.data })
    .from(mealImages)
    .where(eq(mealImages.mealId, mealId))
    .limit(1)
  return image ?? null
}

export async function hasMealImage(mealId: number) {
  const [image] = await db
    .select({ mealId: mealImages.mealId })
    .from(mealImages)
    .where(eq(mealImages.mealId, mealId))
    .limit(1)
  return !!image
}

export async function saveMealImage(
  mealId: number,
  contentType: string,
  data: Buffer,
) {
  await db
    .insert(mealImages)
    .values({ mealId, contentType, data })
    .onConflictDoUpdate({
      target: mealImages.mealId,
      set: { contentType, data },
    })
}

export async function deleteMealImage(mealId: number) {
  await db.delete(mealImages).where(eq(mealImages.mealId, mealId))
}
