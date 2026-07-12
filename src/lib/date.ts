// add n days to a 'YYYY-MM-DD' string, UTC, returns 'YYYY-MM-DD'
export function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
