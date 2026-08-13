# Informace o zpracování osobních údajů

> **NÁVRH – PŘED ZVEŘEJNĚNÍM DOPLŇTE VŠECHNY ÚDAJE V HRANATÝCH ZÁVORKÁCH, OVĚŘTE PŘÍJEMCE A DOBY ULOŽENÍ A SPLŇTE KROKY V ZÁVĚREČNÉM KONTROLNÍM SEZNAMU.**

Verze 0.1, účinná od [DATUM ÚČINNOSTI]

Tento dokument vysvětluje, jak jsou při používání služby Meal Plan na [URL SLUŽBY] zpracovávány osobní údaje. Je samostatný od [Podmínek používání](./terms-and-conditions.cs.md).

## 1. Správce a kontakt

Správcem osobních údajů je [JMÉNO / OBCHODNÍ FIRMA], IČO [IČO, JE-LI PŘIDĚLENO], se sídlem [ADRESA] (dále jen „správce“).

Kontaktní e-mail pro otázky a uplatnění práv: [E-MAIL PRO OCHRANU ÚDAJŮ]

Pověřenec pro ochranu osobních údajů: [KONTAKT POVĚŘENCE, POKUD BYL JMENOVÁN; JINAK TENTO ŘÁDEK SMAŽTE]

## 2. Jaké údaje zpracováváme, proč a jak dlouho

| Účel                                              | Údaje                                                                                                                                                                                                       | Právní základ                                                                                                         | Doba uložení                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Registrace, přihlášení a vedení účtu              | e-mail, interní ID, hash hesla                                                                                                                                                                              | plnění smlouvy, čl. 6 odst. 1 písm. b) GDPR                                                                           | po dobu existence účtu; po jeho zrušení nejdéle [LHŮTA], kromě údajů nutných pro právní nároky |
| Přihlášená relace                                 | náhodný relační token, interní ID, datum expirace                                                                                                                                                           | plnění smlouvy, čl. 6 odst. 1 písm. b) GDPR                                                                           | cookie nejvýše 30 dnů; databázový záznam nejdéle [LHŮTA PRO MAZÁNÍ EXPIROVANÝCH RELACÍ]        |
| Recepty a plánování jídel                         | recepty, ingredience, oblíbené položky, jídelní plány, porce, nákupní položky, preference kuchyně a výživové cíle                                                                                           | plnění smlouvy, čl. 6 odst. 1 písm. b) GDPR                                                                           | po dobu existence účtu nebo do odstranění příslušného obsahu                                   |
| Potravinová omezení                               | zvolené potravinové preference; mohou nepřímo vypovídat o zdravotním stavu                                                                                                                                  | u běžných preferencí plnění smlouvy; pokud údaj vypovídá o zdraví, výslovný souhlas podle čl. 9 odst. 2 písm. a) GDPR | do odstranění údaje, odvolání souhlasu nebo zrušení účtu                                       |
| Zabezpečení přihlášení                            | IP adresa neúspěšných i úspěšných pokusů v dočasné paměti, počet pokusů                                                                                                                                     | oprávněný zájem na ochraně služby a účtů, čl. 6 odst. 1 písm. f) GDPR                                                 | 15 minut                                                                                       |
| Provozní diagnostika                              | identifikátor požadavku, trasa, metoda, stavový kód, doba odezvy, chybová hlášení; běžné aplikační logy neobsahují e-mail ani relační token                                                                 | oprávněný zájem na zabezpečení, stabilitě a odstraňování chyb, čl. 6 odst. 1 písm. f) GDPR                            | provozní logy a metriky 7 dnů                                                                  |
| Diagnostika prostřednictvím Sentry, je-li zapnuta | interní ID uživatele, technické údaje o zařízení a prohlížeči, IP adresa dostupná při síťovém spojení, chybové a výkonnostní údaje; při chybě také záznam interakce s maskovaným textem a blokovanými médii | oprávněný zájem na zabezpečení, stabilitě a odstraňování chyb, čl. 6 odst. 1 písm. f) GDPR                            | [DOBA ULOŽENÍ NASTAVENÁ V SENTRY]                                                              |
| Ochrana práv a plnění právních povinností         | údaje nezbytné k řešení požadavku, incidentu nebo sporu                                                                                                                                                     | právní povinnost podle čl. 6 odst. 1 písm. c) nebo oprávněný zájem podle písm. f) GDPR                                | po dobu stanovenou příslušným předpisem nebo do promlčení nároku                               |

