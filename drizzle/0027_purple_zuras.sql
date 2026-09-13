DO $catalogue$ BEGIN
IF to_regclass('public.user_ingredients') IS NULL THEN
CREATE TABLE "user_ingredients" (
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	CONSTRAINT "user_ingredients_user_id_ingredient_id_pk" PRIMARY KEY("user_id","ingredient_id")
);

ALTER TABLE "ingredients" ADD COLUMN "name_cs" text;
ALTER TABLE "ingredients" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "ingredients" ADD COLUMN "is_catalog" boolean DEFAULT false NOT NULL;
ALTER TABLE "meal_ingredients" ADD COLUMN "original_name" text;
ALTER TABLE "user_settings" ADD COLUMN "pantry_ingredient_ids" integer[] DEFAULT '{}' NOT NULL;
ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;

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

UPDATE meal_ingredients mi SET original_name = i.name FROM ingredients i WHERE mi.ingredient_id = i.id AND mi.original_name IS NULL;

WITH matches AS (
 SELECT old.id AS old_id, min(canonical.id) AS canonical_id
 FROM ingredients old JOIN ingredients canonical ON canonical.is_catalog AND
 lower(regexp_replace(trim(old.name), '\s+', ' ', 'g')) = ANY(
 ARRAY(SELECT lower(regexp_replace(trim(alias), '\s+', ' ', 'g')) FROM unnest(ARRAY[canonical.name, canonical.name_cs] || canonical.aliases) alias))
 GROUP BY old.id HAVING count(DISTINCT canonical.id) = 1
)
UPDATE meal_ingredients mi SET ingredient_id = matches.canonical_id FROM matches WHERE mi.ingredient_id = matches.old_id;

INSERT INTO ingredients (name)
SELECT DISTINCT trim(name) FROM user_settings, unnest(pantry_staples) name WHERE trim(name) <> '' ON CONFLICT (name) DO NOTHING;

WITH resolved AS (
 SELECT s.user_id, p.name, coalesce(
  (SELECT min(i.id) FROM ingredients i WHERE i.is_catalog AND lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = ANY(ARRAY(SELECT lower(regexp_replace(trim(alias), '\s+', ' ', 'g')) FROM unnest(ARRAY[i.name, i.name_cs] || i.aliases) alias)) HAVING count(*) = 1),
  (SELECT i.id FROM ingredients i WHERE i.name = trim(p.name))
 ) AS ingredient_id
 FROM user_settings s CROSS JOIN LATERAL unnest(s.pantry_staples) p(name) WHERE trim(p.name) <> ''
)
UPDATE user_settings s SET pantry_ingredient_ids = ARRAY(SELECT DISTINCT ingredient_id FROM resolved WHERE resolved.user_id = s.user_id AND ingredient_id IS NOT NULL);

UPDATE ingredients SET is_catalog = true WHERE id IN (SELECT mi.ingredient_id FROM meal_ingredients mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id IS NULL);

INSERT INTO user_ingredients (user_id, ingredient_id)
SELECT m.user_id, mi.ingredient_id FROM meal_ingredients mi JOIN meals m ON m.id = mi.meal_id WHERE m.user_id IS NOT NULL
UNION SELECT user_id, unnest(pantry_ingredient_ids) FROM user_settings ON CONFLICT DO NOTHING;

END IF;
END $catalogue$;
--> statement-breakpoint
DO $translations$ BEGIN
IF to_regclass('public.ingredient_translations') IS NULL THEN
CREATE TABLE "ingredient_translations" (
	"ingredient_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "ingredient_translations_ingredient_id_locale_pk" PRIMARY KEY("ingredient_id","locale")
);

ALTER TABLE "ingredient_translations" ADD CONSTRAINT "ingredient_translations_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "ingredient_translations_name_idx" ON "ingredient_translations" USING btree (lower(regexp_replace(trim("name"), '\s+', ' ', 'g')));
CREATE INDEX "ingredient_translations_aliases_idx" ON "ingredient_translations" USING gin ("aliases");
CREATE INDEX "ingredients_normalized_name_idx" ON "ingredients" USING btree (lower(regexp_replace(trim("name"), '\s+', ' ', 'g')));

INSERT INTO ingredient_translations (ingredient_id, locale, name)
SELECT id, 'cs', name_cs FROM ingredients WHERE name_cs IS NOT NULL
ON CONFLICT DO NOTHING;

