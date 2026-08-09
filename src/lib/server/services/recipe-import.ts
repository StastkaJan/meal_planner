import { isoDurationToMinutes } from '$lib/utils/date-time'
import type { ImportedRecipe } from '$lib/types'

const UNIT_ALIASES: Record<string, string> = {
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
  pound: 'lb',
  pounds: 'lb',
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}

export function parseIngredientLine(line: string) {
  const value = line.trim().replace(/^[-•]\s*/, '')
  // ponytail: common leading quantities only; use a recipe NLP parser if imports
  // need ranges, spelled-out numbers, or package-size inference.
  const match = value.match(
    /^(\d+\s+\d+\/\d+|\d+\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(.*)$/,
  )
  if (!match) return { name: value, qty: null, unit: null }

  const quantity = match[1]
  const qty = quantity.includes(' ')
    ? quantity.split(' ').reduce((sum, part) => sum + fraction(part), 0)
    : fraction(quantity)
  const [first = '', ...rest] = match[2].trim().split(/\s+/)
  const unit = UNIT_ALIASES[first.toLowerCase().replace(/\.$/, '')] ?? null
  const name = (unit ? rest.join(' ') : match[2]).replace(/^of\s+/i, '').trim()
  return { name: name || value, qty, unit }
}

function fraction(value: string) {
  const unicode = Object.entries(UNICODE_FRACTIONS).find(([symbol]) =>
    value.endsWith(symbol),
  )
  if (unicode) return (parseInt(value, 10) || 0) + unicode[1]
  const [numerator, denominator] = value.split('/').map(Number)
  return denominator ? numerator / denominator : numerator
}

export function findRecipeNode(
  documents: unknown[],
): Record<string, any> | null {
  const nodes: any[] = []
  for (const document of documents) {
    if (!document) continue
    if (Array.isArray(document)) nodes.push(...document)
    else {
      nodes.push(document)
      const graph = (document as any)['@graph']
      if (Array.isArray(graph)) nodes.push(...graph)
    }
  }
  return (
    nodes.find((node) => {
      const type = node?.['@type']
      return (
        type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
      )
    }) ?? null
  )
}

function flattenSteps(instructions: unknown): string[] {
  if (typeof instructions === 'string') return [instructions]
  if (Array.isArray(instructions)) return instructions.flatMap(flattenSteps)
  if (instructions && typeof instructions === 'object') {
    const value = instructions as Record<string, unknown>
    if (Array.isArray(value.itemListElement))
      return flattenSteps(value.itemListElement)
    if (typeof value.text === 'string') return [value.text]
  }
  return []
}

export function parseRecipeJsonLd(recipe: Record<string, any>): ImportedRecipe {
  const result: ImportedRecipe = {}
  if (typeof recipe.name === 'string') result.name = recipe.name.trim()
  if (typeof recipe.description === 'string')
    result.description = recipe.description.trim()

  const image = recipe.image
  const imageUrl =
    typeof image === 'string'
      ? image
      : Array.isArray(image)
        ? typeof image[0] === 'string'
          ? image[0]
          : image[0]?.url
        : image?.url
  if (typeof imageUrl === 'string') result.imageUrl = imageUrl

  if (Array.isArray(recipe.recipeIngredient)) {
    result.ingredients = recipe.recipeIngredient
      .map(String)
      .map((value: string) => value.trim())
      .filter(Boolean)
      .map(parseIngredientLine)
  }

  const steps = flattenSteps(recipe.recipeInstructions)
    .map((value) => value.trim())
    .filter(Boolean)
  if (steps.length) result.instructions = steps.join('\n')

  const calories = recipe.nutrition?.calories
  const calorieValue =
    typeof calories === 'string'
      ? parseInt(calories, 10)
      : typeof calories === 'number'
        ? calories
        : NaN
  if (Number.isFinite(calorieValue)) result.calories = calorieValue

  const minutes =
    isoDurationToMinutes(recipe.totalTime) ??
    isoDurationToMinutes(recipe.cookTime)
  if (minutes) result.timeMinutes = minutes

  return result
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function attribute(attrs: string, name: string) {
  return attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'),
  )?.[1]
}

function markedValues(html: string, attributeName: string, value: string) {
  const marker = `(?=[^>]*\\b${attributeName}\\s*=\\s*["'][^"']*\\b${value}\\b[^"']*["'])`
  const values: string[] = []
  const paired = new RegExp(
    `<([a-z][\\w-]*)\\b${marker}([^>]*)>([\\s\\S]*?)<\\/\\1\\s*>`,
    'gi',
  )
  for (const match of html.matchAll(paired)) {
    const attrs = match[2]
    const raw =
      attribute(attrs, 'content') ??
      attribute(attrs, 'datetime') ??
      attribute(attrs, 'src') ??
      match[3]
    const decoded = decodeHtml(raw)
    if (decoded) values.push(decoded)
  }
  const voidTags = new RegExp(`<(?:meta|img|link)\\b${marker}([^>]*)>`, 'gi')
  for (const match of html.matchAll(voidTags)) {
    const raw =
      attribute(match[1], 'content') ??
      attribute(match[1], 'src') ??
      attribute(match[1], 'href')
    if (raw) values.push(decodeHtml(raw))
  }
  return values
}

function extractJsonLd(html: string): unknown[] {
  const documents: unknown[] = []
  for (const match of html.matchAll(
    /<script[^>]+type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)(?=\s|>)[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      documents.push(JSON.parse(match[1].trim()))
    } catch {
      // Ignore a malformed block and try the remaining page data.
    }
  }
  return documents
}

export function parseRecipeHtml(html: string): ImportedRecipe | null {
  // ponytail: targeted recipe markup, not a general HTML parser; add one only
  // when real import failures show regex cannot cover the needed sites.
  const jsonLd = findRecipeNode(extractJsonLd(html))
  if (jsonLd) return parseRecipeJsonLd(jsonLd)

  const prop = (name: string) => markedValues(html, 'itemprop', name)
  const ingredients = prop('recipeIngredient')
  const instructions = prop('recipeInstructions')
  const hasMicrodata = ingredients.length || instructions.length

  const plainIngredients = markedValues(html, 'class', 'ingredient')
  const plainInstructions = markedValues(html, 'class', 'instructions')
  const recipeIngredients = ingredients.length ? ingredients : plainIngredients
  const recipeInstructions = instructions.length
    ? instructions
    : plainInstructions
  if (!hasMicrodata && !recipeIngredients.length && !recipeInstructions.length)
    return null

  const meta = (name: string) =>
    markedValues(html, 'property', name)[0] ??
    markedValues(html, 'name', name)[0]
  const name =
    prop('name')[0] ??
    meta('og:title') ??
    decodeHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')

  return parseRecipeJsonLd({
    name,
    description: prop('description')[0] ?? meta('og:description'),
    image: prop('image')[0] ?? meta('og:image'),
    recipeIngredient: recipeIngredients,
    recipeInstructions,
    nutrition: { calories: prop('calories')[0] },
    totalTime: prop('totalTime')[0],
  })
}
