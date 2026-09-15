import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { PGlite } from '@electric-sql/pglite'

const migrations = readMigrationFiles({
  migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
}).filter(
  (migration) =>
    migration.folderMillis > 1788892202558 &&
    migration.folderMillis <= 1789293141322,
)

it.each([0, 1, 2, 3])(
  'unifies expanded catalogue aliases after %i previously applied stages',
  async (appliedStages) => {
    const db = new PGlite()
    try {
      await db.exec(`
        CREATE TABLE users (id integer PRIMARY KEY);
        CREATE TABLE meals (id integer PRIMARY KEY, user_id integer REFERENCES users);
        CREATE TABLE ingredients (id serial PRIMARY KEY, name text NOT NULL UNIQUE);
        CREATE TABLE meal_ingredients (
          meal_id integer REFERENCES meals, ingredient_id integer REFERENCES ingredients,
          position integer, PRIMARY KEY (meal_id, position)
        );
        CREATE TABLE user_settings (user_id integer PRIMARY KEY REFERENCES users, pantry_staples text[]);
        INSERT INTO users VALUES (1);
        INSERT INTO meals VALUES (1, NULL), (2, 1);
        INSERT INTO ingredients (name) VALUES ('Potatoes'), ('  BRAMBORY  '), ('My spice');
        INSERT INTO meal_ingredients VALUES (1, 1, 0), (2, 2, 0), (2, 3, 1);
        INSERT INTO user_settings VALUES (1, ARRAY['Potatoes', '  BRAMBORY  ', 'My spice']);
      `)
      const statements = migrations[0].sql
      for (const statement of statements.slice(0, appliedStages))
        await db.exec(statement)
      await db.exec(statements.join('\n'))
      const potato = (
        await db.query<{ id: number }>(
          "SELECT id FROM ingredients WHERE name = 'Potato'",
        )
      ).rows[0].id
      const check = async () => {
        expect(
          (
            await db.query(
              'SELECT ingredient_id, original_name FROM meal_ingredients ORDER BY meal_id, position',
            )
          ).rows,
        ).toEqual([
          { ingredient_id: potato, original_name: 'Potatoes' },
          { ingredient_id: potato, original_name: '  BRAMBORY  ' },
          { ingredient_id: 3, original_name: 'My spice' },
        ])
        const pantry = (
          await db.query<{
            pantry_ingredient_ids: number[]
            pantry_staples: string[]
          }>('SELECT * FROM user_settings')
        ).rows[0]
        expect(pantry.pantry_ingredient_ids.sort((a, b) => a - b)).toEqual([
          3,
          potato,
        ])
        expect(pantry.pantry_staples).toEqual([
          'Potatoes',
          '  BRAMBORY  ',
          'My spice',
        ])
        expect(
          (
            await db.query(
              'SELECT ingredient_id FROM user_ingredients ORDER BY ingredient_id',
            )
          ).rows,
        ).toEqual([{ ingredient_id: 3 }, { ingredient_id: potato }])
        expect(
          (
            await db.query(
              'SELECT is_catalog FROM ingredients WHERE id IN (1, 2)',
            )
          ).rows,
        ).toEqual([{ is_catalog: false }, { is_catalog: false }])
      }
      await check()
      // Retry preserves resolved links and administrator-maintained locale data.
      await db.exec(`
        INSERT INTO ingredients (name, is_catalog) VALUES ('Shared alias', true), ('First', true), ('Second', true);
        INSERT INTO ingredient_translations (ingredient_id, locale, name, aliases)
          SELECT id, 'en', name, ARRAY['shared alias'] FROM ingredients WHERE name IN ('First', 'Second');
        INSERT INTO ingredient_translations (ingredient_id, locale, name)
          VALUES (${potato}, 'de', 'Kartoffel');
      `)
      await db.exec(statements.join('\n'))
      await check()
      expect(
        (
          await db.query(
            "SELECT is_catalog FROM ingredients WHERE name = 'Shared alias'",
          )
        ).rows,
      ).toEqual([{ is_catalog: true }])
      expect(
        (
          await db.query(
            "SELECT name FROM ingredient_translations WHERE locale = 'de'",
          )
        ).rows,
      ).toEqual([{ name: 'Kartoffel' }])
    } finally {
      await db.close()
    }
  },
  15000,
)

