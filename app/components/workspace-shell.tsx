"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { institutionName, sidebarPreferenceKey, workspaceNavigation } from "../lib/workspace-navigation";
import type { WorkspaceView } from "./school-admin-demo.model";
import type { DemoSession } from "../features/demo/demo-session";

type ShellProps = {
  children: ReactNode;
  institutionLabel?: string;
  activeView: WorkspaceView;
  accountName: string;
  roleLabel: string;
  year: string;
  collapsed: boolean;
  onCollapsedChange(collapsed: boolean): void;
  onNavigate(view: WorkspaceView): void;
  onSignOut(): void;
  expandable?: boolean;
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
};

const ShellConfiguration = createContext<((props: ShellProps) => void) | null>(null);
const displayKeys = ["institutionLabel", "activeView", "accountName", "roleLabel", "year", "collapsed", "expandable", "expanded"] as const;

// Own the actual shell above Suspense: loading the workspace replaces only its
// content, keeping the Drawer, its DOM trigger and focus alive across loading.
export function WorkspaceFrame({ session, initialView, onSignOut, children }: {
  session: DemoSession; initialView: WorkspaceView; onSignOut(): void; children: ReactNode;
}) {
  const [configuration, setConfiguration] = useState<ShellProps>(() => ({
    children: null, activeView: initialView, accountName: session.account.name,
    roleLabel: session.account.roleLabel, year: "", collapsed: false, expanded: false,
    onCollapsedChange() {}, onNavigate() {}, onExpandedChange() {}, onSignOut,
  }));
  const handlers = useRef(configuration);
  const configure = useCallback((next: ShellProps) => {
    handlers.current = next;
    setConfiguration((previous) => displayKeys.some((key) => previous[key] !== next[key])
      ? { ...next, children: null } : previous);
  }, []);
  return <ShellConfiguration.Provider value={configure}>
    <WorkspaceShellView {...configuration}
      onNavigate={(view) => handlers.current.onNavigate(view)}
      onSignOut={() => handlers.current.onSignOut()}
      onCollapsedChange={(value) => {
        // A choice made while the workspace chunk is loading must also be seen
        // by its later preference restoration. Do not defer this user action.
        try { window.localStorage.setItem(sidebarPreferenceKey, String(value)); } catch { /* Optional preference. */ }
        handlers.current.onCollapsedChange(value);
      }}
      onExpandedChange={(value) => handlers.current.onExpandedChange(value)}>
      {children}
    </WorkspaceShellView>
  </ShellConfiguration.Provider>;
}

export function WorkspaceShell(props: ShellProps) {
  const configure = useContext(ShellConfiguration);
  return configure ? <ShellContent configure={configure} shell={props} /> : <WorkspaceShellView {...props} />;
}

function ShellContent({ configure, shell }: { configure(props: ShellProps): void; shell: ShellProps }) {
  useLayoutEffect(() => { configure(shell); }, [configure, shell]);
  return shell.children;
}

function NavigationIcon({ view }: { view: WorkspaceView | "menu" | "close" | "collapse" | "expand" | "signout" }) {
  const paths: Partial<Record<typeof view, ReactNode>> = {
    overview: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/></>,
    enrollments: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/></>,
    payments: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/></>,
    reports: <><path d="M5 3h10l4 4v14H5zM9 17v-4m3 4v-7m3 7v-2"/></>,
    catalog: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    collapse: <path d="m14 6-6 6 6 6"/>,
    expand: <path d="m10 6 6 6-6 6"/>,
    signout: <><path d="M10 4H4v16h6M9 12h12m-5-5 5 5-5 5"/></>,
  };
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[view]}</svg>;
}

