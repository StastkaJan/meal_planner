import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateProfile } from './profile'

afterEach(() => vi.unstubAllGlobals())

describe('updateProfile', () => {
  it('rejects failed responses instead of reporting a successful save', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Save failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await expect(updateProfile({ pantryStaples: ['salt'] })).rejects.toThrow(
      'Save failed',
    )
  })
})
