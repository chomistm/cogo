import Link from "next/link";
import type { Trust } from "@/lib/types";
import { BADGES, verificationLabel } from "@/lib/format";
import { Avatar } from "./Avatar";

export function VerifiedChip({ v }: { v: string | null | undefined }) {
  const label = verificationLabel(v);
  if (!label) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted font-semibold">Neoverený</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand/15 text-brandDark font-semibold">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" /></svg>
      {label}
    </span>
  );
}

export function ThumbsScore({ t, large }: { t: Pick<Trust, "thumbs_pct" | "rating_count">; large?: boolean }) {
  if (!t.rating_count) return <span className={`${large ? "text-sm" : "text-xs"} text-muted`}>Nový v CoGo</span>;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${large ? "text-sm" : "text-xs"} ${(t.thumbs_pct ?? 0) >= 90 ? "text-brandDark" : "text-ink"}`}>
      <svg viewBox="0 0 24 24" className={large ? "w-4 h-4" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11v9H4v-9zm0 0 4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.2 20H7" /></svg>
      {t.thumbs_pct} % <span className="text-muted font-normal">({t.rating_count})</span>
    </span>
  );
}

export function TopBadges({ badges, max = 2 }: { badges: Record<string, number>; max?: number }) {
  const top = Object.entries(badges ?? {}).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (!top.length) return null;
  return (
    <>
      {top.map(([k, n]) => (
        <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-ink font-medium">
          {BADGES[k] ?? k} ×{n}
        </span>
      ))}
    </>
  );
}

/** Kompaktný riadok dôvery: fotka, meno, overenie, % palcov hore, odznaky. Klik otvorí profil. */
export function TrustRow({ t, sub }: { t: Trust; sub?: React.ReactNode }) {
  return (
    <Link href={`/profil/${t.id}`} className="flex items-center gap-3 min-w-0">
      <Avatar name={t.full_name} url={t.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink truncate">{t.full_name}</span>
          <ThumbsScore t={t} />
        </div>
        {sub && <div className="text-xs text-muted truncate">{sub}</div>}
        <div className="mt-1 flex flex-wrap gap-1"><VerifiedChip v={t.verification} /><TopBadges badges={t.badges} max={1} /></div>
      </div>
    </Link>
  );
}

/** Veľká karta dôvery pre profil. */
export function TrustCard({ t }: { t: Trust }) {
  const entries = Object.keys(BADGES);
  return (
    <div className="bg-white border border-line rounded-3xl p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar name={t.full_name} url={t.avatar_url} size={88} />
        <div className="font-display text-xl font-bold mt-3">{t.full_name}</div>
        <div className="mt-2"><VerifiedChip v={t.verification} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-5 text-center">
        <div className="bg-surface rounded-2xl p-3"><div className="font-display font-bold text-lg">{t.rating_count ? `${t.thumbs_pct} %` : "–"}</div><div className="text-[11px] text-muted">palec hore</div></div>
        <div className="bg-surface rounded-2xl p-3"><div className="font-display font-bold text-lg">{t.rating_count}</div><div className="text-[11px] text-muted">hodnotení</div></div>
        <div className="bg-surface rounded-2xl p-3"><div className="font-display font-bold text-lg">{t.rides_done}</div><div className="text-[11px] text-muted">jázd</div></div>
      </div>
      <div className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Odznaky od komunity</div>
      <div className="flex flex-wrap gap-2 mt-2">
        {entries.map((k) => {
          const n = t.badges?.[k];
          return (
            <span key={k} className={`h-8 px-3 rounded-full text-sm font-semibold inline-flex items-center ${n ? "bg-brand/15 text-brandDark" : "bg-surface text-muted"}`}>
              {BADGES[k]}{n ? ` ×${n}` : ""}
            </span>
          );
        })}
      </div>
      {!t.rating_count && <p className="text-xs text-muted mt-2">Hodnotenia a odznaky pribudnú po prvých jazdách.</p>}
    </div>
  );
}
