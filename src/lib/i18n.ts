export const SUPPORTED_LOCALES = ['en', 'cs'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
}

const CS_MESSAGES = {
  'Meal Plan home': 'Domů – jídelní plán',
  'Main navigation': 'Hlavní navigace',
  Planner: 'Plánovač',
  Recipes: 'Recepty',
  Review: 'Kontrola',
  Admin: 'Správa',
  'Admin sections': 'Sekce správy',
  Users: 'Uživatelé',
  Pricing: 'Ceník',
  'Sign out': 'Odhlásit se',
  'Weekly planner': 'Týdenní plánovač',
  'Meal plan': 'Jídelní plán',
  'Plan the week, balance nutrition, shop once.':
    'Naplánujte týden, vyvažte výživu a nakupte najednou.',
  'Create plan': 'Vytvořit plán',
  'Shopping list': 'Nákupní seznam',
  Delete: 'Smazat',
  'Delete this plan?': 'Smazat tento plán?',
  'Create your meal plan to get started.':
    'Začněte vytvořením jídelního plánu.',
  'Loading…': 'Načítání…',
  'No recipes match the auto-compose filters for any empty slot.':
    'Žádný recept odpovídající filtrům automatického sestavení se nehodí do prázdného času.',
  'No empty slots to fill.': 'Nejsou žádné prázdné časy k vyplnění.',
  'Copy last week into this week? Existing slots will be overwritten.':
    'Zkopírovat minulý týden do tohoto týdne? Stávající jídla budou přepsána.',
  'Something went wrong.': 'Něco se pokazilo.',
  'Nothing to recalculate — that day has no empty slots.':
    'Není co přepočítat — tento den nemá žádné prázdné časy.',
  'Plan settings': 'Nastavení plánu',
  'Cuisine preferences': 'Preferované kuchyně',
  'Dietary restrictions': 'Dietní omezení',
  'Used by auto-compose to prefer matching recipes.':
    'Automatické sestavení upřednostní odpovídající recepty.',
  'Auto-compose excludes recipes that do not match.':
    'Automatické sestavení vynechá recepty, které neodpovídají.',
  'Limit automatic planning by favourites or recipe ownership.':
    'Omezí automatické plánování podle oblíbených nebo vlastních receptů.',
  'Meal slots': 'Časy jídel',
  'Choose which meals appear on every day of the plan.':
    'Vyberte jídla, která se zobrazí v každém dni plánu.',
  'Disabled slots and their planned meals are removed.':
    'Vypnuté časy a jejich naplánovaná jídla budou odstraněny.',
  'Custom slot name': 'Název vlastního času',
  'Add slot': 'Přidat čas',
  'Repeat pattern': 'Opakování jídel',
  'Join neighbouring days that should use the same recipe.':
    'Spojte sousední dny, které mají používat stejný recept.',
  'Different meal': 'Jiné jídlo',
  'Same meal': 'Stejné jídlo',
  '{meal}: {day1} and {day2} use the same meal':
    '{meal}: {day1} a {day2} používají stejné jídlo',
  'Previous week': 'Předchozí týden',
  'Next week': 'Následující týden',
  extras: 'navíc',
  nutrition: 'výživa',
  "Re-fill this day's empty slots to fit the remaining budget":
    'Znovu vyplnit prázdné časy tohoto dne podle zbývajícího limitu',
  Recalculate: 'Přepočítat',
  'Copy from last week': 'Kopírovat z minulého týdne',
  'Favourites only': 'Pouze oblíbené',
  'My recipes only': 'Pouze moje recepty',
  'Auto-compose': 'Automaticky sestavit',
  Pro: 'Pro',
  'Remove {name}': 'Odebrat {name}',
  '+ extra': '+ navíc',
  'Add off-plan item': 'Přidat položku mimo plán',
  'Quick picks': 'Rychlý výběr',
  Pizza: 'Pizza',
  'Fast food': 'Rychlé občerstvení',
  Beer: 'Pivo',
  Dessert: 'Dezert',
  'Estimated nutrition — adjust if needed.':
    'Výživové hodnoty jsou orientační — podle potřeby je upravte.',
  'Name (e.g. Pizza, Beer)': 'Název (např. pizza, pivo)',
  Calories: 'Kalorie',
  Protein: 'Bílkoviny',
  Carbs: 'Sacharidy',
  Fat: 'Tuky',
  'Protein g': 'Bílkoviny g',
  'Carbs g': 'Sacharidy g',
  'Fat g': 'Tuky g',
  'Fibre g': 'Vláknina g',
  'Sugars g': 'Cukry g',
  'Saturated fat g': 'Nasycené tuky g',
  'Salt g': 'Sůl g',
  Cancel: 'Zrušit',
  Add: 'Přidat',
  leftovers: 'zbytky',
  'Edit meal assignment': 'Upravit přiřazení jídla',
  'Show recipe': 'Zobrazit recept',
  'Prepare separately': 'Připravit zvlášť',
  'Use leftovers from {source}': 'Použít zbytky z {source}',
  'Remove meal': 'Odebrat jídlo',
  'Click to assign meal': 'Kliknutím přiřadíte jídlo',
  'Search meals…': 'Hledat jídla…',
  'Clear slot': 'Vymazat čas',
  'No meals found': 'Nebyla nalezena žádná jídla',
  'Calories: {value} / {target} kcal': 'Kalorie: {value} / {target} kcal',
  'Protein: {value}g / {target}g': 'Bílkoviny: {value} g / {target} g',
  'Carbs: {value}g / {target}g': 'Sacharidy: {value} g / {target} g',
  'Fat: {value}g / {target}g': 'Tuky: {value} g / {target} g',
  'Fibre: {value}g': 'Vláknina: {value} g',
  'Sugars: {value}g': 'Cukry: {value} g',
  'Saturated fat: {value}g': 'Nasycené tuky: {value} g',
  'Salt: {value}g': 'Sůl: {value} g',
  Fibre: 'Vláknina',
  Sugars: 'Cukry',
  Saturates: 'Nasycené',
  Salt: 'Sůl',
  'Global catalogue': 'Globální katalog',
  'Recipe review': 'Kontrola receptů',
  'Recipe management': 'Správa receptů',
  'Manage shared recipes and review imported recipe data.':
    'Spravujte sdílené recepty a kontrolujte importovaná data receptů.',
  'Shared recipes': 'Sdílené recepty',
  'Open recipe library': 'Otevřít knihovnu receptů',
  'Archive this shared recipe?': 'Archivovat tento sdílený recept?',
  Archive: 'Archivovat',
  'No shared recipes.': 'Žádné sdílené recepty.',
  'Queue licensed recipe data, then approve it for everyone.':
    'Zařaďte licencovaná data receptů do fronty a poté je schvalte pro všechny.',
  'Batch import': 'Hromadný import',
  'Paste a JSON array of 1–300 recipes. Each needs a name, ingredients, and instructions.':
    'Vložte pole JSON s 1–300 recepty. Každý musí mít název, suroviny a postup.',
  'Paste recipe JSON here': 'Sem vložte JSON receptů',
  'Validating…': 'Ověřování…',
  'Queue recipes': 'Zařadit recepty',
  '{accepted} queued, {duplicates} duplicates, {invalid} invalid.':
    'Zařazeno: {accepted}, duplicity: {duplicates}, neplatné: {invalid}.',
  'Import failed': 'Import se nezdařil',
  'Pending ({count})': 'Čekající ({count})',
  'Review content': 'Zkontrolovat obsah',
  Ingredients: 'Suroviny',
  Instructions: 'Postup',
  Approve: 'Schválit',
  Reject: 'Zamítnout',
  'No recipes awaiting review.': 'Žádné recepty nečekají na kontrolu.',
  Administration: 'Správa',
  'User management': 'Správa uživatelů',
  'Control who can manage shared recipes and users.':
    'Určete, kdo může spravovat sdílené recepty a uživatele.',
  'Control administrator roles and Pro plan access.':
    'Spravujte role administrátorů a přístup k tarifu Pro.',
  Administrator: 'Správce',
  User: 'Uživatel',
  'Current account': 'Aktuální účet',
  'Revoke admin': 'Odebrat správce',
  'Make admin': 'Nastavit jako správce',
  'Grant Pro': 'Udělit Pro',
  'Revoke Pro': 'Odebrat Pro',
  Role: 'Role',
  Plan: 'Tarif',
  'Plan access': 'Přístup k tarifům',
  '{pro} Pro and {free} Free accounts':
    '{pro} účtů Pro a {free} bezplatných účtů',
  'View plan comparison': 'Zobrazit porovnání tarifů',
  'No users found.': 'Nebyli nalezeni žádní uživatelé.',
  'Plan better meals, one week at a time.':
    'Plánujte lepší jídla, týden po týdnu.',
  Email: 'E-mail',
  Password: 'Heslo',
  'I accept the': 'Souhlasím s',
  'Terms and Conditions': 'obchodními podmínkami',
  'I acknowledge the': 'Beru na vědomí',
  'Privacy Policy': 'zásady ochrany osobních údajů',
  Terms: 'Obchodní podmínky',
  Privacy: 'Zásady ochrany osobních údajů',
  'Legal updates': 'Právní aktualizace',
  'Please review our Terms and Conditions':
    'Přečtěte si prosím naše obchodní podmínky',
  'Please review our Privacy Policy':
    'Přečtěte si prosím naše zásady ochrany osobních údajů',
  'Review version {version}. You can accept it here after reading.':
    'Přečtěte si verzi {version}. Po přečtení ji zde můžete přijmout.',
  'Review version {version}. This acknowledgement confirms that you saw the notice.':
    'Přečtěte si verzi {version}. Potvrzení znamená, že jste oznámení viděli.',
  'Read document': 'Přečíst dokument',
  Accept: 'Přijmout',
  Acknowledge: 'Potvrdit seznámení',
  'Sign in': 'Přihlásit se',
  'Create account': 'Vytvořit účet',
  'Sign in instead': 'Místo toho se přihlásit',
  'Recipe library': 'Knihovna receptů',
  'Recipe sections': 'Sekce receptů',
  'Keep your favourites ready for the week ahead.':
    'Mějte oblíbené recepty připravené na příští týden.',
  'Show all': 'Zobrazit vše',
  'Import from URL': 'Importovat z URL',
  '+ Add meal': '+ Přidat jídlo',
  'Recipe language': 'Jazyk receptu',
  'Recipe page URL': 'URL stránky s receptem',
  'Import a recipe': 'Importovat recept',
  'Paste a public recipe page URL. The personal recipe opens for editing after import.':
    'Vložte URL veřejné stránky s receptem. Osobní recept se po importu otevře k úpravě.',
  'Importing…': 'Importování…',
  Import: 'Importovat',
  'Import and edit': 'Importovat a upravit',
  'Search recipes…': 'Hledat recepty…',
  'Filter by difficulty': 'Filtrovat podle obtížnosti',
  'Any difficulty': 'Libovolná obtížnost',
  Apply: 'Použít',
  Clear: 'Vymazat',
  'No matching recipes.': 'Nebyly nalezeny odpovídající recepty.',
  'No favourites yet.': 'Zatím nemáte žádné oblíbené recepty.',
  'No meals yet.': 'Zatím zde nejsou žádná jídla.',
  'Recipe pages': 'Stránky receptů',
  Previous: 'Předchozí',
  'Page {page} of {pages}': 'Strana {page} z {pages}',
  Next: 'Další',
  Personal: 'Osobní',
  Unfavourite: 'Odebrat z oblíbených',
  'Mark as favourite': 'Přidat do oblíbených',
  'Meal name': 'Název jídla',
  'Who can see this recipe': 'Kdo může tento recept vidět',
  'Just me': 'Jen já',
  Everyone: 'Všichni',
  Save: 'Uložit',
  Name: 'Název',
  Difficulty: 'Obtížnost',
  Preparation: 'Příprava',
  Actions: 'Akce',
  'No rows.': 'Žádné řádky.',
  'Delete this meal?': 'Smazat toto jídlo?',
  '← Meals': '← Jídla',
  'Start cooking': 'Začít vařit',
  Edit: 'Upravit',
  Translate: 'Přeložit',
  'Make a personal copy': 'Vytvořit osobní kopii',
  Recipe: 'Recept',
  '{minutes} min preparation': 'Příprava {minutes} min',
  'Fewer servings': 'Méně porcí',
  'More servings': 'Více porcí',
  '{value}g protein': '{value} g bílkovin',
  '{value}g carbs': '{value} g sacharidů',
  '{value}g fat': '{value} g tuku',
  '{value}g fibre': '{value} g vlákniny',
  '{value}g sugars': '{value} g cukrů',
  '{value}g saturated fat': '{value} g nasycených tuků',
  '{value}g salt': '{value} g soli',
  'Ingredients without a numeric quantity cannot be scaled. Edit the recipe to add one.':
    'Suroviny bez číselného množství nelze přepočítat. Doplňte je úpravou receptu.',
  'Cooking mode': 'Režim vaření',
  'Screen wake lock status': 'Stav ponechání obrazovky zapnuté',
  'Screen awake': 'Obrazovka zůstává zapnutá',
  'Wake lock unavailable': 'Ponechání obrazovky zapnuté není dostupné',
  'Wake lock inactive': 'Ponechání obrazovky zapnuté není aktivní',
  'Close cooking mode': 'Zavřít režim vaření',
  Close: 'Zavřít',
  'Ingredients for {count}': 'Suroviny pro {count}',
  'Fewer cooking servings': 'Méně porcí pro vaření',
  'More cooking servings': 'Více porcí pro vaření',
  'No ingredients listed.': 'Nejsou uvedeny žádné suroviny.',
  'Step {step} of {count}': 'Krok {step} z {count}',
  'Cooking steps': 'Kroky vaření',
  'Next step': 'Další krok',
  Timers: 'Časovače',
  Minutes: 'Minuty',
  'Start timer': 'Spustit časovač',
  "Time's up": 'Čas vypršel',
  Pause: 'Pozastavit',
  Resume: 'Pokračovat',
  Done: 'Hotovo',
  'Remove timer': 'Odebrat časovač',
  Remove: 'Odebrat',
  'Image URL': 'URL obrázku',
  'Preparation (min)': 'Příprava (min)',
  'Protein (g)': 'Bílkoviny (g)',
  'Carbs (g)': 'Sacharidy (g)',
  'Fat (g)': 'Tuky (g)',
  'Fibre (g)': 'Vláknina (g)',
  'Sugars (g)': 'Cukry (g)',
  'Saturated fat (g)': 'Nasycené tuky (g)',
  'Salt (g)': 'Sůl (g)',
  Servings: 'Porce',
  Cuisine: 'Kuchyně',
  Diet: 'Dieta',
  'Allowed slots': 'Povolené časy',
  '(none = any)': '(žádné = libovolné)',
  Description: 'Popis',
  Ingredient: 'Surovina',
  Qty: 'Množství',
  'Remove ingredient': 'Odebrat surovinu',
  '+ Add ingredient': '+ Přidat surovinu',
  'Recipe translation': 'Překlad receptu',
  'Translate from {language}': 'Přeložit z jazyka {language}',
  Language: 'Jazyk',
  'No original description': 'Původní popis není k dispozici',
  'No original instructions': 'Původní postup není k dispozici',
  'Blank fields fall back to the original recipe.':
    'Prázdná pole použijí text původního receptu.',
  'Save translation': 'Uložit překlad',
  'Delete translation': 'Smazat překlad',
  'Delete the {language} translation?': 'Smazat překlad do jazyka {language}?',
  '← Meal plan': '← Jídelní plán',
  'Copy list': 'Kopírovat seznam',
  'Choose Google Keep or another app from the share menu':
    'V nabídce sdílení vyberte Google Keep nebo jinou aplikaci',
  'Share list': 'Sdílet seznam',
  'Everything for the week': 'Vše na celý týden',
  'Week of {week}': 'Týden od {week}',
  'People served': 'Počet osob',
  'Sharing and copying are not supported by this browser.':
    'Tento prohlížeč nepodporuje sdílení ani kopírování.',
  'Copied. Paste it into Google Keep or another app.':
    'Zkopírováno. Vložte seznam do Google Keep nebo jiné aplikace.',
  'Could not share or copy this list.':
    'Seznam se nepodařilo sdílet ani zkopírovat.',
  'No meals assigned this week — nothing to shop for yet.':
    'Na tento týden nejsou přiřazena žádná jídla — zatím není co nakupovat.',
  'No ingredients to shop for this week.':
    'Tento týden není potřeba nakoupit žádné suroviny.',
  'Your account': 'Váš účet',
  'Free plan': 'Bezplatný tarif',
  'Pro plan': 'Tarif Pro',
  'Your current plan': 'Váš aktuální tarif',
  'Pro is active': 'Pro je aktivní',
  'Recipe import and planning automation are unlocked.':
    'Import receptů a automatizace plánování jsou odemčené.',
  'Manual planning, recipes, favourites, and shopping lists are included.':
    'Ruční plánování, recepty, oblíbené položky a nákupní seznamy jsou součástí tarifu.',
  'Pro payments are coming soon.': 'Platby za Pro budou brzy k dispozici.',
  'Compare plans': 'Porovnat tarify',
  'Plans & pricing': 'Tarify a ceny',
  'Simple plans for better weekly meals.':
    'Jednoduché tarify pro lepší týdenní stravování.',
  'Start with all the essentials for free. Pro adds time-saving automation when you need it.':
    'Začněte se všemi základními funkcemi zdarma. Pro přidává automatizaci, která šetří čas.',
  'Free forever': 'Navždy zdarma',
  'Manual weekly planning': 'Ruční týdenní plánování',
  'Personal and shared recipes': 'Osobní a sdílené recepty',
  'Favourites and shopping lists': 'Oblíbené položky a nákupní seznamy',
  'Nutrition tracking': 'Sledování výživy',
  'Coming soon': 'Již brzy',
  'Everything in Free': 'Vše z bezplatného tarifu',
  'Import recipes from a URL': 'Import receptů z URL',
  'Automatic plan composition': 'Automatické sestavení plánu',
  'Copy a previous week': 'Kopírování předchozího týdne',
  'Recalculate a day around extras': 'Přepočet dne podle položek navíc',
  'Pro checkout is not available yet. During preview, administrators can grant access from user management.':
    'Platba za Pro zatím není dostupná. Během náhledu mohou administrátoři udělit přístup ve správě uživatelů.',
  'Start planning': 'Začít plánovat',
  Profile: 'Profil',
  'Profile sections': 'Sekce profilu',
  Preferences: 'Předvolby',
  Security: 'Zabezpečení',
  'Data & privacy': 'Data a soukromí',
  'Used for the app interface and available recipe translations.':
    'Používá se pro rozhraní aplikace a dostupné překlady receptů.',
  'Preferred language': 'Preferovaný jazyk',
  'Save language': 'Uložit jazyk',
  'Pantry staples': 'Suroviny ve spíži',
  'Ingredients you always have, such as salt or oil. One per line; they are omitted from shopping lists.':
    'Suroviny, které máte vždy po ruce, například sůl nebo olej. Jedna na řádek; v nákupních seznamech se vynechají.',
  'Pantry staples saved.': 'Suroviny ve spíži byly uloženy.',
  'Always on hand': 'Vždy po ruce',
  'Save pantry staples': 'Uložit suroviny ve spíži',
  'Nutrition targets': 'Výživové cíle',
  'Daily goals for nutrition bars and auto-compose. Blank uses the default.':
    'Denní cíle pro výživové ukazatele a automatické sestavení. Prázdné pole použije výchozí hodnotu.',
  'Targets saved.': 'Cíle byly uloženy.',
  'Save targets': 'Uložit cíle',
  'Change password': 'Změnit heslo',
  'Use at least eight characters.': 'Použijte alespoň osm znaků.',
  'Current password': 'Současné heslo',
  'New password': 'Nové heslo',
  'Update password': 'Aktualizovat heslo',
  'Password updated.': 'Heslo bylo aktualizováno.',
  'Your data': 'Vaše data',
  'Download a JSON copy of your profile settings, personal recipes, plans, favourites, and recipe submissions.':
    'Stáhněte si kopii nastavení profilu, osobních receptů, plánů, oblíbených položek a odeslaných receptů ve formátu JSON.',
  'Download my data': 'Stáhnout moje data',
  'Delete account': 'Smazat účet',
  'Permanently deletes your sessions, settings, recipes, plans, and other personal data. Shared recipes stay in the catalogue. This cannot be undone.':
    'Trvale smaže vaše relace, nastavení, recepty, plány a další osobní data. Sdílené recepty zůstanou v katalogu. Tuto akci nelze vrátit zpět.',
  'Type {email} to confirm': 'Pro potvrzení napište {email}',
  'Delete my account permanently': 'Trvale smazat můj účet',
  'Too many attempts. Try again later.':
    'Příliš mnoho pokusů. Zkuste to znovu později.',
  'Invalid email or password': 'Neplatný e-mail nebo heslo',
  'You must accept both legal documents to create an account':
    'Pro vytvoření účtu musíte přijmout oba právní dokumenty',
  'Password must be at least 8 characters': 'Heslo musí mít alespoň 8 znaků',
  'Invalid legal document version': 'Neplatná verze právního dokumentu',
  'Legal documents changed. Review the current versions and try again.':
    'Právní dokumenty se změnily. Přečtěte si aktuální verze a zkuste to znovu.',
  'Password must be at most 128 characters': 'Heslo může mít nejvýše 128 znaků',
  'Email already in use': 'E-mail je již používán',
  'New password must be at least 8 characters':
    'Nové heslo musí mít alespoň 8 znaků',
  'New password must be at most 128 characters':
    'Nové heslo může mít nejvýše 128 znaků',
  'Current password is incorrect': 'Současné heslo není správné',
  'Password and confirmation are required': 'Je vyžadováno heslo a potvrzení',
  'Password or confirmation is incorrect': 'Heslo nebo potvrzení není správné',
  'Promote another administrator before deleting your account':
    'Před smazáním účtu povyšte jiného uživatele na správce',
  'Request failed': 'Požadavek se nezdařil',
  'Page not found': 'Stránka nebyla nalezena',
  'Unexpected error': 'Neočekávaná chyba',
  'Back to home': 'Zpět na úvod',
  'Invalid date': 'Neplatné datum',
  'Status must be approved or rejected':
    'Stav musí být schválený nebo zamítnutý',
  'Pending import not found': 'Čekající import nebyl nalezen',
  'Invalid JSON': 'Neplatný JSON',
  'Invalid client error': 'Neplatná chyba klienta',
  'Not authenticated': 'Nejste přihlášeni',
  'Admin access required': 'Je vyžadován přístup správce',
  'Invalid user id': 'Neplatné ID uživatele',
  'isAdmin must be a boolean': 'Hodnota isAdmin musí být typu boolean',
  'Provide either isAdmin or isPro as a boolean':
    'Zadejte buď isAdmin, nebo isPro jako logickou hodnotu',
  'You cannot change your own admin access':
    'Nemůžete změnit vlastní oprávnění správce',
  'User not found': 'Uživatel nebyl nalezen',
  'Admin access changed; refresh and try again':
    'Oprávnění správce se změnilo; obnovte stránku a zkuste to znovu',
  'Pro subscription required': 'Je vyžadováno předplatné Pro',
  'Plan not found': 'Jídelní plán nebyl nalezen',
  'Name is required': 'Název je povinný',
  'Only admins can create global recipes':
    'Globální recepty mohou vytvářet pouze správci',
  'Invalid scope': 'Neplatný rozsah',
  'Meal not found': 'Jídlo nebylo nalezeno',
  'Only global meals can be duplicated': 'Duplikovat lze pouze globální jídla',
  'Unsupported locale': 'Nepodporovaný jazyk',
  'Edit the original recipe for its source language':
    'Pro zdrojový jazyk upravte původní recept',
  'Could not fetch that URL': 'Tuto URL se nepodařilo načíst',
  'Provide a url or text': 'Zadejte URL nebo text',
  "Couldn't find recipe data on that page":
    'Na této stránce se nepodařilo najít data receptu',
  'Plan already exists': 'Plán již existuje',
  'Choose between 1 and 10 valid meal slots':
    'Vyberte 1 až 10 platných časů jídel',
  'Portions must be a whole number from 1 to 100':
    'Počet porcí musí být celé číslo od 1 do 100',
  'Invalid bonus item id': 'Neplatné ID položky navíc',
  'Source and target week are the same': 'Zdrojový a cílový týden jsou stejné',
  'Invalid mealType': 'Neplatný typ jídla',
  'Invalid groupBreaks': 'Neplatné rozdělení skupin',
  'Meal not allowed for this slot type': 'Jídlo není pro tento čas povoleno',
  'Slot not found': 'Čas nebyl nalezen',
  'Invalid source': 'Neplatný zdroj',
  'Invalid source mealType': 'Neplatný typ zdrojového jídla',
  'Leftovers must come from an earlier meal':
    'Zbytky musí pocházet z dřívějšího jídla',
  'Leftover source must contain the same meal':
    'Zdroj zbytků musí obsahovat stejné jídlo',
  'URL must be a public http(s) address': 'URL musí být veřejná adresa HTTP(S)',
  'URL must resolve only to public addresses':
    'URL musí odkazovat pouze na veřejné adresy',
  'Recipe page is too large': 'Stránka receptu je příliš velká',
  'URL credentials are not allowed': 'Přihlašovací údaje v URL nejsou povoleny',
  'Fetch failed (bad redirect)': 'Načtení selhalo (neplatné přesměrování)',
  'Too many redirects': 'Příliš mnoho přesměrování',
  'Provide between 1 and 300 recipes': 'Zadejte 1 až 300 receptů',
} as const

