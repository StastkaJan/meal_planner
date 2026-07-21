import { describe, it, expect } from 'vitest'
import { addDays, mondayOf, groupWindow } from './date'

describe('addDays', () => {
  it('adds and subtracts days across month/year boundaries', () => {
    expect(addDays('2024-01-01', 1)).toBe('2024-01-02')
    expect(addDays('2024-01-01', -1)).toBe('2023-12-31')
  })
})

describe('mondayOf', () => {
  it("snaps any day in the week to that week's Monday", () => {
    // 2024-01-01 is a Monday
    expect(mondayOf('2024-01-01')).toBe('2024-01-01')
    expect(mondayOf('2024-01-03')).toBe('2024-01-01') // Wednesday
    expect(mondayOf('2024-01-07')).toBe('2024-01-01') // Sunday
    expect(mondayOf('2024-01-08')).toBe('2024-01-08') // next Monday
  })
})

describe('groupWindow', () => {
  // Mon-Tue / Wed-Thu / Fri-Sat-Sun
  const monTueWedThuFriSatSun = [false, true, false, true, false, false]

  it('groups Mon-Tue together', () => {
    expect(groupWindow('2024-01-01', monTueWedThuFriSatSun)).toEqual([
      '2024-01-01',
      '2024-01-02',
    ])
    expect(groupWindow('2024-01-02', monTueWedThuFriSatSun)).toEqual([
      '2024-01-01',
      '2024-01-02',
    ])
  })

  it('groups Wed-Thu together', () => {
    expect(groupWindow('2024-01-03', monTueWedThuFriSatSun)).toEqual([
      '2024-01-03',
      '2024-01-04',
    ])
    expect(groupWindow('2024-01-04', monTueWedThuFriSatSun)).toEqual([
      '2024-01-03',
      '2024-01-04',
    ])
  })

  it('groups Fri-Sat-Sun together', () => {
    expect(groupWindow('2024-01-05', monTueWedThuFriSatSun)).toEqual([
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ])
    expect(groupWindow('2024-01-07', monTueWedThuFriSatSun)).toEqual([
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ])
  })

  it('treats all-true (every gap split) as no grouping', () => {
    const noGrouping = [true, true, true, true, true, true]
    expect(groupWindow('2024-01-03', noGrouping)).toEqual(['2024-01-03'])
  })

  it('treats all-false (every gap joined) as the whole week grouped', () => {
    const wholeWeek = [false, false, false, false, false, false]
    expect(groupWindow('2024-01-04', wholeWeek)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ])
  })
})
