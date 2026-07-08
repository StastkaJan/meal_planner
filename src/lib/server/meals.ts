// Whitelist of columns a client may write on a meal. Prevents mass-assignment
// from a raw request body (id is server-owned).
const WRITABLE = [
  'name', 'calories', 'proteinG', 'carbsG', 'fatG', 'tags',
  'imageUrl', 'description', 'ingredients', 'instructions',
  'timeMinutes', 'difficulty',
] as const;

export function pickMealFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}
