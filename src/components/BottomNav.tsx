"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/domov", label: "Domov", d: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/jazdy", label: "Jazdy", d: "M5 17h14M7 17l1.5-6h7L17 17M8 11V8a4 4 0 0 1 8 0v3" },
  { href: "/penazenka", label: "Peňaženka", d: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zm14 7h.01" },
  { href: "/profil", label: "Profil", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-white/95 backdrop-blur border-t border-line safe-bottom z-30" aria-label="Hlavná navigácia">
      <div className="grid grid-cols-4 px-2 pt-1.5 pb-1.5">
        {ITEMS.map((i) => {
          const on = path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
              className={`h-14 flex flex-col items-center justify-center gap-0.5 ${on ? "text-ink" : "text-muted"}`}>
              <span className={`w-12 h-7 rounded-full grid place-items-center ${on ? "bg-brand/20 text-brandDark" : ""}`}>
                <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={i.d} /></svg>
              </span>
              <span className="text-[11px] font-semibold">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
