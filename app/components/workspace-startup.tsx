"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import { WorkspaceShell } from "./workspace-shell";
import { workspacePath, workspaceView } from "../lib/workspace-navigation";
import type { DemoSession } from "../features/demo/demo-session";
import type { WorkspaceView } from "./school-admin-demo.model";

export function WorkspaceStartup({ session, initialView = "overview", onSignOut, error, onRetry }: {
  session: DemoSession;
  initialView?: WorkspaceView;
  onSignOut(): void;
  error?: string;
  onRetry?(): void;
}) {
  const [view, setView] = useState(() => typeof window === "undefined" ? initialView : workspaceView(window.location.pathname));
  const [collapsed, setCollapsed] = useState(false);
  return <WorkspaceShell activeView={view} accountName={session.account.name} roleLabel={session.account.roleLabel}
    year="" collapsed={collapsed} onCollapsedChange={setCollapsed} onSignOut={onSignOut}
    expanded={false} onExpandedChange={() => {}} onNavigate={(next) => {
      window.history.pushState(null, "", workspacePath(next)); setView(next);
    }}>
    {error ? <section className="lss-responsive-card" aria-labelledby="workspace-load-error">
      <h2 id="workspace-load-error" className="text-xl font-bold">Não foi possível abrir a aplicação</h2>
      <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      <div className="mt-5 flex flex-wrap gap-3"><Button variant="contained" onClick={onRetry}>Tentar novamente</Button><Button onClick={onSignOut}>Sair</Button></div>
    </section> : <WorkspacePlaceholder view={view} />}
  </WorkspaceShell>;
}

export function WorkspacePlaceholder({ view }: { view: WorkspaceView }) {
  return <section aria-busy="true" aria-label="A preparar o conteúdo" className="min-w-0">
    <p role="status" className="sr-only">A preparar o conteúdo…</p>
    {view === "overview" ? <div aria-hidden="true" className="grid gap-4">
      <Skeleton animation={false} variant="rounded" height={44} className="w-full max-w-xs" />
      <Skeleton animation={false} width="12rem" height={28} className="max-w-full" />
      <div className="grid max-w-[22rem] grid-cols-[8fr_7fr_6fr] gap-2">
        <Skeleton animation={false} variant="rounded" height={44} />
        <Skeleton animation={false} variant="rounded" height={44} />
        <Skeleton animation={false} variant="rounded" height={44} />
      </div>
    </div> : <div aria-hidden="true" className="grid gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <Skeleton animation={false} width="38%" height={32} />
        <Skeleton animation={false} variant="rounded" height={48} sx={{ mt: 2 }} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <Skeleton animation={false} width="28%" height={28} />
        {[0, 1, 2, 3].map((key) => <div key={key} className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0"><Skeleton animation={false} variant="circular" width={36} height={36} /><Skeleton animation={false} width="55%" height={28} /><Skeleton animation={false} width="16%" height={28} sx={{ ml: "auto" }} /></div>)}
      </div>
    </div>}
  </section>;
}
