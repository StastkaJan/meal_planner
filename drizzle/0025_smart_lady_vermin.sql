CREATE INDEX "bonus_items_plan_date_idx" ON "bonus_items" USING btree ("plan_id","date");--> statement-breakpoint
CREATE INDEX "meal_ingredients_meal_position_idx" ON "meal_ingredients" USING btree ("meal_id","position");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");