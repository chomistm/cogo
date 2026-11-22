"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CorridorRow, SearchRow } from "@/lib/types";
import { Btn, Segmented, Sheet } from "@/components/ui";
import { TrustRow } from "@/components/Trust";
import { errorText, fmtTime, kr, timeToIso } from "@/lib/format";

export function PassengerSearch({ corridors }: { corridors: CorridorRow[] }) {
  const router = useRouter();
  const allStops = useMemo(() => {
    const m = new Map<string, { id: string; name: string; hint: string | null }>();
    corridors.forEach((c) => c.stops.forEach((s) => m.set(s.id, s)));
    return m;
  }, [corridors]);
  const byName = (n: string) => [...allStops.values()].find((s) => s.name === n)?.id ?? "";
  const [from, setFrom] = useState(byName("Ovsište"));
  const [to, setTo] = useState(byName("Twin City"));
  const [when, setWhen] = useState<"now" | "today" | "tomorrow">("now");
  const [time, setTime] = useState("07:30");
  const [rows, setRows] = useState<SearchRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchRow | null>(null);

  async function search() {
    setBusy(true); setError(null);
    const at = when === "now" ? new Date().toISOString() : timeToIso(time, when === "tomorrow" ? 1 : 0);
    const { data, error } = await createClient().rpc("search_rides", { p_from: from, p_to: to, p_at: at });
    if (error) setError(errorText(error)); else setRows(data as SearchRow[]);
    setBusy(false);
  }

  async function book(r: SearchRow) {
    setBusy(true); setError(null);
    const { error } = await createClient().rpc("book_ride", { p_ride: r.ride_id, p_pickup: from, p_dropoff: to });
    if (error) { setError(errorText(error)); setBusy(false); return; }
    router.push(`/jazda/${r.ride_id}`);
    router.refresh();
  }

  const select = (id: string, value: string, onChange: (v: string) => void, label: string, other: string) => (
    <div>
      <label htmlFor={id} className="text-[11px] uppercase tracking-wider font-bold text-muted">{label}</label>
      <select id={id} value={value} onChange={(e) => { onChange(e.target.value); setRows(null); }}
        className="mt-1 w-full h-12 rounded-xl border border-line bg-surface px-3 font-semibold">
        {corridors.map((c) => (
          <optgroup key={c.id} label={c.name}>
            {c.stops.map((s) => <option key={`${c.id}-${s.id}`} value={s.id} disabled={s.id === other}>{s.name}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-line p-4 shadow-card space-y-3">
        {select("from", from, setFrom, "Nástup", to)}
        <div className="flex justify-end -my-1">
          <button type="button" onClick={() => { setFrom(to); setTo(from); setRows(null); }} className="h-9 px-3 rounded-full bg-surface border border-line text-sm font-semibold">⇅ Vymeniť smer</button>
        </div>
        {select("to", to, setTo, "Výstup", from)}
        <Segmented value={when} onChange={(v) => { setWhen(v); setRows(null); }} options={[{ value: "now", label: "Teraz" }, { value: "today", label: "Dnes o" }, { value: "tomorrow", label: "Zajtra o" }]} />
        {when !== "now" && (
          <div className="flex items-center gap-3">
            <label htmlFor="time" className="text-sm text-muted">Čas na zastávke</label>
            <input id="time" type="time" value={time} onChange={(e) => { setTime(e.target.value); setRows(null); }} className="ml-auto h-11 rounded-xl border border-line px-3 font-semibold bg-surface" />
          </div>
        )}
        <Btn className="w-full" disabled={busy || !from || !to || from === to} onClick={search}>{busy ? "Hľadám…" : "Nájsť CoGo"}</Btn>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {rows && (
        <section>
          <h2 className="font-display font-semibold px-1 mb-2">{rows.length ? `CoGo jazdy v okne ±15 min (${rows.length})` : "V tomto čase zatiaľ nikto nejde"}</h2>
          {rows.length === 0 && <p className="text-sm text-muted px-1">Skús iný čas alebo poprosiť známych šoférov, nech zverejnia svoju trasu. Požiadavku s garanciou návratu pridáme v ďalšom kroku.</p>}
          <div className="space-y-3">
            {rows.map((r) => (
              <button key={r.ride_id} onClick={() => setDetail(r)} className="w-full text-left bg-white rounded-3xl border border-line p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-display text-2xl font-bold tabular-nums leading-none">{fmtTime(r.eta_from)}</div><div className="text-[11px] text-muted mt-1">na zastávke</div></div>
                  <div className="text-right"><div className="font-display font-bold text-lg">{kr(r.price)} <span className="text-xs opacity-70">kr</span></div><div className="text-[11px] font-semibold text-brandDark">{r.seats_left} {r.seats_left === 1 ? "miesto" : "miesta"}</div></div>
                </div>
                <div className="mt-3 pointer-events-none"><TrustRow t={r.driver} sub={`${r.vehicle.make_model} · ${r.vehicle.color} · ${r.vehicle.plate}`} /></div>
                <div className="mt-2 text-xs text-muted">Príchod do cieľa okolo {fmtTime(r.eta_to)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Detail CoGo jazdy">
        {detail && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-line p-4"><TrustRow t={detail.driver} sub={`${detail.driver.rides_done} jázd v CoGo · ťukni pre celý profil`} /></div>
            <div className="bg-white rounded-2xl border border-line p-4">
              <div className="font-semibold">{detail.vehicle.make_model}, {detail.vehicle.color}</div>
              <div className="text-sm text-muted font-mono">{detail.vehicle.plate}</div>
            </div>
            <ol className="bg-white rounded-2xl border border-line p-4 space-y-1.5">
              {detail.route.map((s) => {
                const mine = s.stop_id === from || s.stop_id === to;
                return (
                  <li key={s.stop_id} className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums w-11 text-right text-muted">{fmtTime(s.eta)}</span>
                    <span className={`w-3 h-3 rounded-full ${mine ? "bg-brand ring-4 ring-brand/20" : "bg-line"}`} />
                    <span className={mine ? "font-semibold" : "text-muted"}>{s.name}{s.stop_id === from ? " · nástup" : s.stop_id === to ? " · výstup" : ""}</span>
                  </li>
                );
              })}
            </ol>
            {allStops.get(from)?.hint && <div className="rounded-2xl bg-brand/10 p-4 text-sm"><b>Miesto stretnutia:</b> {allStops.get(from)?.hint}. Príď 2 minúty vopred.</div>}
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex items-center gap-4">
              <div><div className="text-xs text-muted">Cena</div><div className="font-display font-bold text-2xl">{kr(detail.price)} <span className="text-sm opacity-70">kr</span></div></div>
              <Btn className="flex-1" disabled={busy} onClick={() => book(detail)}>{busy ? "Rezervujem…" : "Rezervovať miesto"}</Btn>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
