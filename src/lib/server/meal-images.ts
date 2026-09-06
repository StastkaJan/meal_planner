import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

export const MAX_RECIPE_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_RECIPE_IMAGE_WIDTH = 1200
export const MAX_RECIPE_IMAGE_HEIGHT = 900

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif'])

export class InvalidRecipeImageError extends Error {}

function imageDirectory() {
  return resolve(process.env.RECIPE_IMAGE_DIR ?? 'data/recipe-images')
}

function imagePath(mealId: number) {
  if (!Number.isSafeInteger(mealId) || mealId < 1)
    throw new TypeError('Meal ID must be a positive integer')
  return join(imageDirectory(), `${mealId}.webp`)
}

function isMissingFile(cause: unknown) {
  return (
    cause instanceof Error &&
    'code' in cause &&
    (cause as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

async function writeAtomically(mealId: number, data: Buffer) {
  const directory = imageDirectory()
  await mkdir(directory, { recursive: true })
  const target = imagePath(mealId)
  const temporary = join(directory, `.${mealId}-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, data, { flag: 'wx' })
    await rename(temporary, target)
  } finally {
    await unlink(temporary).catch((cause: unknown) => {
      if (!isMissingFile(cause)) throw cause
    })
  }
}

async function optimizeRecipeImage(data: Buffer) {
  try {
    const input = sharp(data, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: 40_000_000,
    })
    const metadata = await input.metadata()
    if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format))
      throw new InvalidRecipeImageError('Unsupported image format')

    return await input
      .rotate()
      .resize({
        width: MAX_RECIPE_IMAGE_WIDTH,
        height: MAX_RECIPE_IMAGE_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
  } catch (cause) {
    if (cause instanceof InvalidRecipeImageError) throw cause
    throw new InvalidRecipeImageError('Invalid image')
  }
}

export async function readMealImage(mealId: number) {
  try {
    return await readFile(imagePath(mealId))
  } catch (cause) {
    if (isMissingFile(cause)) return null
    throw cause
  }
}

export async function readConditionalMealImage(
  mealId: number,
  ifNoneMatch: string | null,
) {
  let file
  try {
    file = await open(imagePath(mealId), 'r')
  } catch (cause) {
    if (isMissingFile(cause)) return null
    throw cause
  }
  try {
    const stat = await file.stat({ bigint: true })
    // Atomic replacements change file identity even when the size is unchanged.
    const tag = `"${stat.ino}-${stat.size}-${stat.mtimeNs}-${stat.ctimeNs}"`
    const unchanged = ifNoneMatch?.split(',').some((value) => {
      const candidate = value.trim().replace(/^W\//, '')
      return candidate === '*' || candidate === tag
    })
    return { etag: `W/${tag}`, image: unchanged ? null : await file.readFile() }
  } finally {
    await file.close()
  }
}

export async function hasMealImage(mealId: number) {
  try {
    await access(imagePath(mealId))
    return true
  } catch (cause) {
    if (isMissingFile(cause)) return false
    throw cause
  }
}

export async function saveMealImage(mealId: number, data: Buffer) {
  const optimized = await optimizeRecipeImage(data)
  await writeAtomically(mealId, optimized)
}

export async function copyMealImage(
  sourceMealId: number,
  targetMealId: number,
) {
  const image = await readMealImage(sourceMealId)
  if (!image) return false
  await writeAtomically(targetMealId, image)
  return true
}

export async function deleteMealImage(mealId: number) {
  try {
    await unlink(imagePath(mealId))
  } catch (cause) {
    if (!isMissingFile(cause)) throw cause
  }
}

export async function deleteMealImages(mealIds: number[]) {
  await Promise.all(mealIds.map(deleteMealImage))
}
