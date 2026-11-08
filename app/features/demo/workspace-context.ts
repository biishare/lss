import type { PaymentAlertFilter, PaymentWorkspaceSection, WorkspaceView } from "../../components/school-admin-demo.model";

export const workspaceContextKey = "lss-demo-workspace-v1";

export type WorkspaceContext = {
  view: WorkspaceView;
  classId: string;
  groupId: string;
  month: string;
  paymentSection: PaymentWorkspaceSection;
  alertFilter: PaymentAlertFilter;
  search: string;
  selectedStudentIds: string[];
};

export const workspacePaths: Record<WorkspaceView, string> = {
  overview: "/dashboard", enrollments: "/students", groups: "/students",
  classes: "/students", rooms: "/students", payments: "/payments",
  reports: "/reports", catalog: "/settings",
};
const academicViews: WorkspaceView[] = ["classes", "rooms", "groups", "enrollments"];
const sections: PaymentWorkspaceSection[] = ["settings", "student-rules", "entry", "reports"];
const alerts: PaymentAlertFilter[] = ["all", "registration", "overdue", "first-fine", "second-fine", "debt", "rules-ending"];

export function defaultWorkspaceContext(view: WorkspaceView = "overview"): WorkspaceContext {
  return { view, classId: "", groupId: "", month: "", paymentSection: "entry", alertFilter: "all", search: "", selectedStudentIds: [] };
}

export function readWorkspaceContext(raw: string | null, datasetId: string): Partial<WorkspaceContext> {
  try {
    const stored = JSON.parse(raw ?? "null");
    if (stored?.datasetId !== datasetId || !stored.context || typeof stored.context !== "object") return {};
    const context = stored.context;
    return {
      classId: typeof context.classId === "string" ? context.classId : "",
      groupId: typeof context.groupId === "string" ? context.groupId : "",
      month: typeof context.month === "string" ? context.month : "",
      paymentSection: sections.includes(context.paymentSection) ? context.paymentSection : "entry",
      alertFilter: alerts.includes(context.alertFilter) ? context.alertFilter : "all",
      search: typeof context.search === "string" ? context.search.slice(0, 500) : "",
      selectedStudentIds: Array.isArray(context.selectedStudentIds)
        ? context.selectedStudentIds.filter((id: unknown) => typeof id === "string").slice(0, 2000) : [],
    };
  } catch { return {}; }
}

export function contextFromLocation(path: string, query: string, fallback: WorkspaceContext): WorkspaceContext {
  const params = new URLSearchParams(query);
  const view = path === "/students"
    ? academicViews.find((view) => view === params.get("view")) ?? "enrollments"
    : (Object.keys(workspacePaths) as WorkspaceView[]).find((view) => workspacePaths[view] === path) ?? "overview";
  const section = params.get("section") as PaymentWorkspaceSection;
  const alert = params.get("alert") as PaymentAlertFilter;
  return {
    ...fallback, view,
    classId: params.get("class") ?? fallback.classId,
    groupId: params.get("group") ?? fallback.groupId,
    month: params.get("month") ?? fallback.month,
    paymentSection: sections.includes(section) ? section : fallback.paymentSection,
    alertFilter: alerts.includes(alert) ? alert : fallback.alertFilter,
  };
}

export function validateWorkspaceContext(context: WorkspaceContext, data: {
  classes: Array<{ id: string }>;
  groups: Array<{ id: string; classId: string }>;
  students: Array<{ id: string; groupId: string }>;
  months: string[];
}): WorkspaceContext {
  const group = data.groups.find((group) => group.id === context.groupId);
  const classId = data.classes.find((item) => item.id === context.classId)?.id
    ?? (group && data.classes.some((item) => item.id === group.classId) ? group.classId : data.classes[0]?.id) ?? "";
  const groupId = (group?.classId === classId ? group.id : data.groups.find((group) => group.classId === classId)?.id) ?? "";
  return {
    ...context, classId, groupId,
    month: data.months.includes(context.month) ? context.month : data.months[0] ?? "",
    selectedStudentIds: [...new Set(context.selectedStudentIds)].filter((id) => data.students.some((student) => student.id === id && student.groupId === groupId)),
  };
}

export function workspaceUrl(context: WorkspaceContext, year: string): string {
  const params = new URLSearchParams();
  if (academicViews.includes(context.view) && context.view !== "enrollments") params.set("view", context.view);
  if (year) params.set("year", year);
  if (context.classId) params.set("class", context.classId);
  if (context.groupId) params.set("group", context.groupId);
  if (context.month) params.set("month", context.month);
  if (context.view === "payments") {
    params.set("section", context.paymentSection);
    if (context.alertFilter !== "all") params.set("alert", context.alertFilter);
  }
  // Pesquisa e contactos nunca entram no URL.
  const query = params.toString();
  return `${workspacePaths[context.view]}${query ? `?${query}` : ""}`;
}
