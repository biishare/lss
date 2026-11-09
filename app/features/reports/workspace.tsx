"use client";
import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { FilterPanel, type ActiveFilter } from "../../components/filter-panel";
import { TaskSurface } from "../../components/task-surface";
import type { DemoState } from "../demo/demo-state";
import type { DemoRepository } from "../demo/local-repository";
import type { WorkspaceContext } from "../demo/workspace-context";
import { formatCurrency, formatDate, paymentMethods } from "../../components/school-admin-demo.model";
import { ReceiptDialog } from "../finance/receipt-view";
import { receiptStatus } from "../finance/service-model";
import { FinanceServicePanel } from "../finance/service-panel";
import type { ServiceExecute } from "../finance/payment-dialog";
import { CashWorkspace, type CashExecute } from "../cash/workspace";
import { ContinuityWorkspace } from "../continuity/workspace";
import { reportDefinitions, reportSource, queryReport, defaultReportFilters, reminderDraft, type ReportFilters, type ReportKind, type ReportResult, type ReportRow } from "./model";
import { reportCsv, reportColumns, downloadText } from "./export";
import { PrintDialog, ReportPrint } from "./print-view";
import type { ReportSection } from "./context";

export function ReportsWorkspace({ state, role, context, onContext, executeCash, executeService, repository, onRestore }: {
  state: DemoState; role: "director" | "secretaria"; context: WorkspaceContext; onContext(patch: Partial<WorkspaceContext>, push?: boolean): void;
  executeCash: CashExecute; executeService: ServiceExecute; repository: DemoRepository; onRestore(state: DemoState): void;
}) {
  const desktop = useMediaQuery("(min-width:768px)");
  const [now] = useState(() => new Date().toISOString()), source = useMemo(() => reportSource(state, now), [state, now]);
  const filters = { ...defaultReportFilters(context.yearId, now), ...context.reportFilters, yearId: context.yearId };
  const section = context.reportSection ?? "reports", scope = reportDefinitions[filters.kind].scope;
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [print, setPrint] = useState<ReportResult | null>(null), [receiptId, setReceiptId] = useState("");
  const [message, setMessage] = useState<ReturnType<typeof reminderDraft> | null>(null);
  let result: ReportResult | undefined, invalid = "";
  try { result = queryReport(source, filters); } catch (failure) { invalid = failure instanceof Error ? failure.message : "Não foi possível preparar o relatório."; }
  const columns = reportColumns(filters.kind), page = Math.max(0, Math.min(context.reportPage ?? 0, Math.max(0, Math.ceil((result?.count ?? 0) / 50) - 1)));
  const rows = result?.rows.slice(page * 50, (page + 1) * 50) ?? [];
  const update = (patch: Partial<ReportFilters>) => { onContext({ reportFilters: { ...filters, ...patch }, reportPage: 0 }); setError(""); };
  const activeFilters: ActiveFilter[] = [
    ...(filters.classId ? [{ key: "class", label: state.classes.find((item) => item.id === filters.classId)?.name ?? "Classe", remove: () => update({ classId: "", groupId: "" }) }] : []),
    ...(filters.groupId ? [{ key: "group", label: state.groups.find((item) => item.id === filters.groupId)?.name ?? "Turma seleccionada", remove: () => update({ groupId: "" }) }] : []),
    ...(scope === "movements" && filters.method ? [{ key: "method", label: filters.method, remove: () => update({ method: "" }) }] : []),
    ...(scope === "movements" && filters.actorId ? [{ key: "actor", label: filters.actorId === "demo-secretaria" ? "Marta — Secretaria" : "Autor anterior", remove: () => update({ actorId: "" }) }] : []),
  ];
  const openStudent = (row: ReportRow) => onContext({ view: "enrollments", personId: row.personId ?? "", studentTab: "Financeiro", yearId: row.yearId || context.yearId }, true);
  const receipt = state.receipts.find((item) => item.id === receiptId) ?? null;
  const openReceipt = (studentId: string, paymentId: string) => { const stored = state.receipts.find((item) => item.studentId === studentId && item.paymentId === paymentId); if (stored) setReceiptId(stored.id); else setError("O recibo anterior não está disponível. Consulte a ficha e o movimento de origem."); };
  const reportButton = (kind: ReportKind, label: string) => {
    const value = queryReport(source, { ...filters, kind });
    return <button type="button" className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-teal-700" onClick={() => update({ kind })} key={kind}><span className="block text-xs font-semibold text-slate-500">{label}</span><strong className="mt-2 block text-xl">{formatCurrency(value.total)}</strong><span className="mt-1 block text-xs text-slate-500">{value.count} {value.count === 1 ? "registo" : "registos"} · Ver detalhe</span></button>;
  };
  const shownValue = (row: ReportRow, key: keyof ReportRow) => key === "amount" ? result?.unit === "money" ? formatCurrency(row.amount) : row.amount : key === "sourceId" ? row.receiptId ?? "Ver ficha" : String(row[key] ?? "—");
  const rowActions = (row: ReportRow) => <div className="flex flex-wrap gap-1">{row.receiptId && <Button size="small" onClick={() => setReceiptId(row.receiptId!)}>Recibo</Button>}{filters.kind === "overdue" && role === "secretaria" && <Button size="small" disabled={row.pending} onClick={() => { try { if (result) { setMessage(reminderDraft(result, row.personId!)); setNotice(""); setError(""); } } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível preparar a mensagem."); } }}>Prévia de mensagem</Button>}</div>;
  return <div className="grid gap-5">
    <nav aria-label="Áreas de relatórios" className="flex flex-wrap gap-2">{([ ["reports", "Relatórios"], ["cash", "Caixa"], ["proofs", "Conferência"], ["continuity", "Cópias de segurança"] ] as Array<[ReportSection, string]>).map(([value, label]) => <Button key={value} variant={section === value ? "contained" : "outlined"} onClick={() => onContext({ reportSection: value }, true)}>{label}</Button>)}</nav>
    {error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    {section === "reports" && <section className="lss-responsive-card grid gap-3" aria-label="Pesquisa e filtros do relatório">
      <div className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <TextField className="min-[360px]:col-span-2 lg:col-span-1" select label="Relatório" value={filters.kind} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => update({ kind: event.target.value as ReportKind, method: "", actorId: "" })}>{Object.entries(reportDefinitions).map(([kind, definition]) => <option key={kind} value={kind}>{definition.title}</option>)}</TextField>
        {scope !== "current" && <><TextField type="date" label="Data inicial" value={filters.from} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => update({ from: event.target.value })}/><TextField type="date" label="Data final" value={filters.to} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => update({ to: event.target.value })}/></>}
        {scope !== "movements" && <TextField className="min-[360px]:col-span-2 lg:col-span-1" select label="Ano do relatório" value={context.yearId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => onContext({ yearId: event.target.value, reportPage: 0, reportFilters: { ...filters, classId: "", groupId: "" } })}>{source.academic.years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</TextField>}
        <TextField className="min-[360px]:col-span-2 lg:col-span-1" type="search" label="Pesquisar no relatório" value={filters.search} onChange={(event) => update({ search: event.target.value })}/>
      </div>
      <FilterPanel title="Filtros do relatório" value={{ classId: filters.classId, groupId: filters.groupId, method: filters.method, actorId: filters.actorId }}
        clear={() => ({ classId: "", groupId: "", method: "", actorId: "" })} apply={update} active={activeFilters}>
        {(draft, change) => <>
          <TextField select label="Classe do relatório" value={draft.classId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, classId: event.target.value, groupId: "" })}><option value="">Todas</option>{state.classes.filter((item) => scope === "movements" || item.academicYear === context.yearId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</TextField>
          <TextField select label="Turma do relatório" value={draft.groupId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, groupId: event.target.value })}><option value="">Todas</option>{state.groups.filter((item) => (!draft.classId || item.classId === draft.classId) && (scope === "movements" || state.classes.find((schoolClass) => schoolClass.id === item.classId)?.academicYear === context.yearId)).map((item) => <option key={item.id} value={item.id}>{item.name} · {state.classes.find((schoolClass) => schoolClass.id === item.classId)?.name}</option>)}</TextField>
          {scope === "movements" && <><TextField select label="Forma no relatório" value={draft.method} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, method: event.target.value })}><option value="">Todas</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</TextField><TextField select label="Funcionário do relatório" value={draft.actorId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, actorId: event.target.value })}><option value="">Todos</option><option value="demo-secretaria">Marta — Secretaria</option><option value="previous-author">Identificação anterior incompleta</option></TextField></>}
        </>}
      </FilterPanel>
      <p className="text-xs text-slate-500">{scope === "movements" ? "Todos os anos lectivos · pela data efectiva." : scope === "current" ? "Situação actual · sem intervalo de datas." : "Matrículas do ano seleccionado · dívida à data final."}</p>
    </section>}
    {section === "cash" && <CashWorkspace state={state} role={role} from={filters.from} to={filters.to} onPeriodChange={update} execute={executeCash} onReceipt={openReceipt}/>}
    {section === "continuity" && <ContinuityWorkspace state={state} role={role} repository={repository} onRestore={onRestore}/>}
    {section === "proofs" && <FinanceServicePanel state={state} studentId="" yearId={context.yearId} readOnly={role !== "secretaria"} execute={executeService} correctionTarget={null} onCloseCorrection={() => {}}/>}
    {section === "reports" && <>
      {invalid && <Alert severity="error">{invalid}</Alert>}
      {result && <>
      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="font-bold">{result.title}</h2><details className="mt-2 max-w-3xl text-sm text-slate-500"><summary className="cursor-pointer">O que inclui este relatório</summary><p className="mt-2">{result.definition}</p></details><p className="mt-3 text-sm"><strong>{result.count} {result.count === 1 ? "registo" : "registos"} · Total {result.unit === "money" ? formatCurrency(result.total) : result.total}</strong></p></div><div className="flex flex-wrap gap-2"><Button onClick={() => downloadText(`lss-${result!.kind}-${filters.from}-${filters.to}.csv`, reportCsv(result!), "text/csv;charset=utf-8")}>Exportar CSV</Button><Button variant="outlined" onClick={() => setPrint(structuredClone(result!))}>Imprimir / PDF</Button></div></div>
      {!desktop && <div className="report-cards divide-y divide-slate-100">{rows.map((row) => <article className="p-4" key={row.id}><div className="flex justify-between gap-3"><div>{row.personId ? <Button size="small" onClick={() => openStudent(row)}>{row.name}</Button> : <strong>{row.name}</strong>}<p className="text-xs text-slate-500">{row.number} · {row.yearId}</p></div><strong className="whitespace-nowrap">{result!.unit === "money" ? formatCurrency(row.amount) : row.amount}</strong></div><p className="mt-2 text-sm">{row.label}</p><p className="mt-1 text-xs text-slate-500">{row.date ? formatDate(row.date) : "Data anterior não disponível"} · {row.status}{row.method ? ` · ${row.method}` : ""}</p>{rowActions(row)}</article>)}</div>}
      {desktop && <div className="table-scroll report-table" role="region" aria-label="Detalhe do relatório" tabIndex={0}><table className="w-full min-w-[920px] text-left text-sm"><thead><tr className="bg-slate-50">{columns.map((column) => <th className="p-3" key={column.key}>{column.label}</th>)}<th className="p-3">Consultar</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t border-slate-100" key={row.id}>{columns.map((column) => <td className="p-3 align-top" key={column.key}>{column.key === "name" && row.personId ? <Button size="small" onClick={() => openStudent(row)}>{row.name}</Button> : shownValue(row, column.key)}</td>)}<td className="p-3">{rowActions(row)}</td></tr>)}</tbody></table></div>}
      {!rows.length && <p className="p-6 text-sm text-slate-500">Sem registos para os filtros seleccionados.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3"><Button disabled={page === 0} onClick={() => onContext({ reportPage: page - 1 })}>Página anterior do relatório</Button><p className="text-xs">Página {page + 1} de {Math.max(1, Math.ceil(result.count / 50))} · CSV e impressão incluem todos os registos filtrados</p><Button disabled={(page + 1) * 50 >= result.count} onClick={() => onContext({ reportPage: page + 1 })}>Página seguinte do relatório</Button></div>
      </section><details className="rounded-lg border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Indicadores relacionados</summary><div className="mt-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{scope === "movements" ? <>{reportButton("receipts", "Recebido no período")}{reportButton("refunds", "Devoluções no período")}<div className="rounded-lg border border-slate-200 bg-white p-4"><span className="text-xs font-semibold text-slate-500">Líquido após devoluções</span><strong className="mt-2 block text-xl">{formatCurrency(queryReport(source, { ...filters, kind: "receipts" }).total - queryReport(source, { ...filters, kind: "refunds" }).total)}</strong><p className="mt-1 text-xs text-slate-500">Recebido − devolvido; saídas de caixa discriminadas em Caixa</p></div></> : <>{reportButton("overdue", "Dívida vencida")}{reportButton("due", "A vencer")}{reportButton("credit", "Crédito disponível")}</>}</div></div></details></>}
    </>}
    {message && <TaskSurface title="Prévia de mensagem" mobile="full-screen" onClose={() => setMessage(null)} actions={(close) => <><Button onClick={close}>Fechar</Button><Button variant="contained" onClick={async () => { try { await navigator.clipboard.writeText(message.message); setNotice("Mensagem copiada."); setError(""); } catch { setError("Não foi possível copiar automaticamente. Seleccione o texto da prévia para copiar."); } }}>Copiar mensagem</Button></>}>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<p className="text-sm">Destinatário: {message.guardianName} · {message.guardianPhone}</p><p className="mt-2 text-sm">Aluno: {message.studentName} · Valor: {formatCurrency(message.amount)}</p><TextField sx={{ mt: 3 }} multiline minRows={5} fullWidth label="Mensagem para copiar" value={message.message} slotProps={{ input: { readOnly: true } }}/><p className="mt-3 text-xs text-slate-500">A mensagem pode ser copiada. O LSS não a envia.</p></TaskSurface>}
    {print && <PrintDialog title="Prévia do relatório" onClose={() => setPrint(null)}><ReportPrint result={print}/></PrintDialog>}
    {receipt && <ReceiptDialog receipt={receipt} status={receiptStatus(state, receipt)} onClose={() => setReceiptId("")} onPrint={() => window.print()}/>}
  </div>;
}
