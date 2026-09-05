import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const compose = readFileSync(
  new URL('./docker-compose.preview.yml', import.meta.url),
  'utf8',
)

describe('preview deployment', () => {
  it('persists recipe images and accepts the documented upload size', () => {
    expect(compose).toContain('BODY_SIZE_LIMIT: 6M')
    expect(compose).toContain('RECIPE_IMAGE_DIR: /app/data/recipe-images')
    expect(compose).toContain('recipe-images:/app/data/recipe-images')
    expect(compose).toMatch(
      /(?:^|\r?\n)volumes:\r?\n(?:  [^\r\n]*\r?\n)*  recipe-images:\s*(?:\r?\n|$)/,
    )
  })
})
