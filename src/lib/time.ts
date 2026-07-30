export function isoDurationToMinutes(iso: unknown): number | undefined {
  if (typeof iso !== 'string') return undefined
  const match = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?$/)
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined
  return (
    Number(match[1] ?? 0) * 1440 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  )
}
