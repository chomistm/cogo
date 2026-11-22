import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "./Onboarding";

export const dynamic = "force-dynamic";

export default async function Welcome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/prihlasenie");
  const [{ data: profile }, { data: vehicle }] = await Promise.all([
    supabase.from("profiles").select("full_name,avatar_url,role,verification").eq("id", user.id).single(),
    supabase.from("vehicles").select("id,make_model,color,plate,seats").eq("owner_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  return <Onboarding userId={user.id} profile={profile} vehicle={vehicle} />;
}
