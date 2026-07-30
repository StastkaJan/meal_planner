import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://mealplan:mealplan@localhost:5432/mealplan',
  },
})
