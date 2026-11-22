export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { Notifier } from "@/components/Notifier";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { kr } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let balance: number | null = null;
  let userId: string | null = null;
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const [{ data: profile }, { data: wallet }] = await Promise.all([
        supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle(),
        supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profile && !profile.onboarded) redirect("/vitaj");
      balance = wallet ? Number(wallet.balance) : null;
    }
  }
  return (
    <>
      <header className="sticky top-0 z-30 bg-navy text-white safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/domov" aria-label="Domov"><Logo size={24} /></Link>
          <Link href="/penazenka" className="h-9 pl-2 pr-3 rounded-full bg-white/10 flex items-center gap-1.5 text-sm font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand text-navy grid place-items-center text-[10px] font-bold">kr</span>
            <span className="tabular-nums">{balance === null ? "–" : kr(balance)}</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav />
      {userId && <Notifier userId={userId} />}
    </>
  );
}
