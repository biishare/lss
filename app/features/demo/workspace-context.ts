import { appendReportFilters, readReportFilters, reportFiltersFromUrl, reportSections, type ReportSection } from "../reports/context";
import type { ReportFilters } from "../reports/model";
import type { PaymentAlertFilter, PaymentWorkspaceSection, WorkspaceView } from "../../components/school-admin-demo.model";

export const workspaceContextKey = "lss-demo-workspace-v1";

export type WorkspaceContext = {
  reportSection?: ReportSection;
  reportFilters?: Partial<ReportFilters>;
  reportPage?: number;
  paymentPeriod?: "month" | "term" | "year";
  paymentDisplay?: "list" | "sheet";
  yearId: string;
  personId: string;
  studentTab: string;
  studentPage: number;
  studentClassId?: string;
  studentGroupId?: string;
  studentStatus?: string;
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
      reportSection: reportSections.includes(context.reportSection) ? context.reportSection : "reports",
      reportFilters: readReportFilters(context.reportFilters),
      reportPage: Number.isInteger(context.reportPage) && context.reportPage >= 0 ? context.reportPage : 0,
      yearId: typeof context.yearId === "string" ? context.yearId : "",
      studentClassId: typeof context.studentClassId === "string" ? context.studentClassId : "",
      studentGroupId: typeof context.studentGroupId === "string" ? context.studentGroupId : "",
      studentStatus: ["active", "withdrawn", "completed", "cancelled", "unregistered"].includes(context.studentStatus) ? context.studentStatus : "",
      personId: typeof context.personId === "string" ? context.personId : "",
      studentTab: ["Dados", "Matrículas", "Financeiro", "Comprovativos", "Histórico"].includes(context.studentTab) ? context.studentTab : "Dados",
      studentPage: Number.isInteger(context.studentPage) && context.studentPage >= 0 && context.studentPage < 10000 ? context.studentPage : 0,
      classId: typeof context.classId === "string" ? context.classId : "",
      groupId: typeof context.groupId === "string" ? context.groupId : "",
      month: typeof context.month === "string" ? context.month : "",
      paymentPeriod: ["month", "term", "year"].includes(context.paymentPeriod) ? context.paymentPeriod : undefined,
      paymentDisplay: ["list", "sheet"].includes(context.paymentDisplay) ? context.paymentDisplay : undefined,
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
    reportSection: reportSections.includes(params.get("rsection") as ReportSection) ? params.get("rsection") as ReportSection : fallback.reportSection ?? "reports",
    reportFilters: reportFiltersFromUrl(params, fallback.reportFilters ?? {}),
    reportPage: params.has("rpage") && /^\d{1,4}$/.test(params.get("rpage")!) ? Number(params.get("rpage")) : fallback.reportPage ?? 0,
    yearId: params.get("year") ?? fallback.yearId,
    studentClassId: params.get("aclass") ?? (params.has("year") ? "" : fallback.studentClassId ?? ""),
    studentGroupId: params.get("agroup") ?? (params.has("year") ? "" : fallback.studentGroupId ?? ""),
    studentStatus: ["active", "withdrawn", "completed", "cancelled", "unregistered"].includes(params.get("astatus") ?? "") ? params.get("astatus")! : params.has("year") ? "" : fallback.studentStatus ?? "",
    personId: params.get("student") ?? fallback.personId,
    studentTab: ["Dados", "Matrículas", "Financeiro", "Comprovativos", "Histórico"].includes(params.get("tab") ?? "") ? params.get("tab")! : fallback.studentTab,
    studentPage: params.has("page") && /^\d{1,4}$/.test(params.get("page")!) ? Number(params.get("page")) : fallback.studentPage,
    classId: params.get("class") ?? fallback.classId,
    groupId: params.get("group") ?? fallback.groupId,
    month: params.get("month") ?? fallback.month,
    paymentPeriod: ["month", "term", "year"].includes(params.get("period") ?? "") ? params.get("period") as "month" | "term" | "year" : params.has("year") ? undefined : fallback.paymentPeriod,
    paymentDisplay: ["list", "sheet"].includes(params.get("layout") ?? "") ? params.get("layout") as "list" | "sheet" : params.has("year") ? undefined : fallback.paymentDisplay,
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
  defaultMonth?: string;
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
    studentClassId: eligibleClasses.some((item) => item.id === context.studentClassId) ? context.studentClassId : "",
    studentGroupId: data.groups.some((item) => item.id === context.studentGroupId && eligibleClasses.some((schoolClass) => schoolClass.id === item.classId) && (!context.studentClassId || item.classId === context.studentClassId)) ? context.studentGroupId : "",
    personId: data.people && !data.people.some((item) => item.id === context.personId) ? "" : context.personId,
    month: months.includes(context.month) ? context.month : yearId === data.defaultYearId && data.defaultMonth && months.includes(data.defaultMonth) ? data.defaultMonth : months[0] ?? "",
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
  if (academicViews.includes(context.view)) {
    if (context.studentClassId) params.set("aclass", context.studentClassId);
    if (context.studentGroupId) params.set("agroup", context.studentGroupId);
    if (context.studentStatus) params.set("astatus", context.studentStatus);
  }
  if (context.view === "enrollments" && context.studentPage > 0) params.set("page", String(context.studentPage));
  if (context.classId) params.set("class", context.classId);
  if (context.groupId) params.set("group", context.groupId);
  if (context.month) params.set("month", context.month);
  if (context.view === "payments") {
    if (context.paymentPeriod) params.set("period", context.paymentPeriod);
    if (context.paymentDisplay) params.set("layout", context.paymentDisplay);
    params.set("section", context.paymentSection);
    if (context.alertFilter !== "all") params.set("alert", context.alertFilter);
  }
  if (context.view === "reports" || (context.view === "payments" && context.paymentSection === "reports")) {
    if (context.reportSection && context.reportSection !== "reports") params.set("rsection", context.reportSection);
    if (context.reportPage) params.set("rpage", String(context.reportPage));
    appendReportFilters(params, context.reportFilters ?? {});
  }
  // Pesquisa e contactos nunca entram no URL.
  const query = params.toString();
  return `${workspacePaths[context.view]}${query ? `?${query}` : ""}`;
}
