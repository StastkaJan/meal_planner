import { describe, it, expect } from 'vitest';
import { pickMealFields, canAccessMeal } from './meals';

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
