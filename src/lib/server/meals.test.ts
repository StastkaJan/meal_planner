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

const {
  pickMealFields,
  canAccessMeal,
  findRecipeNode,
  isoDurationToMinutes,
  parseRecipeJsonLd,
  parseIngredientLine,
  createMeal,
  updateMeal,
} = await import('./meals')

describe('canAccessMeal', () => {
  it('lets anyone access a global meal', () => {
    expect(canAccessMeal({ userId: null, archivedAt: null }, 1)).toBe(true)
    expect(canAccessMeal({ userId: null, archivedAt: null }, undefined)).toBe(
      true,
    )
  })
  it('lets only the owner access a personal meal', () => {
    expect(canAccessMeal({ userId: 1, archivedAt: null }, 1)).toBe(true)
    expect(canAccessMeal({ userId: 1, archivedAt: null }, 2)).toBe(false)
    expect(canAccessMeal({ userId: 1, archivedAt: null }, undefined)).toBe(
      false,
    )
  })
  it('rejects archived meals', () => {
    expect(canAccessMeal({ userId: null, archivedAt: new Date() }, 1)).toBe(
      false,
    )
    expect(canAccessMeal({ userId: 1, archivedAt: new Date() }, 1)).toBe(false)
  })
})

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
})

describe('isoDurationToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(isoDurationToMinutes('PT1H30M')).toBe(90)
    expect(isoDurationToMinutes('PT20M')).toBe(20)
    expect(isoDurationToMinutes('PT2H')).toBe(120)
  })
  it('returns undefined for junk', () => {
    expect(isoDurationToMinutes('banana')).toBeUndefined()
    expect(isoDurationToMinutes(undefined)).toBeUndefined()
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

describe('parseIngredientLine', () => {
  it('splits a leading integer off the name', () => {
    expect(parseIngredientLine('2 carrots')).toEqual({
      qty: 2,
      name: 'carrots',
    })
  })

  it('splits a leading decimal and a leading fraction', () => {
    expect(parseIngredientLine('1.5 cups flour')).toEqual({
      qty: 1.5,
      name: 'cups flour',
    })
    expect(parseIngredientLine('1/2 cup sugar')).toEqual({
      qty: 0.5,
      name: 'cup sugar',
    })
  })

  it('returns a null qty when there is no leading number', () => {
    expect(parseIngredientLine('salt and pepper')).toEqual({
      qty: null,
      name: 'salt and pepper',
    })
    expect(parseIngredientLine('200g Greek yogurt')).toEqual({
      qty: null,
      name: '200g Greek yogurt',
    })
  })
})

describe('createMeal / updateMeal ingredient sync', () => {
  it('createMeal syncs mealIngredients when the new meal has ingredient lines', async () => {
    const tx = makeTx([
      [{ id: 1, ingredients: ['2 carrots'] }], // insert(meals).values().returning()
      undefined, // delete(mealIngredients).where()
      undefined, // insert(ingredients).values().onConflictDoNothing()
      [{ id: 5, name: 'Carrots' }], // select ingredient ids .where()
      undefined, // insert(mealIngredients).values()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    const meal = await createMeal({ name: 'Soup', ingredients: ['2 carrots'] })
    expect(meal).toEqual({ id: 1, ingredients: ['2 carrots'] })
    expect(tx.delete).toHaveBeenCalled()
    expect(tx.insert).toHaveBeenCalledTimes(3) // meals, ingredients, mealIngredients
  })

  it('createMeal skips ingredient-table writes when the new meal has no ingredient lines', async () => {
    const tx = makeTx([
      [{ id: 2, ingredients: [] }], // insert(meals).values().returning()
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
      [{ id: 1, ingredients: ['2 carrots'] }], // update(meals).set().where().returning()
      undefined, // delete(mealIngredients).where()
      undefined, // insert(ingredients).values().onConflictDoNothing()
      [{ id: 5, name: 'Carrots' }], // select ingredient ids .where()
      undefined, // insert(mealIngredients).values()
    ])
    mockDb.transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) =>
      cb(tx),
    )
    await updateMeal(1, { ingredients: ['2 carrots'] })
    expect(tx.delete).toHaveBeenCalled()
    expect(tx.insert).toHaveBeenCalledTimes(2) // ingredients, mealIngredients
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
    const result = await updateMeal(999, { ingredients: ['2 carrots'] })
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
