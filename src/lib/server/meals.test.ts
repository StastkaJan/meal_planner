import { describe, it, expect } from 'vitest';
import { pickMealFields, canAccessMeal, findRecipeNode, isoDurationToMinutes, parseRecipeJsonLd } from './meals';

describe('canAccessMeal', () => {
  it('lets anyone access a global meal', () => {
    expect(canAccessMeal({ userId: null }, 1)).toBe(true);
    expect(canAccessMeal({ userId: null }, undefined)).toBe(true);
  });
  it('lets only the owner access a personal meal', () => {
    expect(canAccessMeal({ userId: 1 }, 1)).toBe(true);
    expect(canAccessMeal({ userId: 1 }, 2)).toBe(false);
    expect(canAccessMeal({ userId: 1 }, undefined)).toBe(false);
  });
});

describe('pickMealFields', () => {
  it('keeps only writable columns', () => {
    const out = pickMealFields({ name: 'Soup', calories: 300, tags: ['Italian'] });
    expect(out).toEqual({ name: 'Soup', calories: 300, tags: ['Italian'] });
  });

  it('drops unknown/server-owned fields (mass-assignment guard)', () => {
    const out = pickMealFields({ id: 99, name: 'Soup', hacker: true });
    expect(out).toEqual({ name: 'Soup' });
    expect(out.id).toBeUndefined();
  });

  it('omits keys that are undefined so PATCH only sets provided fields', () => {
    const out = pickMealFields({ name: 'Soup', calories: undefined });
    expect('calories' in out).toBe(false);
  });
});

describe('isoDurationToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(isoDurationToMinutes('PT1H30M')).toBe(90);
    expect(isoDurationToMinutes('PT20M')).toBe(20);
    expect(isoDurationToMinutes('PT2H')).toBe(120);
  });
  it('returns undefined for junk', () => {
    expect(isoDurationToMinutes('banana')).toBeUndefined();
    expect(isoDurationToMinutes(undefined)).toBeUndefined();
  });
});

describe('findRecipeNode', () => {
  it('finds a Recipe inside @graph', () => {
    const doc = { '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Stew' }] };
    expect(findRecipeNode([doc])?.name).toBe('Stew');
  });
  it('finds a Recipe when @type is an array', () => {
    expect(findRecipeNode([[{ '@type': ['Thing', 'Recipe'], name: 'X' }]])?.name).toBe('X');
  });
  it('returns null when absent', () => {
    expect(findRecipeNode([{ '@type': 'Article' }])).toBeNull();
  });
});

describe('parseRecipeJsonLd', () => {
  it('maps the common schema.org Recipe fields', () => {
    const out = parseRecipeJsonLd({
      '@type': 'Recipe',
      name: '  Pancakes  ',
      description: 'Fluffy',
      image: [{ url: 'http://img/1.jpg' }],
      recipeIngredient: ['2 eggs', ' 1 cup flour '],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix' }, { '@type': 'HowToStep', text: 'Fry' }],
      nutrition: { calories: '320 kcal' },
      totalTime: 'PT25M',
    });
    expect(out).toEqual({
      name: 'Pancakes',
      description: 'Fluffy',
      imageUrl: 'http://img/1.jpg',
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: 'Mix\nFry',
      calories: 320,
      timeMinutes: 25,
    });
  });

  it('flattens HowToSection instructions and tolerates missing fields', () => {
    const out = parseRecipeJsonLd({
      name: 'Bare',
      recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ text: 'Step A' }, { text: 'Step B' }] }],
    });
    expect(out.instructions).toBe('Step A\nStep B');
    expect(out.calories).toBeUndefined();
    expect(out.ingredients).toBeUndefined();
  });
});
