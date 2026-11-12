# Smart Requests

Smart Requests – nedidelė projektų ir užklausų valdymo aplikacija. Prisijungęs vartotojas gali kurti projektus, kiekvienam projektui registruoti užklausas, nurodyti jų prioritetą ir sekti sukūrimo datą. Skubios užklausos gali būti perduodamos išorinei Zapier automatizacijai.

Vieša aplikacija: [smart-requests.vercel.app](https://smart-requests.vercel.app/).

## Funkcijos

- Registracija el. paštu ir slaptažodžiu, prisijungimas bei atsijungimas per Supabase Auth.
- Projektų sąrašas, paieška, sukūrimas, pavadinimo keitimas ir ištrynimas. Prieš ištrinant projektą su užklausomis prašoma patvirtinimo.
- Projektui priklausančių užklausų kūrimas, peržiūra, redagavimas ir ištrynimas.
- Užklausos prioritetas: `normal` (įprasta) arba `high` (skubi).
- Projektų kortelėse rodomas užklausų skaičius; duomenys įkeliami pagal aktyvią paskyrą.

## Technologijos ir paslaugos

- **React** 19 ja **JavaScript** – naudotojo sąsaja ir aplikacijos logika.
- **Vite** – kūrimo serveris ir produkcinis paketas.
- **Supabase** – Auth autentifikacija ir Postgres duomenų saugykla per `supabase-js` klientą.
- **GitHub** – kodo saugykla ir versijų valdymas.
- **Vercel** – viešos aplikacijos talpinimas.
- **Zapier** – išorinė automatizacija, reaguojanti į Supabase duomenų bazės įterpimo įvykį.

## Reikalavimai ir paleidimas

Reikalingi Node.js ir npm. Projekto šaknyje susikurkite `.env.local` failą:

```dotenv
VITE_SUPABASE_URL=https://jusu-projekto-id.supabase.co
VITE_SUPABASE_ANON_KEY=jusu_supabase_anon_raktas
```

Tai yra tik aplinkos kintamųjų pavadinimai ir pavyzdinės reikšmės – naudokite savo Supabase projekto duomenis. `src/lib/supabase.js` šių dviejų kintamųjų reikalauja paleidimo metu. Nenaudokite `service_role` rakto naršyklės aplikacijoje.

Įdiekite priklausomybes, paleiskite kūrimo serverį, o prireikus sukurkite produkcinį paketą ir patikrinkite ESLint:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Vite pateiks vietinį adresą terminale. `npm run build` sukuria produkcinį paketą, o `npm run lint` paleidžia ESLint. `npm run preview` leidžia lokaliai peržiūrėti sukurtą paketą.

## Duomenys ir prieigos kontrolė

Aplikacijos kodas naudoja dvi Supabase lenteles:

- **`projects`**: klientas skaito `id`, `name`, `created_at` ir filtruoja pagal `user_id`; įrašo `name`, atnaujina pavadinimą ir trina projektą pagal `id` bei `user_id`.
- **`requests`**: klientas naudoja `id`, `project_id`, `title`, `urgency`, `created_at` ir `user_id`; užklausa susiejama su projektu per `project_id`, o projektų kortelių skaičiai apskaičiuojami pagal šį ryšį.

Vartotojas turi būti autentifikuotas, kad galėtų tvarkyti savo duomenis. Aplikacija užklausas taip pat filtruoja pagal dabartinio vartotojo `user_id`. Supabase RLS (Row Level Security) politikos turi būti įjungtos ir sukonfigūruotos taip, kad `auth.uid()` saistytų skaitymo, įterpimo, keitimo ir trynimo veiksmus su įrašo savininku. `requests` politika taip pat turėtų užtikrinti, kad susietas projektas priklausytų tam pačiam vartotojui.

Šioje saugykloje nėra duomenų bazės migracijų ar RLS politikų SQL, todėl tikslios lentelių apribojimų ir politikų išraiškos čia nepatvirtintos. Aplikacijos kodas patvirtina lentelių bei laukų naudojimą ir vartotojo ID filtravimą, bet vien kliento filtrai nėra saugumo riba – prieigą privalo užtikrinti Supabase RLS.

## CRUD elgsena

| Objektas | Sukūrimas | Skaitymas | Atnaujinimas | Trinimas |
| --- | --- | --- | --- | --- |
| Projektas | Pavadinimas | Vartotojo projektų sąrašas ir užklausų skaičius | Pavadinimas | Patvirtinus; susietų užklausų atveju rodoma perspėjimo žinutė |
| Užklausa | Projektas, pavadinimas, prioritetas | Pasirinkto projekto užklausos | Pavadinimas ir prioritetas | Užklausa pašalinama iš sąrašo ir duomenų bazės |

Naujos užklausos kūrimas programiškai tikrina, kad prioritetas būtų `normal` arba `high`. Projekte taip pat taikomi pavadinimų ilgio apribojimai formose.

## Išorinė automatizacija: Supabase ir Zapier

Webhook ir Zapier konfigūracija yra išorinės paslaugos; jų nustatymai nėra šioje saugykloje. Toliau pateikta schema aprašo numatytą integraciją:

```text
React
  → Supabase requests INSERT
  → Supabase Database Webhook
  → Zapier Catch Hook
  → Filter (Type = INSERT)
  → Paths
      Path A: Record Urgency = high
        → Zapier Tables: Create Record
        → Gmail: Send Email (tema „SKUBU“)
      Path B (Fallback)
        → Zapier Tables: Create Record
        → Gmail laiškas nesiunčiamas
```

Webhook turi būti sukonfigūruotas Supabase pusėje `requests` lentelės `INSERT` įvykiui, o jo paskirties vieta – Zapier Catch Hook. Zapier filtras praleidžia tik `INSERT` įvykius; Paths sąlyga nukreipia `high` prioritetą į skubų pranešimą, o likusius atvejus į atsarginį kelią. `UPDATE` ir `DELETE` įvykiai neturėtų sukurti naujo žurnalo įrašo ar laiško.

Zapier Tables lentelės pavadinimas: **Smart Requests – Užklausų žurnalas**. Numatyti laukai:

| Laukas | Paskirtis |
| --- | --- |
| Request ID | Supabase užklausos identifikatorius |
| Pavadinimas | Užklausos pavadinimas |
| Prioritetas | Užklausos prioritetas |
| Project ID | Susieto projekto identifikatorius |
| Sukurta | Įrašo sukūrimo data ir laikas |

Dokumentacijoje sąmoningai nepateikiamas Webhook URL, raktai ar slaptažodžiai. Patikrinkite, kad Catch Hook URL ir kiti prisijungimo duomenys būtų laikomi tik integracijų nustatymuose, o ne GitHub saugykloje.

## Testų suvestinė

Toliau išvardyta projekto pateikta rankinių bandymų suvestinė. Šio README atnaujinimo metu bandymų iš naujo nevykdžiau.

- Registracijos ir prisijungimo validacijos.
- Projektų ir užklausų CRUD.
- Dviejų vartotojų duomenų atskyrimas naudojant RLS.
- `INSERT` su `high` prioritetu: sukuriamas Zapier Tables įrašas ir išsiunčiamas Gmail laiškas.
- `INSERT` su `normal` prioritetu: sukuriamas tik Zapier Tables įrašas.
- `UPDATE`: naujas Zapier įrašas ir Gmail laiškas nesukuriami.
- `DELETE`: naujas Zapier įrašas ir Gmail laiškas nesukuriami.

RLS ir Zapier bandymų rezultatai priklauso nuo išorinės Supabase bei Zapier konfigūracijos; jų negalima patvirtinti vien peržiūrint šiame repozitoriume esantį React kodą.

## Projekto struktūra

```text
.
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/          # Statiniai vaizdai ir piktogramos
│   ├── lib/
│   │   └── supabase.js  # Supabase kliento konfigūracija
│   ├── App.jsx          # Aplikacijos sąsaja ir funkcijos
│   ├── App.css          # Aplikacijos stiliai
│   ├── index.css        # Bendrieji stiliai
│   └── main.jsx         # React įėjimo taškas
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Saugumas ir apribojimai

- Naršyklėje naudojamas Supabase anoninis raktas nėra administratoriaus raktas; duomenų izoliaciją turi užtikrinti teisingos RLS politikos.
- `.env.local` nelaikykite GitHub saugykloje. Vercel aplinkos kintamuosius nustatykite Vercel projekto nustatymuose.
- Supabase Webhook URL, Zapier Catch Hook URL, Gmail prisijungimas ir API raktai yra paslaptys. Nedėkite jų README, kliento kode ar commit istorijoje.
- Zapier automatizavimas naudoja mokamas funkcijas, kurios šiuo metu prieinamos bandomuoju laikotarpiu. Pasibaigus bandomajam laikotarpiui gali reikėti mokamo plano.
- Tikslūs duomenų bazės DDL, RLS SQL ir išorinės integracijos nustatymai repozitoriume nepateikti.

## Galimos tolesnės kryptys

- Įtraukti versijuojamas Supabase migracijas ir RLS politikų aprašus.
- Pridėti automatizuotus testus autentifikacijai, CRUD veiksmams ir prieigos izoliacijai.
- Išplėsti užklausų būsenas, terminus, aprašymus bei filtravimą.
- Dokumentuoti Zapier laukų susiejimą ir integracijos stebėseną atskirame, paslapčių neturinčiame konfigūracijos vadove.
