import { describe, expect, it } from 'vitest'
import { requirePro } from './guards'

const locals = (isPro: boolean) =>
  ({
    user: {
      id: 1,
      email: 'cook@example.com',
      isAdmin: false,
      isPro,
      locale: 'en',
    },
    locale: 'en',
  }) as App.Locals

describe('requirePro', () => {
  it('rejects a free user', () => {
    expect(() => requirePro(locals(false))).toThrow(
      expect.objectContaining({ status: 403 }),
    )
  })

  it('returns a Pro user', () => {
    expect(requirePro(locals(true))).toMatchObject({ id: 1, isPro: true })
  })
})
