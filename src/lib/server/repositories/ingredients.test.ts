import { beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'

const db = vi.hoisted(() => ({ select: vi.fn(), transaction: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import {
  listIngredientOptions,
  resolveIngredient,
  saveManagedIngredient,
  listManagedIngredients,
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
