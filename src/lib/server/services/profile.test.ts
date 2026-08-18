import { describe, expect, it } from 'vitest'
import { toPantryStaples } from './profile'

describe('toPantryStaples', () => {
  it('parses, trims, and deduplicates pantry ingredient names', () => {
    expect(toPantryStaples(' Salt\nolive oil, salt \n')).toEqual([
      'Salt',
      'olive oil',
    ])
  })
})
