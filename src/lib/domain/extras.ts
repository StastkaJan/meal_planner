export type ExtraFields = {
  name: string
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
  sugarG: number | null
  saturatedFatG: number | null
  saltG: number | null
}

export const EXTRA_PRESETS = [
  {
    name: 'Pizza',
    calories: 800,
    proteinG: 32,
    carbsG: 96,
    fatG: 32,
    fiberG: 6,
    sugarG: 8,
    saturatedFatG: 14,
    saltG: 3.2,
  },
  {
    name: 'Fast food',
    calories: 1000,
    proteinG: 35,
    carbsG: 110,
    fatG: 48,
    fiberG: 8,
    sugarG: 15,
    saturatedFatG: 16,
    saltG: 4,
  },
  {
    name: 'Beer',
    calories: 210,
    proteinG: 2,
    carbsG: 18,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    saturatedFatG: 0,
    saltG: 0.02,
  },
  {
    name: 'Dessert',
    calories: 450,
    proteinG: 6,
    carbsG: 58,
    fatG: 22,
    fiberG: 3,
    sugarG: 40,
    saturatedFatG: 13,
    saltG: 0.5,
  },
  {
    name: 'Latte / cappuccino',
    calories: 120,
    proteinG: 6,
    carbsG: 10,
    fatG: 6,
    fiberG: 0,
    sugarG: 10,
    saturatedFatG: 3.5,
    saltG: 0.15,
  },
] as const satisfies readonly ExtraFields[]
