import { describe, it, expect, vi } from 'vitest'

// A minimal thenable query-builder fake: every chain method returns the same object, and
// awaiting it at any point resolves to the next queued response (in call order).
function makeTx(responses: unknown[]) {
  let i = 0
  const chain: any = {}
  for (const method of [
    'select',
    'from',
    'where',
    'insert',
    'update',
    'delete',
    'set',
    'values',
    'onConflictDoNothing',
    'returning',
  ]) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(responses[i++]).then(resolve)
  return chain
}

const mockDb = vi.hoisted(() => ({ transaction: vi.fn() }))
vi.mock('$lib/db', () => ({ db: mockDb }))

const { createMeal, updateMeal } = await import('../repositories/meals')
const { pickMealFields } = await import('./meals')
const { findRecipeNode, parseRecipeJsonLd } = await import('./recipe-import')

describe('pickMealFields', () => {
  it('keeps only writable columns', () => {
    const out = pickMealFields({
      name: 'Soup',
      calories: 300,
      tags: ['Italian'],
      allowedSlots: ['dinner'],
    })
    expect(out).toEqual({
      name: 'Soup',
      calories: 300,
      tags: ['Italian'],
      allowedSlots: ['dinner'],
    })
  })

  it('drops unknown/server-owned fields (mass-assignment guard)', () => {
    const out = pickMealFields({ id: 99, name: 'Soup', hacker: true })
    expect(out).toEqual({ name: 'Soup' })
    expect(out.id).toBeUndefined()
  })

  it('omits keys that are undefined so PATCH only sets provided fields', () => {
    const out = pickMealFields({ name: 'Soup', calories: undefined })
    expect('calories' in out).toBe(false)
  })

  it('normalizes blank numeric form fields to null', () => {
    expect(pickMealFields({ calories: '', timeMinutes: '' })).toEqual({
      calories: null,
      timeMinutes: null,
    })
  })
})

describe('findRecipeNode', () => {
  it('finds a Recipe inside @graph', () => {
    const doc = {
      '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Stew' }],
    }
    expect(findRecipeNode([doc])?.name).toBe('Stew')
  })
  it('finds a Recipe when @type is an array', () => {
    expect(
      findRecipeNode([[{ '@type': ['Thing', 'Recipe'], name: 'X' }]])?.name,
    ).toBe('X')
  })
  it('returns null when absent', () => {
    expect(findRecipeNode([{ '@type': 'Article' }])).toBeNull()
  })
})

describe('createMeal / updateMeal ingredient sync', () => {
  it('createMeal syncs mealIngredients when the new meal has ingredients', async () => {
    const tx = makeTx([
      [{ id: 1, name: 'Soup' }], // insert(meals).values().returning()
      undefined, // delete(mealIngredients).where()
      undefined, // insert(ingredients).values().onConflictDoNothing()
      [{ id: 5, name: 'Carrots' }], // select ingredient ids .where()
      undefined, // insert(mealIngredients).values()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    const meal = await createMeal({
      name: 'Soup',
      ingredients: [{ name: 'carrots', qty: 2, unit: null }],
    })
    expect(meal).toEqual({ id: 1, name: 'Soup' })
    expect(tx.delete).toHaveBeenCalled()
    expect(tx.insert).toHaveBeenCalledTimes(3) // meals, ingredients, mealIngredients
  })

  it('createMeal skips ingredient-table writes when the new meal has no ingredients', async () => {
    const tx = makeTx([
      [{ id: 2, name: 'Water' }], // insert(meals).values().returning()
      undefined, // delete(mealIngredients).where() — still runs unconditionally
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    await createMeal({ name: 'Water', ingredients: [] })
    expect(tx.delete).toHaveBeenCalled()
    expect(tx.insert).toHaveBeenCalledTimes(1) // only the meals insert
  })

  it('updateMeal resyncs mealIngredients when ingredients is part of the write', async () => {
    const tx = makeTx([
      [{ id: 1, name: 'Soup' }], // update(meals).set().where().returning()
      undefined, // delete(mealIngredients).where()
      undefined, // insert(ingredients).values().onConflictDoNothing()
      [{ id: 5, name: 'Carrots' }], // select ingredient ids .where()
      undefined, // insert(mealIngredients).values()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    await updateMeal(1, {
      ingredients: [{ name: 'carrots', qty: 2, unit: null }],
    })
    expect(tx.delete).toHaveBeenCalled()
    expect(tx.insert).toHaveBeenCalledTimes(2) // ingredients, mealIngredients
  })

  it('updateMeal looks the row up instead of updating when ingredients is the only field written', async () => {
    const tx = makeTx([
      [{ id: 1, name: 'Soup' }], // select(meals).where() — mealValues is empty, no .update()
      undefined, // delete(mealIngredients).where()
      undefined, // insert(ingredients).values().onConflictDoNothing()
      [{ id: 5, name: 'Carrots' }], // select ingredient ids .where()
      undefined, // insert(mealIngredients).values()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    const updated = await updateMeal(1, {
      ingredients: [{ name: 'carrots', qty: 2, unit: null }],
    })
    expect(updated).toEqual({ id: 1, name: 'Soup' })
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).toHaveBeenCalled()
  })

  it('updateMeal does not touch ingredient tables when ingredients is not part of the write', async () => {
    const tx = makeTx([
      [{ id: 1, name: 'updated' }], // update(meals).set().where().returning()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    await updateMeal(1, { name: 'updated' })
    expect(tx.delete).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('updateMeal returns without syncing when there is nothing to update', async () => {
    const tx = makeTx([[]]) // update(...).returning() finds no row
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    const result = await updateMeal(999, {
      ingredients: [{ name: 'carrots', qty: 2, unit: null }],
    })
    expect(result).toBeUndefined()
    expect(tx.delete).not.toHaveBeenCalled()
  })
})

describe('parseRecipeJsonLd', () => {
  it('maps the common schema.org Recipe fields', () => {
    const out = parseRecipeJsonLd({
      '@type': 'Recipe',
      name: '  Pancakes  ',
      description: 'Fluffy',
      image: [{ url: 'http://img/1.jpg' }],
      recipeIngredient: ['2 eggs', ' 1 cup flour '],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Mix' },
        { '@type': 'HowToStep', text: 'Fry' },
      ],
      nutrition: { calories: '320 kcal' },
      totalTime: 'PT25M',
    })
    expect(out).toEqual({
      name: 'Pancakes',
      description: 'Fluffy',
      imageUrl: 'http://img/1.jpg',
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: 'Mix\nFry',
      calories: 320,
      timeMinutes: 25,
    })
  })

  it('flattens HowToSection instructions and tolerates missing fields', () => {
    const out = parseRecipeJsonLd({
      name: 'Bare',
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          itemListElement: [{ text: 'Step A' }, { text: 'Step B' }],
        },
      ],
    })
    expect(out.instructions).toBe('Step A\nStep B')
    expect(out.calories).toBeUndefined()
    expect(out.ingredients).toBeUndefined()
  })
})
