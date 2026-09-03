import { describe, expect, it, vi } from 'vitest'
import { createPinnedLookup, isPublicIp } from './safe-fetch'

describe('isPublicIp', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::127.0.0.1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicIp(address)).toBe(false)
  })

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])(
    'allows public address %s',
    (address) => expect(isPublicIp(address)).toBe(true),
  )
})

describe('createPinnedLookup', () => {
  const pinned = { address: '203.0.113.10', family: 4 }

  it('returns the modern address array when Node requests all results', () => {
    const callback = vi.fn()

    createPinnedLookup(pinned)('example.com', { all: true }, callback)

    expect(callback).toHaveBeenCalledWith(null, [pinned])
  })

  it('returns the legacy address and family for a single result', () => {
    const callback = vi.fn()

    createPinnedLookup(pinned)('example.com', {}, callback)

    expect(callback).toHaveBeenCalledWith(null, pinned.address, pinned.family)
  })
})
