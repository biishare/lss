import type { ProfileId, WorkspaceView } from "../components/school-admin-demo.model";

// Public presentation metadata: importing the login or shell must not load the school dataset.
export const institutionName = "Liceu São Silvestre";
export const institutionLogoText = "LSS";
export const sidebarPreferenceKey = "lss-demo-sidebar-collapsed";

export const workspaceNavigation: Array<{
  id: WorkspaceView;
  label: string;
  href: string;
  profiles: ProfileId[];
}> = [
  { id: "overview", label: "Início", href: "/dashboard", profiles: ["director", "secretaria"] },
  { id: "enrollments", label: "Alunos e turmas", href: "/students", profiles: ["director", "secretaria"] },
  { id: "payments", label: "Pagamentos", href: "/payments", profiles: ["director", "secretaria"] },
  { id: "reports", label: "Relatórios", href: "/reports", profiles: ["director", "secretaria"] },
  { id: "catalog", label: "Configurações", href: "/settings", profiles: ["director", "secretaria"] },
];

export function workspacePath(view: WorkspaceView) {
  return workspaceNavigation.find((item) => item.id === view)?.href ?? "/students";
}

export function workspaceView(path: string): WorkspaceView {
  return workspaceNavigation.find((item) => item.href === path)?.id ?? "overview";
}

const contextParameters = new Set([
  "year", "student", "tab", "page", "view", "class", "group", "month", "period", "section", "alert",
  "layout", "aclass", "agroup", "astatus",
  "rsection", "rpage", "from", "to", "rclass", "rgroup", "method", "actor", "report",
]);

// Only known internal paths and non-search context survive entry. Entity IDs are
// validated against the dataset later, without reading school data before login.
export function entryDestination(path: string, search: string, initialView: WorkspaceView = "overview") {
  const destination = workspaceNavigation.some((item) => item.href === path) ? path : workspacePath(initialView);
  const query = new URLSearchParams();
  if (path === "/" && ["classes", "rooms", "groups"].includes(initialView)) query.set("view", initialView);
  for (const [key, value] of new URLSearchParams(search)) {
    if (contextParameters.has(key) && value.length <= 500) query.set(key, value);
  }
  return `${destination}${query.size ? `?${query}` : ""}`;
}
