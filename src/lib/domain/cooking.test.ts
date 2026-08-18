import { describe, expect, it } from 'vitest'
import { cookingSteps, formatTimer } from './cooking'

describe('cookingSteps', () => {
  it('turns numbered lines and sentences into readable steps', () => {
    expect(
      cookingSteps(
        '1. Heat the oven.\n2. Bake for 20 min. Rest before serving.',
      ),
    ).toEqual(['Heat the oven.', 'Bake for 20 min.', 'Rest before serving.'])
  })
})

describe('formatTimer', () => {
  it('formats minute and hour countdowns', () => {
    expect(formatTimer(65)).toBe('1:05')
    expect(formatTimer(3661)).toBe('1:01:01')
  })
})
