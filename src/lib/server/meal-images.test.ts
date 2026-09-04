import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  copyMealImage,
  deleteMealImage,
  hasMealImage,
  InvalidRecipeImageError,
  MAX_RECIPE_IMAGE_HEIGHT,
  MAX_RECIPE_IMAGE_WIDTH,
  readMealImage,
  saveMealImage,
} from './meal-images'

let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'meal-plan-images-'))
  process.env.RECIPE_IMAGE_DIR = directory
})

afterEach(async () => {
  delete process.env.RECIPE_IMAGE_DIR
  await rm(directory, { recursive: true, force: true })
})

describe('recipe image storage', () => {
  it('resizes an uploaded image and stores only WebP output', async () => {
    const input = await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        background: '#dc2626',
      },
    })
      .png()
      .toBuffer()

    await saveMealImage(7, input)

    const stored = await readMealImage(7)
    const metadata = await sharp(stored!).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBeLessThanOrEqual(MAX_RECIPE_IMAGE_WIDTH)
    expect(metadata.height).toBeLessThanOrEqual(MAX_RECIPE_IMAGE_HEIGHT)
    expect(await readdir(directory)).toEqual(['7.webp'])
  })

  it('rejects data that is not a supported, decodable image', async () => {
    await expect(
      saveMealImage(7, Buffer.from('not an image')),
    ).rejects.toBeInstanceOf(InvalidRecipeImageError)
    await expect(hasMealImage(7)).resolves.toBe(false)
  })

  it('atomically replaces an existing optimized image', async () => {
    const first = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: '#dc2626',
      },
    })
      .png()
      .toBuffer()
    const replacement = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: '#2563eb',
      },
    })
      .png()
      .toBuffer()

    await saveMealImage(7, first)
    const original = await readMealImage(7)
    await saveMealImage(7, replacement)

    expect(await readMealImage(7)).not.toEqual(original)
    expect(await readdir(directory)).toEqual(['7.webp'])
  })

  it('copies and deletes optimized files without database access', async () => {
    const input = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: '#ffffff',
      },
    })
      .jpeg()
      .toBuffer()
    await saveMealImage(1, input)

    await expect(copyMealImage(1, 2)).resolves.toBe(true)
    await expect(readMealImage(2)).resolves.toEqual(await readMealImage(1))
    await deleteMealImage(1)
    await expect(hasMealImage(1)).resolves.toBe(false)
  })
})
