-- =====================================================================
-- CoGo – krok 3: jazdy, rezervácie, hodnotenia a profil dôvery
-- Spustenie: Supabase → SQL Editor → vložiť celé → Run (po 1. migrácii)
-- =====================================================================

-- ---------- 1. Poradie zastávok v koridoroch -------------------------
create table if not exists corridor_stops (
  corridor_id  smallint references corridors on delete cascade,
  seq          smallint not null,
  stop_id      uuid not null references stops,
  primary key (corridor_id, seq)
);
alter table corridor_stops enable row level security;
drop policy if exists "read corridor stops" on corridor_stops;
create policy "read corridor stops" on corridor_stops for select to authenticated using (true);

insert into corridor_stops (corridor_id, seq, stop_id)
select x.c, x.seq, s.id
from (values
  (1, 1, 'Slnečnice'), (1, 2, 'Lúky'), (1, 3, 'Ovsište'), (1, 4, 'Ekonomická univerzita'),
  (1, 5, 'Mlynské nivy'), (1, 6, 'Twin City'), (1, 7, 'Šafárikovo námestie'),
  (2, 1, 'Lúky'), (2, 2, 'Aupark / Einsteinova'), (2, 3, 'Šafárikovo námestie'),
  (2, 4, 'Mlynská dolina (FMFI/FiF)'), (2, 5, 'Mlynská dolina (internáty)')
) as x(c, seq, name)
join stops s on s.name = x.name
on conflict do nothing;

-- ---------- 2. Profil: onboarding a ochrana stĺpcov ------------------
alter table profiles add column if not exists onboarded boolean not null default false;

-- Používateľ smie meniť len tieto stĺpce, nie overenie ani hodnotenie.
revoke update on profiles from authenticated, anon;
grant update (full_name, avatar_url, role, onboarded) on profiles to authenticated;

-- ---------- 3. Profil dôvery (verejné súhrny hodnotení) --------------
create or replace view profile_trust as
select p.id,
       p.full_name,
       p.avatar_url,
       p.role,
       p.verification,
       p.verified_domain,
       p.rating_up,
       p.rating_count,
       case when p.rating_count > 0 then round(100.0 * p.rating_up / p.rating_count)::int end as thumbs_pct,
       coalesce((select jsonb_object_agg(x.badge, x.n)
                   from (select unnest(r.badges) as badge, count(*) as n
                           from ratings r where r.ratee_id = p.id and r.thumbs_up
                          group by 1) x), '{}'::jsonb) as badges,
       (select count(*) from bookings b join rides rd on rd.id = b.ride_id
         where b.status = 'completed' and (b.passenger_id = p.id or rd.driver_id = p.id))::int as rides_done,
       p.created_at
from profiles p;
revoke all on profile_trust from anon;
grant select on profile_trust to authenticated;

-- ---------- 4. Šofér zverejní jazdu ----------------------------------
-- Časy príchodu na zastávky sa dopočítajú zo vzdialenosti (25 km/h, cestný faktor 1,4).
create or replace function create_ride(p_vehicle uuid, p_departure timestamptz, p_stops uuid[], p_seats int, p_price numeric)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v vehicles; rid uuid; i int; t timestamptz; prev geography; cur geography;
begin
  select * into v from vehicles where id = p_vehicle and owner_id = auth.uid() and is_active;
  if not found then raise exception 'Toto auto nemáš v profile'; end if;
  if coalesce(array_length(p_stops, 1), 0) < 2 then raise exception 'Vyber aspoň 2 zastávky'; end if;
  if p_seats < 1 or p_seats > v.seats then raise exception 'Počet miest musí byť 1 až %', v.seats; end if;
  if p_price < 0.5 or p_price > 5 then raise exception 'Cena musí byť od 0,50 do 5 kreditov'; end if;
  if p_departure < now() - interval '5 minutes' then raise exception 'Čas odchodu je v minulosti'; end if;
  if exists (select 1 from rides where driver_id = auth.uid() and status in ('scheduled', 'in_progress')
             and departure_at between p_departure - interval '45 minutes' and p_departure + interval '45 minutes') then
    raise exception 'V tomto čase už máš zverejnenú jazdu';
  end if;

  insert into rides (driver_id, vehicle_id, departure_at, seats_total, seats_left, price_credits)
  values (auth.uid(), p_vehicle, p_departure, p_seats, p_seats, p_price)
  returning id into rid;

  t := p_departure;
  for i in 1 .. array_length(p_stops, 1) loop
    select location into cur from stops where id = p_stops[i] and is_active;
    if cur is null then raise exception 'Neznáma zastávka'; end if;
    if i > 1 then
      t := t + make_interval(mins => greatest(2, ceil(st_distance(prev, cur) * 1.4 / 1000 / 25 * 60))::int);
    end if;
    insert into ride_stops (ride_id, seq, stop_id, eta) values (rid, i, p_stops[i], t);
    prev := cur;
  end loop;

  update profiles set role = 'both' where id = auth.uid() and role = 'passenger';
  return rid;
