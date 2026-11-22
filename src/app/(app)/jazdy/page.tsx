import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";
import { fmtDay, fmtTime, kr } from "@/lib/format";

const BOOKING: Record<string, string> = {
  confirmed: "Rezervované",
  picked_up: "Na ceste",
  completed: "Dokončené",
  cancelled: "Zrušené",
  no_show: "Neprišiel",
};
const RIDE: Record<string, string> = {
  scheduled: "Naplánovaná",
  boarding: "Nastupuje sa",
  in_progress: "Prebieha",
  completed: "Dokončená",
  cancelled: "Zrušená",
};

function Pill({ s, active }: { s: string; active: boolean }) {
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${active ? "bg-brand/15 text-brandDark" : "bg-surface text-muted"}`}>{s}</span>;
}

export default async function Trips() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: bookings }, { data: rides }] = await Promise.all([
    supabase.from("bookings")
      .select("id,status,price_credits,ride_id,rides!inner(departure_at),pickup:stops!bookings_pickup_stop_id_fkey(name),dropoff:stops!bookings_dropoff_stop_id_fkey(name)")
      .eq("passenger_id", uid).order("created_at", { ascending: false }).limit(50),
    supabase.from("rides").select("id,departure_at,status,seats_left,seats_total,price_credits")
      .eq("driver_id", uid).order("departure_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold">Moje CoGo jazdy</h1>

      <section>
        <h2 className="font-display font-semibold mb-2">Ako cestujúci</h2>
        {!bookings?.length ? (
          <div className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
            Zatiaľ žiadne rezervácie. <Link href="/domov?rezim=cestujuci" className="text-brandDark font-semibold">Nájsť odvoz</Link>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl border border-line divide-y divide-line">
            {bookings.map((b) => {
              const r = b.rides as unknown as { departure_at: string };
              const from = (b.pickup as unknown as { name: string })?.name;
              const to = (b.dropoff as unknown as { name: string })?.name;
              return (
                <li key={b.id}>
                  <Link href={`/jazda/${b.ride_id}`} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{from} → {to}</div>
                      <div className="text-xs text-muted">{fmtDay(r.departure_at)} · {fmtTime(r.departure_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tabular-nums font-semibold">{kr(b.price_credits)}</div>
                      <Pill s={BOOKING[b.status] ?? b.status} active={["confirmed", "picked_up"].includes(b.status)} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-2">Ako šofér</h2>
        {!rides?.length ? (
          <div className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
            Zatiaľ si neponúkol žiadnu jazdu. <Link href="/domov?rezim=sofer" className="text-brandDark font-semibold">Ponúknuť odvoz</Link>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl border border-line divide-y divide-line">
            {rides.map((r) => (
              <li key={r.id}>
                <Link href={`/jazda/${r.id}`} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{fmtDay(r.departure_at)} o {fmtTime(r.departure_at)}</div>
                    <div className="text-xs text-muted">{r.seats_total - r.seats_left} z {r.seats_total} miest · {kr(r.price_credits)} za miesto</div>
                  </div>
                  <Pill s={RIDE[r.status] ?? r.status} active={["scheduled", "boarding", "in_progress"].includes(r.status)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
