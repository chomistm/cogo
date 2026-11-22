import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NotConfigured } from "@/components/NotConfigured";

export default async function Trips() {
  if (!supabaseConfigured) return <NotConfigured />;
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("id,status,price_credits,created_at").order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Moje CoGo jazdy</h1>
      {!data?.length ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Zatiaľ žiadne jazdy.</div>
      ) : (
        <ul className="bg-white rounded-2xl border border-line divide-y divide-line">
          {data.map((b) => <li key={b.id} className="px-4 py-3 flex justify-between"><span>{b.status}</span><span className="tabular-nums">{b.price_credits} kr</span></li>)}
        </ul>
      )}
    </div>
  );
}