-- Legacy aliases have no language metadata. Preserve them without guessing a language.
INSERT INTO ingredient_translations (ingredient_id, locale, name, aliases)
SELECT id, 'und', name, ARRAY(
  SELECT DISTINCT lower(regexp_replace(trim(alias), '\s+', ' ', 'g'))
  FROM unnest(aliases) alias WHERE trim(alias) <> ''
) FROM ingredients WHERE cardinality(aliases) > 0
ON CONFLICT DO NOTHING;

END IF;
END $translations$;
--> statement-breakpoint
-- Add common foods without replacing existing labels or aliases.
WITH catalogue(name, name_cs, aliases_en, aliases_cs) AS (VALUES
('Potato', 'Brambora', 'potatoes', 'brambory'),
('Sweet potato', 'Batát', 'sweet potatoes', 'batáty;sladké brambory'),
('Broccoli', 'Brokolice', '', ''),
('Cauliflower', 'Květák', '', ''),
('Spinach', 'Špenát', '', ''),
('Kale', 'Kadeřávek', '', 'kadeřavá kapusta'),
('White cabbage', 'Bílé zelí', 'green cabbage', ''),
('Red cabbage', 'Červené zelí', 'purple cabbage', ''),
('Savoy cabbage', 'Kapusta', '', 'hlávková kapusta'),
('Brussels sprouts', 'Růžičková kapusta', 'brussel sprouts', ''),
('Lettuce', 'Hlávkový salát', '', ''),
('Romaine lettuce', 'Římský salát', 'cos lettuce', ''),
('Iceberg lettuce', 'Ledový salát', '', ''),
('Arugula', 'Rukola', 'rocket', ''),
('Lambs lettuce', 'Polníček', 'corn salad', 'kozlíček polníček'),
('Celery stalks', 'Řapíkatý celer', 'celery stalk;celery sticks', ''),
('Celeriac', 'Bulvový celer', 'celery root', 'celer'),
('Parsley root', 'Kořenová petržel', '', 'petržel kořen'),
('Parsnip', 'Pastinák', 'parsnips', ''),
('Beetroot', 'Červená řepa', 'beets;beet', 'řepa'),
('Radish', 'Ředkvička', 'radishes', 'ředkvičky'),
('White radish', 'Bílá ředkev', 'daikon', ''),
('Turnip', 'Vodnice', 'turnips', ''),
('Leek', 'Pórek', 'leeks', 'pór'),
('Shallot', 'Šalotka', 'shallots', 'šalotky'),
('Red onion', 'Červená cibule', 'red onions', ''),
('Eggplant', 'Lilek', 'aubergine;eggplants;aubergines', 'baklažán'),
('Pumpkin', 'Dýně', 'pumpkins', ''),
('Butternut squash', 'Máslová dýně', '', ''),
('Asparagus', 'Chřest', '', ''),
('Green peas', 'Zelený hrášek', 'peas', 'hrášek'),
('Green beans', 'Zelené fazolky', 'green bean;string beans', 'fazolové lusky'),
('Sweetcorn', 'Kukuřice', 'sweet corn;corn kernels', ''),
('Fennel bulb', 'Bulvový fenykl', '', ''),
('Artichoke', 'Artyčok', 'artichokes', 'artyčoky'),
('Button mushrooms', 'Žampiony', 'button mushroom;white mushrooms', 'žampion'),
('Oyster mushrooms', 'Hlíva ústřičná', 'oyster mushroom', 'hlíva'),
('Shiitake mushrooms', 'Houby shiitake', 'shiitake', 'šitake'),
('Porcini mushrooms', 'Hřiby', 'porcini;porcini mushroom', 'hřib'),
('Sauerkraut', 'Kysané zelí', '', 'kvašené zelí'),
('Pickled cucumbers', 'Nakládané okurky', 'gherkins;pickles', 'kyselé okurky'),
('Garlic powder', 'Sušený česnek', 'powdered garlic', 'česnekový prášek'),
('Fresh ginger', 'Čerstvý zázvor', 'ginger root', 'zázvor'),
('Chilli pepper', 'Chilli paprička', 'chili pepper;chilli peppers;chili peppers', 'chilli papričky'),
('Apple', 'Jablko', 'apples', 'jablka'),
('Pear', 'Hruška', 'pears', 'hrušky'),
('Orange', 'Pomeranč', 'oranges', 'pomeranče'),
('Mandarin', 'Mandarinka', 'mandarins;tangerine;tangerines', 'mandarinky'),
('Grapefruit', 'Grapefruit', 'grapefruits', 'grep'),
('Lime', 'Limetka', 'limes', 'limetky'),
('Plum', 'Švestka', 'plums', 'švestky'),
('Apricot', 'Meruňka', 'apricots', 'meruňky'),
('Nectarine', 'Nektarinka', 'nectarines', 'nektarinky'),
('Sweet cherries', 'Třešně', 'sweet cherry;cherries', 'třešeň'),
('Sour cherries', 'Višně', 'sour cherry', 'višeň'),
('Blueberries', 'Borůvky', 'blueberry', 'borůvka'),
('Raspberries', 'Maliny', 'raspberry', 'malina'),
('Blackberries', 'Ostružiny', 'blackberry', 'ostružina'),
('Redcurrants', 'Červený rybíz', 'red currants;redcurrant', ''),
('Blackcurrants', 'Černý rybíz', 'black currants;blackcurrant', ''),
('Cranberries', 'Klikva', 'cranberry', 'klikvy'),
('Grapes', 'Hroznové víno', 'grape', 'hrozny'),
('Kiwi', 'Kiwi', 'kiwifruit', ''),
('Mango', 'Mango', 'mangoes;mangos', ''),
('Pineapple', 'Ananas', 'pineapples', ''),
('Watermelon', 'Vodní meloun', 'watermelons', ''),
('Cantaloupe', 'Meloun cantaloupe', '', ''),
('Pomegranate', 'Granátové jablko', 'pomegranates', 'granátová jablka'),
('Dates', 'Datle', 'date fruit', ''),
('Raisins', 'Rozinky', 'sultanas', 'hrozinky'),
('Dried apricots', 'Sušené meruňky', 'dried apricot', ''),
('Prunes', 'Sušené švestky', 'prune', ''),
('Dried figs', 'Sušené fíky', 'dried fig', ''),
('Chicken thigh', 'Kuřecí stehno', 'chicken thighs', 'kuřecí stehna'),
('Whole chicken', 'Celé kuře', '', ''),
('Turkey breast', 'Krůtí prsa', 'turkey breasts', 'krůtí prso'),
('Ground turkey', 'Mleté krůtí maso', 'turkey mince', ''),
('Pork tenderloin', 'Vepřová panenka', '', ''),
('Pork shoulder', 'Vepřová plec', '', ''),
('Pork loin', 'Vepřová pečeně', '', 'vepřová kotleta'),
('Ground pork', 'Mleté vepřové maso', 'pork mince', ''),
('Beef sirloin', 'Hovězí roštěná', 'sirloin steak', ''),
('Beef chuck', 'Hovězí plec', 'chuck steak', ''),
('Lamb leg', 'Jehněčí kýta', 'leg of lamb', ''),
('Duck breast', 'Kachní prsa', 'duck breasts', 'kachní prso'),
('Rabbit meat', 'Králičí maso', '', ''),
('Chicken liver', 'Kuřecí játra', 'chicken livers', ''),
('Bacon', 'Slanina', '', ''),
('Ham', 'Šunka', '', ''),
('Sausage', 'Klobása', 'sausages', 'klobásy'),
('Cod fillet', 'Filet z tresky', 'cod fillets;cod', 'treska'),
('Trout', 'Pstruh', '', ''),
('Mackerel', 'Makrela', '', ''),
('Sardines', 'Sardinky', 'sardine', ''),
('Smoked salmon', 'Uzený losos', '', ''),
('Shrimp', 'Krevety', 'shrimps;prawns;prawn', 'kreveta'),
('Mussels', 'Slávky', 'mussel', ''),
('Squid', 'Oliheň', 'calamari', 'oliheň obecná'),
('Anchovies', 'Ančovičky', 'anchovy', 'ančovička'),
('Plain yogurt', 'Bílý jogurt', 'plain yoghurt;natural yogurt;natural yoghurt', ''),
('Skyr', 'Skyr', '', ''),
('Quark', 'Tvaroh', '', ''),
('Kefir', 'Kefír', '', ''),
('Buttermilk', 'Podmáslí', '', ''),
('Sour cream', 'Zakysaná smetana', '', ''),
('Whipping cream', 'Smetana ke šlehání', 'heavy cream;double cream', 'šlehačka'),
('Cooking cream', 'Smetana na vaření', 'single cream', ''),
('Cream cheese', 'Smetanový sýr', '', 'čerstvý smetanový sýr'),
('Mozzarella', 'Mozzarella', '', ''),
('Cheddar', 'Čedar', 'cheddar cheese', 'cheddar'),
('Gouda', 'Gouda', '', ''),
('Edam', 'Eidam', 'edam cheese', ''),
('Parmesan', 'Parmazán', 'parmigiano reggiano;parmesan cheese', 'parmezán'),
('Feta', 'Feta', 'feta cheese', ''),
('Goat cheese', 'Kozí sýr', 'goats cheese', ''),
('Ricotta', 'Ricotta', '', ''),
('Mascarpone', 'Mascarpone', '', ''),
('Halloumi', 'Halloumi', '', ''),
('Blue cheese', 'Sýr s modrou plísní', '', 'niva'),
('Egg whites', 'Vaječné bílky', 'egg white', 'bílek;bílky'),
('Egg yolks', 'Vaječné žloutky', 'egg yolk', 'žloutek;žloutky'),
('Rice', 'Rýže', 'white rice', 'bílá rýže'),
('Brown rice', 'Hnědá rýže', 'wholegrain rice', 'celozrnná rýže;natural rýže'),
('Basmati rice', 'Rýže basmati', 'basmati', ''),
('Jasmine rice', 'Jasmínová rýže', 'jasmine', ''),
('Arborio rice', 'Rýže arborio', 'risotto rice', 'rýže na rizoto'),
('Pasta', 'Těstoviny', '', ''),
('Spaghetti', 'Špagety', '', ''),
('Penne', 'Penne', '', ''),
('Wholewheat pasta', 'Celozrnné těstoviny', 'whole wheat pasta;wholegrain pasta', ''),
('Rice noodles', 'Rýžové nudle', '', ''),
('Couscous', 'Kuskus', '', ''),
('Bulgur', 'Bulgur', '', ''),
('Quinoa', 'Quinoa', '', ''),
('Buckwheat', 'Pohanka', '', ''),
('Millet', 'Jáhly', '', ''),
('Pearl barley', 'Ječné kroupy', '', 'kroupy'),
('Polenta', 'Polenta', 'cornmeal', 'kukuřičná krupice'),
('Semolina', 'Krupice', 'wheat semolina', 'pšeničná krupice'),
('Plain flour', 'Hladká mouka', 'all purpose flour;all-purpose flour', ''),
('Semi-coarse flour', 'Polohrubá mouka', '', ''),
('Coarse flour', 'Hrubá mouka', '', ''),
('Wholewheat flour', 'Celozrnná mouka', 'whole wheat flour', ''),
('Rye flour', 'Žitná mouka', '', ''),
('Spelt flour', 'Špaldová mouka', '', ''),
('Rice flour', 'Rýžová mouka', '', ''),
('Almond flour', 'Mandlová mouka', '', ''),
('Cornstarch', 'Kukuřičný škrob', 'corn starch', ''),
('Potato starch', 'Bramborový škrob', '', 'solamyl'),
('Breadcrumbs', 'Strouhanka', 'bread crumbs', ''),
('Bread', 'Chléb', '', 'chleba'),
('Wholegrain bread', 'Celozrnný chléb', 'whole grain bread', ''),
('Rye bread', 'Žitný chléb', '', ''),
('Bread roll', 'Rohlík', 'bread rolls', 'rohlíky'),
('Tortilla', 'Tortilla', 'tortillas;wraps', ''),
('Pita bread', 'Pita chléb', 'pitta bread', ''),
('Chickpeas', 'Cizrna', 'chickpea;garbanzo beans', ''),
('Green lentils', 'Zelená čočka', '', ''),
('Brown lentils', 'Hnědá čočka', '', ''),
('Kidney beans', 'Červené fazole', '', ''),
('White beans', 'Bílé fazole', 'cannellini beans', ''),
('Black beans', 'Černé fazole', '', ''),
('Split peas', 'Loupaný hrách', '', 'půlený hrách'),
('Edamame', 'Edamame', 'green soybeans', ''),
('Tempeh', 'Tempeh', '', ''),
('Silken tofu', 'Hedvábné tofu', 'soft tofu', ''),
('Smoked tofu', 'Uzené tofu', '', ''),
('Soy milk', 'Sójový nápoj', 'soya milk;soy drink', 'sójové mléko'),
('Oat milk', 'Ovesný nápoj', 'oat drink', 'ovesné mléko'),
('Almond milk', 'Mandlový nápoj', 'almond drink', 'mandlové mléko'),
('Almonds', 'Mandle', 'almond', ''),
('Hazelnuts', 'Lískové ořechy', 'hazelnut', 'lískový ořech'),
('Cashews', 'Kešu', 'cashew;cashew nuts', 'kešu ořechy'),
('Peanuts', 'Arašídy', 'peanut;groundnuts', 'burské oříšky'),
('Pistachios', 'Pistácie', 'pistachio', ''),
('Pecans', 'Pekanové ořechy', 'pecan', ''),
('Pine nuts', 'Piniové oříšky', 'pine nut', ''),
('Sunflower seeds', 'Slunečnicová semínka', 'sunflower seed', ''),
('Pumpkin seeds', 'Dýňová semínka', 'pumpkin seed', ''),
('Sesame seeds', 'Sezamová semínka', 'sesame seed', ''),
('Chia seeds', 'Chia semínka', 'chia', ''),
('Flaxseed', 'Lněné semínko', 'flax seeds;linseed', 'lněná semínka'),
('Poppy seeds', 'Mák', 'poppy seed', ''),
('Desiccated coconut', 'Strouhaný kokos', 'shredded coconut', ''),
('Tahini', 'Tahini', 'sesame paste', 'sezamová pasta'),
('Sunflower oil', 'Slunečnicový olej', '', ''),
('Rapeseed oil', 'Řepkový olej', 'canola oil', ''),
('Coconut oil', 'Kokosový olej', '', ''),
('Ghee', 'Přepuštěné máslo', 'clarified butter', 'ghí'),
('Lard', 'Sádlo', '', ''),
('Sugar', 'Cukr', 'white sugar;granulated sugar', 'cukr krystal;krupicový cukr'),
('Brown sugar', 'Hnědý cukr', '', ''),
('Icing sugar', 'Moučkový cukr', 'powdered sugar;confectioners sugar', 'cukr moučka'),
('Maple syrup', 'Javorový sirup', '', ''),
('Cocoa powder', 'Kakaový prášek', 'cocoa', 'kakao'),
('Dark chocolate', 'Hořká čokoláda', '', ''),
('Baking powder', 'Kypřicí prášek', '', 'prášek do pečiva'),
('Baking soda', 'Jedlá soda', 'bicarbonate of soda', ''),
('Fresh yeast', 'Čerstvé droždí', '', 'droždí'),
('Dried yeast', 'Sušené droždí', 'instant yeast;active dry yeast', ''),
('Vanilla extract', 'Vanilkový extrakt', '', ''),
('Vanilla sugar', 'Vanilkový cukr', '', ''),
('Gelatin', 'Želatina', 'gelatine', ''),
('Tomato paste', 'Rajčatový protlak', '', 'rajský protlak'),
('Passata', 'Pasírovaná rajčata', 'tomato passata', ''),
('Ketchup', 'Kečup', 'catsup', ''),
('Mustard', 'Hořčice', '', ''),
('Dijon mustard', 'Dijonská hořčice', '', ''),
('Mayonnaise', 'Majonéza', 'mayo', ''),
('Balsamic vinegar', 'Balzamikový ocet', '', 'balsamico'),
('Apple cider vinegar', 'Jablečný ocet', 'cider vinegar', ''),
('White wine vinegar', 'Bílý vinný ocet', '', ''),
('Rice vinegar', 'Rýžový ocet', '', ''),
('Fish sauce', 'Rybí omáčka', '', ''),
('Worcestershire sauce', 'Worcesterská omáčka', 'worcester sauce', 'worcester'),
('Pesto', 'Pesto', '', ''),
('Olives', 'Olivy', 'olive', 'oliva'),
('Capers', 'Kapary', 'caper', ''),
('Chicken stock', 'Kuřecí vývar', 'chicken broth', ''),
('Beef stock', 'Hovězí vývar', 'beef broth', ''),
('Parsley', 'Petrželová nať', 'flat leaf parsley;curly parsley', 'nať petržele'),
('Basil', 'Bazalka', '', ''),
('Oregano', 'Oregano', '', 'dobromysl'),
('Thyme', 'Tymián', '', ''),
('Rosemary', 'Rozmarýn', '', 'rozmarýna'),
('Chives', 'Pažitka', '', ''),
('Mint', 'Máta', '', ''),
('Fresh coriander', 'Čerstvý koriandr', 'cilantro;coriander leaves', 'koriandrová nať'),
('Bay leaf', 'Bobkový list', 'bay leaves', ''),
('Marjoram', 'Majoránka', '', ''),
('Sweet paprika', 'Sladká paprika', 'paprika powder', 'mletá sladká paprika'),
('Chilli flakes', 'Chilli vločky', 'chili flakes;red pepper flakes', ''),
('Cayenne pepper', 'Kajenský pepř', 'cayenne', ''),
('Turmeric', 'Kurkuma', '', ''),
('Ground coriander', 'Mletý koriandr', 'coriander powder', ''),
('Caraway seeds', 'Kmín', 'caraway', 'kmín kořenný'),
('Nutmeg', 'Muškátový oříšek', '', ''),
('Cloves', 'Hřebíček', '', ''),
('Allspice', 'Nové koření', '', ''),
('Cardamom', 'Kardamom', '', ''),
('Curry powder', 'Kari koření', '', 'kari'),
('Garam masala', 'Garam masala', '', '')
), added AS (
  INSERT INTO ingredients (name, is_catalog)
  SELECT name, true FROM catalogue
  ON CONFLICT (name) DO UPDATE SET is_catalog = true
  RETURNING id, name
)
INSERT INTO ingredient_translations (ingredient_id, locale, name, aliases)
SELECT added.id, translation.locale, translation.name,
  ARRAY(SELECT DISTINCT lower(trim(alias)) FROM unnest(string_to_array(translation.aliases, ';')) alias WHERE trim(alias) <> '')