E-mail a heslo jsou nezbytné pro vytvoření účtu. Bez nich nelze účet a přihlášenou část služby poskytnout. Ostatní obsah a preference jsou dobrovolné; bez jejich zadání mohou být odpovídající funkce omezené.

Správce nepoužívá údaje k marketingu, reklamě ani profilování a neprovádí rozhodování, které by mělo pro uživatele právní nebo obdobně významné účinky.

## 3. Údaje o zdraví a výslovný souhlas

Meal Plan není zdravotnická služba. Uživatel nemá do služby zadávat diagnózy, výsledky vyšetření ani jiné podrobné zdravotní informace.

Potravinové alergie, intolerance a léčebné diety přesto mohou představovat údaje o zdraví. Před uložením takového údaje musí služba požádat o samostatný výslovný souhlas. Souhlas lze kdykoli odvolat odstraněním údajů a prostřednictvím [POSTUP / KONTAKT PRO ODVOLÁNÍ SOUHLASU]. Odvolání nemá vliv na zákonnost dřívějšího zpracování. Bez souhlasu lze službu používat bez ukládání zdravotně podmíněných omezení.

## 4. Cookies a podobné technologie

Služba používá pouze technicky nezbytnou cookie `session`, která udržuje přihlášení. Je zabezpečena proti přístupu z JavaScriptu (`HttpOnly`), používá režim `SameSite=Lax`, platí pro celou službu a expiruje nejpozději za 30 dnů. Bez této cookie nelze používat funkce vyžadující přihlášení.

Pro technicky nezbytnou cookie není vyžadován souhlas. Služba nepoužívá reklamní ani analytické cookies. Pokud budou takové technologie později přidány, tento dokument bude aktualizován a před jejich aktivací bude zajištěn odpovídající souhlas.

## 5. Zdroje údajů

Většinu údajů získává správce přímo od uživatele. Technické údaje vznikají při používání služby. Při importu receptu služba načítá veřejně dostupná data z webové adresy zadané uživatelem; zdrojový web při tom obdrží požadavek ze serveru služby, nikoli přímo z prohlížeče uživatele.

## 6. Příjemci a zpracovatelé

K údajům mohou v nezbytném rozsahu přistupovat:

- [POSKYTOVATEL HOSTINGU A DATABÁZE, ADRESA, ZEMĚ] – hosting aplikace a databáze;
- Functional Software, Inc. (Sentry), je-li Sentry zapnuto – sledování chyb, výkonu a chybových relací;
- [DALŠÍ DODAVATELÉ, NAPŘ. SPRÁVA INFRASTRUKTURY NEBO ZÁLOH; NEJSOU-LI, ŘÁDEK SMAŽTE];
- orgány veřejné moci a další osoby, pokud přístup vyžaduje zákon nebo je nezbytný k ochraně práv správce.

Správce neprodává osobní údaje a neposkytuje je třetím osobám pro jejich vlastní marketing.

## 7. Předávání mimo Evropský hospodářský prostor

[VYBERTE A UPRAVTE PODLE SKUTEČNÉHO HOSTINGU: Údaje hostované v Evropském hospodářském prostoru se mimo něj nepředávají, s výjimkou níže popsané služby Sentry.]

Je-li zapnuto Sentry, může docházet k předání do Spojených států nebo do dalších zemí, v nichž působí jeho schválení další zpracovatelé. Ochrana je zajištěna [ROZHODNUTÍM O ODPOVÍDAJÍCÍ OCHRANĚ / STANDARDNÍMI SMLUVNÍMI DOLOŽKAMI; OVĚŘTE PODLE AKTUÁLNÍ SMLOUVY A NASTAVENÍ SENTRY]. Kopii použitých záruk lze vyžádat na [E-MAIL PRO OCHRANU ÚDAJŮ].

