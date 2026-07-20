import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  primaryKey,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
})

// 1:1 with users; row created lazily on first write. Holds meal-preference defaults new
// plans inherit + per-user nutrition targets (NULL target → global default).
export const userSettings = pgTable('user_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  cuisinePrefs: text('cuisine_prefs')
    .array()
    .notNull()
    .default(sql`'{}'`),
  dietaryRestrictions: text('dietary_restrictions')
    .array()
    .notNull()
    .default(sql`'{}'`),
  calorieTarget: integer('calorie_target'),
  proteinTarget: integer('protein_target'),
  carbsTarget: integer('carbs_target'),
  fatTarget: integer('fat_target'),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
})

export const meals = pgTable('meals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }), // NULL = global/shared
  name: text('name').notNull(),
  calories: integer('calories'),
  proteinG: numeric('protein_g', { precision: 6, scale: 1 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 1 }),
  fatG: numeric('fat_g', { precision: 6, scale: 1 }),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`'{}'`),
  allowedSlots: text('allowed_slots')
    .array()
    .notNull()
    .default(sql`'{}'`),
  imageUrl: text('image_url'),
  description: text('description'),
  ingredients: text('ingredients')
    .array()
    .notNull()
    .default(sql`'{}'`),
  instructions: text('instructions'),
  timeMinutes: integer('time_minutes'),
  difficulty: text('difficulty'),
  servings: integer('servings').notNull().default(1),
  archivedAt: timestamp('archived_at'),
})

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull().default('New Plan'),
  weekStart: date('week_start')
    .notNull()
    .default(sql`CURRENT_DATE`),
  cuisinePrefs: text('cuisine_prefs')
    .array()
    .notNull()
    .default(sql`'{}'`),
  dietaryRestrictions: text('dietary_restrictions')
    .array()
    .notNull()
    .default(sql`'{}'`),
})

export const weekSlots = pgTable(
  'week_slots',
  {
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    mealType: text('meal_type').notNull(),
    mealId: integer('meal_id').references(() => meals.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [primaryKey({ columns: [t.planId, t.date, t.mealType] })],
)

// Per-user bookmark on a meal. A join table (not a boolean on `meals`) because meals can be
// global/shared: favouriting is per-user, not a property of the meal itself.
export const mealFavorites = pgTable(
  'meal_favorites',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mealId: integer('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mealId] })],
)

export type User = typeof users.$inferSelect
export type UserSettings = typeof userSettings.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Meal = typeof meals.$inferSelect
export type Plan = typeof plans.$inferSelect
export type WeekSlot = typeof weekSlots.$inferSelect
export type MealFavorite = typeof mealFavorites.$inferSelect