FROM added JOIN catalogue ON catalogue.name = added.name
CROSS JOIN LATERAL (VALUES
  ('en', catalogue.name, catalogue.aliases_en),
  ('cs', catalogue.name_cs, catalogue.aliases_cs)
) translation(locale, name, aliases)
ON CONFLICT (ingredient_id, locale) DO NOTHING;
--> statement-breakpoint
-- Reconcile legacy identities only after every catalogue translation is available.
-- Rows with translations are managed identities; never merge them by guessing.
DO $backfill$
DECLARE matched record;
BEGIN
  FOR matched IN
    WITH normalized AS (
      SELECT i.id, i.is_catalog,
        lower(regexp_replace(trim(i.name), '\s+', ' ', 'g')) AS name,
        EXISTS (SELECT 1 FROM ingredient_translations t WHERE t.ingredient_id = i.id) AS managed
      FROM ingredients i
    ), legacy AS (
      SELECT * FROM normalized WHERE NOT managed
    ), original_names AS (
      SELECT name, coalesce(
        min(id) FILTER (WHERE managed),
        min(id) FILTER (WHERE is_catalog),
        min(id)
      ) AS canonical_id
      FROM normalized GROUP BY name
      HAVING count(*) FILTER (WHERE managed) <= 1
    ), alias_matches AS (
      SELECT legacy.id AS old_id, min(canonical.id) AS canonical_id
      FROM legacy JOIN ingredients canonical ON canonical.is_catalog AND canonical.id <> legacy.id
      WHERE EXISTS (
        SELECT 1 FROM ingredient_translations t WHERE t.ingredient_id = canonical.id AND (
          legacy.name = lower(regexp_replace(trim(canonical.name), '\s+', ' ', 'g'))
          OR legacy.name = lower(regexp_replace(trim(t.name), '\s+', ' ', 'g'))
          OR t.aliases @> ARRAY[legacy.name]
        )
      )
      GROUP BY legacy.id HAVING count(DISTINCT canonical.id) = 1
    )
    SELECT legacy.id AS old_id,
      coalesce(alias_matches.canonical_id, original_names.canonical_id) AS canonical_id
    FROM legacy
    LEFT JOIN alias_matches ON alias_matches.old_id = legacy.id
    LEFT JOIN original_names ON original_names.name = legacy.name
    WHERE coalesce(alias_matches.canonical_id, original_names.canonical_id) <> legacy.id
  LOOP
    UPDATE meal_ingredients SET ingredient_id = matched.canonical_id
    WHERE ingredient_id = matched.old_id;

    UPDATE user_settings SET pantry_ingredient_ids = ARRAY(
      SELECT DISTINCT CASE WHEN id = matched.old_id THEN matched.canonical_id ELSE id END
      FROM unnest(pantry_ingredient_ids) id
    ) WHERE matched.old_id = ANY(pantry_ingredient_ids);

    INSERT INTO user_ingredients (user_id, ingredient_id)
    SELECT user_id, matched.canonical_id FROM user_ingredients WHERE ingredient_id = matched.old_id
    ON CONFLICT DO NOTHING;
    DELETE FROM user_ingredients WHERE ingredient_id = matched.old_id;
    -- Keep the old row for rollback, but do not offer a competing picker identity.
    UPDATE ingredients SET is_catalog = false WHERE id = matched.old_id;
  END LOOP;
END $backfill$;
