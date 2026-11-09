"use client";
import { useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { formatCurrency, formatDate, getChargeBalance, paymentMethods, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { schoolToday } from "./domain/billing";
import { personCreditSources, receiptStatus, samePerson } from "./service-model";
import { planService } from "./service-commands";
import { PaymentDialog, type ServiceExecute } from "./payment-dialog";
import { ReceiptDialog } from "./receipt-view";
import { TaskSurface } from "../../components/task-surface";
import { StudentSearch } from "./student-search";
import { isPaymentForm, readServiceTaskDrafts, saveServiceTaskDrafts, serviceTaskKey, type ServiceTaskCommand, type ServiceTaskDraft } from "./service-task-drafts";

export type FinanceServiceHandle = { showProofs(studentId?: string): void };

type CorrectionTarget = { studentId: string; paymentId: string };
function CorrectionSession({ state, target, execute, onClose }: { state: DemoState; target: CorrectionTarget; execute: ServiceExecute; onClose(): void }) {
  const record = state.paymentRecords.find((item) => item.studentId === target.studentId);
  const payment = record?.payments.find((item) => item.id === target.paymentId);
  const originalCharge = record?.charges.find((charge) => record.allocations.some((allocation) => allocation.paymentId === target.paymentId && (allocation.chargeId === charge.id || record.penaltyCharges?.some((penalty) => penalty.baseChargeId === charge.id && penalty.id === allocation.chargeId))));
  const key = `lss-correction-${state.datasetId}-${target.studentId}-${target.paymentId}`;
  const [saved] = useState(() => {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
      if (typeof value?.id === "string" && value.id.trim() && typeof value.reason === "string" && isPaymentForm(value.draft) && !state.operations.some((item) => item.id === value.id)) return value as { id: string; reason: string; draft: PaymentLaunchDraft };
    } catch { /* Optional form recovery never changes confirmed data. */ }
    return null;
  });
  const [id] = useState(() => saved?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<PaymentLaunchDraft>(() => saved?.draft ?? { studentId: target.studentId, category: originalCharge?.category ?? "registration", monthKey: originalCharge?.monthKey ?? state.paymentSettings.startMonth, targetChargeId: originalCharge?.id ?? "", amount: String(payment?.amount ?? 0), paidOn: payment?.effectivePaymentDate ?? payment?.paidOn ?? "", method: payment?.method ?? "Numerário", description: payment?.observation ?? "", evidenceReference: payment?.reference ?? payment?.legacyReference, allowFutureAllocation: true, selectedChargeIds: [] });
  const [reason, setReason] = useState(saved?.reason ?? "");
  const [notice, setNotice] = useState("");
  const [initial] = useState(() => JSON.stringify({ draft, reason }));
  const [preserved, setPreserved] = useState(Boolean(saved));
  function remember(next: PaymentLaunchDraft, nextReason = reason) {
    setDraft(next); setReason(nextReason);
    try { window.sessionStorage.setItem(key, JSON.stringify({ id, draft: next, reason: nextReason })); setNotice(""); setPreserved(true); }
    catch { setPreserved(false); setNotice("Não foi possível conservar para recarga. O preenchimento mantém-se enquanto esta tarefa estiver aberta."); }
  }
  return <PaymentDialog hasUnpreservedChanges={!preserved && JSON.stringify({ draft, reason }) !== initial} state={state} draft={draft} commandId={id} onChange={remember} correctionReason={reason}
    onCorrectionReasonChange={(next) => remember(draft, next)} draftNotice={notice} onClose={onClose} correction={target}
    execute={(command, commandId) => { const result = execute(command, commandId); try { window.sessionStorage.removeItem(key); } catch { /* Applied IDs are excluded on recovery. */ } return result; }}
    confirm={() => { throw new Error("Use a operação de correcção."); }}/>;
}

export function FinanceServicePanel({ state, studentId, yearId, readOnly, execute, correctionTarget, onCloseCorrection, serviceRef }: {
  state: DemoState; studentId: string; yearId: string; readOnly: boolean; execute: ServiceExecute;
  serviceRef?: Ref<FinanceServiceHandle>;
  correctionTarget: CorrectionTarget | null; onCloseCorrection(): void;
}) {
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false), [filter, setFilter] = useState<string | null>(null);
  const [section, setSection] = useState<"movements" | "proofs" | "credit">("movements");
  const [choosingStudent, setChoosingStudent] = useState(false);
  const [command, setCommand] = useState<ServiceTaskCommand | null>(null), [preview, setPreview] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null), [localCorrection, setLocalCorrection] = useState<CorrectionTarget | null>(null);
  const [id, setId] = useState(() => crypto.randomUUID());
  const busy = useRef(false);
  const [saving, setSaving] = useState(false), [draftNotice, setDraftNotice] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString());
  const [tasks, setTasks] = useState<Record<string, ServiceTaskDraft>>(() => { try { return readServiceTaskDrafts(window.sessionStorage, state.datasetId, state.operations.map((item) => item.id)); } catch { return {}; } });
  const selected = filter ?? studentId;
  const credit = personCreditSources(state, selected), today = schoolToday({ now: () => new Date().toISOString() });
  const proofs = (state.paymentProofs ?? []).filter((item) => !selected || samePerson(state, item.studentId, selected)), pending = proofs.filter((item) => item.status === "pending");
  const proof = command?.kind === "review-proof" ? (state.paymentProofs ?? []).find((item) => item.id === command.proofId) : undefined;
  const target = command?.kind === "apply-credit" ? state.paymentRecords.find((item) => item.studentId === command.studentId) : undefined;
  const correction = correctionTarget ?? localCorrection;
  useImperativeHandle(serviceRef, () => ({ showProofs(studentId) {
    if (studentId) setFilter(studentId);
    setSection("proofs"); setOpen(true); setChoosingStudent(false);
    window.requestAnimationFrame(() => { const button = panel.current?.querySelector<HTMLElement>('[data-service-section="proofs"]'); button?.scrollIntoView?.({ block: "nearest" }); button?.focus(); });
  } }));
  function restoreFocus() {
    window.requestAnimationFrame(() => {
      const origin = trigger.current;
      (origin?.isConnected ? origin : panel.current?.querySelector<HTMLButtonElement>(`[data-service-section="${section}"]`))?.focus({ preventScroll: true });
    });
  }
  function readTasks() {
    try { return readServiceTaskDrafts(window.sessionStorage, state.datasetId, state.operations.map((item) => item.id)); }
    catch { return {}; }
  }
  function persist(changes: Record<string, ServiceTaskDraft>, remove: string[] = []) {
    const applied = state.operations.map((item) => item.id);
    const current = readTasks();
    const next = Object.fromEntries(Object.entries({ ...tasks, ...current, ...changes }).filter(([key, task]) => !remove.includes(key) && !applied.includes(task.id)));
    setTasks(next);
    try { saveServiceTaskDrafts(window.sessionStorage, state.datasetId, next); setDraftNotice(""); }
    catch { setDraftNotice("O preenchimento foi conservado neste separador, mas não pôde ser guardado para recarga."); }
  }
  function resume(task: ServiceTaskDraft) { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setId(task.id); setRecordedAt(task.recordedAt); setCommand(task.command); setPreview(false); setError(""); }
  const update = (next: ServiceTaskCommand) => {
    setCommand(next); setPreview(false); setError("");
    persist({ [serviceTaskKey(next)]: { command: next, id, recordedAt } });
  };
  const start = (next: ServiceTaskCommand) => {
    if (readOnly) return;
    const previous = (draftNotice ? tasks : readTasks())[serviceTaskKey(next)] ?? tasks[serviceTaskKey(next)];
    if (previous) { resume(previous); return; }
    const task = { command: next, id: crypto.randomUUID(), recordedAt: new Date().toISOString() };
    resume(task); persist({ [serviceTaskKey(next)]: task });
  };
  const plan = (() => { if (!command) return undefined; try { return planService(state, command, { id: id, role: "secretaria", recordedAt }); } catch { return undefined; } })();
  function submit(event: FormEvent) {
    event.preventDefault(); if (!command || busy.current || readOnly) return;
    busy.current = true; setSaving(true); setError("");
    try {
      planService(state, command, { id: id, role: "secretaria", recordedAt });
      if (!preview) { setPreview(true); return; }
      const result = execute(command, id);
      setNotice(result.message); setCommand(null); if (result.receipt) setReceipt(result.receipt); else restoreFocus();
      persist({}, [serviceTaskKey(command)]);
      try { window.sessionStorage.removeItem(`lss-service-draft-${state.datasetId}`); } catch { /* Confirmation already persisted. */ }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar. O preenchimento foi conservado."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section ref={panel} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4" data-workspace-secondary>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Conferência e movimentos</h3><p className="text-sm text-slate-500">{pending.length} comprovativos em análise · recibos, crédito e devoluções</p></div><div className="flex flex-wrap gap-2"><Button data-service-section="movements" variant="outlined" onClick={() => { setSection("movements"); setOpen(true); }}>Consultar movimentos</Button><Button data-service-section="proofs" onClick={() => { setSection("proofs"); setOpen(true); }}>{readOnly ? "Consultar comprovativos" : "Conferir comprovativos"}</Button><Button data-service-section="credit" onClick={() => { setSection("credit"); setOpen(true); }}>Crédito e devoluções</Button></div></div>
    {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
    {open && <div className="mt-4 grid gap-3" aria-label="Consulta de movimentos">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm">{selected ? state.students.find((item) => item.id === selected)?.fullName : "Todos os alunos"} · {yearId}</p><div><Button onClick={() => setChoosingStudent((value) => !value)}>Escolher aluno</Button><Button onClick={() => { setFilter(""); setChoosingStudent(false); }}>Todos os alunos</Button><Button onClick={() => setOpen(false)}>Fechar consulta</Button></div></div>
      {choosingStudent && <StudentSearch students={state.students} onChoose={(item) => { setFilter(item.id); setChoosingStudent(false); }} />}
      {section === "credit" && <>
      {!selected && <Alert severity="info">Escolha o aluno para consultar as origens de crédito e registar uma operação.</Alert>}
      <h3 className="mt-6 mb-3 font-bold">Crédito desta pessoa</h3>
      {credit.length ? credit.map((source) => <div key={`${source.studentId}-${source.payment.id}`} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-3 text-sm"><div><strong>{formatCurrency(source.available)}</strong><p>Ano {source.year} · Origem {source.payment.id}</p></div>{!readOnly && <div className="flex flex-wrap gap-2"><Button onClick={() => start({ kind: "apply-credit", sourceStudentId: source.studentId, paymentId: source.payment.id, studentId: selected, chargeIds: [], amount: String(source.available), effectiveOn: today, reason: "" })}>Aplicar crédito</Button><Button color="error" onClick={() => start({ kind: "refund", studentId: source.studentId, paymentId: source.payment.id, amount: String(source.available), method: "Numerário", effectiveOn: today, reason: "" })}>Registar devolução</Button></div>}</div>) : <p className="text-sm text-slate-500">Sem crédito disponível.</p>}
      </>}
      {section === "proofs" && <>
      <h3 className="mt-6 mb-3 font-bold">Comprovativos para conferência</h3>
      {proofs.length ? proofs.map((item) => <section key={item.id} className="my-3 rounded border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.reference} · {formatCurrency(item.draft.amount)}</strong><Chip size="small" label={item.status === "pending" ? "Em análise" : item.status === "confirmed" ? "Conferido" : "Rejeitado"}/></div><p className="mt-2">{state.students.find((student) => student.id === item.studentId)?.fullName} · {item.draft.method} · {formatDate(item.draft.paidOn)}</p><p>{item.note || "Sem observação adicional"}</p>{item.decision && <p>Decisão: {item.decision} · {item.reviewedBy}</p>}{item.status === "pending" && !readOnly && <Button onClick={() => start({ kind: "review-proof", proofId: item.id, confirm: true, decision: "" })}>Conferir comprovativo {item.reference}</Button>}</section>) : <p className="text-sm text-slate-500">Sem comprovativos registados.</p>}
      </>}
      {section === "movements" && <>
      <h3 className="mt-6 mb-3 font-bold">Recebimentos de {yearId}</h3>
      {state.paymentRecords.filter((record) => state.students.find((item) => item.id === record.studentId)?.academicYearId === yearId && (!selected || samePerson(state, record.studentId, selected))).flatMap((record) => record.payments.filter((payment) => payment.kind !== "credit-application").map((payment) => {
        const stored = state.receipts.find((item) => item.studentId === record.studentId && item.paymentId === payment.id);
        return <div key={`${record.studentId}-${payment.id}`} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-3 text-sm"><div><strong>{state.students.find((item) => item.id === record.studentId)?.fullName} · {formatCurrency(payment.amount)}</strong><p>{formatDate(payment.effectivePaymentDate ?? payment.paidOn)} · {payment.method}{payment.reversedBy ? " · Anulado por correcção" : ""}</p><p className="text-xs text-slate-500">{payment.id}</p></div><div>{stored && <Button onClick={() => setReceipt(stored)}>Abrir {stored.id}</Button>}{!readOnly && !payment.reversedBy && <Button onClick={() => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setLocalCorrection({ studentId: record.studentId, paymentId: payment.id }); }}>Corrigir recebimento</Button>}</div></div>;
      }))}
      </>}
      {section === "credit" && <>
      <h3 className="mt-6 mb-3 font-bold">Histórico de crédito e devoluções</h3>
      {state.paymentRecords.filter((record) => selected && samePerson(state, record.studentId, selected)).flatMap((record) => (record.creditDebits ?? []).map((item) => <p key={item.id} className="border-b border-slate-100 py-3 text-sm">{item.kind === "refund" ? "Devolução" : "Crédito entre anos"} · {formatCurrency(item.amount)} · {item.method} · {formatDate(item.effectiveOn)}<span className="block">{item.reason} · {item.recordedBy} · Origem {item.paymentId}</span></p>))}
      </>}
    </div>}
    {!readOnly && Object.values(tasks).length > 0 && <section className="mt-3" aria-label="Preenchimentos por concluir"><h4 className="text-sm font-semibold">Preenchimentos por concluir</h4>{Object.values(tasks).map((task) => <Button key={task.id} onClick={() => resume(task)}>Retomar {task.command.kind === "review-proof" ? "conferência" : task.command.kind === "refund" ? "devolução" : "aplicação de crédito"}</Button>)}</section>}
    {command && <TaskSurface title={command.kind === "review-proof" ? "Conferir comprovativo" : command.kind === "refund" ? "Registar devolução" : "Aplicar crédito"}
      mobile={command.kind === "review-proof" ? "sheet" : "full-screen"} tall={command.kind === "review-proof"} busy={saving}
      closeNotice={draftNotice || "O preenchimento fica conservado para retomar."} onClose={() => setCommand(null)}
      actions={(close) => <><Button onClick={close}>Fechar</Button><Button variant="contained" type="submit" form="finance-service-operation">{preview ? "Confirmar operação" : "Rever efeito"}</Button></>}>
<form id="finance-service-operation" className="grid gap-4" onSubmit={submit}>
      {error && <Alert severity="error">{error}</Alert>}
      {command.kind === "review-proof" && <><p className="text-sm">Compare estes dados com a evidência apresentada.</p><section className="rounded bg-slate-50 p-4 text-sm"><p>Referência: {proof?.reference}</p><p>Aluno: {state.students.find((item) => item.id === proof?.studentId)?.fullName}</p><p>Valor: {proof?.draft.amount} MT · {proof?.draft.method}</p><p>Data efectiva: {proof?.draft.paidOn}</p><p>Registado por: {proof?.recordedBy}</p></section><TextField select label="Decisão" value={command.confirm ? "confirm" : "reject"} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, confirm: event.target.value === "confirm" })}><option value="confirm">Confirmar recebimento</option><option value="reject">Rejeitar comprovativo</option></TextField><TextField label="Resultado da conferência / Motivo" value={command.decision} onChange={(event) => update({ ...command, decision: event.target.value })} required/></>}
      {command.kind === "apply-credit" && <><p className="text-sm break-words">Origem: {command.paymentId}. A aplicação não gera nova entrada de dinheiro.</p><TextField select label="Matrícula de destino" value={command.studentId} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, studentId: event.target.value, chargeIds: [] })}>{state.students.filter((student) => (student.personId ?? student.id) === (state.students.find((item) => item.id === command.sourceStudentId)?.personId ?? command.sourceStudentId)).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.academicYearId}</option>)}</TextField><TextField select label="Cobrança a liquidar" value={command.chargeIds[0] ?? ""} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, chargeIds: [event.target.value] })}><option value="">Seleccione uma cobrança</option>{target?.charges.filter((item) => getChargeBalance(target, item) + (target.penaltyCharges ?? []).filter((penalty) => penalty.baseChargeId === item.id).reduce((sum, penalty) => sum + getChargeBalance(target, penalty), 0) > 0).map((item) => <option key={item.id} value={item.id}>{item.description} · {formatCurrency(getChargeBalance(target, item))}</option>)}</TextField></>}
      {(command.kind === "apply-credit" || command.kind === "refund") && <><TextField label="Valor (MT)" value={command.amount} type="number" slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} onChange={(event) => update({ ...command, amount: event.target.value })} required/><TextField label="Data efectiva" value={command.effectiveOn} type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }} onChange={(event) => update({ ...command, effectiveOn: event.target.value })} required/>{command.kind === "refund" && <TextField select label="Forma de devolução" value={command.method} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, method: event.target.value })}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</TextField>}<TextField label="Motivo" value={command.reason} onChange={(event) => update({ ...command, reason: event.target.value })} required/></>}
      {preview && plan && <Alert severity="warning">{plan.details.map((item) => <p key={item}>{item}</p>)}</Alert>}
    </form>
    </TaskSurface>}

    {correction && <CorrectionSession key={`${correction.studentId}-${correction.paymentId}`} state={state} target={correction} execute={execute} onClose={() => { setLocalCorrection(null); onCloseCorrection(); if (!correctionTarget) restoreFocus(); }}/>}
    {receipt && <ReceiptDialog receipt={receipt} status={receiptStatus(state, receipt)} onClose={() => { setReceipt(null); restoreFocus(); }} onPrint={() => window.print()}/>}
  </section>;
}

