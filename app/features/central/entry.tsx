"use client";

import { lazy, Suspense, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntryForm } from "../../components/entry-form";
import { WorkspacePlaceholder } from "../../components/workspace-startup";
import { entryDestination, workspaceView } from "../../lib/workspace-navigation";
import type { WorkspaceView } from "../../components/school-admin-demo.model";
import { apiRequest, isSchoolActor, issueMessage, type SchoolActor } from "./client";

const Workspace = lazy(() => import("./workspace").then((module) => ({ default: module.CentralWorkspace })));

export function CentralEntry({ actor, notice, initialView = "overview" }: {
  actor?: SchoolActor;
  notice?: string;
  initialView?: WorkspaceView;
}) {
  const [refused, setRefused] = useState(false);
  const pathname = usePathname();
  const currentView = pathname === "/" ? initialView : workspaceView(pathname);
  async function enter(email: string, password: string) {
    try {
      await apiRequest("POST", "/api/auth/sign-in/email", { body: { email, password } });
      if (!isSchoolActor(await apiRequest("GET", "/api/v1/me"))) {
        await apiRequest("POST", "/api/auth/sign-out");
        setRefused(true);
        return "Use uma conta da Secretaria ou do Director.";
      }
      window.location.replace(entryDestination(window.location.pathname, window.location.search, initialView));
    } catch (error) {
      return issueMessage(error, false);
    }
  }
  if (actor) return <Suspense fallback={<WorkspacePlaceholder view={currentView} />}>
    <Workspace actor={actor} initialView={currentView} />
  </Suspense>;
  return <EntryForm emailEntry initialError={notice} enter={enter} recovery={<>
    <Link href="/recuperar" className="font-semibold text-[#185c54]">Activar ou recuperar acesso</Link>
    {refused && <p className="mt-2"><a href="https://lss-admin.vercel.app/" className="font-semibold text-[#185c54]">Abrir o painel de administração</a></p>}
  </>} />;
}

export function RecoveryEntry() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") ?? "").trim();
    const newPassword = String(data.get("password") ?? "");
    if (newPassword.length < 12 || newPassword !== data.get("confirmation")) {
      setError("Use pelo menos 12 caracteres e confirme a mesma palavra-passe.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await apiRequest("POST", "/api/v1/access-reset/complete", { body: { code, newPassword } });
      setDone(true);
    } catch (cause) {
      setError(issueMessage(cause, false));
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10">
    <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold">Activar ou recuperar acesso</h1>
      {done ? <Alert className="mt-5" severity="success">A palavra-passe foi guardada. Já pode entrar no LSS.</Alert> :
        <form onSubmit={submit} className="mt-5 grid gap-5" aria-busy={busy}>
          <p className="text-sm text-slate-600">Use o código de utilização única entregue pela administração.</p>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Código de acesso" name="code" autoComplete="one-time-code" required />
          <TextField label="Nova palavra-passe" name="password" type="password" autoComplete="new-password" required />
          <TextField label="Confirmar palavra-passe" name="confirmation" type="password" autoComplete="new-password" required />
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "A guardar…" : "Guardar palavra-passe"}</Button>
        </form>}
      <Link href="/" className="mt-5 block text-sm font-semibold text-[#185c54]">Voltar à entrada</Link>
    </section>
  </main>;
}
