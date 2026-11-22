import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";

const LABELS: Record<string, string> = {
  welcome_bonus: "Uvítací bonus CoGo",
  booking_hold: "Rezervácia jazdy (blokované)",
  hold_release: "Vrátenie kreditov",
  ride_earning: "Príjem za odvoz",
  reward_redeem: "Odmena",
  adjustment: "Úprava",
};

export default async function Wallet() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;
  const [{ data: wallet }, { data: tx }] = await Promise.all([
    supabase.from("wallet_balances").select("balance,on_hold").eq("user_id", uid).maybeSingle(),
    supabase.from("credit_transactions").select("id,amount,kind,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
  ]);
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-navy text-white p-5">
        <div className="text-white/65 text-sm">CoGo peňaženka</div>
        <div className="font-display text-[44px] font-bold leading-none mt-3 tabular-nums">{fmt(Number(wallet?.balance ?? 0))} <span className="text-2xl opacity-70">kr</span></div>
        <div className="text-white/65 text-sm mt-2">1 CoGo kredit = 1 €{Number(wallet?.on_hold) ? ` · ${fmt(Number(wallet?.on_hold))} kr blokované` : ""}</div>
      </div>
      <section>
        <h2 className="font-display font-semibold mb-2">Pohyby na účte</h2>
        <ul className="bg-white border border-line rounded-2xl divide-y divide-line">
          {tx?.map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-center justify-between">
              <div><div>{LABELS[t.kind] ?? t.kind}</div><div className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString("sk-SK")}</div></div>
              <div className={`font-semibold tabular-nums ${t.amount > 0 ? "text-brandDark" : ""}`}>{t.amount > 0 ? "+" : "−"}{fmt(Math.abs(Number(t.amount)))}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
