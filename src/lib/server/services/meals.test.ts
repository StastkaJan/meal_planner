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
vi.mock('$lib/database', () => ({ db: mockDb }))

const { createMeal, updateMeal } = await import('../repositories/meals')
const { pickMealFields } = await import('./meals')
const {
  findRecipeNode,
  parseIngredientLine,
  parseRecipeHtml,
  parseRecipeJsonLd,
} = await import('./recipe-import')

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
    expect(
      pickMealFields({ calories: '', fiberG: '', saltG: '', timeMinutes: '' }),
    ).toEqual({
      calories: null,
      fiberG: null,
      saltG: null,
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
      nutrition: {
        calories: '320 kcal',
        proteinContent: '12 g',
        carbohydrateContent: '42 g',
        fatContent: '9 g',
        fiberContent: '4.5 g',
        sugarContent: '8 g',
        saturatedFatContent: '2.5 g',
        sodiumContent: '400 mg',
      },
      totalTime: 'PT25M',
    })
    expect(out).toEqual({
      name: 'Pancakes',
      description: 'Fluffy',
      imageUrl: 'http://img/1.jpg',
      ingredients: [
        { name: 'eggs', qty: 2, unit: null },
        { name: 'flour', qty: 1, unit: 'cup' },
      ],
      instructions: 'Mix\nFry',
      calories: 320,
      proteinG: 12,
      carbsG: 42,
      fatG: 9,
      fiberG: 4.5,
      sugarG: 8,
      saturatedFatG: 2.5,
      saltG: 1,
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

  it('parses common ingredient quantities and known units', () => {
    expect(parseIngredientLine('1 1/2 tablespoons olive oil')).toEqual({
      name: 'olive oil',
      qty: 1.5,
      unit: 'tbsp',
    })
    expect(parseIngredientLine('½ cup flour')).toEqual({
      name: 'flour',
      qty: 0.5,
      unit: 'cup',
    })
    expect(parseIngredientLine('Salt to taste')).toEqual({
      name: 'Salt to taste',
      qty: null,
      unit: null,
    })
  })

  it('parses the pattypan recipe and preserves ambiguous ranges', () => {
    expect(
      [
        '5 cups halved small pattypan squash (about 1-1/4 pounds)',
        '1 tablespoon olive oil',
        '2 garlic cloves, minced',
        '1/2 teaspoon salt',
        '1/4 teaspoon dried oregano',
        'Salt to taste',
        '1–2 cups flour',
      ].map(parseIngredientLine),
    ).toEqual([
      {
        name: 'halved small pattypan squash (about 1-1/4 pounds)',
        qty: 5,
        unit: 'cup',
      },
      { name: 'olive oil', qty: 1, unit: 'tbsp' },
      { name: 'garlic cloves, minced', qty: 2, unit: null },
      { name: 'salt', qty: 0.5, unit: 'tsp' },
      { name: 'dried oregano', qty: 0.25, unit: 'tsp' },
      { name: 'Salt to taste', qty: null, unit: null },
      { name: '1–2 cups flour', qty: null, unit: null },
    ])
  })

  it('falls back to schema.org microdata', () => {
    const out = parseRecipeHtml(`
      <article itemscope itemtype="https://schema.org/Recipe">
        <meta itemprop="name" content="Soup">
        <div itemprop="recipeIngredient">2 cups water</div>
        <div itemprop="recipeInstructions">Stir &amp; serve.</div>
        <meta itemprop="saltContent" content="1.5 g">
      </article>
    `)
    expect(out).toMatchObject({
      name: 'Soup',
      ingredients: [{ name: 'water', qty: 2, unit: 'cup' }],
      instructions: 'Stir & serve.',
      saltG: 1.5,
    })
  })

  it('falls back to common plain HTML recipe markup', () => {
    const out = parseRecipeHtml(`
      <meta property="og:title" content="Toast">
      <li class="recipe-ingredient">2 slices bread</li>
      <div class="recipe-instructions">Toast the bread.</div>
    `)
    expect(out).toMatchObject({
      name: 'Toast',
      ingredients: [{ name: 'bread', qty: 2, unit: 'slice' }],
      instructions: 'Toast the bread.',
    })
  })

  it.each([
    {
      source:
        'https://www.kingarthurbaking.com/recipes/quick-and-easy-pancakes-made-with-all-purpose-baking-mix-recipe',
      html: `<script type="application/ld+json">${JSON.stringify({
        '@graph': [
          {
            '@type': 'Recipe',
            name: 'Quick-and-Easy Pancakes made with All-Purpose Baking Mix',
            image: {
              '@type': 'ImageObject',
              url: 'https://www.kingarthurbaking.com/pancakes.jpg',
            },
            recipeIngredient: [
              '1 cup (120g) King Arthur All-Purpose Baking Mix',
              '3/4 cup (170g) milk or almond milk',
            ],
            recipeInstructions: ['Preheat the griddle.', 'Whisk together.'],
            totalTime: 'PT15M',
            nutrition: { calories: '110 calories' },
          },
        ],
      })}</script>`,
      expected: {
        name: 'Quick-and-Easy Pancakes made with All-Purpose Baking Mix',
        imageUrl: 'https://www.kingarthurbaking.com/pancakes.jpg',
        ingredients: [
          {
            name: '(120g) King Arthur All-Purpose Baking Mix',
            qty: 1,
            unit: 'cup',
          },
          { name: '(170g) milk or almond milk', qty: 0.75, unit: 'cup' },
        ],
        instructions: 'Preheat the griddle.\nWhisk together.',
        calories: 110,
        timeMinutes: 15,
      },
    },
    {
      source: 'https://www.bbcgoodfood.com/recipes/spiced-carrot-lentil-soup',
      html: `<script data-testid="schema" type="application/ld+json">${JSON.stringify(
        {
          '@type': 'Recipe',
          name: 'Spiced carrot & lentil soup',
          image: [
            {
              '@type': 'ImageObject',
              url: 'https://images.immediate.co.uk/carrot-soup.jpg',
            },
          ],
          recipeIngredient: [
            '2 tsp cumin seeds',
            '600g carrots washed and coarsely grated',
            '140g split red lentils',
          ],
          recipeInstructions: [
            { '@type': 'HowToStep', text: 'Toast the spices.' },
            { '@type': 'HowToStep', text: 'Add the remaining ingredients.' },
          ],
          totalTime: 'PT25M',
          nutrition: { calories: '263 calories' },
        },
      )}</script>`,
      expected: {
        name: 'Spiced carrot & lentil soup',
        ingredients: [
          { name: 'cumin seeds', qty: 2, unit: 'tsp' },
          { name: 'carrots washed and coarsely grated', qty: 600, unit: 'g' },
          { name: 'split red lentils', qty: 140, unit: 'g' },
        ],
        instructions: 'Toast the spices.\nAdd the remaining ingredients.',
        calories: 263,
        timeMinutes: 25,
      },
    },
    {
      source: 'https://www.loveandlemons.com/pancakes-recipe/',
      html: `<script type=application/ld+json class=yoast-schema-graph>${JSON.stringify(
        {
          '@graph': [
            { '@type': 'Article' },
            {
              '@type': ['Recipe'],
              name: 'Fluffy Homemade Pancakes',
              recipeIngredient: [
                '1½ cups all-purpose flour',
                '½ teaspoon sea salt',
                '1¼ cups milk',
              ],
              recipeInstructions: [
                { '@type': 'HowToStep', text: 'Whisk the dry ingredients.' },
              ],
              totalTime: 'PT20M',
            },
          ],
        },
      )}</script>`,
      expected: {
        name: 'Fluffy Homemade Pancakes',
        ingredients: [
          { name: 'all-purpose flour', qty: 1.5, unit: 'cup' },
          { name: 'sea salt', qty: 0.5, unit: 'tsp' },
          { name: 'milk', qty: 1.25, unit: 'cup' },
        ],
        instructions: 'Whisk the dry ingredients.',
        timeMinutes: 20,
      },
    },
  ])('parses representative markup from $source', ({ html, expected }) => {
    expect(parseRecipeHtml(html)).toMatchObject(expected)
  })
})
