# CoGo

Mestský mikro-carpooling pre Bratislavu: virtuálne zastávky, CoGo kredity (1 kr = 1 €) a garancia návratu. Pilot pre 50–100 ľudí na koridoroch Petržalka ↔ EU / Mlynské nivy / Staré Mesto a Petržalka / Centrum ↔ Mlynská dolina.

**Stack:** Next.js 15 (App Router, PWA) · Tailwind CSS · Supabase (Postgres + PostGIS, Auth, Realtime, pg_cron) · Vercel.

## Rozbehnutie

1. Supabase projekt (Free, región Frankfurt). V **SQL Editore** spusti `supabase/migrations/20261122000000_init.sql`.
2. V Supabase → **Authentication → URL Configuration** nastav *Site URL* na adresu appky a pridaj `http://localhost:3000/auth/callback` aj `https://<tvoja-domena>/auth/callback` do *Redirect URLs*.
3. Skopíruj `.env.example` do `.env.local` a doplň `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. `npm install` a `npm run dev`, appka beží na http://localhost:3000.

Kľúč `service_role` do repozitára ani do `NEXT_PUBLIC_*` premenných nikdy nedávaj.

## Štruktúra

| Cesta | Čo obsahuje |
| --- | --- |
| `src/app/page.tsx` | Úvodná obrazovka |
| `src/app/prihlasenie` | Prihlásenie magic linkom, odmietne freemail |
| `src/app/auth/callback` | Výmena kódu za session |
| `src/app/(app)/…` | Domov, Jazdy, Peňaženka, Profil so spodnou navigáciou |
| `src/lib/supabase` | Supabase klient pre prehliadač a server |
| `src/middleware.ts` | Obnova session, presmerovanie neprihlásených |
| `src/app/manifest.ts` | PWA manifest (inštalácia na plochu) |
| `supabase/migrations` | Schéma, RPC funkcie (`book_ride`, `complete_booking`, `cancel_booking`), RLS, seed zastávok |

## Ďalšie kroky

- Hľadanie jázd ±15 min a rezervácia cez `book_ride`
- Zverejnenie jazdy šoférom a notifikácie (Realtime, Web Push)
- Chat, priebeh jazdy, hodnotenie
- Odmeny a garancia návratu (pg_cron)
