CREATE TABLE "meal_favorites" (
	"user_id" integer NOT NULL,
	"meal_id" integer NOT NULL,
	CONSTRAINT "meal_favorites_user_id_meal_id_pk" PRIMARY KEY("user_id","meal_id")
);
--> statement-breakpoint
ALTER TABLE "meal_favorites" ADD CONSTRAINT "meal_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_favorites" ADD CONSTRAINT "meal_favorites_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;