function WorkspaceShellView({
  children, activeView, accountName, roleLabel, year, collapsed, onCollapsedChange,
  onNavigate, onSignOut, expandable = false, expanded, onExpandedChange,
  institutionLabel = institutionName,
}: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktop = useMediaQuery("(min-width:1200px)", { noSsr: true });
  const tablet = useMediaQuery("(min-width:768px)", { noSsr: true });
  const previousViewport = useRef({ desktop, tablet });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeArea = ["classes", "rooms", "groups"].includes(activeView) ? "enrollments" : activeView;
  const title = workspaceNavigation.find((item) => item.id === activeArea)?.label ?? "Início";
  const compact = !desktop || collapsed;

  useEffect(() => {
    const previous = previousViewport.current;
    if (previous.desktop === desktop && previous.tablet === tablet) return;
    previousViewport.current = { desktop, tablet };
    const timer = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [desktop, tablet]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      // Um diálogo aberto trata o seu Escape; a vista permanece expandida.
      const openDialog = [...document.querySelectorAll('[role="dialog"]')].some((dialog) => !dialog.closest('[aria-hidden="true"]'));
      if (event.key === "Escape" && !openDialog) onExpandedChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onExpandedChange]);

  function navigate(view: WorkspaceView) {
    setDrawerOpen(false);
    onExpandedChange(false);
    onNavigate(view);
  }
  function navigation(compactMode: boolean) {
    return (
      <nav aria-label="Áreas do LSS" className="grid gap-1">
        {workspaceNavigation.map((item) => (
          <Tooltip key={item.id} title={compactMode ? item.label : ""} placement="right" arrow>
            <Button
              onClick={() => navigate(item.id)} aria-label={item.label}
              aria-current={activeArea === item.id ? "page" : undefined}
              className="lss-navigation-item" data-active={activeArea === item.id}
              data-compact={compactMode}
              sx={{ justifyContent: compactMode ? "center" : "flex-start", minWidth: 44, gap: 1.5, color: "inherit", px: compactMode ? 0 : 1.5 }}
            >
              <NavigationIcon view={item.id}/>
              <span className={compactMode ? "sr-only" : ""}>{item.label}</span>
            </Button>
          </Tooltip>
        ))}
      </nav>
    );
  }
  return (
    <div className="lss-workspace min-h-dvh bg-slate-50 text-slate-950" data-expanded={expanded}>
      <a href="#workspace-content" className="lss-skip-link">Saltar para o conteúdo</a>
      <header className="lss-workspace-topbar">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!expanded && <IconButton ref={triggerRef} className="lss-mobile-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls={drawerOpen ? "workspace-menu" : undefined}><NavigationIcon view="menu"/></IconButton>}
          <span className="lss-brand-mark" aria-hidden="true">LSS</span>
          <div className="min-w-0">
            <p className="lss-institution-label">{institutionLabel}</p>
            <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {year && <span aria-label={`Ano lectivo ${year}`} className="text-xs font-semibold text-slate-600">{year}</span>}
          <div className="lss-account-label text-right text-sm"><p className="font-semibold">{accountName}</p><p className="text-xs text-slate-500">{roleLabel}</p></div>
          <Tooltip title="Sair" arrow><IconButton onClick={onSignOut} aria-label="Sair"><NavigationIcon view="signout"/></IconButton></Tooltip>
        </div>
      </header>

      <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { id: "workspace-menu", role: "dialog", "aria-modal": true, "aria-labelledby": "workspace-menu-title", sx: { width: "min(288px, calc(100vw - 48px))", p: 2 } } }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="workspace-menu-title" className="font-bold">Navegação</h2>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Fechar menu"><NavigationIcon view="close"/></IconButton>
        </div>
        {navigation(false)}
        <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-600">{accountName} · {roleLabel}</p>
      </Drawer>

      <div className="lss-shell-grid" data-collapsed={collapsed}>
        <aside className="lss-workspace-sidebar" aria-label="Navegação principal">
          {navigation(compact)}
          <Tooltip title={compact ? "Expandir menu" : "Recolher menu"} placement="right">
            <IconButton aria-label={compact ? "Expandir menu" : "Recolher menu"} className="lss-sidebar-toggle"
              onClick={(event) => {
                if (desktop) onCollapsedChange(!collapsed);
                else { triggerRef.current = event.currentTarget; setDrawerOpen(true); }
              }}>
              <NavigationIcon view={compact ? "expand" : "collapse"}/>
            </IconButton>
          </Tooltip>
        </aside>
        <main id="workspace-content" tabIndex={-1} className="lss-workspace-content">
          {expandable && <div className="lss-expansion-toolbar">
            {expanded && <p className="text-sm text-slate-600">Planilha · {year}</p>}
            <Button variant="outlined" onClick={() => onExpandedChange(!expanded)}>{expanded ? "Sair da vista expandida" : "Expandir planilha"}</Button>
          </div>}
          {children}
        </main>
      </div>
    </div>
  );
}
