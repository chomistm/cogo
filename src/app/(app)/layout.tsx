export const dynamic = "force-dynamic";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let balance: number | null = null;
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("wallet_balances").select("balance").maybeSingle();
    balance = data ? Number(data.balance) : null;
  }
  return (
    <>
      <header className="sticky top-0 z-30 bg-navy text-white safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <Logo size={24} />
          <Link href="/penazenka" className="h-9 pl-2 pr-3 rounded-full bg-white/10 flex items-center gap-1.5 text-sm font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand text-navy grid place-items-center text-[10px] font-bold">kr</span>
            <span className="tabular-nums">{balance === null ? "–" : balance.toFixed(2).replace(".", ",")}</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
