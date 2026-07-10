import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { meals, plans } from './schema.js'

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://mealplan:mealplan@localhost:5432/mealplan',
})
const db = drizzle(pool)

const existing = await db.select().from(plans).limit(1)
if (existing.length === 0) {
  await db.insert(plans).values({ name: 'Week 1' })
  console.log('Seeded default plan.')
} else {
  console.log('Seed skipped — data exists.')
}

const existingMeals = await db.select().from(meals).limit(1)
if (existingMeals.length === 0) {
  await db.insert(meals).values([
    {
      name: 'Oatmeal with Berries',
      calories: 320,
      proteinG: '10.0',
      carbsG: '55.0',
      fatG: '6.0',
      tags: ['Vegetarian', 'Vegan', 'no_eggs', 'no_lactose'],
      description: 'Creamy rolled oats topped with fresh mixed berries.',
      timeMinutes: 10,
      difficulty: 'easy',
      ingredients: [
        '1 cup rolled oats',
        '2 cups water',
        '1/2 cup mixed berries',
        '1 tbsp honey',
      ],
      instructions:
        'Bring water to a boil. Add oats and simmer 5 min, stirring occasionally. Top with berries and a drizzle of honey.',
    },
    {
      name: 'Scrambled Eggs on Toast',
      calories: 380,
      proteinG: '22.0',
      carbsG: '30.0',
      fatG: '16.0',
      tags: ['American', 'Vegetarian', 'no_lactose', 'high_protein'],
      description: 'Fluffy scrambled eggs on toasted sourdough.',
      timeMinutes: 10,
      difficulty: 'easy',
      ingredients: [
        '3 eggs',
        '2 slices sourdough bread',
        '1 tbsp butter',
        'salt and pepper',
      ],
      instructions:
        'Beat eggs with salt and pepper. Melt butter in pan over medium-low heat, add eggs and fold gently until just set. Serve on toasted bread.',
    },
    {
      name: 'Greek Yogurt with Honey',
      calories: 180,
      proteinG: '15.0',
      carbsG: '22.0',
      fatG: '3.0',
      tags: ['Mediterranean', 'Vegetarian', 'no_eggs', 'high_protein'],
      description: 'Thick Greek yogurt drizzled with honey and walnuts.',
      timeMinutes: 5,
      difficulty: 'easy',
      ingredients: [
        '200g Greek yogurt',
        '1 tbsp honey',
        '1 tbsp walnuts',
        'pinch of cinnamon',
      ],
      instructions:
        'Spoon yogurt into a bowl. Drizzle honey on top, scatter walnuts and dust with cinnamon.',
    },
    {
      name: 'Apple and Almond Butter',
      calories: 210,
      proteinG: '5.0',
      carbsG: '25.0',
      fatG: '12.0',
      tags: ['Vegetarian', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'],
      description: 'Crisp apple slices with creamy almond butter.',
      timeMinutes: 5,
      difficulty: 'easy',
      ingredients: ['1 large apple', '2 tbsp almond butter'],
      instructions:
        'Core and slice the apple. Serve with almond butter for dipping.',
    },
    {
      name: 'Grilled Chicken Salad',
      calories: 450,
      proteinG: '40.0',
      carbsG: '20.0',
      fatG: '22.0',
      tags: [
        'American',
        'Mediterranean',
        'no_lactose',
        'no_eggs',
        'no_gluten',
        'high_protein',
      ],
      description:
        'Juicy grilled chicken over mixed greens with lemon vinaigrette.',
      timeMinutes: 25,
      difficulty: 'medium',
      ingredients: [
        '200g chicken breast',
        '100g mixed greens',
        '1/2 cucumber',
        '10 cherry tomatoes',
        '2 tbsp olive oil',
        '1 lemon',
        'salt and pepper',
      ],
      instructions:
        'Season chicken and grill 6–7 min per side until cooked through. Slice and place over greens. Whisk olive oil and lemon juice, drizzle over salad.',
    },
    {
      name: 'Lentil Soup',
      calories: 360,
      proteinG: '18.0',
      carbsG: '52.0',
      fatG: '6.0',
      tags: [
        'Mediterranean',
        'Indian',
        'Vegan',
        'no_eggs',
        'no_lactose',
        'no_gluten',
      ],
      description: 'Hearty red lentil soup with cumin and smoked paprika.',
      timeMinutes: 35,
      difficulty: 'easy',
      ingredients: [
        '1 cup red lentils',
        '1 onion',
        '2 garlic cloves',
        '1 tsp cumin',
        '1 tsp smoked paprika',
        '4 cups vegetable stock',
        '2 tbsp olive oil',
      ],
      instructions:
        'Sauté onion and garlic in oil 5 min. Add spices, then lentils and stock. Simmer 25 min until lentils are soft. Blend partially for a creamy texture.',
    },
    {
      name: 'Tuna Rice Bowl',
      calories: 520,
      proteinG: '38.0',
      carbsG: '60.0',
      fatG: '8.0',
      tags: ['Japanese', 'no_eggs', 'no_lactose', 'no_gluten', 'high_protein'],
      description:
        'Seasoned tuna over steamed rice with avocado and soy sauce.',
      timeMinutes: 20,
      difficulty: 'easy',
      ingredients: [
        '1 can tuna in water',
        '1 cup cooked rice',
        '1/2 avocado',
        '1 tbsp soy sauce',
        '1 tsp sesame oil',
        'spring onions',
      ],
      instructions:
        'Cook rice. Drain tuna and mix with soy sauce and sesame oil. Arrange over rice with sliced avocado. Top with spring onions.',
    },
    {
      name: 'Banana and Peanut Butter',
      calories: 250,
      proteinG: '7.0',
      carbsG: '32.0',
      fatG: '12.0',
      tags: ['American', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'],
      description:
        'Ripe banana with natural peanut butter — a quick energy snack.',
      timeMinutes: 2,
      difficulty: 'easy',
      ingredients: ['1 banana', '2 tbsp peanut butter'],
      instructions:
        'Peel banana, slice if desired, and spread or dip with peanut butter.',
    },
    {
      name: 'Cottage Cheese with Fruit',
      calories: 200,
      proteinG: '18.0',
      carbsG: '20.0',
      fatG: '4.0',
      tags: ['American', 'Vegetarian', 'no_eggs', 'no_gluten', 'high_protein'],
      description:
        'Low-fat cottage cheese with seasonal fruit and a honey drizzle.',
      timeMinutes: 5,
      difficulty: 'easy',
      ingredients: [
        '200g cottage cheese',
        '1/2 cup strawberries',
        '1/2 peach',
        '1 tsp honey',
      ],
      instructions:
        'Spoon cottage cheese into a bowl. Top with sliced fruit and drizzle with honey.',
    },
    {
      name: 'Salmon with Sweet Potato',
      calories: 580,
      proteinG: '42.0',
      carbsG: '48.0',
      fatG: '18.0',
      tags: [
        'Mediterranean',
        'American',
        'no_lactose',
        'no_eggs',
        'no_gluten',
        'high_protein',
      ],
      description: 'Baked salmon fillet with roasted sweet potato wedges.',
      timeMinutes: 35,
      difficulty: 'medium',
      ingredients: [
        '180g salmon fillet',
        '1 large sweet potato',
        '2 tbsp olive oil',
        '1 lemon',
        'fresh dill',
        'salt and pepper',
      ],
      instructions:
        'Preheat oven to 200°C. Toss sweet potato wedges with oil, season and roast 20 min. Place salmon on a lined tray, squeeze lemon over, bake 15 min. Serve with dill.',
    },
    {
      name: 'Pasta Bolognese',
      calories: 620,
      proteinG: '35.0',
      carbsG: '72.0',
      fatG: '18.0',
      tags: ['Italian', 'high_protein'],
      description: 'Classic slow-cooked beef ragù with tagliatelle.',
      timeMinutes: 50,
      difficulty: 'medium',
      ingredients: [
        '300g tagliatelle',
        '250g ground beef',
        '1 onion',
        '2 garlic cloves',
        '400g canned tomatoes',
        '1 carrot',
        '2 tbsp olive oil',
        'salt and pepper',
        'parmesan to serve',
      ],
      instructions:
        'Sauté onion, carrot and garlic in oil 5 min. Add beef and brown. Add tomatoes, season, simmer 30 min. Cook pasta al dente. Toss together, top with parmesan.',
    },
    {
      name: 'Veggie Stir Fry with Tofu',
      calories: 420,
      proteinG: '22.0',
      carbsG: '45.0',
      fatG: '16.0',
      tags: ['Chinese', 'Vegan', 'no_eggs', 'no_lactose', 'no_gluten'],
      description:
        'Crispy tofu and seasonal vegetables in a savory ginger-soy sauce.',
      timeMinutes: 20,
      difficulty: 'medium',
      ingredients: [
        '200g firm tofu',
        '1 bell pepper',
        '1 zucchini',
        '2 tbsp soy sauce',
        '1 tsp grated ginger',
        '1 garlic clove',
        '1 tbsp sesame oil',
        '1 cup cooked rice',
      ],
      instructions:
        'Press tofu, cube and fry in sesame oil until golden. Remove. Stir-fry vegetables with garlic and ginger 3 min. Add tofu and soy sauce, toss and serve over rice.',
    },
  ])
  console.log('Seeded dummy meals.')
} else {
  console.log('Meals seed skipped — data exists.')
}

await pool.end()
