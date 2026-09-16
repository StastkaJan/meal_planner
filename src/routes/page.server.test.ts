import { expect, it } from 'vitest'
import { load } from './+page.server'

function event(query = '') {
  return { url: new URL(`http://localhost/${query}`) } as Parameters<
    typeof load
  >[0]
}

it.each(['', '?utm_source=newsletter'])(
  'renders the homepage for %s',
  (query) => {
    expect(load(event(query))).toBeUndefined()
  },
)

it.each([
  '?plan=7&week=2026-09-14',
  '?week=2026-09-14',
  '?pickDate=2026-09-14&pickSlot=lunch&pickQuery=soup&pickMine=1&pickPage=2',
])('preserves legacy planner bookmarks: %s', (query) => {
  try {
    load(event(query))
    expect.unreachable('Expected a redirect')
  } catch (error) {
    expect(error).toMatchObject({ status: 307, location: `/planner${query}` })
  }
})
