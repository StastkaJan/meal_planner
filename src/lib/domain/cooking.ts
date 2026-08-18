export function cookingSteps(instructions: string): string[] {
  return instructions
    .trim()
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((step) => step.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter(Boolean)
}

export function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}
