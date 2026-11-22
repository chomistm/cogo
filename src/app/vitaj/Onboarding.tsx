"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Btn, Segmented, inputCls } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { VerifiedChip } from "@/components/Trust";
import { errorText } from "@/lib/format";

type Profile = { full_name: string; avatar_url: string | null; role: string; verification: string } | null;
type Vehicle = { id: string; make_model: string; color: string; plate: string; seats: number } | null;

export function Onboarding({ userId, profile, vehicle }: { userId: string; profile: Profile; vehicle: Vehicle }) {
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [role, setRole] = useState(profile?.role ?? "passenger");
  const [car, setCar] = useState({ make_model: vehicle?.make_model ?? "", color: vehicle?.color ?? "", plate: vehicle?.plate ?? "", seats: vehicle?.seats ?? 3 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsCar = role !== "passenger";

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) setError(`Fotku sa nepodarilo nahrať: ${error.message}`);
    else setAvatar(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      if (needsCar) {
        const row = { owner_id: userId, ...car, plate: car.plate.toUpperCase() };
        const { error } = vehicle
          ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
          : await supabase.from("vehicles").insert(row);
        if (error) throw error;
      }
      const { error } = await supabase.from("profiles").update({ full_name: name.trim(), avatar_url: avatar, role, onboarded: true }).eq("id", userId);
      if (error) throw error;
      router.replace("/domov");
      router.refresh();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const carOk = !needsCar || (car.make_model.trim() && car.color.trim() && car.plate.trim());
  return (
    <main className="flex-1 px-6 pt-8 pb-10 safe-top">
      <h1 className="font-display text-2xl font-bold">Tvoj CoGo profil</h1>
      <p className="text-muted mt-1">Fotka a meno pomáhajú, aby ste sa na zastávke spoznali a dôverovali si.</p>
      <div className="mt-2"><VerifiedChip v={profile?.verification} /></div>

      <label htmlFor="photo" className="mt-6 inline-flex items-center gap-4 cursor-pointer">
        <Avatar name={name || "?"} url={avatar} size={80} />
        <span className="text-sm font-semibold text-brandDark">{avatar ? "Zmeniť fotku" : "Pridať fotku"}</span>
        <input id="photo" type="file" accept="image/*" className="sr-only" onChange={upload} />
      </label>

      <label htmlFor="name" className="block mt-6 text-sm font-semibold">Meno a priezvisko</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="napr. Jana Nováková" />

      <div className="mt-6 text-sm font-semibold mb-2">Ako chceš CoGo používať?</div>
      <Segmented value={role} onChange={setRole} options={[{ value: "passenger", label: "Cestujúci" }, { value: "driver", label: "Šofér" }, { value: "both", label: "Oboje" }]} />

      {needsCar && (
        <section className="mt-6 bg-white rounded-3xl border border-line p-4">
          <h2 className="font-display font-semibold">Tvoje auto</h2>
          <label htmlFor="car-model" className="block mt-3 text-sm font-semibold">Model</label>
          <input id="car-model" value={car.make_model} onChange={(e) => setCar({ ...car, make_model: e.target.value })} className={inputCls} placeholder="napr. Škoda Fabia" />
          <label htmlFor="car-color" className="block mt-3 text-sm font-semibold">Farba</label>
          <input id="car-color" value={car.color} onChange={(e) => setCar({ ...car, color: e.target.value })} className={inputCls} placeholder="napr. biela" />
          <label htmlFor="car-plate" className="block mt-3 text-sm font-semibold">ŠPZ</label>
          <input id="car-plate" value={car.plate} onChange={(e) => setCar({ ...car, plate: e.target.value.toUpperCase() })} className={inputCls} placeholder="BA-000XX" />
          <div className="mt-3 text-sm font-semibold mb-2">Voľné miesta pre CoGo</div>
          <Segmented value={car.seats} onChange={(v) => setCar({ ...car, seats: v })} options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} />
        </section>
      )}

      {error && <p className="text-sm text-danger mt-4">{error}</p>}
      <Btn className="w-full mt-8" disabled={busy || name.trim().length < 3 || !carOk} onClick={save}>{busy ? "Ukladám…" : "Uložiť a pokračovať"}</Btn>
    </main>
  );
}
