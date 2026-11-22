import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Landing() {
  return (
    <main className="flex-1 bg-navy text-white flex flex-col px-6 pb-8 safe-top">
      <div className="pt-10"><Logo size={40} /></div>
      <div className="flex-1 flex flex-col justify-center py-10">
        <h1 className="font-display text-[34px] leading-[1.1] font-bold">Mestská linka od&nbsp;susedov.</h1>
        <p className="text-white/70 mt-3 text-base leading-relaxed">
          Odvez sa do školy alebo práce so šoférom, ktorý ide tvojím smerom. Za 1,50 – 2,50 € a bez prestupov.
        </p>
      </div>
      <Link href="/prihlasenie" className="h-14 rounded-2xl bg-brand text-navy font-semibold grid place-items-center">
        Prihlásiť sa školským e-mailom
      </Link>
    </main>
  );
}
