export const AISLES = [
  'Produce',
  'Bakery',
  'Dairy & eggs',
  'Meat & fish',
  'Pantry',
  'Frozen',
  'Other',
] as const

export type ShoppingListItem = {
  key: string
  name: string
  unit: string | null
  qty: number | null
  count: number
  aisle: string
  checked: boolean
  excluded: boolean
  custom: boolean
}

type SavedShoppingItem = Omit<ShoppingListItem, 'qty' | 'count'>
type DerivedShoppingItem = Pick<
  ShoppingListItem,
  'name' | 'unit' | 'qty' | 'count'
>

export function ingredientShoppingKey(name: string, unit: string | null) {
  return `ingredient:${JSON.stringify([name, unit])}`
}

export function mergeShoppingItems(
  derived: DerivedShoppingItem[],
  saved: SavedShoppingItem[],
): ShoppingListItem[] {
  const savedByKey = new Map(saved.map((item) => [item.key, item]))
  const items = derived.map((item) => {
    const key = ingredientShoppingKey(item.name, item.unit)
    return {
      ...item,
      key,
      aisle: 'Other',
      checked: false,
      excluded: false,
      custom: false,
      ...savedByKey.get(key),
    }
  })

  return items.concat(
    saved
      .filter((item) => item.custom)
      .map((item) => ({ ...item, qty: null, count: 1 })),
  )
}
