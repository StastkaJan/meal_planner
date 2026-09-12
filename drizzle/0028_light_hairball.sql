CREATE TABLE "ingredient_translations" (
	"ingredient_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "ingredient_translations_ingredient_id_locale_pk" PRIMARY KEY("ingredient_id","locale")
);
--> statement-breakpoint
ALTER TABLE "ingredient_translations" ADD CONSTRAINT "ingredient_translations_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_translations_name_idx" ON "ingredient_translations" USING btree (lower(regexp_replace(trim("name"), '\s+', ' ', 'g')));--> statement-breakpoint
CREATE INDEX "ingredient_translations_aliases_idx" ON "ingredient_translations" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "ingredients_normalized_name_idx" ON "ingredients" USING btree (lower(regexp_replace(trim("name"), '\s+', ' ', 'g')));
--> statement-breakpoint
INSERT INTO ingredient_translations (ingredient_id, locale, name)
SELECT id, 'cs', name_cs FROM ingredients WHERE name_cs IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Legacy aliases have no language metadata. Preserve them without guessing a language.
INSERT INTO ingredient_translations (ingredient_id, locale, name, aliases)
SELECT id, 'und', name, ARRAY(
  SELECT DISTINCT lower(regexp_replace(trim(alias), '\s+', ' ', 'g'))
  FROM unnest(aliases) alias WHERE trim(alias) <> ''
) FROM ingredients WHERE cardinality(aliases) > 0
ON CONFLICT DO NOTHING;
