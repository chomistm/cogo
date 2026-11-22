"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Trust } from "@/lib/types";
import { Btn } from "@/components/ui";
import { TrustRow } from "@/components/Trust";
import { BADGES, DRIVER_BADGES, PASSENGER_BADGES, errorText, fmtDay, fmtTime, kr } from "@/lib/format";

export type RideData = {
  id: string; status: string; departure_at: string; seats_total: number; seats_left: number; price: number;
  vehicle: { make_model: string; color: string; plate: string };
  driver: Trust; isDriver: boolean;
  stops: { id: string; eta: string; name: string; hint: string | null }[];
  bookings: { id: string; status: string; pickup: string; dropoff: string; price: number; passenger: Trust; rated: boolean; mine: boolean }[];
};

const STATUS: Record<string, string> = { scheduled: "Naplánovaná", in_progress: "Jazda prebieha", completed: "Dokončená", cancelled: "Zrušená" };

export function RideView({ data }: { data: RideData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`ride:${data.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${data.id}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `ride_id=eq.${data.id}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [data.id, router]);

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true); setError(null);
    const { error } = await createClient().rpc(fn, args);
    if (error) setError(errorText(error));
    setBusy(false); setConfirmCancel(false);
    router.refresh();
  }

  const name = (id: string) => data.stops.find((s) => s.id === id)?.name ?? "";
  const my = data.bookings.find((b) => b.mine);
  const active = data.status === "scheduled" || data.status === "in_progress";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-navy text-white p-5">
        <div className="text-brand text-sm font-semibold">{STATUS[data.status] ?? data.status}{data.isDriver ? " · si šofér" : ""}</div>
        <div className="font-display text-[26px] font-bold mt-1 leading-tight">
          {my ? `${name(my.pickup)} → ${name(my.dropoff)}` : `${data.stops[0]?.name} → ${data.stops.at(-1)?.name}`}
        </div>
        <div className="text-white/70 text-sm mt-1">
          {fmtDay(data.departure_at)} · {my ? `vyzdvihnutie o ${fmtTime(data.stops.find((s) => s.id === my.pickup)?.eta ?? data.departure_at)}` : `odchod o ${fmtTime(data.departure_at)}`}
          {" · "}{kr(data.price)} kr / os.
        </div>
      </div>

      {!data.isDriver && (
        <div className="bg-white rounded-3xl border border-line p-4 space-y-3">
          <TrustRow t={data.driver} sub="Šofér · ťukni pre hodnotenia" />
          <div className="text-sm"><b>{data.vehicle.make_model}</b>, {data.vehicle.color} · <span className="font-mono">{data.vehicle.plate}</span></div>
          {my && data.stops.find((s) => s.id === my.pickup)?.hint && (
            <div className="rounded-2xl bg-brand/10 p-3 text-sm"><b>Miesto stretnutia:</b> {data.stops.find((s) => s.id === my.pickup)?.hint}</div>
          )}
        </div>
      )}

      <ol className="bg-white rounded-3xl border border-line p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Trasa a nástupy</div>
        {data.stops.map((s) => {
          const ups = data.bookings.filter((b) => b.pickup === s.id && b.status !== "cancelled");
          const downs = data.bookings.filter((b) => b.dropoff === s.id && b.status !== "cancelled");
          return (
            <li key={s.id} className="py-2 flex gap-3">
              <span className="tabular-nums text-sm text-muted w-11 text-right">{fmtTime(s.eta)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.name}</div>
                {data.isDriver && ups.map((b) => <div key={b.id} className="text-xs text-brandDark font-semibold mt-0.5">↑ {b.passenger.full_name} nastúpi</div>)}
                {data.isDriver && downs.map((b) => <div key={b.id} className="text-xs text-muted mt-0.5">↓ {b.passenger.full_name} vystúpi</div>)}
              </div>
            </li>
          );
        })}
      </ol>

      {data.isDriver && (
        <section className="bg-white rounded-3xl border border-line p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Cestujúci ({data.seats_total - data.seats_left} z {data.seats_total})</div>
          {data.bookings.length === 0 && <p className="text-sm text-muted">Zatiaľ nikto. Upozorníme ťa, keď si niekto rezervuje miesto.</p>}
          {data.bookings.map((b) => (
            <div key={b.id} className="space-y-2">
              <TrustRow t={b.passenger} sub={`${name(b.pickup)} → ${name(b.dropoff)} · ${b.status === "completed" ? "zaplatené" : "rezervované"}`} />
              {b.status === "completed" && !b.rated && <RateForm bookingId={b.id} who={b.passenger.full_name} options={PASSENGER_BADGES} onDone={() => router.refresh()} />}
            </div>
          ))}
        </section>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {data.isDriver && data.status === "scheduled" && (
        <>
          <Btn className="w-full" disabled={busy} onClick={() => call("start_ride", { p_ride: data.id })}>Som na mieste / Štartujem jazdu</Btn>
          {confirmCancel ? (
            <div className="rounded-2xl border border-danger/30 bg-white p-4 text-sm">
              Naozaj zrušiť jazdu? Cestujúcim vrátime kredity.
              <div className="flex gap-2 mt-3"><Btn kind="danger" className="flex-1 h-12" disabled={busy} onClick={() => call("cancel_ride", { p_ride: data.id })}>Áno, zrušiť</Btn><Btn kind="ghost" className="flex-1 h-12" onClick={() => setConfirmCancel(false)}>Nie</Btn></div>
            </div>
          ) : <button className="w-full h-11 text-danger font-semibold text-sm" onClick={() => setConfirmCancel(true)}>Zrušiť jazdu</button>}
        </>
      )}
      {data.isDriver && data.status === "in_progress" && (
        <Btn className="w-full" disabled={busy} onClick={() => call("finish_ride", { p_ride: data.id })}>Ukončiť jazdu</Btn>
      )}
      {data.isDriver && data.status === "in_progress" && <p className="text-xs text-muted text-center">Po ukončení dostaneš kredity aj za cestujúcich, ktorí výstup nepotvrdili.</p>}

      {my && my.status === "confirmed" && data.status === "scheduled" && (
        confirmCancel ? (
          <div className="rounded-2xl border border-danger/30 bg-white p-4 text-sm">
            Zrušiť rezerváciu? Vrátime ti {kr(my.price)} kr.
            <div className="flex gap-2 mt-3"><Btn kind="danger" className="flex-1 h-12" disabled={busy} onClick={() => call("cancel_booking", { p_booking: my.id })}>Áno, zrušiť</Btn><Btn kind="ghost" className="flex-1 h-12" onClick={() => setConfirmCancel(false)}>Nie</Btn></div>
          </div>
        ) : <button className="w-full h-11 text-danger font-semibold text-sm" onClick={() => setConfirmCancel(true)}>Zrušiť rezerváciu a vrátiť kredity</button>
      )}
      {my && data.status === "scheduled" && my.status === "confirmed" && <p className="text-xs text-muted text-center">Kredity ({kr(my.price)} kr) sú zablokované. Šoférovi prejdú, keď potvrdíš výstup.</p>}
      {my && ["confirmed", "picked_up"].includes(my.status) && data.status === "in_progress" && (
        <Btn className="w-full" disabled={busy} onClick={() => call("complete_booking", { p_booking: my.id })}>Potvrdiť vystúpenie</Btn>
      )}
      {my && my.status === "completed" && !my.rated && <RateForm bookingId={my.id} who={data.driver.full_name} options={DRIVER_BADGES} onDone={() => router.refresh()} />}
      {my && my.status === "completed" && my.rated && <p className="text-center text-sm text-muted">Ďakujeme za hodnotenie. Pomáhaš, aby si v CoGo ľudia dôverovali.</p>}
      {!active && data.isDriver && data.bookings.every((b) => b.rated || b.status !== "completed") && data.status === "completed" && <p className="text-center text-sm text-muted">Jazda je uzavretá. Ďakujeme, že voziš susedov.</p>}
    </div>
  );
}

