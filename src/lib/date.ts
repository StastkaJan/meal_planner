// add n days to a 'YYYY-MM-DD' string, UTC, returns 'YYYY-MM-DD'
export function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// snap a 'YYYY-MM-DD' string to the Monday of its week, UTC, returns 'YYYY-MM-DD'
export function mondayOf(iso: string): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

// Given a date and a meal type's weekly repeat pattern (6 booleans for the gaps
// Mon|Tue..Sat|Sun, true = split), returns every date in the same Mon–Sun group as `date`.
export function groupWindow(date: string, groupBreaks: boolean[]): string[] {
  const monday = mondayOf(date)
  const dayIdx = Math.round(
    (Date.parse(date) - Date.parse(monday)) / 86_400_000,
  )
  let start = dayIdx
  while (start > 0 && !groupBreaks[start - 1]) start--
  let end = dayIdx
  while (end < 6 && !groupBreaks[end]) end++
  return Array.from({ length: end - start + 1 }, (_, i) =>
    addDays(monday, start + i),
  )
}
