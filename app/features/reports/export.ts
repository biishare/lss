import type { ReportResult, ReportRow } from "./model";
export const reportColumns = (kind: ReportResult["kind"]): Array<{ key: keyof ReportRow; label: string }> => kind === "occupancy" ? [
  { key: "name", label: "Turma" }, { key: "label", label: "Classe" }, { key: "yearId", label: "Ano" }, { key: "capacity", label: "Capacidade" }, { key: "occupied", label: "Ocupados" }, { key: "amount", label: "Vagas" }, { key: "status", label: "Estado" },
] : [
  { key: "name", label: "Aluno" }, { key: "number", label: "Número" }, { key: "yearId", label: "Ano" }, { key: "label", label: "Item" },
  { key: "date", label: kind === "allocations" || kind === "benefits" ? "Competência" : "Data efectiva / Prazo" },
  ...(kind === "allocations" ? [{ key: "applicationDate" as const, label: "Data de aplicação" }, { key: "originYear" as const, label: "Ano de origem" }] : []),
  ...(["overdue", "due"].includes(kind) ? [{ key: "principal" as const, label: "Principal (MT)" }, { key: "penalty" as const, label: "Multas (MT)" }] : []),
  { key: "amount", label: kind === "enrollments" ? "Matrículas" : "Valor (MT)" },
  ...(["receipts", "refunds", "allocations"].includes(kind) ? [{ key: "method" as const, label: "Forma" }, { key: "actorName" as const, label: "Funcionário" }] : []),
  { key: "status", label: "Estado" }, { key: "sourceId", label: "Origem" },
];
function csvCell(value: unknown): string {
  const input = typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value ?? "");
  const safe = typeof value !== "number" && /^[\s]*[=+\-@\t\r]/.test(input) ? `'${input}` : input;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvTable(headers: string[], rows: unknown[][]) {
  return "\uFEFF" + [headers.map(csvCell).join(";"), ...rows.map((row) => row.map(csvCell).join(";"))].join("\r\n");
}
export function reportCsv(result: ReportResult) {
  const columns = reportColumns(result.kind);
  const lines = [columns.map((column) => csvCell(column.label)).join(";"),
    ...result.rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(";")),
    columns.map((column, index) => csvCell(column.key === "amount" ? result.total : index === 0 ? "Total" : "")).join(";")];
  return "\uFEFF" + lines.join("\r\n");
}
export function downloadText(name: string, content: string, type: string) {
  const blob = new Blob([content], { type }), url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
