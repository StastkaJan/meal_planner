# DB Schema

| Table       | Key columns                                                                                                          |
|-------------|----------------------------------------------------------------------------------------------------------------------|
| `users`     | id, email, passwordHash, cuisinePrefs[], dietaryRestrictions[] (defaults new plans inherit), calorieTarget/proteinTarget/carbsTarget/fatTarget (nullable; NULL → global default) |
| `sessions`  | id (PK), userId FK, expiresAt                                                                                        |
| `meals`     | id, name, calories, proteinG, carbsG, fatG, tags[], imageUrl, description, ingredients[], instructions, timeMinutes, difficulty |
| `plans`     | id, userId FK, name, weekStart, cuisinePrefs[], dietaryRestrictions[]                                                |
| `weekSlots` | (planId, week, dayOfWeek, mealType) composite PK, mealId FK                                                          |
