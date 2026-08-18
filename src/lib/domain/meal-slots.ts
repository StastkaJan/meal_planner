export function normalizeMealSlot(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function parseMealSlots(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10)
    return null

  const slots = value.map((slot) =>
    typeof slot === 'string' && slot.length <= 40
      ? normalizeMealSlot(slot)
      : '',
  )
  if (slots.some((slot) => !slot)) return null
  return [...new Set(slots)]
}
