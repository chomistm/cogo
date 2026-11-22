import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function Profile() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("full_name,verification,verified_domain,rating_up,rating_count").eq("id", user?.id ?? "").maybeSingle();
  const badge = p?.verification === "student" ? "Overený študent" : p?.verification === "colleague" ? "Overený kolega" : "Neoverený";
  return (
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-3xl p-5 text-center">
        <div className="font-display text-xl font-bold">{p?.full_name ?? "Profil"}</div>
        <div className="text-sm text-muted">{user?.email}</div>
        <div className="mt-2 inline-block rounded-full bg-brand/15 text-brandDark text-xs font-semibold px-2.5 py-1">{badge}</div>
      </div>
      <form action={signOut}>
        <button className="w-full h-12 rounded-2xl border border-line bg-white text-muted font-semibold text-sm">Odhlásiť sa</button>
      </form>
    </div>
  );
}
