# DB Schema

| Table       | Key columns                                                                                                          |
|-------------|----------------------------------------------------------------------------------------------------------------------|
| `users`     | id, email, passwordHash                                                                                              |
| `sessions`  | id (PK), userId FK, expiresAt                                                                                        |
| `meals`     | id, name, calories, proteinG, carbsG, fatG, tags[], imageUrl, description, ingredients[], instructions, timeMinutes, difficulty |
| `plans`     | id, userId FK, name, weekStart, cuisinePrefs[], dietaryRestrictions[]                                                |
| `weekSlots` | (planId, dayOfWeek, mealType) composite PK, mealId FK                                                               |
