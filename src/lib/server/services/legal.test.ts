import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLegalDocumentEvents = vi.hoisted(() => vi.fn())
const saveLegalDocumentEvent = vi.hoisted(() => vi.fn())

vi.mock('../repositories/legal', () => ({
  getLegalDocumentEvents,
  saveLegalDocumentEvent,
}))

import { getPendingLegalNotices, recordCurrentLegalNotice } from './legal'

beforeEach(() => vi.clearAllMocks())

describe('legal notices', () => {
  it('returns only current document versions the user has not recorded', async () => {
    getLegalDocumentEvents.mockResolvedValueOnce([
      { document: 'terms', version: '0.1' },
    ])

    await expect(getPendingLegalNotices(42)).resolves.toEqual([
      expect.objectContaining({
        document: 'privacy',
        version: '0.1',
        action: 'acknowledged',
      }),
    ])
  })

  it('records only a configured current document version', async () => {
    await expect(recordCurrentLegalNotice(42, 'terms', 'old')).resolves.toBe(
      false,
    )
    expect(saveLegalDocumentEvent).not.toHaveBeenCalled()

    await expect(recordCurrentLegalNotice(42, 'terms', '0.1')).resolves.toBe(
      true,
    )
    expect(saveLegalDocumentEvent).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        document: 'terms',
        version: '0.1',
        action: 'accepted',
      }),
    )
  })
})
