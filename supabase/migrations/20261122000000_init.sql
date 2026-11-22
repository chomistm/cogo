-- =====================================================================
-- CoGo MVP – databázová schéma pre Supabase (Postgres 15+)
-- Spustenie: Supabase Dashboard → SQL Editor → vložiť a spustiť celé.
-- 1 CoGo kredit = 1 €. Kredity sú účtovná kniha (credit_transactions).
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pg_cron;

-- ---------- ENUM typy ------------------------------------------------
create type user_role         as enum ('passenger', 'driver', 'both');
create type verification_kind as enum ('none', 'student', 'colleague');
create type ride_status       as enum ('scheduled', 'boarding', 'in_progress', 'completed', 'cancelled');
create type booking_status    as enum ('confirmed', 'picked_up', 'completed', 'cancelled', 'no_show');
create type request_status    as enum ('open', 'matched', 'guarantee_issued', 'expired', 'cancelled');
create type tx_kind           as enum ('welcome_bonus', 'booking_hold', 'hold_release',
                                       'ride_earning', 'reward_redeem', 'adjustment');

-- ---------- 1. Používatelia a dôvera ---------------------------------
create table verified_domains (
  domain  text primary key,                 -- napr. 'euba.sk', 'stuba.sk', 'uniba.sk'
  label   text not null,                    -- 'Ekonomická univerzita v Bratislave'
  kind    verification_kind not null        -- student | colleague
);

create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  full_name       text not null,
  avatar_url      text,
  role            user_role not null default 'passenger',
  verification    verification_kind not null default 'none',
  verified_domain text references verified_domains,
  verified_at     timestamptz,
  rating_up       int not null default 0,
  rating_count    int not null default 0,
  co2_saved_kg    numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);

create table vehicles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles on delete cascade,
  make_model  text not null,                -- 'Škoda Octavia'
  color       text not null,                -- 'oranžová'
  plate       text not null,                -- 'BA-123XY'
  seats       smallint not null check (seats between 1 and 3),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- 2. Koridory a virtuálne zastávky -------------------------
create table corridors (
  id    smallint primary key,
  name  text not null                       -- 'Petržalka ↔ Staré Mesto / Ružinov'
);

create table stops (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,               -- 'Ovsište'
  district     text not null,               -- 'Petržalka'
  corridor_id  smallint references corridors,
  location     geography(point, 4326) not null,
  hint         text,                        -- 'zálivová zastávka MHD, smer Einsteinova'
  is_active    boolean not null default true
);
create index stops_location_idx on stops using gist (location);

-- ---------- 3. Jazdy šoférov -----------------------------------------
-- Pravidelná jazda (šablóna Po–Pi), z ktorej sa každý deň vygenerujú rides.
create table ride_templates (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid not null references profiles on delete cascade,
  vehicle_id     uuid not null references vehicles,
  weekdays       smallint[] not null,       -- 1 = Po … 7 = Ne
  depart_time    time not null,
  seats          smallint not null check (seats between 1 and 3),
  price_credits  numeric(5,2) not null check (price_credits between 0.5 and 5),
  is_active      boolean not null default true
);

create table ride_template_stops (
  template_id  uuid references ride_templates on delete cascade,
  seq          smallint not null,
  stop_id      uuid not null references stops,
  offset_min   smallint not null,           -- minúty od odchodu
  primary key (template_id, seq)
);

