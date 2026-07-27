import type { IngredientInput } from './types'

// Recognized unit words/synonyms a free-text ingredient line might use, mapped to the
// canonical UNIT_OPTIONS value (see constants.ts).
const UNIT_SYNONYMS: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  piece: 'piece',
  pieces: 'piece',
  pcs: 'piece',
  clove: 'clove',
  cloves: 'clove',
  pinch: 'pinch',
  pinches: 'pinch',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
}

// Best-effort split of a free-text ingredient line (e.g. a recipe-import line) into qty/unit/
// name — "2 tbsp olive oil" -> {qty: 2, unit: 'tbsp', name: 'olive oil'}. Only recognizes a
// unit as the token immediately after the quantity; ponytail: "2 garlic cloves" (unit after
// the name) and "1 large apple" ("large" isn't a real unit) both fall through to the whole
// remainder as name — acceptable, user can fix up unit/qty in the edit form after import.
export function parseIngredientLine(raw: string): IngredientInput {
  const match = raw.match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(.+)$/)
  if (!match) return { qty: null, unit: null, name: raw }
  const [, qtyStr, rest] = match
  const qty = qtyStr.includes('/')
    ? Number(qtyStr.split('/')[0]) / Number(qtyStr.split('/')[1])
    : Number(qtyStr)
  const unitMatch = rest.match(/^([a-zA-Z]+)\s+(.+)$/)
  if (unitMatch) {
    const unit = UNIT_SYNONYMS[unitMatch[1].toLowerCase()]
    if (unit) return { qty, unit, name: unitMatch[2] }
  }
  return { qty, unit: null, name: rest }
}
