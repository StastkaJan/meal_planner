import { readFile, writeFile } from 'node:fs/promises'

type Ingredient = { name: string; qty: number | null; unit: string | null }
type Recipe = {
  name: string
  description?: string
  tags?: string[]
  ingredients: Ingredient[]
  instructions?: string
  servings?: number
  timeMinutes?: number
  difficulty?: string
  [key: string]: unknown
}
type Nutrient = { nutrient: { id: number }; amount: number }
type Portion = { amount: number; gramWeight: number; modifier?: string }
type UsdaFood = {
  description: string
  foodNutrients: Nutrient[]
  foodPortions?: Portion[]
}
type FoodIndex = {
  foods: UsdaFood[]
  tokens: Map<string, Set<number>>
}

const NUTRIENTS = { calories: 1008, proteinG: 1003, carbsG: 1005, fatG: 1004 }
const STOP_WORDS = new Set([
  'fresh',
  'dried',
  'ground',
  'chopped',
  'minced',
  'sliced',
  'diced',
  'crushed',
  'grated',
  'peeled',
  'large',
  'medium',
  'small',
  'finely',
  'roughly',
  'optional',
  'taste',
  'pinch',
  'tbs',
  'tbsp',
  'tsp',
  'cup',
  'cups',
  'tablespoon',
  'teaspoon',
  'of',
  'and',
  'or',
  'for',
  'the',
  'a',
  'an',
])
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  oz: 28.3495,
  lb: 453.592,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  pinch: 0.3,
  clove: 3,
  slice: 30,
  can: 400,
  piece: 100,
}

export function preparationMinutes(recipe: Recipe) {
  const durations = [
    ...(recipe.instructions ?? '').matchAll(
      /(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*)?(hours?|hrs?|minutes?|mins?)\b/gi,
    ),
  ]
  const explicit = durations.reduce((total, match) => {
    const value = Number(match[2] ?? match[1])
    return total + value * (/^(?:hours?|hrs?)$/i.test(match[3]) ? 60 : 1)
  }, 0)
  return Math.min(
    360,
    explicit || Math.ceil((10 + recipe.ingredients.length * 2) / 5) * 5,
  )
}

export function recipeDifficulty(recipe: Recipe, timeMinutes: number) {
  if (timeMinutes > 90 || recipe.ingredients.length > 15) return 'hard'
  if (timeMinutes > 30 || recipe.ingredients.length > 8) return 'medium'
  return 'easy'
}

export function normalizeRecipe(
  recipe: Recipe,
  servings = recipe.servings ?? 1,
) {
  const timeMinutes = recipe.timeMinutes ?? preparationMinutes(recipe)
  const oldNote =
    'Nutrition estimated from USDA SR Legacy ingredient data; serving count inferred.'
  const note =
    'Nutrition estimated from USDA SR Legacy ingredient data; quantities normalized to one serving.'
  return {
    ...recipe,
    description: recipe.description?.includes(note)
      ? recipe.description
      : `${recipe.description?.replace(oldNote, '').trim() ?? ''} ${note}`.trim(),
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      qty:
        ingredient.qty == null
          ? null
          : Number((ingredient.qty / servings).toFixed(3)),
    })),
    timeMinutes,
    difficulty: recipe.difficulty ?? recipeDifficulty(recipe, timeMinutes),
    servings: 1,
  }
}

function singular(word: string) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('ses') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3)
    return word.slice(0, -1)
  return word
}

function words(value: string) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .map(singular)
        .filter((word) => word.length > 1 && !STOP_WORDS.has(word)),
    ),
  ]
}

export function buildFoodIndex(foods: UsdaFood[]): FoodIndex {
  const tokens = new Map<string, Set<number>>()
  foods.forEach((food, index) => {
    for (const token of words(food.description)) {
      const matches = tokens.get(token) ?? new Set<number>()
      matches.add(index)
      tokens.set(token, matches)
    }
  })
  return { foods, tokens }
}