export function FinanceHistory({ state, personId }: { state: DemoState; personId: string }) {
  const ids = new Set(state.students.filter((item) => (item.personId ?? item.id) === personId).map((item) => item.id));
  const entries = state.paymentRecords.filter((record) => ids.has(record.studentId)).flatMap((record) => [
    ...record.payments.map((item) => ({ id: `${record.studentId}:${item.id}`, title: item.kind === "credit-application" ? "Crédito aplicado de outro ano" : item.reversedBy ? "Recebimento original anulado" : "Recebimento confirmado", amount: item.amount, date: item.recordedAt ?? "", effectiveOn: item.effectivePaymentDate ?? item.paidOn, author: item.recordedBy, detail: `${item.id} · ${item.method}${item.replaces ? ` · Substitui ${item.replaces.paymentId}` : ""}` })),
    ...(record.creditDebits ?? []).map((item) => ({ id: item.id, title: item.kind === "refund" ? "Devolução" : "Crédito aplicado noutro ano", amount: item.amount, date: item.recordedAt ?? "", effectiveOn: item.effectiveOn, author: item.recordedBy, detail: `${item.reason} · Origem ${item.paymentId}` })),
    ...(record.reversals ?? []).map((item) => ({ id: item.id, title: "Correcção de recebimento", amount: undefined, date: item.recordedAt ?? "", effectiveOn: undefined, author: item.recordedBy, detail: `${item.reason} · Original ${item.paymentId} · Substituto ${item.replacementPaymentId}` })),
  ]).sort((a, b) => b.date.localeCompare(a.date));
  return <section className="lss-responsive-card"><h3 className="font-bold">Histórico financeiro</h3>{entries.length ? <ol className="mt-4 grid gap-3">{entries.map((item) => <li key={item.id} className="rounded border border-slate-200 p-3 text-sm"><h4 className="font-bold">{item.title}{item.amount !== undefined ? ` · ${formatCurrency(item.amount)}` : ""}</h4><p className="mt-2 break-words">{item.detail}</p><p>Data efectiva: {item.effectiveOn ? formatDate(item.effectiveOn) : "Ver movimento de origem"} · Registado: {item.date || "Instante anterior não disponível"} · {item.author ?? "Autor anterior não registado"}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">Sem movimentos financeiros.</p>}</section>;
}
