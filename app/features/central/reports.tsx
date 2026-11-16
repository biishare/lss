"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { FilterPanel } from "../../components/filter-panel";
import { PrintDialog } from "../reports/print-view";
import { apiRequest, issueMessage, requestPath, type Schema } from "./client";
import { DateField, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { dateLabel, methods, money, schoolDay, statuses } from "./format";
import { CashDesk } from "./cash";
import { Receipt } from "./receipts";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

type ReportKind = Schema<"SchoolReportPage">["kind"];
type ReportPage = Schema<"SchoolReportPage">;
type ReportRow = Schema<"SchoolReportRow">;
type Filters = { from?: string; to?: string; method?: keyof typeof methods; yearId?: string; classId?: string; groupId?: string };
type FilterDraft = { from: string; to: string; method: keyof typeof methods | ""; classId: string; groupId: string };

function defaultFilters(): FilterDraft {
  const today = schoolDay();
  return { from: today.slice(0, 7) + "-01", to: today, method: "", classId: "", groupId: "" };
}

function rowLabel(row: ReportRow) {
  return row.studentName ?? row.label ?? (row.date ? dateLabel(row.date) : row.permanentNumber ?? "Registo");
}

function valueOf(unit: ReportPage["unit"], row: ReportRow) {
  if (unit === "count") return row.quantity === undefined ? "—" : String(row.quantity);
  return row.amountCents == null ? "—" : money(row.amountCents);
}

function totalOf(page: ReportPage) {
  return page.unit === "cents" ? money(page.totalAmountCents ?? 0) : String(page.totalQuantity ?? 0);
}

export function Reports({ year, canWrite, openStudent }: {
  year?: Year; canWrite: boolean; openStudent(id: string): void;
}) {
  const [section, setSection] = useState<"reports" | "cash">("reports");
  const [kind, setKind] = useState<ReportKind>("receipts");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState(defaultFilters);
  const { from, to, method, classId, groupId } = applied;
  const [receipt, setReceipt] = useState<string>();
  const [print, setPrint] = useState<{ meta: ReportPage; rows: ReportRow[] }>();
  const [delivery, setDelivery] = useState<"csv" | "print">();
  const [issue, setIssue] = useState("");
  const catalog = useRemote(section === "reports" ? "reports" : null, signal => apiRequest("GET", "/api/v1/reports", { signal }));
  const detail = catalog.value?.items.find(item => item.kind === kind);
  const flags = new Set(detail?.filters);
  const filters: Filters = {
    ...(flags.has("from") && { from }), ...(flags.has("to") && { to }),
    ...(flags.has("method") && method && { method }),
    ...(flags.has("yearId") && year && { yearId: year.id }),
    ...(flags.has("classId") && classId && { classId }), ...(flags.has("groupId") && groupId && { groupId }),
  };
  const invalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const report = useRemote(detail && section === "reports" && !invalid ? JSON.stringify([kind, filters, page]) : null, signal =>
    apiRequest("GET", "/api/v1/reports/{kind}", { params: { kind }, query: { ...filters, page, limit: 30 }, signal }));
  const classes = useRemote(flags.has("classId") && year && section === "reports" ? year.id : null, signal =>
    apiRequest("GET", "/api/v1/classes", { query: { yearId: year?.id, page: 1, limit: 100 }, signal }));
  const groups = useRemote(flags.has("groupId") && year && section === "reports" ? year.id : null, signal =>
    apiRequest("GET", "/api/v1/groups", { query: { yearId: year?.id, page: 1, limit: 100 }, signal }));

  function applyFilters(next: FilterDraft) { setApplied(next); setPage(1); }

  async function exportReport(format: "csv" | "print") {
    if (delivery || !report.value) return;
    setIssue("");
    setDelivery(format);
    try {
      const limit = 100;
      const pages = Math.max(1, Math.ceil(report.value.total / limit));
      if (format === "print") {
        const rows: ReportRow[] = [];
        for (let number = 1; number <= pages; number += 1) {
          const result = await apiRequest("GET", "/api/v1/reports/{kind}", { params: { kind }, query: { ...filters, page: number, limit } });
          rows.push(...result.items);
        }
        setPrint({ meta: report.value, rows });
      } else {
        const parts: string[] = [];
        for (let number = 1; number <= pages; number += 1) {
          const url = requestPath("/api/v1/reports/{kind}", { kind }, { ...filters, page: number, limit, format: "csv" });
          const response = await fetch(url, { cache: "no-store", credentials: "same-origin", mode: "same-origin" });
          if (response.status === 401) {
            window.location.replace("/?sessao=expirada");
            return;
          }
          if (!response.ok || !response.headers.get("content-type")?.startsWith("text/csv")) {
            throw new Error("Não foi possível exportar o relatório. Tente novamente.");
          }
          const content = await response.text();
          parts.push(number === 1 ? content : content.slice(content.indexOf("\r\n") + 2));
        }
        const blob = new Blob(parts, { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "lss-" + kind + ".csv";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      setIssue(issueMessage(cause));
    } finally { setDelivery(undefined); }
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap gap-2">
      <Button variant={section === "reports" ? "contained" : "outlined"} onClick={() => setSection("reports")}>Relatórios</Button>
      <Button variant={section === "cash" ? "contained" : "outlined"} onClick={() => setSection("cash")}>Caixa</Button>
    </div>
    {section === "cash" ? <CashDesk canWrite={canWrite} /> : <>
      <section className="lss-responsive-card grid gap-4">
        <Heading title="Relatórios escolares" />
        <ResourceState {...catalog} retry={catalog.refresh} />
        {catalog.value && <>
          <Select label="Relatório" value={kind} onChange={(event) => { setKind(event.target.value as ReportKind); setPage(1); }}>
            {catalog.value.items.map(item => <option value={item.kind} key={item.kind}>{item.title}</option>)}
          </Select>
          {detail && <p className="text-sm text-slate-600">{detail.description}</p>}
          {flags.has("from") && <p className="text-xs text-slate-600">Período {dateLabel(from)} a {dateLabel(to)}</p>}
          {(flags.has("from") || flags.has("method") || classes.value || groups.value) &&
            <FilterPanel title="Filtros do relatório" value={applied} clear={defaultFilters} apply={applyFilters}
              validate={draft => flags.has("from") && (!draft.from || !draft.to || draft.from > draft.to)
                ? "Escolha um intervalo ordenado de datas." : ""}
              active={[
                ...(flags.has("method") && method ? [{ key: "method", label: methods[method], remove: () => applyFilters({ ...applied, method: "" }) }] : []),
                ...(flags.has("classId") && classId ? [{ key: "class", label: classes.value?.items.find(item => item.id === classId)?.name ?? "Classe", remove: () => applyFilters({ ...applied, classId: "", groupId: "" }) }] : []),
                ...(flags.has("groupId") && groupId ? [{ key: "group", label: groups.value?.items.find(item => item.id === groupId)?.name ?? "Turma", remove: () => applyFilters({ ...applied, groupId: "" }) }] : []),
              ]}>
              {(draft, change) => <>
                {flags.has("from") && <DateField label="De" value={draft.from} required onChange={event => change({ ...draft, from: event.target.value })} />}
                {flags.has("to") && <DateField label="Até" value={draft.to} required onChange={event => change({ ...draft, to: event.target.value })} />}
                {flags.has("method") && <Select label="Meio de pagamento" value={draft.method}
                  onChange={event => change({ ...draft, method: event.target.value as FilterDraft["method"] })}>
                  <option value="">Todos</option>{Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>}
                {classes.value && <Select label="Classe" value={draft.classId}
                  onChange={event => change({ ...draft, classId: event.target.value, groupId: "" })}>
                  <option value="">Todas</option>{classes.value.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>}
                {groups.value && <Select label="Turma" value={draft.groupId}
                  onChange={event => change({ ...draft, groupId: event.target.value })}>
                  <option value="">Todas</option>{groups.value.items.filter(item => !draft.classId || item.classId === draft.classId)
                    .map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>}
              </>}
            </FilterPanel>}
        </>}
        {invalid && <Alert severity="error">Escolha um intervalo com a data final igual ou posterior à inicial.</Alert>}
        {issue && <Alert severity="error">{issue}</Alert>}
      </section>
      <ResourceState {...report} retry={report.refresh} />
      {report.value && <section className="lss-responsive-card grid gap-3" data-wide="true">
        <Heading title={report.value.title} detail={report.value.total + (report.value.total === 1 ? " registo" : " registos") + " · Total " + totalOf(report.value)}
          action={<div className="flex flex-wrap gap-2">
            <Button variant="outlined" onClick={() => exportReport("csv")} disabled={Boolean(delivery)}>Exportar CSV</Button>
            <Button variant="outlined" onClick={() => exportReport("print")} disabled={Boolean(delivery)}>Imprimir / PDF</Button>
          </div>} />
        {delivery && <p role="status" className="text-sm">A preparar o relatório…</p>}
        <RecordList rows={report.value.items} empty="Sem registos para os filtros seleccionados." render={row => <>
          <div><strong>{rowLabel(row)}</strong><p className="text-sm text-slate-600">
            {[row.date && dateLabel(row.date), row.competence, row.status && (statuses[row.status] ?? row.status)].filter(Boolean).join(" · ")}
          </p></div>
          <div className="flex flex-wrap items-center gap-2">
            <strong>{valueOf(report.value!.unit, row)}</strong>
            {row.studentId && <Button onClick={() => openStudent(row.studentId!)}>Ficha</Button>}
            {row.receiptId && <Button onClick={() => setReceipt(row.receiptId ?? undefined)}>Recibo</Button>}
          </div>
        </>} />
        <Paging {...report.value} change={setPage} />
      </section>}
    </>}
    {receipt && <Receipt id={receipt} close={() => setReceipt(undefined)} />}
    {print && <PrintDialog title="Prévia do relatório" onClose={() => setPrint(undefined)}>
      <h2 className="text-lg font-bold">{print.meta.schoolName}</h2>
      <p>{print.meta.title} · {dateLabel(print.meta.schoolDate)} · Total {totalOf(print.meta)}</p>
      <table className="mt-4 w-full text-left text-sm"><thead><tr><th>Registo</th><th>Data</th><th>Valor</th></tr></thead>
        <tbody>{print.rows.map((row) => <tr key={row.id}><td>{rowLabel(row)}</td><td>{dateLabel(row.date)}</td>
          <td>{valueOf(print.meta.unit, row)}</td></tr>)}</tbody>
      </table>
    </PrintDialog>}
  </div>;
}
