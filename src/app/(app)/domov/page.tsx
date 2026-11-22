import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";

type Stop = { id: string; name: string; district: string; hint: string | null; corridor_id: number | null };

export default async function Home() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: stops, error } = await supabase.from("stops").select("id,name,district,hint,corridor_id").eq("is_active", true).order("corridor_id").order("name");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Virtuálne zastávky</h1>
      <p className="text-sm text-muted">Hľadanie a rezervácia jázd prídu v ďalšom kroku. Toto je overenie, že appka číta dáta zo Supabase.</p>
      {error && <p className="text-sm text-danger">Zastávky sa nepodarilo načítať: {error.message}</p>}
      <ul className="bg-white rounded-2xl border border-line divide-y divide-line">
        {(stops as Stop[] | null)?.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-muted">{s.district}{s.hint ? ` · ${s.hint}` : ""}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
