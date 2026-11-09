"use client";

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DemoEntry } from "./demo-entry";
import { WorkspaceStartup } from "./workspace-startup";
import { demoSessionFor, demoSessionKey, readDemoSession, saveDemoSession, type DemoSession } from "../features/demo/demo-session";
import { entryDestination } from "../lib/workspace-navigation";
import type { WorkspaceView } from "./school-admin-demo.model";

// This module is the public entry. Neither importing it nor rendering the login
// reads/initializes the school repository or downloads the school workspace.
const SchoolAdminWorkspace = lazy(() => import("./school-admin-demo").then((module) => ({ default: module.SchoolAdminWorkspace })));

class WorkspaceLoadBoundary extends Component<{
  children: ReactNode;
  session: DemoSession;
  initialView: WorkspaceView;
  onSignOut(): void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <WorkspaceStartup session={this.props.session} initialView={this.props.initialView}
          onSignOut={this.props.onSignOut} error="Não foi possível abrir a aplicação. Tente novamente."
          onRetry={() => window.location.reload()} />
      : this.props.children;
  }
}

export function WorkspaceEntry({ initialView = "overview", developerToolsEnabled }: {
  initialView?: WorkspaceView;
  developerToolsEnabled?: boolean;
}) {
  // The initial render is the same on the server and client: a complete login.
  const [session, setSession] = useState<DemoSession | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const userChoseSession = useRef(false);

  const openWorkspace = useCallback((next: DemoSession) => {
    const destination = entryDestination(window.location.pathname, window.location.search, initialView);
    if (`${window.location.pathname}${window.location.search}` !== destination) {
      window.history.replaceState(null, "", destination);
    }
    setSession(next);
  }, [initialView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (userChoseSession.current) return;
      try {
        const saved = readDemoSession(window.sessionStorage);
        if (saved) openWorkspace(saved);
      } catch { /* Storage may be blocked. The public login stays usable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openWorkspace]);

  function enter(accountId: string) {
    const next = demoSessionFor(accountId);
    if (!next) return;
    userChoseSession.current = true;
    setSessionNotice("");
    try { saveDemoSession(window.sessionStorage, next); }
    catch { setSessionNotice("A sessão não pôde ser guardada. Ao recarregar, será necessário entrar novamente."); }
    openWorkspace(next);
  }

  function signOut() {
    userChoseSession.current = true;
    try { window.sessionStorage.removeItem(demoSessionKey); } catch { /* Leaving stays available. */ }
    setSession(null);
    setSessionNotice("");
    window.history.replaceState(null, "", "/");
  }

  if (!session) return <DemoEntry onEnter={enter} />;

  return <WorkspaceLoadBoundary key={session.account.id} session={session} initialView={initialView} onSignOut={signOut}>
    <Suspense fallback={<WorkspaceStartup session={session} initialView={initialView} onSignOut={signOut} />}>
      <SchoolAdminWorkspace session={session} onSignOut={signOut} sessionNotice={sessionNotice}
        initialView={initialView} developerToolsEnabled={developerToolsEnabled} />
    </Suspense>
  </WorkspaceLoadBoundary>;
}
