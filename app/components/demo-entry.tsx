"use client";

import { useState, type FormEvent } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { authenticateDemoSession } from "../features/demo/demo-auth";
import { institutionLogoText, institutionName } from "./school-admin-demo.model";

export function DemoEntry({ onEnter }: { onEnter: (accountId: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (!username.trim() || !password) {
      setError("Preencha o utilizador e a palavra-passe.");
      return;
    }
    setSubmitting(true);
    try {
      const session = await authenticateDemoSession(username, password);
      if (!session) {
        setError("Utilizador ou palavra-passe incorrectos.");
        return;
      }
      onEnter(session.account.id);
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10 text-slate-950">
      <section aria-labelledby="entry-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="mb-6 grid size-14 place-items-center rounded-lg bg-[#185c54] text-lg font-bold text-white">{institutionLogoText}</div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#185c54]">{institutionName}</p>
        <h1 id="entry-title" className="mt-3 text-2xl font-bold">Entrar no LSS</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Matrículas, pagamentos e acompanhamento da escola.</p>
        <form onSubmit={submit} className="mt-7 grid gap-5" aria-busy={submitting}>
          <TextField
            label="Utilizador" name="username" value={username}
            onChange={(event) => { setUsername(event.target.value); setError(""); }}
            autoComplete="username" autoCapitalize="none" spellCheck={false}
            required fullWidth size="medium" error={Boolean(error)}
          />
          <TextField
            label="Palavra-passe" name="password" type="password" value={password}
            onChange={(event) => { setPassword(event.target.value); setError(""); }}
            autoComplete="current-password" required fullWidth size="medium" error={Boolean(error)}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" fullWidth disabled={submitting}>{submitting ? "A entrar…" : "Entrar"}</Button>
        </form>
        <p className="mt-7 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">Para recuperar o acesso, contacte a administração da escola.</p>
      </section>
    </main>
  );
}
