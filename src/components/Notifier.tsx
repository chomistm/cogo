"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const TEXT: Record<string, [string, string]> = {
  booking_new: ["Nová rezervácia!", "Niekto si rezervoval miesto v tvojej jazde."],
  booking_cancelled: ["Rezervácia zrušená", "Cestujúci zrušil miesto, kredity sme mu vrátili."],
  booking_paid: ["Kredity prijaté", "Cestujúci potvrdil výstup."],
  ride_started: ["Šofér vyrazil", "Buď včas na zastávke."],
  ride_cancelled: ["Jazda zrušená", "Šofér zrušil jazdu, kredity máš späť."],
  booking_completed: ["Jazda dokončená", "Ohodnoť šoféra, pomôžeš komunite."],
};

type Note = { id: number; type: string; payload: { ride_id?: string } };

/** Počúva upozornenia pre prihláseného používateľa a obnoví obrazovku. */
export function Notifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (msg) => {
        setNote(msg.new as Note);
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, router]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(t);
  }, [note]);

  if (!note) return null;
  const [title, body] = TEXT[note.type] ?? ["CoGo", "Máš nové upozornenie."];
  const inner = (
    <div className="mx-4 w-full max-w-[408px] bg-navy text-white rounded-2xl p-4 shadow-2xl">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-white/75 mt-0.5">{body}</div>
    </div>
  );
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }} role="status">
      {note.payload?.ride_id ? <Link href={`/jazda/${note.payload.ride_id}`} onClick={() => setNote(null)} className="w-full flex justify-center">{inner}</Link> : inner}
    </div>
  );
}
