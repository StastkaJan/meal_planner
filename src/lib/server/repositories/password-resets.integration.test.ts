import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'

vi.mock('$lib/database', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  return { db: drizzle(new PGlite()) }
})
import { db } from '$lib/database'
import { consumePasswordReset, savePasswordReset } from './password-resets'

const client = (db as unknown as { $client: PGlite }).$client
beforeAll(async () => {
  await client.exec(`
    CREATE TABLE users (id integer PRIMARY KEY, email text NOT NULL, password_hash text NOT NULL, is_admin boolean DEFAULT false, is_pro boolean DEFAULT false);
    CREATE TABLE sessions (id text PRIMARY KEY, user_id integer REFERENCES users ON DELETE CASCADE, expires_at timestamp NOT NULL);
    INSERT INTO users (id, email, password_hash) VALUES (1, 'reset@example.com', 'old'), (2, 'other@example.com', 'other');
    INSERT INTO sessions VALUES ('first', 1, now() + interval '1 day'), ('second', 1, now() + interval '1 day'), ('other', 2, now() + interval '1 day');
  `)
  await client.exec(
    readFileSync(
      new URL(
        '../../../../drizzle/0028_email_password_reset.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
}, 15000)
afterAll(() => client.close())

it('applies the migration and enforces expiry, replacement, single use, session isolation, and account deletion', async () => {
  expect(await savePasswordReset(1, 'old', 'expired', new Date(0))).toBe(true)
  expect(await consumePasswordReset('expired', 'new')).toBe(false)
  const expires = new Date(Date.now() + 30 * 60_000)
  await savePasswordReset(1, 'old', 'replaced', expires)
  await savePasswordReset(1, 'old', 'active', expires)
  expect(await consumePasswordReset('replaced', 'new')).toBe(false)
  expect(await consumePasswordReset('active', 'new')).toBe(true)
  expect(await consumePasswordReset('active', 'replay')).toBe(false)
  expect((await client.query('SELECT id FROM sessions')).rows).toEqual([
    { id: 'other' },
  ])
  expect(
    (await client.query('SELECT password_hash FROM users WHERE id = 1')).rows,
  ).toEqual([{ password_hash: 'new' }])
  expect(await savePasswordReset(1, 'old', 'stale', expires)).toBe(false)
  await savePasswordReset(1, 'new', 'changed-password', expires)
  await client.exec("UPDATE users SET password_hash = 'changed' WHERE id = 1")
  expect(await consumePasswordReset('changed-password', 'bad')).toBe(false)
  await client.exec('DELETE FROM users WHERE id = 1')
  expect((await client.query('SELECT * FROM password_resets')).rows).toEqual([])
})

it('rolls back token consumption and password changes if session revocation fails', async () => {
  await savePasswordReset(
    2,
    'other',
    'rollback',
    new Date(Date.now() + 30 * 60_000),
  )
  await client.exec(`
    CREATE FUNCTION fail_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;
    CREATE TRIGGER fail_session_delete BEFORE DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION fail_session_delete();
  `)
  await expect(consumePasswordReset('rollback', 'wrong')).rejects.toThrow()
  expect(
    (await client.query('SELECT password_hash FROM users WHERE id = 2')).rows,
  ).toEqual([{ password_hash: 'other' }])
  expect(
    (
      await client.query(
        'SELECT token_hash FROM password_resets WHERE user_id = 2',
      )
    ).rows,
  ).toEqual([{ token_hash: 'rollback' }])
  await client.exec('DROP TRIGGER fail_session_delete ON sessions')
  expect(await consumePasswordReset('rollback', 'new')).toBe(true)
})
