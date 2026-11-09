import { reportDefinitions, type ReportFilters } from "./model";
export type ReportSection = "reports" | "cash" | "proofs" | "continuity";
export const reportSections: ReportSection[] = ["reports", "cash", "proofs", "continuity"];
export function readReportFilters(value: unknown): Partial<ReportFilters> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>, result: Partial<ReportFilters> = {};
  for (const key of ["from", "to", "classId", "groupId", "method", "actorId", "search"] as const) if (typeof input[key] === "string") result[key] = input[key].slice(0, 500);
  if (typeof input.kind === "string" && Object.hasOwn(reportDefinitions, input.kind)) result.kind = input.kind as ReportFilters["kind"];
  return result;
}
export function reportFiltersFromUrl(params: URLSearchParams, fallback: Partial<ReportFilters>) {
  const map = { from: "from", to: "to", classId: "rclass", groupId: "rgroup", method: "method", actorId: "actor", kind: "report" } as const;
  const result = { ...fallback };
  for (const [key, parameter] of Object.entries(map)) if (params.has(parameter)) Object.assign(result, readReportFilters({ [key]: params.get(parameter) }));
  return result;
}
export function appendReportFilters(params: URLSearchParams, filters: Partial<ReportFilters>) {
  for (const [key, parameter] of Object.entries({ from: "from", to: "to", classId: "rclass", groupId: "rgroup", method: "method", actorId: "actor", kind: "report" })) {
    const value = filters[key as keyof ReportFilters]; if (value) params.set(parameter, value);
  }
}
