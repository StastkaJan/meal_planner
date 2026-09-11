CREATE TABLE "user_ingredients" (
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	CONSTRAINT "user_ingredients_user_id_ingredient_id_pk" PRIMARY KEY("user_id","ingredient_id")
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "name_cs" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "is_catalog" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "pantry_ingredient_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO ingredients (name, name_cs, aliases, is_catalog) VALUES
('Tomato', 'Rajče', ARRAY['tomatoes','rajčata','rajčete']::text[], true),
('Eggs', 'Vejce', ARRAY['egg','vajíčko','vajíčka']::text[], true),
('Olive oil', 'Olivový olej', ARRAY[]::text[], true),
('Rolled oats', 'Ovesné vločky', ARRAY[]::text[], true),
('Water', 'Voda', ARRAY[]::text[], true),
('Mixed berries', 'Směs bobulového ovoce', ARRAY[]::text[], true),
('Honey', 'Med', ARRAY[]::text[], true),
('Sourdough bread', 'Kváskový chléb', ARRAY[]::text[], true),
('Butter', 'Máslo', ARRAY[]::text[], true),
('Salt and pepper', 'Sůl a pepř', ARRAY[]::text[], true),
('Greek yogurt', 'Řecký jogurt', ARRAY['greek yoghurt']::text[], true),
('Banana', 'Banán', ARRAY['bananas','banány']::text[], true),
('Strawberries', 'Jahody', ARRAY['strawberry','jahoda']::text[], true),
('Cottage cheese', 'Cottage sýr', ARRAY[]::text[], true),
('Peach', 'Broskev', ARRAY['peaches','broskve']::text[], true),
('Walnuts', 'Vlašské ořechy', ARRAY['walnut','vlašský ořech']::text[], true),
('Chicken breast', 'Kuřecí prsa', ARRAY['chicken breasts','kuřecí prso']::text[], true),
('Cooked rice', 'Vařená rýže', ARRAY[]::text[], true),
('Bell pepper', 'Paprika', ARRAY['bell peppers','papriky']::text[], true),
('Onion', 'Cibule', ARRAY['onions']::text[], true),
('Garlic', 'Česnek', ARRAY[]::text[], true),
('Soy sauce', 'Sójová omáčka', ARRAY['sojová omáčka']::text[], true),
('Sesame oil', 'Sezamový olej', ARRAY[]::text[], true),
('Salmon fillet', 'Filet z lososa', ARRAY['salmon fillets']::text[], true),
('Lemon', 'Citron', ARRAY['lemons','citrón','citrony']::text[], true),
('Fresh dill', 'Čerstvý kopr', ARRAY[]::text[], true),
('Ground beef', 'Mleté hovězí maso', ARRAY[]::text[], true),
('Canned tomatoes', 'Konzervovaná rajčata', ARRAY['canned tomato','rajčata v konzervě']::text[], true),
('Tagliatelle', 'Tagliatelle', ARRAY[]::text[], true),
('Parmesan to serve', 'Parmazán k podávání', ARRAY[]::text[], true),
('Red lentils', 'Červená čočka', ARRAY[]::text[], true),
('Carrot', 'Mrkev', ARRAY['carrots','mrkve']::text[], true),
('Cumin', 'Římský kmín', ARRAY[]::text[], true),
('Vegetable stock', 'Zeleninový vývar', ARRAY[]::text[], true),
('Firm tofu', 'Pevné tofu', ARRAY[]::text[], true),
('Zucchini', 'Cuketa', ARRAY['zucchinis','cukety']::text[], true),
('Grated ginger', 'Strouhaný zázvor', ARRAY[]::text[], true),
('Spring onions', 'Jarní cibulka', ARRAY['spring onion','jarní cibulky']::text[], true),
('Tuna in water', 'Tuňák ve vlastní šťávě', ARRAY[]::text[], true),
('Mixed greens', 'Směs listových salátů', ARRAY[]::text[], true),
('Cucumber', 'Okurka', ARRAY['cucumbers','okurky']::text[], true),
('Cherry tomatoes', 'Cherry rajčata', ARRAY['cherry tomato','cherry rajče']::text[], true),
('Avocado', 'Avokádo', ARRAY['avocados','avokáda']::text[], true),
('Large apple', 'Velké jablko', ARRAY['large apples','velká jablka']::text[], true),
('Peanut butter', 'Arašídové máslo', ARRAY[]::text[], true),
('Large sweet potato', 'Velký batát', ARRAY['large sweet potatoes','velké batáty']::text[], true),
('Smoked paprika', 'Uzená paprika', ARRAY[]::text[], true),
('Almond butter', 'Mandlové máslo', ARRAY[]::text[], true),
('Cinnamon', 'Skořice', ARRAY[]::text[], true),
('Flour', 'Mouka', ARRAY[]::text[], true),
('Salt', 'Sůl', ARRAY[]::text[], true),
('Black pepper', 'Černý pepř', ARRAY[]::text[], true),
('Milk', 'Mléko', ARRAY[]::text[], true),
('Coconut milk', 'Kokosové mléko', ARRAY[]::text[], true)
ON CONFLICT (name) DO UPDATE SET name_cs = excluded.name_cs, aliases = excluded.aliases, is_catalog = true;
--> statement-breakpoint
UPDATE meal_ingredients mi SET original_name = i.name FROM ingredients i WHERE mi.ingredient_id = i.id AND mi.original_name IS NULL;
--> statement-breakpoint
WITH matches AS (
 SELECT old.id AS old_id, min(canonical.id) AS canonical_id
 FROM ingredients old JOIN ingredients canonical ON canonical.is_catalog AND
 lower(regexp_replace(trim(old.name), '\s+', ' ', 'g')) = ANY(
 ARRAY(SELECT lower(regexp_replace(trim(alias), '\s+', ' ', 'g')) FROM unnest(ARRAY[canonical.name, canonical.name_cs] || canonical.aliases) alias))
 GROUP BY old.id HAVING count(DISTINCT canonical.id) = 1
)
UPDATE meal_ingredients mi SET ingredient_id = matches.canonical_id FROM matches WHERE mi.ingredient_id = matches.old_id;
--> statement-breakpoint
INSERT INTO ingredients (name)
SELECT DISTINCT trim(name) FROM user_settings, unnest(pantry_staples) name WHERE trim(name) <> '' ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
WITH resolved AS (
 SELECT s.user_id, p.name, coalesce(
  (SELECT min(i.id) FROM ingredients i WHERE i.is_catalog AND lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = ANY(ARRAY(SELECT lower(regexp_replace(trim(alias), '\s+', ' ', 'g')) FROM unnest(ARRAY[i.name, i.name_cs] || i.aliases) alias)) HAVING count(*) = 1),
  (SELECT i.id FROM ingredients i WHERE i.name = trim(p.name))
 ) AS ingredient_id
 FROM user_settings s CROSS JOIN LATERAL unnest(s.pantry_staples) p(name) WHERE trim(p.name) <> ''
)
UPDATE user_settings s SET pantry_ingredient_ids = ARRAY(SELECT DISTINCT ingredient_id FROM resolved WHERE resolved.user_id = s.user_id AND ingredient_id IS NOT NULL);
--> statement-breakpoint
UPDATE ingredients SET is_catalog = true WHERE id IN (SELECT mi.ingredient_id FROM meal_ingredients mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id IS NULL);
--> statement-breakpoint
INSERT INTO user_ingredients (user_id, ingredient_id)
SELECT m.user_id, mi.ingredient_id FROM meal_ingredients mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id IS NOT NULL
UNION SELECT user_id, unnest(pantry_ingredient_ids) FROM user_settings ON CONFLICT DO NOTHING;
