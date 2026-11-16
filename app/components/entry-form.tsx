"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { institutionLogoText, institutionName } from "../lib/workspace-navigation";

export function EntryForm({
  enter, schoolName = institutionName, logoText = institutionLogoText, emailEntry = false,
  initialError = "", recovery,
}: {
  enter(user: string, password: string): Promise<string | void>;
  schoolName?: string;
  logoText?: string;
  emailEntry?: boolean;
  initialError?: string;
  recovery?: ReactNode;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) {
      setError(emailEntry ? "Preencha o e-mail e a palavra-passe." : "Preencha o utilizador e a palavra-passe.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const message = await enter(username.trim(), password);
      if (message) setError(message);
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10 text-slate-950">
      <section aria-labelledby="entry-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="mb-6 grid size-14 place-items-center rounded-lg bg-[#185c54] text-lg font-bold text-white">{logoText}</div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#185c54]">{schoolName}</p>
        <h1 id="entry-title" className="mt-3 text-2xl font-bold">Entrar no LSS</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Matrículas, pagamentos e acompanhamento da escola.</p>
        <form onSubmit={submit} className="mt-7 grid gap-5" aria-busy={busy}>
          <TextField label={emailEntry ? "E-mail" : "Utilizador"} name="username" value={username}
            type={emailEntry ? "email" : "text"} onChange={(event) => { setUsername(event.target.value); setError(""); }}
            autoComplete="username" autoCapitalize="none" spellCheck={false} required fullWidth size="medium" error={Boolean(error)} />
          <TextField label="Palavra-passe" name="password" type="password" value={password}
            onChange={(event) => { setPassword(event.target.value); setError(""); }}
            autoComplete="current-password" required fullWidth size="medium" error={Boolean(error)} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" fullWidth disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : undefined}>
            {busy ? "A entrar…" : "Entrar"}
          </Button>
        </form>
        <div className="mt-7 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">
          {recovery ?? "Para recuperar o acesso, contacte a administração da escola."}
        </div>
      </section>
    </main>
  );
}