describe('consolidated ingredient migration', () => {
  it.each([
    ['before the PR', 1788892202558, true],
    ['former catalogue migration applied', 1789133039998, true],
    ['catalogue and translations applied', 1789211278498, true],
    ['expanded catalogue already applied', 1789293141320, true],
    ['catalogue backfill already applied', 1789293141321, true],
    ['normalized names already reconciled', 1789293141322, false],
  ] as const)('handles %s', async (_state, timestamp, applies) => {
    const dialect = new PgDialect()
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    }).filter(
      (migration) =>
        migration.folderMillis > 1788892202558 &&
        migration.folderMillis <= 1789293141322,
    )
    expect(migrations).toHaveLength(1)
    const execute = vi.fn(async (_query: SQL) => [])
    const session = {
      execute: vi.fn(async () => []),
      all: vi.fn(async () => [{ created_at: timestamp }]),
      transaction: async (
        run: (tx: { execute: typeof execute }) => Promise<void>,
      ) => run({ execute }),
    }
    await dialect.migrate(
      migrations,
      session as unknown as Parameters<PgDialect['migrate']>[1],
      { migrationsFolder: '' },
    )
    const statements = execute.mock.calls.map(([query]) =>
      dialect.sqlToQuery(query),
    )
    if (!applies) {
      expect(statements).toEqual([])
      return
    }
    expect(statements[0].sql).toContain(
      "IF to_regclass('public.user_ingredients') IS NULL",
    )
    expect(statements[1].sql).toContain(
      "IF to_regclass('public.ingredient_translations') IS NULL",
    )
    expect(statements[2].sql).toContain('WITH catalogue')
    expect(statements[3].sql).toContain('DO $backfill$')
    expect(statements.at(-1)?.params[1]).toBe(1789293141322)
  })
})

it.each([null, 1])(
  'preserves case-insensitive custom pantry exclusions for recipe owner %s',
  async (owner) => {
    const db = new PGlite()
    try {
      await db.exec(`
        CREATE TABLE users (id integer PRIMARY KEY);
        CREATE TABLE meals (id integer PRIMARY KEY, user_id integer REFERENCES users);
        CREATE TABLE ingredients (id serial PRIMARY KEY, name text NOT NULL UNIQUE);
        CREATE TABLE meal_ingredients (
          meal_id integer REFERENCES meals, ingredient_id integer REFERENCES ingredients,
          position integer, PRIMARY KEY (meal_id, position)
        );
        CREATE TABLE user_settings (user_id integer PRIMARY KEY REFERENCES users, pantry_staples text[]);
        INSERT INTO users VALUES (1);
        INSERT INTO meals VALUES (1, ${owner === null ? 'NULL' : owner});
        INSERT INTO ingredients (name) VALUES ('My spice'), ('MY SPICE');
        INSERT INTO meal_ingredients VALUES (1, 1, 0), (1, 2, 1);
        INSERT INTO user_settings VALUES (1, ARRAY['my spice', 'Other seasoning']);
      `)
      // Earlier previews already created a separate lower-case pantry identity.
      for (const statement of migrations[0].sql.slice(0, 3))
        await db.exec(statement)
      const check = async () => {
        expect(
          (
            await db.query(
              'SELECT ingredient_id, original_name FROM meal_ingredients ORDER BY position',
            )
          ).rows,
        ).toEqual([
          { ingredient_id: 1, original_name: 'My spice' },
          { ingredient_id: 1, original_name: 'MY SPICE' },
        ])
        expect(
          (
            await db.query(
              `SELECT mi.ingredient_id FROM meal_ingredients mi CROSS JOIN user_settings s WHERE NOT mi.ingredient_id = ANY(s.pantry_ingredient_ids)`,
            )
          ).rows,
        ).toEqual([])
        expect(
          (
            await db.query(
              `SELECT i.name FROM user_ingredients u JOIN ingredients i ON i.id = u.ingredient_id ORDER BY i.name`,
            )
          ).rows,
        ).toEqual([{ name: 'My spice' }, { name: 'Other seasoning' }])
      }
      await db.exec(migrations[0].sql.join('\n'))
      await check()
      await db.exec(migrations[0].sql.join('\n'))
      await check()
      // Retrying the migration must preserve later pantry edits.
      await db.exec(`UPDATE user_settings SET pantry_ingredient_ids = ARRAY[1]`)
      await db.exec(migrations[0].sql.join('\n'))
      expect(
        (await db.query('SELECT pantry_ingredient_ids FROM user_settings'))
          .rows,
      ).toEqual([{ pantry_ingredient_ids: [1] }])
    } finally {
      await db.close()
    }
  },
  15000,
)
