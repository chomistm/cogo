import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";
import { TrustCard } from "@/components/Trust";
import type { Trust } from "@/lib/types";

export default async function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) return <NotConfigured />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: t } = await supabase.from("profile_trust").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  const since = new Date(t.created_at).toLocaleDateString("sk-SK", { month: "long", year: "numeric" });
  return (
    <div className="space-y-4">
      <TrustCard t={t as Trust} />
      <p className="text-xs text-muted px-1">V CoGo od {since}. Hodnotenia môžu dať len ľudia, ktorí s {t.full_name?.split(" ")[0]} naozaj išli.</p>
      <Link href="/domov" className="block text-center text-sm font-semibold text-brandDark">Späť</Link>
    </div>
  );
}
