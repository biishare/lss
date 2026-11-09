"use client";
import { useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import useMediaQuery from "@mui/material/useMediaQuery";
import { TaskSurface } from "../../components/task-surface";
import { cashDraftsKey, cashTaskKey, readCashTasks, type CashTask } from "./task-drafts";
import type { DemoState } from "../demo/demo-state";
import { formatCurrency, formatDate, formatDateTime, paymentMethods } from "../../components/school-admin-demo.model";
import { validDate } from "../finance/domain/billing";
import { PrintDialog } from "../reports/print-view";
import { csvTable, downloadText } from "../reports/export";
import { activeCashSession, cashTotals, emptyCashBook, sessionMovements, type CashMovement, type CashSession } from "./model";
import { planCash, type CashCommand } from "./commands";

export type CashExecute = (command: CashCommand, id: string) => string;
const names = { receipt: "Recebimento", refund: "Devolução", expense: "Saída", float: "Reforço" };
function CashTable({ rows, onReceipt, document = false }: { rows: CashMovement[]; document?: boolean; onReceipt?(id: string, paymentId: string): void }) {
  const desktop = useMediaQuery("(min-width:768px)");
  if (!desktop && !document) return <section aria-label="Movimentos de caixa" className="divide-y divide-slate-100">{rows.map((item) => <article key={item.id} className="py-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{names[item.kind]} · {item.studentName ?? item.category ?? "Caixa"}</strong><strong>{item.kind === "expense" || item.kind === "refund" ? "−" : "+"}{formatCurrency(item.amount)}</strong></div><p className="mt-2 break-words">{item.description}</p><p className="mt-1 text-slate-500">{formatDate(item.effectiveOn)} · {item.method} · {item.actorName}</p>{item.source && onReceipt ? <Button size="small" onClick={() => onReceipt(item.source!.studentId, item.source!.paymentId)}>Ver origem</Button> : item.document && <p className="mt-1 break-words">{item.document}</p>}</article>)}{!rows.length && <p className="py-4 text-sm text-slate-500">Sem movimentos para esta selecção.</p>}</section>;
  return <div className="table-scroll" role="region" aria-label="Movimentos de caixa" tabIndex={0}><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="bg-slate-50">{["Movimento", "Aluno / Descrição", "Forma", "Valor", "Data efectiva", "Registado", "Responsável", "Documento"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-3">{names[item.kind]}</td><td className="p-3">{item.studentName ?? item.category ?? "—"}<p className="text-xs text-slate-500">{item.description}</p></td><td className="p-3">{item.method}</td><td className="p-3 whitespace-nowrap">{formatCurrency(item.amount)}</td><td className="p-3">{formatDate(item.effectiveOn)}</td><td className="p-3">{formatDateTime(item.recordedAt)}</td><td className="p-3">{item.actorName}</td><td className="p-3">{item.source && onReceipt ? <Button size="small" onClick={() => onReceipt(item.source!.studentId, item.source!.paymentId)}>Ver origem</Button> : item.document ?? "—"}</td></tr>)}</tbody></table>{!rows.length && <p className="p-4 text-sm text-slate-500">Sem movimentos para esta selecção.</p>}</div>;
}
function CashStatement({ session, rows }: { session: CashSession; rows: CashMovement[] }) {
  const totals = session.snapshot?.totals ?? cashTotals(session.openingAmount, rows);
  return <><h2 className="font-bold text-lg">{session.snapshot?.schoolName ?? "Liceu São Silvestre"}</h2><h3 className="mt-2 font-bold">Fecho de caixa · {formatDate(session.businessDate)}</h3><p className="my-3 text-sm">{session.actorName} · {session.closedAt ? formatDateTime(session.closedAt) : "Sessão aberta"}</p><p className="mb-4 text-sm">Abertura {formatCurrency(session.openingAmount)} · Numerário esperado {formatCurrency(totals.expectedCashCents / 100)} · Contado {session.countedAmount === undefined ? "Por indicar" : formatCurrency(session.countedAmount)} · Diferença {formatCurrency((session.differenceCents ?? 0) / 100)}</p>{session.reason && <p className="mb-4 text-sm">Justificação: {session.reason}</p>}<CashTable rows={rows} document/><h4 className="mt-5 font-bold">Conferência por forma</h4>{totals.methods.map((item) => <p key={item.method} className="mt-2 text-sm">{item.method}: recebimentos {formatCurrency(item.receipts)} · devoluções {formatCurrency(item.refunds)} · saídas {formatCurrency(item.expenses)} · reforços {formatCurrency(item.floats)} · líquido {formatCurrency(item.netCents / 100)}</p>)}</>;
}
const titles = { open: "Abrir caixa", close: "Fechar caixa", expense: "Registar saída", float: "Registar reforço" };
const resumeLabels = { open: "abertura", close: "fecho", expense: "saída", float: "reforço" };
const confirmations = { open: "Confirmar abertura", close: "Confirmar fecho", expense: "Confirmar saída", float: "Confirmar reforço" };
const detailNet = (rows: CashMovement[]) => cashTotals(0, rows).methods.reduce((sum, item) => sum + item.netCents, 0) / 100;
function CashDetail({ schoolName, session, rows, method }: { schoolName: string; session: CashSession; rows: CashMovement[]; method: string }) {
  return <><h2 className="text-lg font-bold">{schoolName}</h2><h3 className="mt-2 font-bold">Detalhe do caixa · {formatDate(session.businessDate)}</h3><p className="my-3 text-sm">Forma: {method || "Todas"} · {rows.length} {rows.length === 1 ? "movimento" : "movimentos"} · Líquido apresentado: {formatCurrency(detailNet(rows))}</p><CashTable rows={rows} document/></>;
}
export function CashWorkspace({ state, role, from, to, onPeriodChange, execute, onReceipt }: {
  state: DemoState; role: "director" | "secretaria"; from: string; to: string;
  onPeriodChange?(patch: { from?: string; to?: string }): void;
  execute: CashExecute; onReceipt(studentId: string, paymentId: string): void;
}) {
  const book = state.cashBook ?? emptyCashBook(), active = activeCashSession(book), canWrite = role === "secretaria";
  const [selected, setSelected] = useState(""), [method, setMethod] = useState(""), [notice, setNotice] = useState("");
  const [tasks, setTasks] = useState<Record<string, CashTask>>(() => { try { return readCashTasks(window.sessionStorage.getItem(cashDraftsKey(state.datasetId)), state.datasetId, state.operations.map((item) => item.id)); } catch { return {}; } });
  const [task, setTask] = useState<CashTask | null>(null), [preview, setPreview] = useState(false), [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState(""), [saving, setSaving] = useState(false);
  const busy = useRef(false), errorRef = useRef<HTMLDivElement>(null);
  const command = task?.command;
  const taskSession = book.sessions.find((item) => item.id === task?.sessionId);
  const [print, setPrint] = useState<{ session: CashSession; rows: CashMovement[]; method: string; complete: boolean } | null>(null);
  const session = book.sessions.find((item) => item.id === selected) ?? active ?? book.sessions.at(-1);
  const rows = session ? session.status === "closed" ? session.snapshot!.movements : sessionMovements(book, session.id) : [];
  const shown = rows.filter((item) => !method || item.method === method), totals = session ? session.snapshot?.totals ?? cashTotals(session.openingAmount, rows) : undefined;
  const historyInvalid = !validDate(from) || !validDate(to) || from > to;
  const resumableTasks = Object.values(tasks).filter((item) => !state.operations.some((operation) => operation.id === item.id));
  const subsequent = session ? book.adjustments.filter((item) => book.movements.some((movement) => movement.id === item.movementId && movement.sessionId === session.id) && (!session.closedAt || (session.snapshot?.adjustmentIds ? !session.snapshot.adjustmentIds.includes(item.id) : item.recordedAt > session.closedAt))) : [];
  function persist(next: Record<string, CashTask>) {
    next = Object.fromEntries(Object.entries(next).filter(([, item]) => !state.operations.some((operation) => operation.id === item.id)));
    setTasks(next);
    try { window.sessionStorage.setItem(cashDraftsKey(state.datasetId), JSON.stringify({ version: 1, datasetId: state.datasetId, tasks: Object.values(next) })); setDraftNotice(""); }
    catch { setDraftNotice("O preenchimento mantém-se nesta página, mas não pôde ser conservado para recarga."); }
  }
  function resume(next: CashTask) { setTask(next); setPreview(false); setError(""); }
  function start(command: CashCommand) {
    const next = { id: crypto.randomUUID(), recordedAt: new Date().toISOString(), sessionId: command.kind === "open" ? "" : active?.id ?? "", command };
    const previous = tasks[cashTaskKey(next)];
    if (previous && !state.operations.some((item) => item.id === previous.id)) resume(previous); else { resume(next); persist({ ...tasks, [cashTaskKey(next)]: next }); }
  }
  function update(command: CashCommand) {
    if (!task) return;
    const next = { ...task, command }; setTask(next); setPreview(false); setError(""); persist({ ...tasks, [cashTaskKey(next)]: next });
  }
  function planned() {
    if (!task) return;
    if (task.command.kind !== "open" && task.sessionId !== active?.id) throw new Error("Este preenchimento pertence a outra sessão de caixa. Consulte o histórico antes de iniciar uma operação na sessão actual.");
    return planCash(state, task.command, { id: task.id, role, recordedAt: new Date().toISOString() });
  }
  let plan: ReturnType<typeof planCash> | undefined;
  try { plan = planned(); } catch { /* Validation is shown when reviewing. */ }
  function submit(event: FormEvent) {
    event.preventDefault(); if (!task || busy.current || !canWrite) return;
    busy.current = true; setSaving(true);
    try {
      planned();
      if (!preview) { setPreview(true); return; }
      setNotice(execute(task.command, task.id));
      const next = { ...tasks }; delete next[cashTaskKey(task)]; persist(next);
      setTask(null); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar. O preenchimento foi conservado."); window.requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { busy.current = false; setSaving(false); }
  }
  return <div className="grid gap-4">
    {notice && <Alert severity="success">{notice}</Alert>}
    <section className="lss-responsive-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Caixa diário</h2><p className="mt-1 text-sm text-slate-500">{active ? `${formatDate(active.businessDate)} · ${active.actorName}` : "Sem sessão aberta"}</p></div>{canWrite && !active && <Button variant="contained" onClick={() => start({ kind: "open", openingAmount: "0" })}>Abrir caixa</Button>}</div>
      {active && <div className="mt-3 flex flex-wrap items-center gap-2"><Chip label="Aberto"/>{canWrite && <><Button variant="contained" onClick={() => start({ kind: "expense", amount: "", method: "Numerário", category: "Material", reason: "", document: "" })}>Registar saída</Button><Button variant="outlined" onClick={() => start({ kind: "close", sessionId: active.id, countedAmount: "", reason: "" })}>Fechar caixa</Button><Button onClick={() => start({ kind: "float", amount: "", method: "Numerário", category: "Fundo de caixa", reason: "", document: "" })}>Registar reforço</Button></>}</div>}
      {!book.sessions.length && <p className="mt-3 text-sm text-slate-600">Indique o fundo de abertura. Se receber primeiro, a sessão abre com 0 MT.</p>}
      {canWrite && resumableTasks.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Operações de caixa por concluir">{resumableTasks.map((item) => <Button key={item.id} onClick={() => resume(item)}>Retomar {resumeLabels[item.command.kind]}</Button>)}</div>}
    </section>
    {session && totals && <section className="lss-responsive-card"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{session.status === "closed" ? "Fecho preservado" : "Sessão em atendimento"} · {formatDate(session.businessDate)}</h3><p className="mt-1 text-sm">{session.actorName} · Abertura {formatCurrency(session.openingAmount)}</p></div><p className="text-sm">Numerário esperado · <strong>{formatCurrency(totals.expectedCashCents / 100)}</strong></p></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><TextField select label="Forma no detalhe" value={method} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} sx={{ minWidth: 180 }} onChange={(event) => setMethod(event.target.value)}><option value="">Todas</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</TextField><div className="flex flex-wrap gap-2"><Button onClick={() => downloadText(`caixa-${session.businessDate}.csv`, csvTable(["Movimento", "Descrição", "Forma", "Valor (MT)", "Data efectiva", "Registado", "Responsável", "Documento"], shown.map((item) => [names[item.kind], item.description, item.method, item.kind === "expense" || item.kind === "refund" ? -item.amount : item.amount, item.effectiveOn, item.recordedAt, item.actorName, item.document ?? ""])), "text/csv;charset=utf-8")}>Exportar detalhe CSV</Button><Button variant="outlined" onClick={() => setPrint({ session: structuredClone(session), rows: structuredClone(shown), method, complete: false })}>Imprimir detalhe / PDF</Button></div></div>
      <p className="my-3 text-sm" role="status">{shown.length} {shown.length === 1 ? "movimento" : "movimentos"} · {method || "Todas as formas"} · Líquido apresentado: <strong>{formatCurrency(detailNet(shown))}</strong></p>
      <CashTable rows={shown} onReceipt={onReceipt}/>
      <details className="mt-4 border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">Conferência da sessão completa</summary><p className="mt-3 text-xs text-slate-500">Sem o filtro de forma. Banco e carteiras não entram no numerário contado.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><p className="rounded bg-slate-50 p-3 text-sm">Numerário contado: <strong>{session.countedAmount === undefined ? "Por indicar" : formatCurrency(session.countedAmount)}</strong></p><p className="rounded bg-slate-50 p-3 text-sm">Diferença: <strong>{session.differenceCents === undefined ? "Por apurar" : formatCurrency(session.differenceCents / 100)}</strong></p>{active?.openingMode === "automatic" && <p className="text-sm">Abertura automática sem fundo.</p>}</div>
        {session.reason && <p className="my-3 text-sm">Justificação: {session.reason}</p>}
        <div className="mt-3 grid gap-2">{totals.methods.map((item) => <p className="rounded border border-slate-200 p-3 text-sm" key={item.method}><strong>{item.method}</strong> · entradas {formatCurrency(item.receipts)} · devoluções {formatCurrency(item.refunds)} · saídas {formatCurrency(item.expenses)} · reforços {formatCurrency(item.floats)} · líquido {formatCurrency(item.netCents / 100)}</p>)}</div>
        <Button sx={{ mt: 2 }} onClick={() => setPrint({ session: structuredClone(session), rows: structuredClone(rows), method: "", complete: true })}>Imprimir sessão completa</Button>
      </details>
      {subsequent.length > 0 && <Alert severity="info" sx={{ mt: 2 }}><strong>Ajustamentos posteriores ao retrato</strong>{subsequent.map((item) => <p key={item.id}>{formatDateTime(item.recordedAt)} · {item.actorName} · {item.reason} · {item.before.method} → {item.after.method}. O retrato original mantém-se.</p>)}</Alert>}
    </section>}
    <section className="lss-responsive-card"><h3 className="font-bold">Histórico de sessões</h3><div className="my-3 grid gap-3 sm:grid-cols-2"><TextField type="date" label="Data inicial do histórico" value={from} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onPeriodChange?.({ from: event.target.value })}/><TextField type="date" label="Data final do histórico" value={to} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onPeriodChange?.({ to: event.target.value })}/></div><p className="text-xs text-slate-500">O período filtra esta lista. A sessão aberta continua acessível acima.</p>{historyInvalid && <Alert severity="error" sx={{ mt: 2 }}>Reveja o intervalo de datas do histórico.</Alert>}<div className="mt-3 grid gap-2">{book.sessions.filter((item) => !historyInvalid && item.businessDate >= from && item.businessDate <= to).slice().reverse().map((item) => <button className="flex flex-wrap justify-between gap-2 rounded border border-slate-200 p-3 text-left text-sm hover:bg-slate-50" key={item.id} onClick={() => setSelected(item.id)}><span>{formatDate(item.businessDate)} · {item.actorName}</span><span>{item.status === "closed" ? `Fechado · diferença ${formatCurrency((item.differenceCents ?? 0) / 100)}` : "Aberto"}</span></button>)}</div></section>
    {task && command && <TaskSurface title={titles[command.kind]} subtitle={command.kind === "open" ? "Indique o fundo inicial em numerário." : `${formatDate(taskSession?.businessDate ?? task.recordedAt.slice(0, 10))} · ${taskSession?.actorName ?? "Sessão anterior"}`} mobile={command.kind === "open" ? "sheet" : "full-screen"} busy={saving} onClose={() => setTask(null)} closeNotice={draftNotice || "O preenchimento fica conservado para retomar."} actions={(close) => <><Button type="button" onClick={close}>Fechar</Button><Button variant="contained" form="cash-command-form" type="submit" disabled={saving}>{saving ? "A guardar…" : preview ? confirmations[command.kind] : "Rever efeito"}</Button></>}>
      <form className="grid gap-4" id="cash-command-form" onSubmit={submit}>{error && <Alert ref={errorRef} tabIndex={-1} severity="error">{error}</Alert>}
        {command.kind === "open" && <TextField label="Numerário de abertura (MT)" type="number" value={command.openingAmount} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ ...command, openingAmount: event.target.value })} required/>}
        {command.kind === "close" && <><p className="text-sm">Conte apenas o numerário. Depósitos, transferências e carteiras ficam discriminados por forma.</p><TextField label="Numerário contado (MT)" type="number" value={command.countedAmount} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ ...command, countedAmount: event.target.value })} required/><TextField label="Justificação da diferença / Observação" value={command.reason} onChange={(event) => update({ ...command, reason: event.target.value })}/></>}
        {(command.kind === "expense" || command.kind === "float") && <><TextField label="Valor (MT)" type="number" value={command.amount} slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} onChange={(event) => update({ ...command, amount: event.target.value })} required/><TextField select label="Forma" value={command.method} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, method: event.target.value })}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</TextField><TextField label="Categoria" value={command.category} onChange={(event) => update({ ...command, category: event.target.value })} required/><TextField label="Motivo" value={command.reason} onChange={(event) => update({ ...command, reason: event.target.value })} required/><TextField label="Documento de apoio (opcional)" value={command.document} onChange={(event) => update({ ...command, document: event.target.value })}/></>}
        {preview && plan && <Alert severity="info">{plan.details.map((item) => <p key={item}>{item}</p>)}</Alert>}
      </form>
    </TaskSurface>}
    {print && <PrintDialog title={print.complete ? "Impressão da sessão de caixa" : "Detalhe filtrado do caixa"} onClose={() => setPrint(null)}>{print.complete ? <CashStatement session={print.session} rows={print.rows}/> : <CashDetail schoolName={state.academic?.institution.name ?? "Liceu São Silvestre"} session={print.session} rows={print.rows} method={print.method}/>}</PrintDialog>}
  </div>;
}
