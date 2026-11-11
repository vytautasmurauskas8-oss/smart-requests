# Smart Requests

Internetinė projektų ir užklausų valdymo programa – mokomasis baigiamasis projektas.

## Tikslas

Registruotas vartotojas gali kurti savo projektus ir su jais susijusias užklausas. Nauja skubi (`high`) užklausa per Supabase Database Webhook ir Zapier sukelia Gmail pranešimą administratoriui. Įprastos (`normal`) užklausos išsaugomos be el. laiško.

## Technologijos

- **React + Vite (JavaScript)** – naudotojo sąsaja
- **Supabase** – autentifikacija, PostgreSQL ir Row Level Security (RLS)
- **GitHub** – versijų valdymas ir bent 3 sujungti Pull Request
- **Vercel** – viešas aplikacijos diegimas
- **Zapier** – Catch Hook → Filter → Paths → Gmail
- **Notion** – projekto dokumentacija ir užduotys

## Duomenų modelis

- `projects`: `id`, `user_id`, `name`, `created_at`
- `requests`: `id`, `project_id`, `user_id`, `title`, `urgency`, `created_at`

`requests.project_id` nurodo `projects.id`. Vartotojai per RLS gali pasiekti tik savo duomenis.

## Automatizacijos veikimas

1. Vartotojas React programoje sukuria užklausą.
2. Supabase išsaugo įrašą `requests` lentelėje.
3. Supabase Database Webhook (`INSERT`) perduoda įvykį Zapier Catch Hook.
4. Zapier Filter praleidžia tik `INSERT` įvykius; Paths tikrina `urgency`.
5. Kai `urgency = high`, Gmail siunčia „SKUBU“ laišką. Kai `normal`, laiškas nesiunčiamas.

## Planuojami ekranai ir būsenos

- Registracija ir prisijungimas
- Projektų ir užklausų sąrašas
- Projektų ir užklausų kūrimo forma

Būsenos: **Loading**, **Error**, **Empty**, **Success**.

## Paleidimas lokaliai

> **Būsena:** React + Vite aplikacija dar nekuriama šiame etape. Toliau pateiktos komandos veiks, kai bus pridėtas aplikacijos kodas ir `package.json`.

```bash
npm install
npm run dev
```

Vietiniame projekte reikės failo `.env.local` su šiais kintamųjų **pavadinimais** (be realių reikšmių repozitorijoje):

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Niekada nekelkite `service_role` rakto, slaptažodžių ar Zapier Catch Hook URL į GitHub.

## Projekto apribojimai

Nedarome mokėjimų, realaus laiko funkcijų, failų įkėlimo, nuosavo serverio / Edge Functions, TypeScript ar atskiros mobiliosios versijos.

## Dokumentacija

[Smart Requests – Notion projekto puslapis](https://app.notion.com/p/4156a70021f7813d89b5e60f187574ae)

**Vieša Vercel nuoroda:** bus įrašyta po deploy.

## Projekto būsena

- [x] Scope ir dokumentacijos pagrindas
- [x] GitHub repozitorija, README ir .gitignore
- [ ] React + Vite aplikacija
- [ ] Supabase Auth, lentelės ir RLS
- [ ] 3 ekranai ir 4 būsenos
- [ ] 3 sujungti Pull Request
- [ ] Vercel diegimas
- [ ] Supabase Webhook ir Zapier automatizacija
- [ ] Testai ir galutinis pristatymas
