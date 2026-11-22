export const TZ = "Europe/Bratislava";

export function fmtTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("sk-SK", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function fmtDay(iso: string | Date) {
  const d = new Date(iso);
  const key = (x: Date) => x.toLocaleDateString("sk-SK", { timeZone: TZ });
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  if (key(d) === key(today)) return "dnes";
  if (key(d) === key(tomorrow)) return "zajtra";
  return d.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric", timeZone: TZ });
}

export function kr(n: number | string | null | undefined) {
  return Number(n ?? 0).toFixed(2).replace(".", ",");
}

export const BADGES: Record<string, string> = {
  dochvilny: "Dochvíľny",
  prijemny_pokec: "Príjemný pokec",
  bezpecna_jazda: "Bezpečná jazda",
  ciste_auto: "Čisté auto",
  ochotny: "Ochotný",
};
export const DRIVER_BADGES = ["dochvilny", "bezpecna_jazda", "prijemny_pokec", "ciste_auto"];
export const PASSENGER_BADGES = ["dochvilny", "prijemny_pokec", "ochotny"];

export function verificationLabel(v: string | null | undefined) {
  if (v === "student") return "Overený študent";
  if (v === "colleague") return "Overený kolega";
  return null;
}

export function initials(name: string | null | undefined) {
  return (name ?? "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Prevedie „HH:MM“ v deň (0 = dnes, 1 = zajtra) na ISO čas podľa času zariadenia. */
export function timeToIso(hhmm: string, dayOffset = 0) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function errorText(e: unknown) {
  const msg = (e as { message?: string })?.message ?? String(e);
  return msg.replace(/^.*?ERROR:\s*/, "");
}
