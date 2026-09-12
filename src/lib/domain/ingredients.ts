export type IngredientOption = {
  id: number
  name: string
  translations: Record<string, { name: string; aliases: string[] }>
}

export const ingredientDisplayName = (
  option: IngredientOption,
  locale: string,
) =>
  Object.hasOwn(option.translations, locale)
    ? option.translations[locale].name
    : option.name

export const ingredientNames = (option: IngredientOption) => [
  option.name,
  ...Object.values(option.translations).flatMap(({ name, aliases }) => [
    name,
    ...aliases,
  ]),
]

export const normalizeIngredientName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')

export function matchIngredient(name: string, options: IngredientOption[]) {
  const key = normalizeIngredientName(name)
  const matches = options.filter((option) =>
    ingredientNames(option).some(
      (alias) => alias && normalizeIngredientName(alias) === key,
    ),
  )
  return matches.length === 1 ? matches[0] : undefined
}

// Only exact unit equivalences: a cup/spoon has no universal metric size.
const units: Record<string, [string, number]> = {
  g: ['g', 1],
  gram: ['g', 1],
  grams: ['g', 1],
  gramů: ['g', 1],
  gramy: ['g', 1],
  kg: ['g', 1000],
  kilogram: ['g', 1000],
  kilograms: ['g', 1000],
  kilogramů: ['g', 1000],
  ml: ['ml', 1],
  milliliter: ['ml', 1],
  milliliters: ['ml', 1],
  l: ['ml', 1000],
  liter: ['ml', 1000],
  liters: ['ml', 1000],
  litre: ['ml', 1000],
  litr: ['ml', 1000],
  piece: ['piece', 1],
  pieces: ['piece', 1],
  ks: ['piece', 1],
  kus: ['piece', 1],
  kusy: ['piece', 1],
  kusů: ['piece', 1],
}

export function normalizeIngredientUnit(unit: string | null) {
  const key = unit?.trim().toLocaleLowerCase('en') || null
  return key
    ? Object.hasOwn(units, key)
      ? units[key]
      : ([key, 1] as const)
    : ([null, 1] as const)
}

export function aggregateShoppingIngredients<
  T extends {
    ingredientId: number
    name: string
    unit: string | null
    qty: number | null
    count: number
  },
>(rows: T[]) {
  const grouped = new Map<string, T>()
  for (const row of rows) {
    const [unit, scale] = normalizeIngredientUnit(row.unit)
    const key = JSON.stringify([row.ingredientId, unit])
    const qty = row.qty === null ? null : row.qty * scale
    const previous = grouped.get(key)
    if (previous) {
      previous.qty =
        previous.qty === null || qty === null ? null : previous.qty + qty
      previous.count += row.count
    } else grouped.set(key, { ...row, unit, qty })
  }
  return [...grouped.values()]
}
