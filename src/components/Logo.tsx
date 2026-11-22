export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size * 1.6} height={size} viewBox="0 0 64 40" aria-hidden="true">
      <circle cx="22" cy="20" r="12" fill="none" stroke="#19B5C9" strokeWidth="6" />
      <path d="M53.8 22.1 A12 12 0 1 1 48 9.6" fill="none" stroke="#12C98A" strokeWidth="6" strokeLinecap="round" />
      <path d="M44.6 3.8 L55.4 8.6 L47.6 16.6 Z" fill="#12C98A" />
      <path d="M33.2 13.6 A12 12 0 0 1 34 20" fill="none" stroke="#19B5C9" strokeWidth="6" />
    </svg>
  );
}

export function Logo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="CoGo">
      <LogoMark size={size} />
      <span className={`font-display font-bold tracking-tight ${dark ? "text-ink" : "text-white"}`} style={{ fontSize: size * 0.85 }}>
        Co<span className="text-brand">Go</span>
      </span>
    </div>
  );
}
