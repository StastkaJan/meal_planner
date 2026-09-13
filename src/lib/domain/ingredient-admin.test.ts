import { expect, it } from 'vitest'
import { ingredientAdminInput } from './ingredient-admin'

it('normalizes names, locales and duplicate aliases while preserving accents', () => {
  expect(
    ingredientAdminInput.parse({
      name: '  Red   onion ',
      translations: [
        {
          locale: ' CS ',
          name: ' Červená   cibule ',
          aliases: [' CIBULE ', 'cibule', ' Červené  cibule '],
        },
        { locale: 'de-DE', name: 'Rote Zwiebel', aliases: [] },
      ],
    }),
  ).toEqual({
    name: 'Red onion',
    translations: [
      {
        locale: 'cs',
        name: 'Červená cibule',
        aliases: ['cibule', 'červené cibule'],
      },
      { locale: 'de-de', name: 'Rote Zwiebel', aliases: [] },
    ],
  })
})

it.each([
  null,
  { name: '', translations: [] },
  { name: 'x'.repeat(101), translations: [] },
  { name: 'Salt', translations: [{ locale: '', name: 'Sůl', aliases: [] }] },
  {
    name: 'Salt',
    translations: [{ locale: 'not_a_locale', name: 'Sůl', aliases: [] }],
  },
  {
    name: 'Salt',
    translations: [{ locale: 'cs', name: '', aliases: ['sůl'] }],
  },
  {
    name: 'Salt',
    translations: [{ locale: 'cs', name: 'Sůl', aliases: 'sůl' }],
  },
  {
    name: 'Salt',
    translations: [{ locale: 'cs', name: 'Sůl', aliases: [' '] }],
  },
  {
    name: 'Salt',
    translations: ['cs', 'CS'].map((locale) => ({
      locale,
      name: 'Sůl',
      aliases: [],
    })),
  },
])('rejects malformed catalogue input: %j', (input) => {
  expect(ingredientAdminInput.safeParse(input).success).toBe(false)
})

it('allows removing all translations and retaining legacy und aliases', () => {
  expect(
    ingredientAdminInput.safeParse({ name: 'Salt', translations: [] }).success,
  ).toBe(true)
  expect(
    ingredientAdminInput.safeParse({
      name: 'Salt',
      translations: [{ locale: 'und', name: 'Salt', aliases: ['sůl'] }],
    }).success,
  ).toBe(true)
})