export type MessageKey = keyof typeof CS_MESSAGES
export type MessageParams = Record<string, string | number>
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string
}

export function translate(
  locale: Locale,
  message: MessageKey,
  params: MessageParams = {},
): string {
  const template = locale === 'cs' ? CS_MESSAGES[message] : message
  return Object.entries(params).reduce<string>(
    (text, [key, value]) => text.replaceAll(`{${key}}`, () => String(value)),
    template,
  )
}

export function translateMessage(locale: Locale, message: string): string {
  if (locale !== 'cs') return message
  if (message in CS_MESSAGES) return CS_MESSAGES[message as MessageKey]
  const fetchStatus = message.match(/^Fetch failed \((.+)\)$/)
  return fetchStatus ? `Načtení selhalo (${fetchStatus[1]})` : message
}

export const localeCode = (locale: Locale) =>
  locale === 'cs' ? 'cs-CZ' : 'en-US'

const CS_LABELS: Record<string, string> = {
  breakfast: 'snídaně',
  morning_snack: 'svačina',
  lunch: 'oběd',
  afternoon_snack: 'svačina',
  dinner: 'večeře',
  easy: 'Snadná',
  medium: 'Střední',
  hard: 'Náročná',
  Italian: 'Italská',
  Chinese: 'Čínská',
  Japanese: 'Japonská',
  Mexican: 'Mexická',
  Indian: 'Indická',
  Mediterranean: 'Středomořská',
  Thai: 'Thajská',
  American: 'Americká',
  Vegetarian: 'Vegetariánská',
  Vegan: 'Veganská',
  no_lactose: 'bez laktózy',
  no_gluten: 'bez lepku',
  no_fiber: 'bez vlákniny',
  no_nuts: 'bez ořechů',
  no_eggs: 'bez vajec',
  low_carb: 'nízkosacharidová',
  low_fat: 'nízkotučná',
  high_protein: 'vysokoproteinová',
  tsp: 'lžička',
  tbsp: 'lžíce',
  cup: 'hrnek',
  piece: 'ks',
  clove: 'stroužek',
  pinch: 'špetka',
  slice: 'plátek',
  can: 'plechovka',
  bunch: 'svazek',
  handful: 'hrst',
}