end $$;

-- ---------- 5. Cestujúci hľadá jazdy (okno ±15 min) -------------------
create or replace function search_rides(p_from uuid, p_to uuid, p_at timestamptz, p_window int default 15)
returns table (ride_id uuid, eta_from timestamptz, eta_to timestamptz, price numeric, seats_left smallint,
               vehicle jsonb, route jsonb, driver jsonb)
language sql stable security definer set search_path = public as $$
  select r.id, a.eta, b.eta, r.price_credits, r.seats_left,
         jsonb_build_object('make_model', v.make_model, 'color', v.color, 'plate', v.plate),
         (select jsonb_agg(jsonb_build_object('stop_id', rs.stop_id, 'name', s.name, 'eta', rs.eta) order by rs.seq)
            from ride_stops rs join stops s on s.id = rs.stop_id where rs.ride_id = r.id),
         to_jsonb(pt)
    from rides r
    join ride_stops a on a.ride_id = r.id and a.stop_id = p_from
    join ride_stops b on b.ride_id = r.id and b.stop_id = p_to and b.seq > a.seq
    join vehicles v on v.id = r.vehicle_id
    join profile_trust pt on pt.id = r.driver_id
   where r.status = 'scheduled'
     and r.seats_left > 0
     and r.driver_id <> auth.uid()
     and a.eta between p_at - make_interval(mins => p_window) and p_at + make_interval(mins => p_window)
     and a.eta > now() - interval '5 minutes'
     and not exists (select 1 from bookings bk where bk.ride_id = r.id and bk.passenger_id = auth.uid() and bk.status <> 'cancelled')
   order by a.eta
   limit 20;
$$;

