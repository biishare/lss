import type { PaymentAlertFilter, PaymentWorkspaceSection, WorkspaceView } from "../../components/school-admin-demo.model";

export const workspaceContextKey = "lss-demo-workspace-v1";

export type WorkspaceContext = {
  paymentPeriod?: "month" | "term" | "year";
  yearId: string;
  personId: string;
  studentTab: string;
  studentPage: number;
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
  return { view, yearId: "", personId: "", studentTab: "Dados", studentPage: 0, classId: "", groupId: "", month: "", paymentSection: "entry", alertFilter: "all", search: "", selectedStudentIds: [] };
}

export function readWorkspaceContext(raw: string | null, datasetId: string): Partial<WorkspaceContext> {
  try {
    const stored = JSON.parse(raw ?? "null");
    if (stored?.datasetId !== datasetId || !stored.context || typeof stored.context !== "object") return {};
    const context = stored.context;
    return {
      yearId: typeof context.yearId === "string" ? context.yearId : "",
      personId: typeof context.personId === "string" ? context.personId : "",
      studentTab: ["Dados", "Matrículas", "Financeiro", "Comprovativos", "Histórico"].includes(context.studentTab) ? context.studentTab : "Dados",
      studentPage: Number.isInteger(context.studentPage) && context.studentPage >= 0 && context.studentPage < 10000 ? context.studentPage : 0,
      classId: typeof context.classId === "string" ? context.classId : "",
      groupId: typeof context.groupId === "string" ? context.groupId : "",
      month: typeof context.month === "string" ? context.month : "",
      paymentPeriod: ["month", "term", "year"].includes(context.paymentPeriod) ? context.paymentPeriod : "year",
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
    yearId: params.get("year") ?? fallback.yearId,
    personId: params.get("student") ?? fallback.personId,
    studentTab: ["Dados", "Matrículas", "Financeiro", "Comprovativos", "Histórico"].includes(params.get("tab") ?? "") ? params.get("tab")! : fallback.studentTab,
    studentPage: params.has("page") && /^\d{1,4}$/.test(params.get("page")!) ? Number(params.get("page")) : fallback.studentPage,
    classId: params.get("class") ?? fallback.classId,
    groupId: params.get("group") ?? fallback.groupId,
    month: params.get("month") ?? fallback.month,
    paymentPeriod: ["month", "term", "year"].includes(params.get("period") ?? "") ? params.get("period") as "month" | "term" | "year" : fallback.paymentPeriod ?? "year",
    paymentSection: sections.includes(section) ? section : fallback.paymentSection,
    alertFilter: alerts.includes(alert) ? alert : fallback.alertFilter,
  };
}

export function validateWorkspaceContext(context: WorkspaceContext, data: {
  classes: Array<{ id: string; academicYear?: string }>;
  groups: Array<{ id: string; classId: string }>;
  students: Array<{ id: string; groupId: string }>;
  months: string[];
  years?: Array<{ id: string; billingMonths: string[] }>;
  defaultYearId?: string;
  people?: Array<{ id: string }>;
}): WorkspaceContext {
  const yearId = data.years?.some((item) => item.id === context.yearId) ? context.yearId : data.years?.some((item) => item.id === data.defaultYearId) ? data.defaultYearId! : data.years?.[0]?.id ?? context.yearId;
  const eligibleClasses = data.classes.filter((item) => !yearId || !item.academicYear || item.academicYear === yearId);
  const months = data.years?.find((item) => item.id === yearId)?.billingMonths ?? data.months;
  const group = data.groups.find((group) => group.id === context.groupId);
  const classId = eligibleClasses.find((item) => item.id === context.classId)?.id
    ?? (group && eligibleClasses.some((item) => item.id === group.classId) ? group.classId : eligibleClasses[0]?.id) ?? "";
  const groupId = (group?.classId === classId ? group.id : data.groups.find((group) => group.classId === classId)?.id) ?? "";
  return {
    ...context, yearId, classId, groupId,
    personId: data.people && !data.people.some((item) => item.id === context.personId) ? "" : context.personId,
    month: months.includes(context.month) ? context.month : months[0] ?? "",
    selectedStudentIds: [...new Set(context.selectedStudentIds)].filter((id) => data.students.some((student) => student.id === id && student.groupId === groupId)),
  };
}

export function workspaceUrl(context: WorkspaceContext, year: string): string {
  const params = new URLSearchParams();
  if (academicViews.includes(context.view) && context.view !== "enrollments") params.set("view", context.view);
  if (context.yearId || year) params.set("year", context.yearId || year);
  if (context.personId && academicViews.includes(context.view)) {
    params.set("student", context.personId);
    if (context.studentTab !== "Dados") params.set("tab", context.studentTab);
  }
  if (context.view === "enrollments" && context.studentPage > 0) params.set("page", String(context.studentPage));
  if (context.classId) params.set("class", context.classId);
  if (context.groupId) params.set("group", context.groupId);
  if (context.month) params.set("month", context.month);
  if (context.view === "payments") {
    if (context.paymentPeriod && context.paymentPeriod !== "year") params.set("period", context.paymentPeriod);
    params.set("section", context.paymentSection);
    if (context.alertFilter !== "all") params.set("alert", context.alertFilter);
  }
  // Pesquisa e contactos nunca entram no URL.
  const query = params.toString();
  return `${workspacePaths[context.view]}${query ? `?${query}` : ""}`;
}
