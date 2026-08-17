import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseIngredientLine } from '../src/lib/server/services/recipe-import'

const API = 'https://www.themealdb.com/api/json/v1/1/search.php?f='
const SUPPORTED_CUISINES = new Set([
  'American',
  'Chinese',
  'Indian',
  'Italian',
  'Japanese',
  'Mexican',
  'Thai',
])

type SourceMeal = Record<string, string | null> & {
  idMeal: string
  strMeal: string
  strInstructions: string
}

export function normalizeMeal(meal: SourceMeal) {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const ingredient = meal[`strIngredient${index + 1}`]?.trim()
    if (!ingredient) return null
    const measure = meal[`strMeasure${index + 1}`]?.trim() ?? ''
    return parseIngredientLine(`${measure} ${ingredient}`)
  }).filter((value) => value !== null)

  return {
    name: meal.strMeal.trim(),
    description:
      [meal.strCategory, meal.strArea].filter(Boolean).join(' · ') +
      `. Recipe data from TheMealDB (ID ${meal.idMeal}).`,
    imageUrl: meal.strMealThumb,
    tags:
      meal.strArea && SUPPORTED_CUISINES.has(meal.strArea)
        ? [meal.strArea]
        : [],
    ingredients,
    instructions: meal.strInstructions.trim(),
  }
}

export function selectMeals(
  meals: SourceMeal[],
  limit: number,
  excludedNames = new Set<string>(),
) {
  const available = meals
    .filter((meal) => !excludedNames.has(meal.strMeal.trim()))
    .sort((a, b) => a.strMeal.localeCompare(b.strMeal))
  const count = Math.min(limit, available.length)
  return Array.from(
    { length: count },
    (_, index) => available[Math.floor((index * available.length) / count)],
  )
}

async function main() {
  const limit = Number(process.argv[2] ?? 300)
  const outputPath = process.argv[3] ?? 'data/themealdb-recipes.json'
  const excludePaths = process.argv.slice(4)
  if (!Number.isInteger(limit) || limit < 1 || limit > 300)
    throw new Error('Recipe count must be an integer from 1 to 300')

  const excludedNames = new Set<string>()
  for (const excludePath of excludePaths) {
    const excluded = JSON.parse(await readFile(excludePath, 'utf8')) as {
      name?: unknown
    }[]
    for (const recipe of excluded)
      if (typeof recipe.name === 'string') excludedNames.add(recipe.name.trim())
  }

  const responses = await Promise.all(
    'abcdefghijklmnopqrstuvwxyz'.split('').map(async (letter) => {
      const response = await fetch(`${API}${letter}`)
      if (!response.ok) throw new Error(`TheMealDB returned ${response.status}`)
      return (await response.json()) as { meals: SourceMeal[] | null }
    }),
  )
  const meals = responses.flatMap(({ meals }) => meals ?? [])
  const recipes = selectMeals(meals, limit, excludedNames).map(normalizeMeal)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(recipes, null, 2)}\n`)
  console.log(`Saved ${recipes.length} recipes to ${outputPath}`)
}

if (process.argv[1]?.endsWith('fetch-themealdb-recipes.ts')) await main()
