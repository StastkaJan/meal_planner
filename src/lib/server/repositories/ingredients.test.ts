import { beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import { ingredientAdminInput } from '$lib/domain/ingredient-admin'

const db = vi.hoisted(() => ({ select: vi.fn(), transaction: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import {
  listIngredientOptions,
  resolveIngredient,
  saveManagedIngredient,
  listManagedIngredients,
  mergeIngredients,
  listMergeSources,
} from './ingredients'

beforeEach(() => vi.clearAllMocks())

function database(responses: unknown[][]) {
  const query = vi.fn(async (..._args: any[]) => ({
    rows: responses.shift() ?? [],
  }))
  return { tx: drizzle({ client: { query } as any }), query }
}

it('resolves a translated alias with bounded SQL and preserves every locale', async () => {
  const translations = { de: { name: 'Tomate', aliases: ['tomaten'] } }
  const { tx, query } = database([[[1, 'Tomato', translations]]])
  await expect(resolveIngredient(tx as any, ' TOMATEN ', 42)).resolves.toEqual({
    id: 1,
    name: 'Tomato',
    translations,
  })
  expect(query).toHaveBeenCalledTimes(1)
  const [config, params] = query.mock.calls[0]
  expect(config.text).toContain('t.aliases @> array[')
  expect(config.text).toContain('t.ingredient_id = "ingredients"."id"')
  expect(config.text).toContain('limit')
  expect(config.text).toContain('u.user_id =')
  expect(params).toContain('tomaten')
  expect(params.at(-1)).toBe(2)
})

it('rejects an inaccessible ingredient ID without creating anything', async () => {
  const { tx, query } = database([[]])
  await expect(
    resolveIngredient(tx as any, 'Private spice', 42, 9),
  ).rejects.toThrow('Unknown ingredient')
  expect(query).toHaveBeenCalledTimes(1)
  const [config, params] = query.mock.calls[0]
  expect(config.text).toContain('"ingredients"."id" =')
  expect(params).toContain(9)
  expect(params).toContain(42)
})

it('does not select an arbitrary ingredient for an ambiguous alias', async () => {
  const { tx, query } = database([
    [
      [1, 'First', {}],
      [2, 'Second', {}],
    ],
    [], // advisory lock
    [[3, 'My spice', null, [], false]], // exact original-name lookup
    [], // owner link
    [[3, 'My spice', {}]], // response with translations
  ])
  await expect(
    resolveIngredient(tx as any, '  My   spice ', 42),
  ).resolves.toEqual({
    id: 3,
    name: 'My spice',
    translations: {},
  })
  const [config, params] = query.mock.calls[2]
  expect(config.text).toContain("'\\s+'")
  expect(params).toEqual(['my spice', 1])
})

it('loads translations without restricting their locale to the current UI languages', async () => {
  const { tx } = database([
    [[1, 'Tomato', { de: { name: 'Tomate', aliases: [] } }]],
  ])
  const options = await listIngredientOptions(null, tx as any)
  expect(options[0].translations.de.name).toBe('Tomate')
})

it('limits admin searches to shared ingredients and bounds the page size', async () => {
  const { tx, query } = database([
    [[35]],
    Array.from({ length: 10 }, (_, id) => [id, 'Salt', {}]),
  ])
  db.select.mockImplementation(tx.select.bind(tx))
  const result = await listManagedIngredients('50%_salt', 3)
  expect(result.ingredients).toHaveLength(10)
  expect(result.totalPages).toBe(4)
  const [config, params] = query.mock.calls[1]
  expect(config.text).toContain('"ingredients"."is_catalog" =')
  expect(params).toContain('%50\\%\\_salt%')
  expect(params.slice(-2)).toEqual([10, 20])
})

it('filters missing translations before counting and clamps out-of-range pages', async () => {
  const { tx, query } = database([[[11]], [[12, 'Salt', {}]]])
  db.select.mockImplementation(tx.select.bind(tx))
  const result = await listManagedIngredients('', 999, true)
  expect(result.page).toBe(2)
  expect(result.totalPages).toBe(2)
  for (const [config] of query.mock.calls) {
    expect(config.text).toContain('not exists')
    expect(config.text).toContain("t.locale = 'en'")
    expect(config.text).toContain("t.locale = 'cs'")
    expect(config.text).toContain('"ingredients"."is_catalog" =')
  }
  expect(query.mock.calls[1][1].slice(-2)).toEqual([10, 10])
})

it('never edits a private or missing ingredient', async () => {
  const { tx, query } = database([[], []])
  db.transaction.mockImplementation((fn) => fn(tx))
  expect(
    await saveManagedIngredient({ name: 'Salt', translations: [] }, 5),
  ).toBeNull()
  expect(
    query.mock.calls.some(([config]) =>
      /update|delete|insert/i.test(config.text),
    ),
  ).toBe(false)
})

it('replaces translations in one transaction while preserving ingredient identity', async () => {
  const { tx, query } = database([
    [],
    [[5, 'Salt', {}]],
    [], // normalized-name lock
    [],
    [[5]],
    [],
    [],
    [[5, 'Salt', { cs: { name: 'Sůl', aliases: ['soli'] } }]],
  ])
  db.transaction.mockImplementation((fn) => fn(tx))
  const result = await saveManagedIngredient(
    {
      name: 'Salt',
      translations: [{ locale: 'cs', name: 'Sůl', aliases: ['soli'] }],
    },
    5,
  )
  expect(result).toMatchObject({
    id: 5,
    translations: { cs: { aliases: ['soli'] } },
  })
  expect(db.transaction).toHaveBeenCalledTimes(1)
  expect(query.mock.calls[5][0].text).toContain(
    'delete from "ingredient_translations"',
  )
  expect(query.mock.calls[6][1]).toContain('cs')
  expect(query.mock.calls[4][0].text).toContain('update "ingredients"')
})

it('publishes a matching private identity atomically without changing recipe or pantry links', async () => {
  const client = new PGlite()
  const database = pgliteDrizzle(client)
  db.transaction.mockImplementation(database.transaction.bind(database))
  try {
    await client.exec(`
      CREATE TABLE ingredients (id serial PRIMARY KEY, name text NOT NULL UNIQUE, is_catalog boolean DEFAULT false, name_cs text, aliases text[] DEFAULT '{}');
      CREATE TABLE ingredient_translations (ingredient_id int REFERENCES ingredients, locale text, name text, aliases text[] DEFAULT '{}', PRIMARY KEY (ingredient_id, locale));
      CREATE TABLE user_ingredients (user_id int, ingredient_id int REFERENCES ingredients, PRIMARY KEY (user_id, ingredient_id));
      CREATE TABLE meal_ingredients (ingredient_id int REFERENCES ingredients, original_name text);
      CREATE TABLE user_settings (pantry_ingredient_ids int[]);
      INSERT INTO ingredients (name) VALUES ('Sumac'), ('SUMAC');
      INSERT INTO user_ingredients VALUES (42, 1);
      INSERT INTO meal_ingredients VALUES (1, 'sumac to taste');
      INSERT INTO user_settings VALUES (ARRAY[1]);
    `)
    const translation = { locale: 'en', name: 'Sumac', aliases: ['sumach'] }
    const input = { name: 'SUMAC', translations: [translation] }
    // Direct private-ID edits remain forbidden.
    expect(await saveManagedIngredient(input, 1)).toBeNull()
    await expect(
      saveManagedIngredient({
        ...input,
        translations: [translation, translation],
      }),
    ).rejects.toThrow()
    expect(
      (await client.query('SELECT name, is_catalog FROM ingredients')).rows,
    ).toEqual([
      { name: 'Sumac', is_catalog: false },
      { name: 'SUMAC', is_catalog: false },
    ])
    const saved = await saveManagedIngredient(input)
    expect(saved).toEqual({
      id: 1,
      name: 'Sumac',
      aliases: [],
      translations: { en: { name: 'Sumac', aliases: ['sumach'] } },
    })
    expect(await listIngredientOptions(null, database as any)).toEqual([saved])
    expect((await client.query('SELECT * FROM meal_ingredients')).rows).toEqual(
      [{ ingredient_id: 1, original_name: 'sumac to taste' }],
    )
    expect((await client.query('SELECT * FROM user_settings')).rows).toEqual([
      { pantry_ingredient_ids: [1] },
    ])
    expect((await client.query('SELECT * FROM user_ingredients')).rows).toEqual(
      [{ user_id: 42, ingredient_id: 1 }],
    )
    expect(await saveManagedIngredient(input)).toBe(false)
    expect(
      (await client.query('SELECT count(*)::int AS count FROM ingredients'))
        .rows,
    ).toEqual([{ count: 2 }])
  } finally {
    db.transaction.mockReset()
    await client.close()
  }
}, 15000)

it('merges private duplicates, preserves recipe data and locale names, and resolves old aliases for every user', async () => {
  const client = new PGlite()
  const database = pgliteDrizzle(client)
  db.transaction.mockImplementation(database.transaction.bind(database))
  try {
    await client.exec(`
      CREATE TABLE ingredients (id serial PRIMARY KEY, name text NOT NULL UNIQUE, is_catalog boolean DEFAULT false, name_cs text, aliases text[] DEFAULT '{}');
      CREATE TABLE ingredient_translations (ingredient_id int REFERENCES ingredients ON DELETE CASCADE, locale text, name text, aliases text[] DEFAULT '{}', PRIMARY KEY (ingredient_id, locale));
      CREATE TABLE user_ingredients (user_id int, ingredient_id int REFERENCES ingredients, PRIMARY KEY (user_id, ingredient_id));
      CREATE TABLE meal_ingredients (ingredient_id int REFERENCES ingredients, original_name text, qty numeric, unit text, position int);
      CREATE TABLE user_settings (user_id int PRIMARY KEY, pantry_ingredient_ids int[], pantry_staples text[]);
      INSERT INTO ingredients (name, is_catalog) VALUES ('Scallion', false), ('Spring onion', true), ('Salt', true);
      INSERT INTO ingredient_translations VALUES (1, 'en', 'Scallions', ARRAY['green onions']), (1, 'de', 'Frühlingszwiebel', ARRAY['frühlingszwiebeln']), (2, 'en', 'Spring onion', ARRAY['spring onions']);
      INSERT INTO user_ingredients VALUES (42, 1), (42, 2), (43, 1);
      INSERT INTO meal_ingredients VALUES (1, 'scallion, sliced', 100, 'g', 0), (2, 'Spring onion', 2, 'pcs', 1);
      INSERT INTO user_settings VALUES (42, ARRAY[3,1,2], ARRAY['Salt', 'Scallion']), (43, ARRAY[]::int[], ARRAY[' scallions ']);
    `)
    expect(await mergeIngredients(1, 1)).toBe(false)
    expect(await mergeIngredients(2, 1)).toBeNull()
    expect(await mergeIngredients(999, 2)).toBeNull()
    // A conflicting catalogue alias must leave every reference untouched.
    await client.exec(
      "INSERT INTO ingredient_translations VALUES (3, 'en', 'Salt', ARRAY['green onions'])",
    )
    expect(await mergeIngredients(1, 2)).toBe(false)
    expect(
      (
        await client.query(
          'SELECT ingredient_id FROM meal_ingredients ORDER BY position',
        )
      ).rows,
    ).toEqual([{ ingredient_id: 1 }, { ingredient_id: 2 }])
    await client.exec(
      'DELETE FROM ingredient_translations WHERE ingredient_id = 3',
    )

    // A failure late in the transaction also rolls back the aliases and moved links.
    await client.exec(
      'ALTER TABLE user_settings ADD CONSTRAINT unchanged_pantry CHECK (pantry_ingredient_ids <> ARRAY[3,2])',
    )
    await expect(mergeIngredients(1, 2)).rejects.toThrow()
    expect(
      (
        await client.query(
          'SELECT ingredient_id FROM user_ingredients WHERE user_id = 43',
        )
      ).rows,
    ).toEqual([{ ingredient_id: 1 }])
    expect(
      (
        await client.query(
          "SELECT aliases FROM ingredient_translations WHERE ingredient_id = 2 AND locale = 'en'",
        )
      ).rows,
    ).toEqual([{ aliases: ['spring onions'] }])
    await client.exec(
      'ALTER TABLE user_settings DROP CONSTRAINT unchanged_pantry',
    )

    const merged = await mergeIngredients(1, 2)
    expect(merged).toMatchObject({
      id: 2,
      translations: {
        en: {
          name: 'Spring onion',
          aliases: ['spring onions', 'scallions', 'green onions'],
        },
        de: {
          name: 'Frühlingszwiebel',
          aliases: ['frühlingszwiebel', 'frühlingszwiebeln'],
        },
      },
      aliases: ['scallion'],
    })
    expect(merged && merged.translations).not.toHaveProperty('und')
    expect(
      (
        await client.query(
          "SELECT * FROM ingredient_translations WHERE locale = 'und'",
        )
      ).rows,
    ).toEqual([])
    expect(
      (await client.query('SELECT * FROM meal_ingredients ORDER BY position'))
        .rows,
    ).toEqual([
      {
        ingredient_id: 2,
        original_name: 'scallion, sliced',
        qty: '100',
        unit: 'g',
        position: 0,
      },
      {
        ingredient_id: 2,
        original_name: 'Spring onion',
        qty: '2',
        unit: 'pcs',
        position: 1,
      },
    ])
    expect(
      (await client.query('SELECT * FROM user_ingredients ORDER BY user_id'))
        .rows,
    ).toEqual([
      { user_id: 42, ingredient_id: 2 },
      { user_id: 43, ingredient_id: 2 },
    ])
    const settings = (
      await client.query('SELECT * FROM user_settings ORDER BY user_id')
    ).rows
    expect(settings[0]).toMatchObject({
      pantry_ingredient_ids: [3, 2],
      pantry_staples: expect.arrayContaining(['Salt', 'Spring onion']),
    })
    expect(settings[1]).toMatchObject({
      pantry_ingredient_ids: [],
      pantry_staples: ['Spring onion'],
    })
    for (const userId of [42, 99, null])
      for (const name of [' SCALLION ', 'green onions', 'Frühlingszwiebeln'])
        expect(
          await database.transaction((tx) =>
            resolveIngredient(tx as any, name, userId),
          ),
        ).toMatchObject({ id: 2 })
    expect(await mergeIngredients(1, 2)).toBeNull()
    expect(
      (await client.query('SELECT id FROM ingredients ORDER BY id')).rows,
    ).toEqual([{ id: 2 }, { id: 3 }])

    // Existing preview merges remain readable; the next save folds und into general aliases.
    await client.exec(
      "INSERT INTO ingredient_translations VALUES (2, 'und', 'Old label', ARRAY['old alias'])",
    )
    const legacy = (await listIngredientOptions(null, database as any)).find(
      (row) => row.id === 2,
    )!
    expect(legacy.translations).not.toHaveProperty('und')
    expect(legacy.aliases).toEqual(
      expect.arrayContaining(['scallion', 'old label', 'old alias']),
    )
    const translationInput = Object.entries(legacy.translations).map(
      ([locale, row]) => ({ locale, ...row }),
    )
    const saved = await saveManagedIngredient(
      { name: legacy.name, translations: translationInput },
      2,
    )
    expect(saved).toMatchObject({ aliases: legacy.aliases })
    expect(
      (
        await client.query(
          "SELECT * FROM ingredient_translations WHERE locale = 'und'",
        )
      ).rows,
    ).toEqual([])

    await client.exec(`
      INSERT INTO ingredients (name, aliases) VALUES ('Young onion', ARRAY['young onions']);
      INSERT INTO ingredient_translations VALUES (4, 'und', 'Young onion', ARRAY['little onions']);
      UPDATE ingredients SET aliases = ARRAY['young onions'] WHERE id = 3;
    `)
    expect(await mergeIngredients(4, 2)).toBe(false)
    await client.exec("UPDATE ingredients SET aliases = '{}' WHERE id = 3")
    const repaired = await mergeIngredients(4, 2)
    expect(repaired).toMatchObject({
      aliases: expect.arrayContaining([
        'scallion',
        'old alias',
        'young onion',
        'young onions',
        'little onions',
      ]),
    })
    expect(repaired && repaired.translations).not.toHaveProperty('und')
    expect(
      (
        await client.query(
          "SELECT * FROM ingredient_translations WHERE locale = 'und'",
        )
      ).rows,
    ).toEqual([])
    for (const alias of ['old alias', 'young onions', 'little onions'])
      expect(
        await database.transaction((tx) =>
          resolveIngredient(tx as any, alias, 99),
        ),
      ).toMatchObject({ id: 2 })

    db.select.mockImplementation(database.select.bind(database))
    expect(
      (await listManagedIngredients('little onions', 1)).ingredients.map(
        (row) => row.id,
      ),
    ).toEqual([2])
    expect(
      (await listMergeSources('little onions')).map((row) => row.id),
    ).toEqual([2])
    // General aliases can be edited and removed without changing translations.
    const edited = await saveManagedIngredient(
      {
        name: legacy.name,
        aliases: ['new alias'],
        translations: translationInput,
      },
      2,
    )
    expect(edited).toMatchObject({
      aliases: ['new alias'],
      translations: legacy.translations,
    })

    await client.exec(
      "INSERT INTO ingredients (name, is_catalog) VALUES ('Untranslated duplicate', false), ('Untranslated target', true)",
    )
    expect(await mergeIngredients(5, 6)).toEqual({
      id: 6,
      name: 'Untranslated target',
      aliases: ['untranslated duplicate'],
      translations: {},
    })
  } finally {
    db.transaction.mockReset()
    await client.close()
  }
}, 15000)

it('rejects a merge that would exceed the catalogue editor limits without losing aliases or references', async () => {
  const client = new PGlite()
  const database = pgliteDrizzle(client)
  db.transaction.mockImplementation(database.transaction.bind(database))
  try {
    await client.exec(`
      CREATE TABLE ingredients (id serial PRIMARY KEY, name text NOT NULL UNIQUE, is_catalog boolean DEFAULT false, name_cs text, aliases text[] DEFAULT '{}');
      CREATE TABLE ingredient_translations (ingredient_id int REFERENCES ingredients ON DELETE CASCADE, locale text, name text, aliases text[] DEFAULT '{}', PRIMARY KEY (ingredient_id, locale));
      CREATE TABLE user_ingredients (user_id int, ingredient_id int REFERENCES ingredients, PRIMARY KEY (user_id, ingredient_id));
      CREATE TABLE meal_ingredients (ingredient_id int REFERENCES ingredients);
      CREATE TABLE user_settings (pantry_ingredient_ids int[], pantry_staples text[]);
      INSERT INTO ingredients (name, is_catalog) VALUES ('Duplicate', true), ('Target', true);
      INSERT INTO meal_ingredients VALUES (1);
      UPDATE ingredients SET aliases = ARRAY(SELECT 'alias ' || n FROM generate_series(1, 100) n) WHERE id = 2;
    `)
    const target = (await listIngredientOptions(null, database as any)).find(
      (row) => row.id === 2,
    )!
    expect(
      ingredientAdminInput.safeParse({ ...target, translations: [] }).success,
    ).toBe(true)
    await expect(mergeIngredients(1, 2)).rejects.toThrow(
      'Merged ingredient exceeds catalogue limits',
    )
    expect(
      (await client.query('SELECT ingredient_id FROM meal_ingredients')).rows,
    ).toEqual([{ ingredient_id: 1 }])
    expect(await listIngredientOptions(null, database as any)).toEqual([
      expect.objectContaining({ id: 1 }),
      target,
    ])
  } finally {
    db.transaction.mockReset()
    await client.close()
  }
}, 15000)
