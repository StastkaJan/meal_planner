import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { meals, plans } from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://mealplan:mealplan@localhost:5432/mealplan'
});
const db = drizzle(pool);

const existing = await db.select().from(plans).limit(1);
if (existing.length === 0) {
  await db.insert(plans).values({ name: 'Week 1' });
  console.log('Seeded default plan.');
} else {
  console.log('Seed skipped — data exists.');
}

const existingMeals = await db.select().from(meals).limit(1);
if (existingMeals.length === 0) {
  await db.insert(meals).values([
    { name: 'Oatmeal with Berries',       calories: 320, proteinG: '10.0', carbsG: '55.0', fatG:  '6.0', tags: ['Vegetarian', 'Vegan', 'no_eggs', 'no_lactose'] },
    { name: 'Scrambled Eggs on Toast',    calories: 380, proteinG: '22.0', carbsG: '30.0', fatG: '16.0', tags: ['American', 'Vegetarian', 'no_lactose', 'high_protein'] },
    { name: 'Greek Yogurt with Honey',    calories: 180, proteinG: '15.0', carbsG: '22.0', fatG:  '3.0', tags: ['Mediterranean', 'Vegetarian', 'no_eggs', 'high_protein'] },
    { name: 'Apple and Almond Butter',    calories: 210, proteinG:  '5.0', carbsG: '25.0', fatG: '12.0', tags: ['Vegetarian', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'] },
    { name: 'Grilled Chicken Salad',      calories: 450, proteinG: '40.0', carbsG: '20.0', fatG: '22.0', tags: ['American', 'Mediterranean', 'no_lactose', 'no_eggs', 'no_gluten', 'high_protein'] },
    { name: 'Lentil Soup',                calories: 360, proteinG: '18.0', carbsG: '52.0', fatG:  '6.0', tags: ['Mediterranean', 'Indian', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'] },
    { name: 'Tuna Rice Bowl',             calories: 520, proteinG: '38.0', carbsG: '60.0', fatG:  '8.0', tags: ['Japanese', 'no_eggs', 'no_lactose', 'no_gluten', 'high_protein'] },
    { name: 'Banana and Peanut Butter',   calories: 250, proteinG:  '7.0', carbsG: '32.0', fatG: '12.0', tags: ['American', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'] },
    { name: 'Cottage Cheese with Fruit',  calories: 200, proteinG: '18.0', carbsG: '20.0', fatG:  '4.0', tags: ['American', 'Vegetarian', 'no_eggs', 'no_gluten', 'high_protein'] },
    { name: 'Salmon with Sweet Potato',   calories: 580, proteinG: '42.0', carbsG: '48.0', fatG: '18.0', tags: ['Mediterranean', 'American', 'no_lactose', 'no_eggs', 'no_gluten', 'high_protein'] },
    { name: 'Pasta Bolognese',            calories: 620, proteinG: '35.0', carbsG: '72.0', fatG: '18.0', tags: ['Italian', 'high_protein'] },
    { name: 'Veggie Stir Fry with Tofu',  calories: 420, proteinG: '22.0', carbsG: '45.0', fatG: '16.0', tags: ['Chinese', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'] },
  ]);
  console.log('Seeded dummy meals.');
} else {
  console.log('Meals seed skipped — data exists.');
}

await pool.end();
