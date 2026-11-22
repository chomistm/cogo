"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CorridorRow } from "@/lib/types";
import { Btn, Segmented, Stepper } from "@/components/ui";
import { errorText, kr, timeToIso } from "@/lib/format";

type Vehicle = { id: string; make_model: string; color: string; plate: string; seats: number };

const suggested = (n: number) => Math.min(2.5, 1.5 + 0.5 * Math.floor((n - 2) / 2));

export function DriverPublish({ corridors, vehicle }: { corridors: CorridorRow[]; vehicle: Vehicle }) {
  const router = useRouter();
  const [cid, setCid] = useState(corridors[0]?.id ?? 1);
  const [reverse, setReverse] = useState(false);
  const base = corridors.find((c) => c.id === cid)?.stops ?? [];
  const route = reverse ? [...base].reverse() : base;
  const [off, setOff] = useState<string[]>([]);
  const chosen = route.filter((s) => !off.includes(s.id));
  const [when, setWhen] = useState<"soon" | "today" | "tomorrow">("soon");
  const [time, setTime] = useState("07:20");
  const [seats, setSeats] = useState(Math.min(vehicle.seats, 3));
  const [price, setPrice] = useState<number | null>(null);
  const p = price ?? suggested(chosen.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(c: number, r: boolean) { setCid(c); setReverse(r); setOff([]); setPrice(null); }

  async function publish() {
    setBusy(true); setError(null);
    const departure = when === "soon" ? new Date(Date.now() + 15 * 60000).toISOString() : timeToIso(time, when === "tomorrow" ? 1 : 0);
    const { data, error } = await createClient().rpc("create_ride", {
      p_vehicle: vehicle.id, p_departure: departure, p_stops: chosen.map((s) => s.id), p_seats: seats, p_price: p,
    });
    if (error) { setError(errorText(error)); setBusy(false); return; }
    router.push(`/jazda/${data}`);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-3xl border border-line p-4 shadow-card space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Môj ťah</div>
        <Segmented value={cid} onChange={(v) => reset(v, reverse)} options={corridors.map((c) => ({ value: c.id, label: `Koridor ${c.id}` }))} />
        {route.length > 1 && (
          <button type="button" onClick={() => reset(cid, !reverse)} className="mt-2 w-full h-11 rounded-xl bg-surface text-sm font-semibold">
            ⇅ {route[0].name} → {route[route.length - 1].name}
          </button>
        )}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Zastávky, cez ktoré idem</div>
        <div className="flex flex-wrap gap-2">
          {route.map((s) => {
            const on = !off.includes(s.id);
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => setOff(on ? [...off, s.id] : off.filter((x) => x !== s.id))}
                className={`h-10 px-3.5 rounded-full text-sm font-semibold border ${on ? "bg-navy text-white border-navy" : "bg-white text-muted border-line"}`}>
                {on ? "✓ " : ""}{s.name}
              </button>
            );
          })}
        </div>
        {chosen.length < 2 && <p className="text-sm text-danger mt-2">Vyber aspoň 2 zastávky.</p>}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Kedy vyrážam</div>
        <Segmented value={when} onChange={setWhen} options={[{ value: "soon", label: "O 15 min" }, { value: "today", label: "Dnes o" }, { value: "tomorrow", label: "Zajtra o" }]} />
        {when !== "soon" && (
          <div className="mt-3 flex items-center gap-3">
            <label htmlFor="dtime" className="text-sm text-muted">Odchod z prvej zastávky</label>
            <input id="dtime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="ml-auto h-11 rounded-xl border border-line px-3 font-semibold bg-surface" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Voľné miesta" value={seats} min={1} max={vehicle.seats} onChange={setSeats} />
        <Stepper label="Cena / os. (kr)" value={p} min={0.5} max={5} step={0.5} onChange={setPrice} format={kr} />
      </div>
      <p className="text-xs text-muted">Vezieš {vehicle.make_model}, {vehicle.color}, {vehicle.plate}. Časy na zastávkach dopočítame podľa vzdialenosti.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Btn className="w-full" disabled={busy || chosen.length < 2} onClick={publish}>{busy ? "Zverejňujem…" : "Zverejniť CoGo jazdu"}</Btn>
    </div>
  );
}