## 8. Zabezpečení

Správce používá přiměřená technická a organizační opatření. Hesla ukládá pouze jako jednosměrné hashe s individuální solí, relační tokeny generuje náhodně a přístup k uživatelskému obsahu omezuje na vlastníka účtu. Přenos produkční služby musí být chráněn pomocí HTTPS. Žádný způsob zabezpečení však nemůže zaručit absolutní bezpečnost.

## 9. Práva uživatele

Podle okolností má uživatel právo:

- získat potvrzení, zda jsou jeho údaje zpracovávány, a právo na přístup k nim;
- požadovat opravu nepřesných nebo doplnění neúplných údajů;
- požadovat výmaz údajů;
- požadovat omezení zpracování;
- získat údaje poskytnuté správci ve strukturovaném, běžně používaném a strojově čitelném formátu a předat je jinému správci;
- vznést námitku proti zpracování založenému na oprávněném zájmu;
- kdykoli odvolat souhlas, je-li zpracování založeno na souhlasu;
- podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, [uoou.gov.cz](https://uoou.gov.cz/).

Práva lze uplatnit na [E-MAIL PRO OCHRANU ÚDAJŮ]. Správce může v nezbytném rozsahu ověřit totožnost žadatele. Na žádost odpoví bez zbytečného odkladu, zpravidla do jednoho měsíce; v případech dovolených GDPR může být lhůta prodloužena.

Právo na výmaz není absolutní. Některé údaje může být nutné uchovat kvůli právní povinnosti nebo určení, výkonu či obhajobě právních nároků.

## 10. Změny těchto informací

Aktuální znění je vždy dostupné na [VEŘEJNÁ URL INFORMACÍ]. Při podstatné změně zpracování správce uživatele přiměřeně informuje předem. Datum účinnosti a číslo verze jsou uvedeny v záhlaví.

## Kontrolní seznam před zveřejněním (odstraňte tuto část z veřejné verze)

- Doplňte úplnou identitu, adresu, IČO, kontakt správce a veřejné URL obou dokumentů.
- Určete, zda je provozovatel podnikatelem; podle toho ověřte identifikaci, spotřebitelská ustanovení a ČOI v podmínkách.
- Doplňte hosting, umístění databáze, zálohy, jejich retenční dobu a všechny osoby, které mají k produkčním údajům přístup.
- V Sentry ověřte organizaci, datový region, dobu uchování, seznam dalších zpracovatelů a mechanismus mezinárodního předání; uzavřete zpracovatelskou smlouvu.
- Před veřejným provozem přidejte samostatný, evidovaný výslovný souhlas pro potravinová omezení, která mohou vypovídat o zdraví, a snadný způsob jeho odvolání; jinak tato data neukládejte.
- Zaveďte skutečný proces pro výmaz účtu, obsahu, expirovaných relací a záloh a slaďte s ním retenční lhůty v tabulce.
- Zajistěte možnost exportu údajů pro přístup a přenositelnost.
- Umístěte trvalé odkazy na oba dokumenty také do patičky nebo jiného snadno dostupného místa. Při současném použití pouze technické cookie není nutná cookie lišta.
- Ověřte, že produkce používá HTTPS a že cookie `session` má v produkci atribut `Secure`; současný kód jej výslovně nenastavuje.
- Proveďte právní kontrolu finálního textu podle skutečného obchodního modelu a zemí, ve kterých bude služba nabízena.

## Použité právní a metodické zdroje

- [Nařízení (EU) 2016/679 (GDPR), zejména čl. 6, 9, 12–22, 28, 32 a 44–49](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32016R0679)
- [ÚOOÚ: metodika k plnění informační povinnosti](https://uoou.gov.cz/profesional/metodiky-a-doporuceni-pro-spravce/metodika-k-plneni-informacni-povinnosti-a-k-souvisejicim-ujednanim-vuci-zakaznikum)
- [ÚOOÚ: cookies](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies)
- [Sentry: Data Processing Addendum](https://sentry.io/legal/dpa/)