function findFood(name: string, index: FoodIndex) {
  const query = words(name)
  if (!query.length) return null
  const candidateSets = query
    .map((word) => index.tokens.get(word))
    .filter(Boolean) as Set<number>[]
  if (!candidateSets.length) return null
  const candidates = [...candidateSets.sort((a, b) => a.size - b.size)[0]]
  let best: { food: UsdaFood; score: number } | null = null
  for (const candidate of candidates) {
    const food = index.foods[candidate]
    const foodWords = words(food.description)
    const overlap = query.filter((word) => foodWords.includes(word)).length
    if (overlap / query.length < 0.5) continue
    const first = foodWords[0] === query[0] ? 2 : 0
    const score =
      overlap * 10 + first - Math.min(foodWords.length - overlap, 20) * 0.1
    if (!best || score > best.score) best = { food, score }
  }
  return best?.food ?? null
}

function ingredientGrams(ingredient: Ingredient, food: UsdaFood) {
  if (ingredient.qty == null) return null
  if (!ingredient.unit) {
    if (/^g\//i.test(ingredient.name)) return ingredient.qty
    if (/^kg\//i.test(ingredient.name)) return ingredient.qty * 1000
    if (/^ml\//i.test(ingredient.name)) return ingredient.qty
    if (/^litre\b/i.test(ingredient.name)) return ingredient.qty * 1000
  }
  const unit = ingredient.unit ?? 'piece'
  if (['g', 'kg', 'ml', 'l', 'oz', 'lb'].includes(unit))
    return ingredient.qty * UNIT_GRAMS[unit]
  const aliases: Record<string, RegExp> = {
    cup: /\bcup\b/i,
    tbsp: /\b(?:tbsp|tablespoon)\b/i,
    tsp: /\b(?:tsp|teaspoon)\b/i,
    slice: /\bslice\b/i,
    can: /\bcan\b/i,
    clove: /\bclove\b/i,
    piece: /\b(?:piece|whole|medium|large|small)\b/i,
  }
  const portion = food.foodPortions?.find((value) =>
    aliases[unit]?.test(value.modifier ?? ''),
  )
  const grams = portion
    ? ingredient.qty * (portion.gramWeight / (portion.amount || 1))
    : ingredient.qty * (UNIT_GRAMS[unit] ?? 100)
  return Math.min(grams, 5000)
}

function nutrient(food: UsdaFood, id: number) {
  return (
    food.foodNutrients.find((value) => value.nutrient.id === id)?.amount ?? 0
  )
}

const has = (ingredients: Ingredient[], pattern: RegExp) =>
  ingredients.some(({ name }) => pattern.test(name.toLowerCase()))

function dietaryTags(ingredients: Ingredient[]) {
  const meat =
    /\b(?:beef|chicken|pork|lamb|turkey|duck|bacon|ham|sausage|steak|veal|venison|rabbit|lard|prosciutto|chorizo|pepperoni|gelatin|salmon|tuna|cod|haddock|mackerel|sardine|anchov\w*|fish|shrimp|prawn|crab|lobster|oyster|clam|mussel|squid|octopus|scallop)\b/
  const dairy =
    /\b(?:milk|butter|cream|cheese|yogurt|yoghurt|whey|ghee|buttermilk|mascarpone|mozzarella|parmesan|cheddar|feta)\b/
  const egg = /\b(?:egg|eggs|mayonnaise|mayo|aioli|meringue)\b/
  const nuts =
    /\b(?:almond|walnut|pecan|pistachio|cashew|hazelnut|peanut|macadamia|chestnut|marzipan|nutella|coconut)\w*\b/
  const gluten =
    /\b(?:wheat|flour|bread|pasta|spaghetti|noodle|barley|rye|couscous|semolina|tortilla|cracker|biscuit|breadcrumb|panko|oat|soy sauce)\w*\b/
  const glutenExceptions =
    /\b(?:rice|corn|maize|almond|coconut|chickpea|gram|gluten.free) flour\b/
  const hasMeat = has(ingredients, meat)
  const hasDairy = has(ingredients, dairy)
  const hasEgg = has(ingredients, egg)
  const hasNuts = has(ingredients, nuts)
  const hasGluten = ingredients.some(
    ({ name }) =>
      gluten.test(name.toLowerCase()) &&
      !glutenExceptions.test(name.toLowerCase()),
  )
  const tags: string[] = []
  if (!hasMeat) tags.push('Vegetarian')
  if (!hasMeat && !hasDairy && !hasEgg && !has(ingredients, /\bhoney\b/))
    tags.push('Vegan')
  if (!hasEgg) tags.push('no_eggs')
  if (!hasDairy) tags.push('no_lactose')
  if (!hasGluten) tags.push('no_gluten')
  if (!hasNuts) tags.push('no_nuts')
  return tags
}

function cuisineTag(recipe: Recipe) {
  const area = recipe.description?.match(/·\s*([^.]+)\. Recipe data/)?.[1]
  if (!area) return []
  if (area === 'India') return ['Indian']
  if (area === 'United States') return ['American']
  if (
    [
      'American',
      'Chinese',
      'Indian',
      'Italian',
      'Japanese',
      'Mexican',
      'Thai',
    ].includes(area)
  )
    return [area]
  if (
    /^(Croatian|Egyptian|Greek|Moroccan|Portuguese|Spanish|Tunisian|Turkish)$/.test(
      area,
    )
  )
    return ['Mediterranean']
  return []
}

export function enrichRecipe(recipe: Recipe, index: FoodIndex) {
  const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  let quantified = 0
  let matched = 0
  for (const ingredient of recipe.ingredients) {
    if (ingredient.qty == null) continue
    quantified++
    const food = findFood(ingredient.name, index)
    if (!food) continue
    const grams = ingredientGrams(ingredient, food)
    if (grams == null) continue
    matched++
    for (const [field, id] of Object.entries(NUTRIENTS))
      totals[field as keyof typeof totals] += (nutrient(food, id) * grams) / 100
  }
  const coverage = quantified ? matched / quantified : 0
  const category = recipe.description?.split('·')[0].trim()
  const target =
    category === 'Dessert' ? 300 : category === 'Breakfast' ? 450 : 600
  const servings =
    recipe.servings && recipe.servings > 0
      ? recipe.servings
      : totals.calories > 0
        ? Math.max(1, Math.min(24, Math.round(totals.calories / target)))
        : 1
  const perServing = Object.fromEntries(
    Object.entries(totals).map(([field, value]) => [field, value / servings]),
  ) as typeof totals
  const macroTags: string[] = []
  if (coverage >= 0.7) {
    if (
      perServing.proteinG >= 20 &&
      perServing.proteinG * 4 >= perServing.calories * 0.2
    )
      macroTags.push('high_protein')
    if (perServing.carbsG <= 20) macroTags.push('low_carb')
    if (perServing.fatG <= 10) macroTags.push('low_fat')
  }
  return normalizeRecipe(
    {
      ...recipe,
      tags: [
        ...new Set([
          ...cuisineTag(recipe),
          ...dietaryTags(recipe.ingredients),
          ...macroTags,
        ]),
      ],
      calories: Math.round(perServing.calories),
      proteinG: Number(perServing.proteinG.toFixed(1)),
      carbsG: Number(perServing.carbsG.toFixed(1)),
      fatG: Number(perServing.fatG.toFixed(1)),
    },
    servings,
  )
}

async function main() {
  const [usdaPath, ...recipePaths] = process.argv.slice(2)
  if (usdaPath === '--normalize') {
    for (const path of recipePaths) {
      const recipes = JSON.parse(await readFile(path, 'utf8')) as Recipe[]
      const normalized = recipes.map((recipe) => normalizeRecipe(recipe))
      await writeFile(path, `${JSON.stringify(normalized, null, 2)}\n`)
      console.log(`Normalized ${normalized.length} recipes in ${path}`)
    }
    return
  }
  if (!usdaPath || !recipePaths.length)
    throw new Error(
      'Usage: recipes:enrich <USDA JSON> <recipe JSON...> | --normalize <recipe JSON...>',
    )
  const usda = JSON.parse(await readFile(usdaPath, 'utf8')) as {
    SRLegacyFoods: UsdaFood[]
  }
  const index = buildFoodIndex(usda.SRLegacyFoods)
  for (const path of recipePaths) {
    const recipes = JSON.parse(await readFile(path, 'utf8')) as Recipe[]
    const enriched = recipes.map((recipe) => enrichRecipe(recipe, index))
    await writeFile(path, `${JSON.stringify(enriched, null, 2)}\n`)
    console.log(`Enriched ${enriched.length} recipes in ${path}`)
  }
}

if (process.argv[1]?.endsWith('enrich-recipes.ts')) await main()