export function localizeLabel(locale: Locale, value: string): string {
  if (locale === 'cs' && CS_LABELS[value]) return CS_LABELS[value]
  return value.replaceAll('_', ' ')
}

export function formatCount(
  locale: Locale,
  count: number,
  forms: PluralForms,
): string {
  const rule = new Intl.PluralRules(localeCode(locale)).select(count)
  return `${count} ${forms[rule] ?? forms.other}`
}

const COUNT_FORMS = {
  recipe: {
    en: { one: 'recipe', other: 'recipes' },
    cs: { one: 'recept', few: 'recepty', other: 'receptů' },
  },
  serving: {
    en: { one: 'serving', other: 'servings' },
    cs: { one: 'porce', few: 'porce', other: 'porcí' },
  },
} satisfies Record<string, Record<Locale, PluralForms>>

export type CountedNoun = keyof typeof COUNT_FORMS

export const formatNamedCount = (
  locale: Locale,
  count: number,
  noun: CountedNoun,
) => formatCount(locale, count, COUNT_FORMS[noun][locale])

export function parseLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null
  const language = value.trim().toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LOCALES.find((locale) => locale === language) ?? null
}

export function localeFromAcceptLanguage(value: string | null): Locale {
  if (!value) return DEFAULT_LOCALE
  let preferred: Locale | null = null
  let preferredQuality = -1
  let wildcardQuality = -1
  const specified = new Set<Locale>()
  for (const item of value.split(',')) {
    const [language, ...parameters] = item.split(';')
    const qualityParameter = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.toLowerCase().startsWith('q='))
    const quality = qualityParameter ? Number(qualityParameter.slice(2)) : 1
    if (!Number.isFinite(quality) || quality < 0 || quality > 1) continue
    if (language.trim() === '*') {
      wildcardQuality = Math.max(wildcardQuality, quality)
      continue
    }
    const locale = parseLocale(language)
    if (locale) specified.add(locale)
    if (locale && quality > 0 && quality > preferredQuality) {
      preferred = locale
      preferredQuality = quality
    }
  }
  if (wildcardQuality > 0 && wildcardQuality > preferredQuality) {
    const wildcardLocale = SUPPORTED_LOCALES.find(
      (locale) => !specified.has(locale),
    )
    if (wildcardLocale) return wildcardLocale
  }
  return preferred ?? DEFAULT_LOCALE
}
