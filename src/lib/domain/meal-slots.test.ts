import { describe, expect, it } from 'vitest'
import { normalizeMealSlot, parseMealSlots } from './meal-slots'

describe('meal slots', () => {
  it('normalizes a custom label for storage and display reuse', () => {
    expect(normalizeMealSlot('  Second Breakfast! ')).toBe('second_breakfast')
  })

  it('accepts one to ten unique normalized slots', () => {
    expect(
      parseMealSlots(['breakfast', 'Second breakfast', 'breakfast']),
    ).toEqual(['breakfast', 'second_breakfast'])
  })

  it.each([[], [''], [42], Array(11).fill('slot')])(
    'rejects an unusable slot list: %j',
    (value) => expect(parseMealSlots(value)).toBeNull(),
  )
})