-- Konkrétna jazda v konkrétny deň a čas.
create table rides (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid not null references profiles on delete cascade,
  vehicle_id     uuid not null references vehicles,
  template_id    uuid references ride_templates on delete set null,
  departure_at   timestamptz not null,
  seats_total    smallint not null check (seats_total between 1 and 3),
  seats_left     smallint not null check (seats_left >= 0),
  price_credits  numeric(5,2) not null,
  status         ride_status not null default 'scheduled',
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index rides_departure_idx on rides (departure_at) where status = 'scheduled';

-- Trasa jazdy = zoradený zoznam zastávok s plánovaným časom.
create table ride_stops (
  ride_id  uuid references rides on delete cascade,
  seq      smallint not null,
  stop_id  uuid not null references stops,
  eta      timestamptz not null,
  primary key (ride_id, seq)
);
create index ride_stops_stop_eta_idx on ride_stops (stop_id, eta);

-- ---------- 4. Dopyt cestujúcich a rezervácie ------------------------
-- Požiadavka „chcem ísť z A do B v okne“ – základ pre párovanie a garanciu návratu.
create table ride_requests (
  id              uuid primary key default gen_random_uuid(),
  passenger_id    uuid not null references profiles on delete cascade,
  from_stop_id    uuid not null references stops,
  to_stop_id      uuid not null references stops,
  window_start    timestamptz not null,
  window_end      timestamptz not null,
  is_return_trip  boolean not null default false,
  status          request_status not null default 'open',
  guarantee_code  text,                     -- promo kód pri aktivovaní garancie
  created_at      timestamptz not null default now(),
  check (window_end > window_start)
);

create table bookings (
  id               uuid primary key default gen_random_uuid(),
  ride_id          uuid not null references rides on delete cascade,
  passenger_id     uuid not null references profiles on delete cascade,
  request_id       uuid references ride_requests on delete set null,
  pickup_stop_id   uuid not null references stops,
  dropoff_stop_id  uuid not null references stops,
  price_credits    numeric(5,2) not null,
  status           booking_status not null default 'confirmed',
  picked_up_at     timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (ride_id, passenger_id)
);

-- ---------- 5. Kredity (účtovná kniha) a odmeny ----------------------
create table rewards (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,              -- 'Tankovacia karta 10 €'
  partner       text not null,              -- 'Slovnaft'
  cost_credits  numeric(6,2) not null,
  is_active     boolean not null default true
);

create table reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  reward_id   uuid not null references rewards,
  voucher     text not null,
  created_at  timestamptz not null default now()
);

create table credit_transactions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles on delete cascade,
  amount         numeric(8,2) not null,     -- + príjem, − výdaj / blokácia
  kind           tx_kind not null,
  booking_id     uuid references bookings on delete set null,
  redemption_id  uuid references reward_redemptions on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index credit_tx_user_idx on credit_transactions (user_id, created_at desc);

create view wallet_balances with (security_invoker = true) as
select p.id as user_id,
       coalesce(sum(t.amount), 0)::numeric(8,2) as balance,
       coalesce((select sum(b.price_credits) from bookings b
                 where b.passenger_id = p.id and b.status in ('confirmed','picked_up')), 0)::numeric(8,2) as on_hold
from profiles p
left join credit_transactions t on t.user_id = p.id
group by p.id;

-- ---------- 6. Hodnotenia, chat, notifikácie --------------------------
create table ratings (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings on delete cascade,
  rater_id    uuid not null references profiles,
  ratee_id    uuid not null references profiles,
  thumbs_up   boolean not null,
  badges      text[] not null default '{}'
              check (badges <@ array['dochvilny','prijemny_pokec','bezpecna_jazda','ciste_auto','ochotny']),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (booking_id, rater_id)
);

create table messages (
  id          bigint generated always as identity primary key,
  ride_id     uuid not null references rides on delete cascade,
  sender_id   uuid not null references profiles,
  body        text not null,
  quick_key   text,                         -- 'at_stop' | 'late_2' | 'orange_car' …
  created_at  timestamptz not null default now()
);

create table notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles on delete cascade,
  type        text not null,                -- 'booking_new' | 'ride_started' | 'guarantee' …
  payload     jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table push_subscriptions (
  user_id   uuid references profiles on delete cascade,
  endpoint  text not null,
  keys      jsonb not null,
  primary key (user_id, endpoint)
);

