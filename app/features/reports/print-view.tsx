"use client";
import { useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { formatCurrency, formatDateTime } from "../../components/school-admin-demo.model";
import type { ReportResult } from "./model";
import { reportColumns } from "./export";

export function PrintDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose(): void }) {
  const [error, setError] = useState("");
  return <Dialog open fullWidth maxWidth="lg" onClose={onClose} aria-labelledby="report-print-title"><DialogTitle id="report-print-title">{title}</DialogTitle><DialogContent dividers>{error && <Alert severity="error">{error}</Alert>}<article className="lss-report-print">{children}</article></DialogContent><DialogActions sx={{ flexWrap: "wrap" }}><Button onClick={onClose}>Fechar</Button><Button variant="contained" onClick={() => { try { window.print(); } catch { setError("Não foi possível abrir a impressão. O relatório mantém-se disponível para tentar novamente."); } }}>Imprimir / Guardar PDF</Button></DialogActions></Dialog>;
}
export function ReportPrint({ result }: { result: ReportResult }) {
  const columns = reportColumns(result.kind);
  return <><header className="mb-5"><h2 className="font-bold text-lg">{result.schoolName}</h2><h3 className="mt-2 font-bold">{result.title} · Relatório interno</h3><p className="mt-2 text-sm">{result.definition}</p><p className="mt-2 text-sm">{result.scope === "current" ? `Situação actual em ${result.schoolDate}` : ["overdue", "due"].includes(result.kind) ? `Situação em ${result.filters.to}` : `Período: ${result.filters.from} a ${result.filters.to}`}{result.scope !== "movements" ? ` · Ano ${result.filters.yearId || "Todos"}` : " · Todos os anos lectivos"}</p><p className="text-sm">Emitido em {formatDateTime(result.generatedAt)} · {result.count} registos</p>{(result.filters.classId || result.filters.groupId) && <p className="text-sm">Classe: {result.filterLabels.className} · Turma: {result.filterLabels.groupName}</p>}{result.scope === "movements" && <p className="text-sm">Forma: {result.filters.method || "Todas"} · Funcionário: {result.filterLabels.actorName}</p>}{result.filters.search && <p className="text-sm">Pesquisa: {result.filters.search}</p>}</header>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{columns.map((column) => <th className="border-b border-slate-300 p-2" key={column.key}>{column.label}</th>)}</tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}>{columns.map((column) => <td className="border-b border-slate-200 p-2 align-top" key={column.key}>{column.key === "amount" && result.unit === "money" ? formatCurrency(row.amount) : String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div><p className="mt-4 font-bold">Total: {result.unit === "money" ? formatCurrency(result.total) : result.total}</p></>;
}
