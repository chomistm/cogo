export function NotConfigured() {
  return (
    <div className="rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
      <b>Supabase ešte nie je pripojený.</b> Doplň <code>NEXT_PUBLIC_SUPABASE_URL</code> a{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> do <code>.env.local</code> (lokálne) alebo do nastavení Vercelu.
    </div>
  );
}
