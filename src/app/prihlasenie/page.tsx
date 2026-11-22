"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailProblem } from "@/lib/domains";
import { Logo } from "@/components/Logo";

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = emailProblem(email);
    if (problem) return setError(problem);
    setError(null);
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: name ? { full_name: name } : undefined,
      },
    });
    if (error) {
      setState("idle");
      setError(`Prihlasovací odkaz sa nepodarilo poslať: ${error.message}`);
      return;
    }
    setState("sent");
  }

  return (
    <main className="flex-1 flex flex-col px-6 pb-8 safe-top">
      <div className="pt-8"><Logo size={30} dark /></div>
      {state === "sent" ? (
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="font-display text-2xl font-bold">Skontroluj si e-mail</h1>
          <p className="text-muted mt-2">Na <b className="text-ink">{email}</b> sme poslali prihlasovací odkaz. Otvor ho v tomto telefóne.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex-1 flex flex-col pt-10">
          <h1 className="font-display text-2xl font-bold">Over sa školským alebo firemným e-mailom</h1>
          <p className="text-muted mt-1">V pilote jazdia len overení ľudia. Pošleme ti odkaz, heslo netreba.</p>
          <label htmlFor="name" className="mt-6 text-sm font-semibold">Meno a priezvisko</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="napr. Jana Nováková"
            className="mt-2 h-14 rounded-2xl border border-line bg-white px-4 outline-none focus:border-brand" />
          <label htmlFor="email" className="mt-4 text-sm font-semibold">E-mail</label>
          <input id="email" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="meno@euba.sk"
            className="mt-2 h-14 rounded-2xl border border-line bg-white px-4 outline-none focus:border-brand" />
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
          <div className="flex-1" />
          <button disabled={!email || state === "sending"} className="h-14 rounded-2xl bg-brand text-navy font-semibold disabled:opacity-40">
            {state === "sending" ? "Posielam…" : "Poslať prihlasovací odkaz"}
          </button>
        </form>
      )}
    </main>
  );
}
