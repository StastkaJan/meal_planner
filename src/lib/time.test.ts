import { describe, expect, it } from 'vitest'
import { isoDurationToMinutes } from './time'

describe('isoDurationToMinutes', () => {
  it('parses days, hours, and minutes', () => {
    expect(isoDurationToMinutes('P1DT1H30M')).toBe(1530)
    expect(isoDurationToMinutes('PT20M')).toBe(20)
  })

  it('rejects invalid durations', () => {
    expect(isoDurationToMinutes('banana')).toBeUndefined()
    expect(isoDurationToMinutes(undefined)).toBeUndefined()
  })
})
