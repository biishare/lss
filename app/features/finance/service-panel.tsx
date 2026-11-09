"use client";
import { useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { formatCurrency, formatDate, getChargeBalance, paymentMethods, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { schoolToday } from "./domain/billing";
import { personCreditSources, receiptStatus } from "./service-model";
import { planService, type ServiceCommand } from "./service-commands";
import { PaymentDialog, type ServiceExecute } from "./payment-dialog";
import { ReceiptDialog } from "./receipt-view";

type CorrectionTarget = { studentId: string; paymentId: string };
function CorrectionSession({ state, target, execute, onClose }: { state: DemoState; target: CorrectionTarget; execute: ServiceExecute; onClose(): void }) {
  const payment = state.paymentRecords.find((item) => item.studentId === target.studentId)?.payments.find((item) => item.id === target.paymentId);
  const [draft, setDraft] = useState<PaymentLaunchDraft>(() => ({ studentId: target.studentId, category: "registration", monthKey: state.paymentSettings.startMonth, targetChargeId: "", amount: String(payment?.amount ?? 0), paidOn: payment?.effectivePaymentDate ?? payment?.paidOn ?? "", method: payment?.method ?? "Numerário", description: payment?.observation ?? "", evidenceReference: payment?.reference ?? payment?.legacyReference, allowFutureAllocation: true, selectedChargeIds: [] }));
  return <PaymentDialog state={state} draft={draft} onChange={setDraft} onClose={onClose} correction={target} execute={execute} confirm={() => { throw new Error("Use a operação de correcção."); }}/>;
}

export function FinanceServicePanel({ state, studentId, yearId, readOnly, execute, correctionTarget, onCloseCorrection }: {
  state: DemoState; studentId: string; yearId: string; readOnly: boolean; execute: ServiceExecute;
  correctionTarget: CorrectionTarget | null; onCloseCorrection(): void;
}) {
  const [open, setOpen] = useState(false), [filter, setFilter] = useState("");
  const [command, setCommand] = useState<ServiceCommand | null>(null), [preview, setPreview] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null), [localCorrection, setLocalCorrection] = useState<CorrectionTarget | null>(null);
  const [id, setId] = useState(() => crypto.randomUUID());
  const busy = useRef(false);
  const selected = filter || studentId || state.students[0]?.id || "";
  const credit = personCreditSources(state, selected), today = schoolToday({ now: () => new Date().toISOString() });
  const proofs = state.paymentProofs ?? [], pending = proofs.filter((item) => item.status === "pending");
  const proof = command?.kind === "review-proof" ? proofs.find((item) => item.id === command.proofId) : undefined;
  const target = command?.kind === "apply-credit" ? state.paymentRecords.find((item) => item.studentId === command.studentId) : undefined;
  const correction = correctionTarget ?? localCorrection;
  const update = (next: ServiceCommand) => {
    setCommand(next); setPreview(false); setError("");
    try { sessionStorage.setItem(`lss-service-draft-${state.datasetId}`, JSON.stringify({ command: next, id: id })); } catch { /* In-memory draft stays usable. */ }
  };
  const start = (next: ServiceCommand) => { const nextId = crypto.randomUUID(); setId(nextId); update(next); };
  const plan = (() => { if (!command) return undefined; try { return planService(state, command, { id: id, role: "secretaria", recordedAt: new Date().toISOString() }); } catch { return undefined; } })();
  function submit(event: FormEvent) {
    event.preventDefault(); if (!command || busy.current) return;
    busy.current = true; setError("");
    try {
      planService(state, command, { id: id, role: "secretaria", recordedAt: new Date().toISOString() });
      if (!preview) { setPreview(true); return; }
      const result = execute(command, id);
      setNotice(result.message); setCommand(null); if (result.receipt) setReceipt(result.receipt);
      try { sessionStorage.removeItem(`lss-service-draft-${state.datasetId}`); } catch { /* Confirmation already persisted. */ }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar. O preenchimento foi conservado."); }
    finally { busy.current = false; }
  }
  return <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4" data-workspace-secondary>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Conferência e movimentos</h3><p className="text-sm text-slate-500">{pending.length} comprovativos em análise · recibos, crédito e devoluções</p></div><Button variant="outlined" onClick={() => setOpen(true)}>Consultar movimentos</Button></div>
    {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
    <Dialog open={open && !command && !receipt && !correction} fullWidth maxWidth="md" onClose={() => setOpen(false)} aria-labelledby="finance-operations-title"><DialogTitle id="finance-operations-title">Conferência e movimentos</DialogTitle><DialogContent dividers>
      <TextField select fullWidth label="Aluno / Matrícula" value={selected} slotProps={{ select: { native: true } }} onChange={(event) => setFilter(event.target.value)}>{state.students.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.academicYearId} · {item.registrationNumber}</option>)}</TextField>
      <h3 className="mt-6 mb-3 font-bold">Crédito desta pessoa</h3>
      {credit.length ? credit.map((source) => <div key={`${source.studentId}-${source.payment.id}`} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-3 text-sm"><div><strong>{formatCurrency(source.available)}</strong><p>Ano {source.year} · Origem {source.payment.id}</p></div>{!readOnly && <div className="flex flex-wrap gap-2"><Button onClick={() => start({ kind: "apply-credit", sourceStudentId: source.studentId, paymentId: source.payment.id, studentId: selected, chargeIds: [], amount: String(source.available), effectiveOn: today, reason: "" })}>Aplicar crédito</Button><Button color="error" onClick={() => start({ kind: "refund", studentId: source.studentId, paymentId: source.payment.id, amount: String(source.available), method: "Numerário", effectiveOn: today, reason: "" })}>Registar devolução</Button></div>}</div>) : <p className="text-sm text-slate-500">Sem crédito disponível.</p>}
      <h3 className="mt-6 mb-3 font-bold">Comprovativos para conferência</h3>
      {proofs.length ? proofs.map((item) => <section key={item.id} className="my-3 rounded border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.reference} · {formatCurrency(item.draft.amount)}</strong><Chip size="small" label={item.status === "pending" ? "Em análise" : item.status === "confirmed" ? "Conferido" : "Rejeitado"}/></div><p className="mt-2">{state.students.find((student) => student.id === item.studentId)?.fullName} · {item.draft.method} · {formatDate(item.draft.paidOn)}</p><p>{item.note || "Sem observação adicional"}</p>{item.decision && <p>Decisão: {item.decision} · {item.reviewedBy}</p>}{item.status === "pending" && !readOnly && <Button onClick={() => start({ kind: "review-proof", proofId: item.id, confirm: true, decision: "" })}>Conferir comprovativo {item.reference}</Button>}</section>) : <p className="text-sm text-slate-500">Sem comprovativos registados.</p>}
      <h3 className="mt-6 mb-3 font-bold">Recebimentos de {yearId}</h3>
      {state.paymentRecords.filter((record) => state.students.find((item) => item.id === record.studentId)?.academicYearId === yearId && (!filter || record.studentId === filter)).flatMap((record) => record.payments.filter((payment) => payment.kind !== "credit-application").map((payment) => {
        const stored = state.receipts.find((item) => item.studentId === record.studentId && item.paymentId === payment.id);
        return <div key={`${record.studentId}-${payment.id}`} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-3 text-sm"><div><strong>{state.students.find((item) => item.id === record.studentId)?.fullName} · {formatCurrency(payment.amount)}</strong><p>{formatDate(payment.effectivePaymentDate ?? payment.paidOn)} · {payment.method}{payment.reversedBy ? " · Anulado por correcção" : ""}</p><p className="text-xs text-slate-500">{payment.id}</p></div><div>{stored && <Button onClick={() => setReceipt(stored)}>Abrir {stored.id}</Button>}{!readOnly && !payment.reversedBy && <Button onClick={() => setLocalCorrection({ studentId: record.studentId, paymentId: payment.id })}>Corrigir recebimento</Button>}</div></div>;
      }))}
      <h3 className="mt-6 mb-3 font-bold">Histórico de crédito e devoluções</h3>
      {state.paymentRecords.flatMap((record) => (record.creditDebits ?? []).map((item) => <p key={item.id} className="border-b border-slate-100 py-3 text-sm">{item.kind === "refund" ? "Devolução" : "Crédito entre anos"} · {formatCurrency(item.amount)} · {item.method} · {formatDate(item.effectiveOn)}<span className="block">{item.reason} · {item.recordedBy} · Origem {item.paymentId}</span></p>))}
      {!readOnly && <Button sx={{ mt: 2 }} onClick={() => { try { const saved = JSON.parse(sessionStorage.getItem(`lss-service-draft-${state.datasetId}`) ?? "null"); if (saved?.command?.kind && typeof saved.id === "string") { setId(saved.id); setCommand(saved.command); setPreview(false); } else setNotice("Sem preenchimento anterior para retomar."); } catch { setNotice("Não foi possível recuperar o preenchimento anterior."); } }}>Retomar preenchimento anterior</Button>}
    </DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Fechar</Button></DialogActions></Dialog>
    {command && <Dialog open fullWidth maxWidth="sm" onClose={() => setCommand(null)} aria-labelledby="service-action-title"><DialogTitle id="service-action-title">{command.kind === "review-proof" ? "Conferir comprovativo" : command.kind === "refund" ? "Registar devolução" : "Aplicar crédito"}</DialogTitle><DialogContent dividers><form id="finance-service-operation" className="grid gap-4" onSubmit={submit}>
      {error && <Alert severity="error">{error}</Alert>}
      {command.kind === "review-proof" && <><p className="text-sm">Compare estes dados com a evidência apresentada.</p><section className="rounded bg-slate-50 p-4 text-sm"><p>Referência: {proof?.reference}</p><p>Aluno: {state.students.find((item) => item.id === proof?.studentId)?.fullName}</p><p>Valor: {proof?.draft.amount} MT · {proof?.draft.method}</p><p>Data efectiva: {proof?.draft.paidOn}</p><p>Registado por: {proof?.recordedBy}</p></section><TextField select label="Decisão" value={command.confirm ? "confirm" : "reject"} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, confirm: event.target.value === "confirm" })}><option value="confirm">Confirmar recebimento</option><option value="reject">Rejeitar comprovativo</option></TextField><TextField label="Resultado da conferência / Motivo" value={command.decision} onChange={(event) => update({ ...command, decision: event.target.value })} required/></>}
      {command.kind === "apply-credit" && <><p className="text-sm break-words">Origem: {command.paymentId}. A aplicação não gera nova entrada de dinheiro.</p><TextField select label="Matrícula de destino" value={command.studentId} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, studentId: event.target.value, chargeIds: [] })}>{state.students.filter((student) => (student.personId ?? student.id) === (state.students.find((item) => item.id === command.sourceStudentId)?.personId ?? command.sourceStudentId)).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.academicYearId}</option>)}</TextField><TextField select label="Cobrança a liquidar" value={command.chargeIds[0] ?? ""} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, chargeIds: [event.target.value] })}><option value="">Seleccione uma cobrança</option>{target?.charges.filter((item) => getChargeBalance(target, item) + (target.penaltyCharges ?? []).filter((penalty) => penalty.baseChargeId === item.id).reduce((sum, penalty) => sum + getChargeBalance(target, penalty), 0) > 0).map((item) => <option key={item.id} value={item.id}>{item.description} · {formatCurrency(getChargeBalance(target, item))}</option>)}</TextField></>}
      {(command.kind === "apply-credit" || command.kind === "refund") && <><TextField label="Valor (MT)" value={command.amount} type="number" slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} onChange={(event) => update({ ...command, amount: event.target.value })} required/><TextField label="Data efectiva" value={command.effectiveOn} type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }} onChange={(event) => update({ ...command, effectiveOn: event.target.value })} required/>{command.kind === "refund" && <TextField select label="Forma de devolução" value={command.method} slotProps={{ select: { native: true } }} onChange={(event) => update({ ...command, method: event.target.value })}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</TextField>}<TextField label="Motivo" value={command.reason} onChange={(event) => update({ ...command, reason: event.target.value })} required/></>}
      {preview && plan && <Alert severity="warning">{plan.details.map((item) => <p key={item}>{item}</p>)}</Alert>}
    </form></DialogContent><DialogActions sx={{ flexWrap: "wrap" }}><Button onClick={() => setCommand(null)}>Fechar e conservar preenchimento</Button><Button variant="contained" type="submit" form="finance-service-operation">{preview ? "Confirmar operação" : "Rever efeito"}</Button></DialogActions></Dialog>}
    {correction && <CorrectionSession key={`${correction.studentId}-${correction.paymentId}`} state={state} target={correction} execute={execute} onClose={() => { setLocalCorrection(null); onCloseCorrection(); }}/>}
    {receipt && <ReceiptDialog receipt={receipt} status={receiptStatus(state, receipt)} onClose={() => setReceipt(null)} onPrint={() => window.print()}/>}
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