-- ---------- 6. Rezervácia s kontrolou trasy --------------------------
create or replace function book_ride(p_ride uuid, p_pickup uuid, p_dropoff uuid, p_request uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r rides; bal numeric; bid uuid; s1 int; s2 int;
begin
  select * into r from rides where id = p_ride for update;
  if not found or r.status <> 'scheduled' then raise exception 'Jazda už nie je dostupná'; end if;
  if r.seats_left < 1 then raise exception 'Jazda je plná'; end if;
  if r.driver_id = auth.uid() then raise exception 'Nemôžeš si rezervovať vlastnú jazdu'; end if;
  select seq into s1 from ride_stops where ride_id = p_ride and stop_id = p_pickup;
  select seq into s2 from ride_stops where ride_id = p_ride and stop_id = p_dropoff;
  if s1 is null or s2 is null or s1 >= s2 then raise exception 'Šofér touto trasou nejde'; end if;
  if exists (select 1 from bookings where ride_id = p_ride and passenger_id = auth.uid() and status <> 'cancelled') then
    raise exception 'Na túto jazdu už máš rezerváciu';
  end if;

  select balance into bal from wallet_balances where user_id = auth.uid();
  if coalesce(bal, 0) < r.price_credits then raise exception 'Nedostatok CoGo kreditov'; end if;

  delete from bookings where ride_id = p_ride and passenger_id = auth.uid() and status = 'cancelled';
  insert into bookings (ride_id, passenger_id, request_id, pickup_stop_id, dropoff_stop_id, price_credits)
  values (p_ride, auth.uid(), p_request, p_pickup, p_dropoff, r.price_credits)
  returning id into bid;

  update rides set seats_left = seats_left - 1 where id = p_ride;
  update ride_requests set status = 'matched' where id = p_request;
  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (auth.uid(), -r.price_credits, 'booking_hold', bid);
  insert into notifications (user_id, type, payload)
  values (r.driver_id, 'booking_new', jsonb_build_object('booking_id', bid, 'ride_id', p_ride, 'stop_id', p_pickup));
  return bid;
end $$;

-- ---------- 7. Štart, koniec a zrušenie jazdy šoférom ----------------
create or replace function start_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update rides set status = 'in_progress', started_at = now()
   where id = p_ride and driver_id = auth.uid() and status = 'scheduled';
  if not found then raise exception 'Jazdu nejde odštartovať'; end if;
  insert into notifications (user_id, type, payload)
  select passenger_id, 'ride_started', jsonb_build_object('ride_id', p_ride)
    from bookings where ride_id = p_ride and status = 'confirmed';
end $$;

-- Interná pomocná funkcia: dokončí rezerváciu a pošle kredity šoférovi.
create or replace function settle_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; r rides;
begin
  select * into b from bookings where id = p_booking for update;
  if b.status not in ('confirmed', 'picked_up') then return; end if;
  select * into r from rides where id = b.ride_id;
  update bookings set status = 'completed', completed_at = now() where id = p_booking;
  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (r.driver_id, b.price_credits, 'ride_earning', p_booking);
  update profiles set co2_saved_kg = co2_saved_kg + 0.6 where id in (b.passenger_id, r.driver_id);
  insert into notifications (user_id, type, payload)
  values (r.driver_id, 'booking_paid', jsonb_build_object('booking_id', p_booking, 'ride_id', r.id, 'amount', b.price_credits)),
         (b.passenger_id, 'booking_completed', jsonb_build_object('booking_id', p_booking, 'ride_id', r.id));
end $$;
revoke execute on function settle_booking(uuid) from public, anon, authenticated;

-- Cestujúci potvrdí výstup (len počas jazdy alebo po nej).
create or replace function complete_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; st ride_status;
begin
  select * into b from bookings where id = p_booking;
  if not found or b.passenger_id <> auth.uid() then raise exception 'Nie je tvoja rezervácia'; end if;
  if b.status not in ('confirmed', 'picked_up') then raise exception 'Rezervácia už je uzavretá'; end if;
  select status into st from rides where id = b.ride_id;
  if st not in ('in_progress', 'completed') then raise exception 'Výstup potvrdíš, keď jazda začne'; end if;
  perform settle_booking(p_booking);
end $$;

-- Šofér ukončí jazdu: nepotvrdené rezervácie sa dokončia automaticky.
create or replace function finish_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
declare bid uuid;
begin
  update rides set status = 'completed', completed_at = now()
   where id = p_ride and driver_id = auth.uid() and status = 'in_progress';
  if not found then raise exception 'Jazdu nejde ukončiť'; end if;
  for bid in select id from bookings where ride_id = p_ride and status in ('confirmed', 'picked_up') loop
    perform settle_booking(bid);
  end loop;
end $$;

-- Šofér zruší jazdu pred štartom: všetkým vrátime kredity.
create or replace function cancel_ride(p_ride uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  update rides set status = 'cancelled'
   where id = p_ride and driver_id = auth.uid() and status = 'scheduled';
  if not found then raise exception 'Jazdu už nejde zrušiť'; end if;
  for b in select * from bookings where ride_id = p_ride and status = 'confirmed' loop
    update bookings set status = 'cancelled' where id = b.id;
    insert into credit_transactions (user_id, amount, kind, booking_id)
    values (b.passenger_id, b.price_credits, 'hold_release', b.id);
    insert into notifications (user_id, type, payload)
    values (b.passenger_id, 'ride_cancelled', jsonb_build_object('ride_id', p_ride));
  end loop;
end $$;

-- Zrušenie rezervácie cestujúcim (len pred štartom jazdy).
create or replace function cancel_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; r rides;
begin
  select * into b from bookings where id = p_booking for update;
  if not found or b.passenger_id <> auth.uid() then raise exception 'Nie je tvoja rezervácia'; end if;
  select * into r from rides where id = b.ride_id;
  if b.status <> 'confirmed' or r.status <> 'scheduled' then raise exception 'Rezerváciu už nejde zrušiť'; end if;
  update bookings set status = 'cancelled' where id = p_booking;
  update rides set seats_left = seats_left + 1 where id = b.ride_id;
  insert into credit_transactions (user_id, amount, kind, booking_id)
  values (b.passenger_id, b.price_credits, 'hold_release', p_booking);
  insert into notifications (user_id, type, payload)
  values (r.driver_id, 'booking_cancelled', jsonb_build_object('booking_id', p_booking, 'ride_id', r.id));
end $$;

-- ---------- 8. Hodnotenie po jazde (oboma smermi) --------------------
create or replace function rate_booking(p_booking uuid, p_thumbs_up boolean, p_badges text[] default '{}', p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; r rides; target uuid;
begin
  select * into b from bookings where id = p_booking;
  if not found then raise exception 'Rezervácia neexistuje'; end if;
  select * into r from rides where id = b.ride_id;
  if b.status <> 'completed' then raise exception 'Hodnotiť môžeš až po dokončenej jazde'; end if;
  if auth.uid() = b.passenger_id then target := r.driver_id;
  elsif auth.uid() = r.driver_id then target := b.passenger_id;
  else raise exception 'Tejto jazdy si sa nezúčastnil'; end if;
  insert into ratings (booking_id, rater_id, ratee_id, thumbs_up, badges, comment)
  values (p_booking, auth.uid(), target, p_thumbs_up, case when p_thumbs_up then coalesce(p_badges, '{}') else '{}' end,
          nullif(trim(p_comment), ''));
exception when unique_violation then
  raise exception 'Túto jazdu si už ohodnotil';
end $$;

-- Priamy zápis hodnotení len cez rate_booking.
drop policy if exists "rate own booking" on ratings;

-- ---------- 9. Profilové fotky ---------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar upload own" on storage.objects;
create policy "avatar upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar update own" on storage.objects;
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar read" on storage.objects;
create policy "avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
