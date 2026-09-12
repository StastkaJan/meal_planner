import { beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'

const db = vi.hoisted(() => ({ select: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import { listIngredientOptions, resolveIngredient } from './ingredients'

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
