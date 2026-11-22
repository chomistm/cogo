import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";
import { loadCorridors } from "@/lib/corridors";
import { fmtDay, fmtTime } from "@/lib/format";
import { PassengerSearch } from "./PassengerSearch";
import { DriverPublish } from "./DriverPublish";

export default async function Home({ searchParams }: { searchParams: Promise<{ rezim?: string }> }) {
  if (!supabaseConfigured) return <NotConfigured />;
  const { rezim } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: profile }, corridors, { data: vehicle }, { data: myBookings }, { data: myRides }] = await Promise.all([
    supabase.from("profiles").select("full_name,role").eq("id", uid).single(),
    loadCorridors(supabase),
    supabase.from("vehicles").select("id,make_model,color,plate,seats").eq("owner_id", uid).eq("is_active", true).maybeSingle(),
    supabase.from("bookings").select("id,status,ride_id,rides!inner(departure_at,status),pickup:stops!bookings_pickup_stop_id_fkey(name),dropoff:stops!bookings_dropoff_stop_id_fkey(name)")
      .eq("passenger_id", uid).in("status", ["confirmed", "picked_up"]).in("rides.status", ["scheduled", "in_progress"]),
    supabase.from("rides").select("id,departure_at,status,seats_left,seats_total").eq("driver_id", uid).in("status", ["scheduled", "in_progress"]).order("departure_at"),
  ]);

  const mode = rezim === "sofer" || (!rezim && profile?.role === "driver") ? "driver" : "passenger";
  const first = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-navy text-white p-4 -mt-1">
        <div className="text-white/60 text-sm">Ahoj {first}, kam to dnes bude?</div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/10 mt-3" role="tablist">
          <Link href="/domov?rezim=cestujuci" role="tab" aria-selected={mode === "passenger"} className={`h-11 rounded-xl text-sm font-semibold grid place-items-center ${mode === "passenger" ? "bg-brand text-navy" : "text-white/75"}`}>Hľadám odvoz</Link>
          <Link href="/domov?rezim=sofer" role="tab" aria-selected={mode === "driver"} className={`h-11 rounded-xl text-sm font-semibold grid place-items-center ${mode === "driver" ? "bg-brand text-navy" : "text-white/75"}`}>Ponúkam odvoz</Link>
        </div>
      </div>

      {mode === "passenger" && myBookings?.map((b) => {
        const r = b.rides as unknown as { departure_at: string; status: string };
        return (
          <Link key={b.id} href={`/jazda/${b.ride_id}`} className="block rounded-3xl bg-brand/10 border border-brand/30 p-4">
            <div className="text-sm font-semibold text-brandDark">{r.status === "in_progress" ? "Jazda prebieha" : "Máš rezervované miesto"}</div>
            <div className="font-semibold mt-0.5">{(b.pickup as unknown as { name: string }).name} → {(b.dropoff as unknown as { name: string }).name}</div>
            <div className="text-sm text-muted">{fmtDay(r.departure_at)} · odchod šoféra {fmtTime(r.departure_at)} · otvoriť detail</div>
          </Link>
        );
      })}

      {mode === "driver" && myRides?.map((r) => (
        <Link key={r.id} href={`/jazda/${r.id}`} className="block rounded-3xl bg-brand/10 border border-brand/30 p-4">
          <div className="text-sm font-semibold text-brandDark">{r.status === "in_progress" ? "Jazda prebieha" : "Tvoja zverejnená jazda"}</div>
          <div className="font-semibold mt-0.5">{fmtDay(r.departure_at)} o {fmtTime(r.departure_at)}</div>
          <div className="text-sm text-muted">{r.seats_total - r.seats_left} z {r.seats_total} miest obsadených · otvoriť detail</div>
        </Link>
      ))}

      {mode === "passenger" ? (
        <PassengerSearch corridors={corridors} />
      ) : vehicle ? (
        <DriverPublish corridors={corridors} vehicle={vehicle} />
      ) : (
        <div className="bg-white rounded-3xl border border-line p-5">
          <h2 className="font-display font-semibold">Pridaj auto a môžeš ponúkať odvozy</h2>
          <p className="text-sm text-muted mt-1">Cestujúci potrebujú vedieť model, farbu a ŠPZ, aby ťa na zastávke spoznali.</p>
          <Link href="/vitaj" className="mt-4 h-12 rounded-2xl bg-brand text-navy font-semibold grid place-items-center">Pridať auto</Link>
        </div>
      )}
    </div>
  );
}
