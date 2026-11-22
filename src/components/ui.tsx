"use client";

export function Btn({ children, onClick, kind = "primary", className = "", disabled, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; kind?: "primary" | "dark" | "ghost" | "danger";
  className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const k = {
    primary: "bg-brand text-navy",
    dark: "bg-navy text-white",
    ghost: "bg-white text-ink border border-line",
    danger: "bg-white text-danger border border-danger/30",
  }[kind];
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`h-14 rounded-2xl px-5 font-semibold text-[15px] inline-flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none ${k} ${className}`}>
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 p-1 rounded-2xl bg-line/70" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }} role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={`h-11 rounded-xl text-sm font-semibold ${o.value === value ? "bg-white text-ink shadow-sm" : "text-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ label, value, min, max, step = 1, onChange, format = (v: number) => String(v) }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="bg-surface rounded-2xl p-3">
      <div className="text-xs text-muted font-semibold">{label}</div>
      <div className="flex items-center justify-between mt-1">
        <button type="button" aria-label={`Menej: ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} className="w-10 h-10 rounded-xl bg-white border border-line text-xl">−</button>
        <span className="font-display font-bold text-xl tabular-nums">{format(value)}</span>
        <button type="button" aria-label={`Viac: ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} className="w-10 h-10 rounded-xl bg-white border border-line text-xl">+</button>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-center items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-navy/50" aria-label="Zavrieť" onClick={onClose} />
      <div className="relative w-full max-w-app bg-surface rounded-t-3xl max-h-[88%] flex flex-col safe-bottom">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full text-2xl leading-none" aria-label="Zavrieť">×</button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export const inputCls = "mt-2 w-full h-14 rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-brand";