function RateForm({ bookingId, who, options, onDone }: { bookingId: string; who: string; options: string[]; onDone: () => void }) {
  const [up, setUp] = useState<boolean | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    const { error } = await createClient().rpc("rate_booking", { p_booking: bookingId, p_thumbs_up: up, p_badges: badges, p_comment: comment });
    if (error) { setError(errorText(error)); setBusy(false); return; }
    onDone();
  }

  return (
    <div className="rounded-3xl bg-white border border-line p-4 text-center">
      <div className="font-display font-semibold">Ako sa išlo s {who.split(" ")[0]}?</div>
      <p className="text-xs text-muted mt-1">Hodnotenie uvidia ostatní v profile. Pomáha budovať dôveru v komunite.</p>
      <div className="flex justify-center gap-3 mt-3">
        {[true, false].map((v) => (
          <button key={String(v)} type="button" aria-label={v ? "Palec hore" : "Palec dole"} onClick={() => setUp(v)}
            className={`w-16 h-16 rounded-2xl border-2 text-2xl ${up === v ? (v ? "border-brand bg-brand/10" : "border-danger bg-danger/10") : "border-line"}`}>
            {v ? "👍" : "👎"}
          </button>
        ))}
      </div>
      {up && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {options.map((b) => {
            const on = badges.includes(b);
            return <button key={b} type="button" aria-pressed={on} onClick={() => setBadges(on ? badges.filter((x) => x !== b) : [...badges, b])} className={`h-10 px-3.5 rounded-full text-sm font-semibold border ${on ? "bg-navy text-white border-navy" : "bg-white border-line"}`}>{BADGES[b]}</button>;
          })}
        </div>
      )}
      {up !== null && (
        <>
          <label htmlFor={`c-${bookingId}`} className="sr-only">Komentár</label>
          <textarea id={`c-${bookingId}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={280} rows={2}
            placeholder={up ? "Krátka pochvala (nepovinné)" : "Čo sa nepodarilo? Uvidí to len tím CoGo."} className="mt-3 w-full rounded-2xl border border-line bg-surface p-3 text-sm" />
        </>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <Btn className="w-full mt-3" disabled={up === null || busy} onClick={send}>Odoslať hodnotenie</Btn>
    </div>
  );
}