-- =====================================================================
-- FUNKCIE (všetka logika s kreditmi beží tu, v jednej transakcii)
-- =====================================================================

-- Nový používateľ → profil, overenie domény, 10 uvítacích kreditov.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare d verified_domains;
begin
  select * into d from verified_domains where domain = split_part(new.email, '@', 2);
  insert into profiles (id, full_name, verification, verified_domain, verified_at)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          coalesce(d.kind, 'none'), d.domain, case when d.domain is not null then now() end);
  insert into credit_transactions (user_id, amount, kind, note)
  values (new.id, 10, 'welcome_bonus', 'Vitaj v CoGo!');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- Rezervácia miesta: zamkne jazdu, overí miesto a zostatok, zablokuje kredity.
create or replace function book_ride(p_ride uuid, p_pickup uuid, p_dropoff uuid, p_request uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r rides; bal numeric; bid uuid;
begin
  select * into r from rides where id = p_ride for update;
  if r.status <> 'scheduled' then raise exception 'Jazda už nie je dostupná'; end if;
  if r.seats_left < 1 then raise exception 'Jazda je plná'; end if;
  if r.driver_id = auth.uid() then raise exception 'Nemôžeš si rezervovať vlastnú jazdu'; end if;

  select balance into bal from wallet_balances where user_id = auth.uid();
  if bal < r.price_credits then raise exception 'Nedostatok CoGo kreditov'; end if;

  insert into bookings (ride_id, passenger_id, request_id, pickup_stop_id, dropoff_stop_id, price_credits)
  values (p_ride, auth.uid(), p_request, p_pickup, p_dropoff, r.price_credits)
  returning id into bid;

  update rides set seats_left = seats_left - 1 where id = p_ride;
  update ride_requests set status = 'matched' where id = p_request;

  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (auth.uid(), -r.price_credits, 'booking_hold', bid);

  insert into notifications (user_id, type, payload)
  values (r.driver_id, 'booking_new', jsonb_build_object('booking_id', bid, 'ride_id', p_ride));
  return bid;
end $$;

-- Cestujúci potvrdí výstup → kredity idú šoférovi, pripíše sa CO2.
create or replace function complete_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; r rides;
begin
  select * into b from bookings where id = p_booking for update;
  if b.passenger_id <> auth.uid() then raise exception 'Nie je tvoja rezervácia'; end if;
  if b.status not in ('confirmed', 'picked_up') then raise exception 'Rezervácia už je uzavretá'; end if;
  select * into r from rides where id = b.ride_id;

  update bookings set status = 'completed', completed_at = now() where id = p_booking;
  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (r.driver_id, b.price_credits, 'ride_earning', p_booking);
  -- ~0,6 kg CO2 ušetrené na jazdu cca 5 km (0,12 kg/km), hodnota na kalibráciu v pilote
  update profiles set co2_saved_kg = co2_saved_kg + 0.6 where id in (b.passenger_id, r.driver_id);
end $$;

-- Zrušenie rezervácie → vráti kredity a uvoľní miesto.
create or replace function cancel_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking for update;
  if b.passenger_id <> auth.uid() then raise exception 'Nie je tvoja rezervácia'; end if;
  if b.status <> 'confirmed' then raise exception 'Rezerváciu už nejde zrušiť'; end if;
  update bookings set status = 'cancelled' where id = p_booking;
  update rides set seats_left = seats_left + 1 where id = b.ride_id;
  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (b.passenger_id, b.price_credits, 'hold_release', p_booking);
end $$;

-- Hodnotenie po jazde → aktualizuje skóre hodnoteného.
create or replace function on_rating_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set rating_count = rating_count + 1,
         rating_up    = rating_up + (case when new.thumbs_up then 1 else 0 end)
   where id = new.ratee_id;
  return new;
end $$;
create trigger ratings_after_insert after insert on ratings
for each row execute function on_rating_insert();

-- CoGo Garancia návratu: 20 min pred oknom bez šoféra → promo kód + výzva komunite.
create or replace function issue_return_guarantees()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with due as (
    update ride_requests
       set status = 'guarantee_issued',
           guarantee_code = 'COGO-' || upper(substr(md5(random()::text), 1, 6))
     where status = 'open'
       and window_start <= now() + interval '20 minutes'
       and window_start >  now()
    returning id, passenger_id, from_stop_id, guarantee_code
  ), notify_passenger as (
    insert into notifications (user_id, type, payload)
    select passenger_id, 'guarantee', jsonb_build_object('request_id', id, 'code', guarantee_code) from due
  )
  insert into notifications (user_id, type, payload)       -- urgentná výzva šoférom
  select p.id, 'urgent_request', jsonb_build_object('request_id', d.id, 'stop_id', d.from_stop_id)
    from due d join profiles p on p.role in ('driver', 'both') and p.id <> d.passenger_id;
  get diagnostics n = row_count;
  return n;
end $$;

select cron.schedule('cogo-return-guarantee', '* * * * *', $$select issue_return_guarantees()$$);

-- =====================================================================
-- RLS (Row Level Security) – klient vidí len to, čo má
-- =====================================================================
alter table profiles            enable row level security;
alter table vehicles            enable row level security;
alter table stops               enable row level security;
alter table corridors           enable row level security;
alter table rides               enable row level security;
alter table ride_stops          enable row level security;
alter table ride_templates      enable row level security;
alter table ride_template_stops enable row level security;
alter table ride_requests       enable row level security;
alter table bookings            enable row level security;
alter table credit_transactions enable row level security;
alter table rewards             enable row level security;
alter table reward_redemptions  enable row level security;
alter table ratings             enable row level security;
alter table messages            enable row level security;
alter table notifications       enable row level security;
alter table push_subscriptions  enable row level security;
alter table verified_domains    enable row level security;

-- Verejné číselníky pre prihlásených
create policy "read stops"     on stops            for select to authenticated using (true);
create policy "read corridors" on corridors        for select to authenticated using (true);
create policy "read rewards"   on rewards          for select to authenticated using (is_active);
create policy "read domains"   on verified_domains for select to authenticated using (true);

-- Profily: čítať všetci prihlásení (dôvera), meniť len svoj
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "update own"    on profiles for update to authenticated using (id = auth.uid());

create policy "read vehicles" on vehicles for select to authenticated using (true);
create policy "own vehicles"  on vehicles for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Jazdy: vidia všetci, spravuje šofér (rezervácie len cez book_ride)
create policy "read rides"      on rides      for select to authenticated using (true);
create policy "driver rides"    on rides      for all    to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy "read ride_stops" on ride_stops for select to authenticated using (true);
create policy "driver ride_stops" on ride_stops for all to authenticated
  using (exists (select 1 from rides r where r.id = ride_id and r.driver_id = auth.uid()))
  with check (exists (select 1 from rides r where r.id = ride_id and r.driver_id = auth.uid()));
create policy "own templates" on ride_templates for all to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy "own template stops" on ride_template_stops for all to authenticated
  using (exists (select 1 from ride_templates t where t.id = template_id and t.driver_id = auth.uid()));

create policy "own requests" on ride_requests for all to authenticated using (passenger_id = auth.uid()) with check (passenger_id = auth.uid());
create policy "drivers see open requests" on ride_requests for select to authenticated using (status in ('open','guarantee_issued'));

-- Rezervácie: cestujúci a šofér danej jazdy (zápis len cez RPC)
create policy "read bookings" on bookings for select to authenticated
  using (passenger_id = auth.uid()
         or exists (select 1 from rides r where r.id = ride_id and r.driver_id = auth.uid()));

-- Kredity: len vlastné, iba na čítanie (zápis výhradne cez funkcie)
create policy "own tx" on credit_transactions for select to authenticated using (user_id = auth.uid());
create policy "own redemptions" on reward_redemptions for select to authenticated using (user_id = auth.uid());

-- Hodnotenie: len účastník dokončenej jazdy
create policy "read ratings" on ratings for select to authenticated using (true);
create policy "rate own booking" on ratings for insert to authenticated with check (
  rater_id = auth.uid() and exists (
    select 1 from bookings b join rides r on r.id = b.ride_id
     where b.id = booking_id and b.status = 'completed'
       and auth.uid() in (b.passenger_id, r.driver_id)));

-- Chat: šofér + cestujúci s aktívnou rezerváciou na jazde
create policy "ride chat" on messages for all to authenticated
  using (exists (select 1 from rides r where r.id = ride_id and (r.driver_id = auth.uid()
         or exists (select 1 from bookings b where b.ride_id = r.id and b.passenger_id = auth.uid()))))
  with check (sender_id = auth.uid());

create policy "own notifications" on notifications for all to authenticated using (user_id = auth.uid());
create policy "own push"          on push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime pre chat, notifikácie a stav jázd
alter publication supabase_realtime add table messages, notifications, bookings, rides;

-- =====================================================================
-- SEED – pilotné koridory, zastávky, odmeny, domény
-- (súradnice sú približné, pred pilotom ich overiť na mieste)
-- =====================================================================
insert into corridors values
  (1, 'Petržalka ↔ Ekonomická univerzita / Mlynské nivy / Staré Mesto'),  -- Šafárikovo nám. je prestupná pre oba koridory
  (2, 'Petržalka / Centrum ↔ Mlynská dolina');

insert into stops (name, district, corridor_id, location, hint) values
  ('Slnečnice',               'Petržalka',   1, 'POINT(17.1196 48.1124)', 'parkovisko pri Jantárovej ceste'),
  ('Lúky',                    'Petržalka',   1, 'POINT(17.1312 48.1194)', 'záliv MHD Vyšehradská'),
  ('Ovsište',                 'Petržalka',   1, 'POINT(17.1132 48.1281)', 'záliv MHD Ovsište, smer most'),
  ('Aupark / Einsteinova',    'Petržalka',   2, 'POINT(17.1067 48.1330)', 'záliv pri Auparku'),
  ('Ekonomická univerzita',   'Petržalka',   1, 'POINT(17.1213 48.1226)', 'Dolnozemská cesta, pred hlavným vchodom'),
  ('Mlynské nivy',            'Ružinov',     1, 'POINT(17.1270 48.1467)', 'pri Twin City, Karadžičova'),
  ('Twin City',               'Staré Mesto', 1, 'POINT(17.1235 48.1480)', 'Mlynské nivy, záliv'),
  ('Šafárikovo námestie',     'Staré Mesto', null, 'POINT(17.1135 48.1408)', 'pri Lekárskej fakulte'),
  ('Mlynská dolina (internáty)', 'Karlova Ves', 2, 'POINT(17.0710 48.1520)', 'Botanická, oproti internátom'),
  ('Mlynská dolina (FMFI/FiF)', 'Karlova Ves', 2, 'POINT(17.0688 48.1508)', 'Mlynská dolina, pri vrátnici');

insert into rewards (title, partner, cost_credits) values
  ('Tankovacia karta 10 €', 'Slovnaft', 10),
  ('Tankovacia karta 10 €', 'OMV',      10),
  ('Káva zdarma',           'Kaviareň partner', 3),
  ('Umytie auta',           'Autoumyváreň partner', 8),
  ('Parkovanie 2 h',        'Mestské parkovanie', 4);

insert into verified_domains values
  ('euba.sk',     'Ekonomická univerzita v Bratislave', 'student'),
  ('student.euba.sk', 'Ekonomická univerzita v Bratislave', 'student'),
  ('uniba.sk',    'Univerzita Komenského', 'student'),
  ('stuba.sk',    'STU v Bratislave', 'student');
