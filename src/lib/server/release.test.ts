import { describe, expect, it } from 'vitest'
import { normalizeRelease } from './release'

describe('release identification', () => {
  it('accepts bounded commit and version labels', () => {
    expect(normalizeRelease('  75cbd6b  ')).toBe('75cbd6b')
    expect(normalizeRelease('v1.2.3-rc.1')).toBe('v1.2.3-rc.1')
  })

  it('falls back for missing or unsafe labels', () => {
    expect(normalizeRelease(undefined)).toBe('unknown')
    expect(normalizeRelease('release with spaces')).toBe('unknown')
    expect(normalizeRelease('a'.repeat(65))).toBe('unknown')
  })
})
