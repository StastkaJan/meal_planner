import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueRecipeImports = vi.hoisted(() => vi.fn())
vi.mock('../repositories/recipe-imports', () => ({ queueRecipeImports }))

import {
  importCatalogueBatch,
  validateCatalogueRecipe,
} from './catalogue-imports'

const candidate = {
  name: 'Soup',
  ingredients: [{ name: 'Water', qty: 1, unit: 'l' }],
  instructions: 'Boil.',
}

describe('catalogue imports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires usable recipe content', () => {
    expect(validateCatalogueRecipe({ name: 'Soup' }).errors).toEqual(
      expect.arrayContaining(['ingredients', 'instructions']),
    )
  })

  it('deduplicates content within a batch and queues normalized entries', async () => {
    queueRecipeImports.mockImplementationOnce(async (values) => values)
    const result = await importCatalogueBatch(7, [candidate, { ...candidate }])
    expect(result).toMatchObject({ accepted: 1, duplicates: 1, errors: [] })
    expect(queueRecipeImports).toHaveBeenCalledWith([
      expect.objectContaining({
        submittedBy: 7,
        recipe: candidate,
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ])
  })

  it('reports database conflicts as duplicates', async () => {
    queueRecipeImports.mockResolvedValueOnce([])
    expect(await importCatalogueBatch(7, [candidate])).toMatchObject({
      accepted: 0,
      duplicates: 1,
    })
  })
})
