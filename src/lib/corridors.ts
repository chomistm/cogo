import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorridorRow, StopRow } from "./types";

export async function loadCorridors(supabase: SupabaseClient): Promise<CorridorRow[]> {
  const [{ data: corridors }, { data: cs }] = await Promise.all([
    supabase.from("corridors").select("id,name").order("id"),
    supabase.from("corridor_stops").select("corridor_id,seq,stops(id,name,district,hint)").order("corridor_id").order("seq"),
  ]);
  return (corridors ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    stops: (cs ?? [])
      .filter((x) => x.corridor_id === c.id)
      .map((x) => x.stops as unknown as StopRow),
  }));
}
