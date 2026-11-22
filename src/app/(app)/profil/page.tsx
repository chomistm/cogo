import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";
import { TrustCard } from "@/components/Trust";
import type { Trust } from "@/lib/types";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const ROLE: Record<string, string> = { passenger: "Cestujúci", driver: "Šofér", both: "Šofér aj cestujúci" };

export default async function Profile() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;
  const [{ data: t }, { data: vehicle }] = await Promise.all([
    supabase.from("profile_trust").select("*").eq("id", uid).single(),
    supabase.from("vehicles").select("make_model,color,plate,seats").eq("owner_id", uid).eq("is_active", true).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      {t && <TrustCard t={t as Trust} />}
      <div className="bg-white border border-line rounded-2xl divide-y divide-line text-sm">
        <div className="px-4 py-3 flex justify-between"><span className="text-muted">E-mail</span><span className="truncate ml-3">{user?.email}</span></div>
        <div className="px-4 py-3 flex justify-between"><span className="text-muted">Rola</span><span>{ROLE[t?.role ?? ""] ?? "–"}</span></div>
        <div className="px-4 py-3 flex justify-between"><span className="text-muted">Auto</span><span className="text-right">{vehicle ? `${vehicle.make_model}, ${vehicle.color} · ${vehicle.plate}` : "–"}</span></div>
      </div>
      <p className="text-xs text-muted px-1">Takto ťa vidia ostatní pri rezervácii. Percento palcov hore a odznaky sa počítajú z hodnotení po dokončených jazdách.</p>
      <Link href="/vitaj" className="w-full h-12 rounded-2xl bg-brand text-navy font-semibold text-sm grid place-items-center">Upraviť profil, fotku a auto</Link>
      <form action={signOut}>
        <button className="w-full h-12 rounded-2xl border border-line bg-white text-muted font-semibold text-sm">Odhlásiť sa</button>
      </form>
    </div>
  );
}
