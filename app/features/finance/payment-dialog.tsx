"use client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { getChargeBalance, formatCurrency, monthLabel, paymentMethods, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { prepareConfirmedPayment } from "../demo/payment-command";
import { samePerson } from "./service-model";
import { planService, type ServiceCommand } from "./service-commands";
import { ReceiptContent } from "./receipt-view";
import { schoolToday } from "./domain/billing";

export type ServiceExecute = (command: ServiceCommand, id: string) => { receipt?: PaymentReceipt | null; message: string };
export function PaymentDialog({ onOpenCash, state, draft, onChange, onClose, confirm, execute, commandId, correction }: {
  onOpenCash?(): void;
  state: DemoState; draft: PaymentLaunchDraft; onChange(draft: PaymentLaunchDraft): void; onClose(): void;
  confirm(draft: PaymentLaunchDraft, id: string): PaymentReceipt; execute: ServiceExecute;
  commandId?: string | null; correction?: { studentId: string; paymentId: string };
}) {
  const [id] = useState(() => commandId ?? crypto.randomUUID());
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null), [outcome, setOutcome] = useState("");
  const [recordedAt] = useState(() => new Date().toISOString());
  const student = state.students.find((item) => item.id === draft.studentId);
  const record = state.paymentRecords.find((item) => item.studentId === draft.studentId);
  const original = correction ? state.paymentRecords.find((item) => item.studentId === correction.studentId)?.payments.find((item) => item.id === correction.paymentId) : undefined;
  const months = state.academic?.years.find((item) => item.id === student?.academicYearId)?.billingMonths ?? [];
  const preview = useMemo(() => {
    try {
      if (correction) {
        const plan = planService(state, { kind: "replace-payment", ...correction, draft, reason }, { id: id, role: "secretaria", recordedAt });
        return { receipt: plan.receipt, details: plan.details, error: "" };
      }
      return { receipt: prepareConfirmedPayment(state, { commandId: id, draft, recordedAt }).receipt, details: [], error: "" };
    } catch (failure) { return { receipt: undefined, details: [], error: failure instanceof Error ? failure.message : "Reveja o pagamento." }; }
  }, [state, draft, correction, reason, recordedAt, id]);
  const update = (patch: Partial<PaymentLaunchDraft>) => { setError(""); onChange({ ...draft, ...patch }); };
  const alternatives = state.paymentRecords.filter((item) => samePerson(state, draft.studentId, item.studentId)).flatMap((item) => item.charges.filter((charge) => getChargeBalance(item, charge) + (item.penaltyCharges ?? []).filter((penalty) => penalty.baseChargeId === charge.id).reduce((sum, penalty) => sum + getChargeBalance(item, penalty), 0) > 0).map((charge) => ({ record: item, charge, year: state.students.find((student) => student.id === item.studentId)?.academicYearId })));
  function submit(event: FormEvent, proof = false) {
    event.preventDefault(); if (submitting.current) return;
    setError(""); submitting.current = true; setBusy(true);
    try {
      if (preview.error && !proof) throw new Error(preview.error);
      if (correction) {
        const result = execute({ kind: "replace-payment", ...correction, draft, reason }, id);
        setReceipt(result.receipt ?? null); setOutcome(result.message);
      } else if (proof) {
        const result = execute({ kind: "save-proof", draft, reference: draft.evidenceReference ?? draft.reference ?? "", note: draft.lateReason ?? draft.description }, id);
        setOutcome(result.message);
      } else {
        if (draft.method !== "Numerário" && !(draft.evidenceReference ?? draft.reference)?.trim()) throw new Error("Indique o comprovativo conferido antes de confirmar.");
        setReceipt(confirm(draft, id));
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar. O preenchimento foi conservado."); }
    finally { submitting.current = false; setBusy(false); }
  }
  const title = receipt ? `Recibo ${receipt.id}` : correction ? "Corrigir recebimento" : "Registar pagamento";
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !busy && onClose()} aria-labelledby="payment-dialog-title" slotProps={{ paper: { sx: { m: { xs: 1, sm: 4 }, width: { xs: "calc(100% - 16px)", sm: "100%" }, maxHeight: "calc(100dvh - 16px)" } } }}>
    <DialogTitle id="payment-dialog-title">{title}<p className="mt-1 text-sm font-normal text-slate-500">{student?.fullName} · {student?.registrationNumber} · {student?.academicYearId ?? state.paymentSettings.academicYear} · {draft.category === "tuition" ? `Mensalidade de ${monthLabel(draft.monthKey)}` : draft.category === "registration" ? "Inscrição / Renovação" : draft.description || "Outro item"}</p></DialogTitle>
    <DialogContent dividers>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {receipt ? <ReceiptContent receipt={receipt}/> : outcome ? <Alert severity="success">{outcome}</Alert> : <form id="payment-service-form" onSubmit={submit} className="grid gap-4">
        <TextField select label={correction ? "Aluno do recebimento corrigido" : "Aluno"} value={draft.studentId} onChange={(event) => update({ studentId: event.target.value, targetChargeId: "", selectedChargeIds: [], additionalTargets: [], primaryAllocationAmount: undefined })} slotProps={{ select: { native: true } }}>{state.students.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.academicYearId} · {item.registrationNumber}</option>)}</TextField>
        {correction && <><Alert severity="info">O original fica anulado e ligado ao substituto. O valor físico recebido mantém-se em {formatCurrency(original?.amount ?? 0)}.</Alert><TextField label="Motivo da correcção" value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} required/></>}
        <div className="grid gap-4 sm:grid-cols-2"><TextField select label="Item" value={draft.category} slotProps={{ select: { native: true } }} onChange={(event) => update({ category: event.target.value as PaymentLaunchDraft["category"], targetChargeId: "", creditOnly: false, selectedChargeIds: [], additionalTargets: [], primaryAllocationAmount: undefined })}><option value="registration">Inscrição / Renovação</option><option value="tuition">Mensalidade</option><option value="miscellaneous">Outro item</option></TextField>
        {draft.category === "tuition" && <TextField select label="Mês da mensalidade" value={draft.monthKey} slotProps={{ select: { native: true } }} onChange={(event) => update({ monthKey: event.target.value, targetChargeId: "" })}>{(months.length ? months : [draft.monthKey]).map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}</TextField>}
        {draft.category === "miscellaneous" && <TextField select label="Cobrança" value={draft.targetChargeId ?? ""} slotProps={{ select: { native: true } }} onChange={(event) => update({ targetChargeId: event.target.value })}><option value="">Novo item</option>{record?.charges.filter((item) => item.category === "miscellaneous").map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}</TextField>}</div>
        {draft.category === "miscellaneous" && !draft.targetChargeId && !draft.creditOnly && <TextField label="Descrição do item" value={draft.description} onChange={(event) => update({ description: event.target.value })} required/>}
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Valor recebido" type="number" required disabled={Boolean(correction)} value={draft.amount} slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} onChange={(event) => update({ amount: event.target.value })}/><TextField label="Data efectiva do pagamento" type="date" required value={draft.paidOn} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: schoolToday({ now: () => recordedAt }) } }} onChange={(event) => update({ paidOn: event.target.value })}/></div>
        <TextField select label="Forma de pagamento" value={draft.method} slotProps={{ select: { native: true } }} onChange={(event) => update({ method: event.target.value })}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</TextField>
        {(draft.method !== "Numerário" || draft.paidOn < schoolToday({ now: () => recordedAt })) && <><TextField label="Referência do comprovativo" value={draft.evidenceReference ?? ""} onChange={(event) => update({ evidenceReference: event.target.value })}/><TextField label="Motivo da apresentação posterior / Observação" value={draft.lateReason ?? ""} onChange={(event) => update({ lateReason: event.target.value })}/></>}
        {!draft.creditOnly && draft.category === "tuition" && <FormControlLabel control={<Checkbox checked={draft.allowFutureAllocation} onChange={(event) => update({ allowFutureAllocation: event.target.checked })}/>} label="Confirmar antecipação do mês seleccionado"/>}
        <FormControlLabel control={<Checkbox checked={Boolean(draft.creditOnly)} onChange={(event) => update({ creditOnly: event.target.checked, selectedChargeIds: [], additionalTargets: [], primaryAllocationAmount: undefined })}/>} label="Receber apenas como crédito, sem liquidar cobranças"/>
        {!draft.creditOnly && <details className="rounded border border-slate-200 p-3"><summary className="cursor-pointer font-semibold text-sm">Acrescentar outras cobranças desta pessoa</summary><p className="my-2 text-xs text-slate-500">A selecção inicial é mantida. As mais antigas aparecem primeiro; o excedente só é distribuído pelos itens escolhidos.</p>{alternatives.sort((a, b) => (a.charge.dueOn ?? "").localeCompare(b.charge.dueOn ?? "")).filter(({ record: r, charge }) => !(r.studentId === draft.studentId && (charge.id === draft.targetChargeId || (charge.category === draft.category && (draft.category === "registration" || charge.monthKey === draft.monthKey))))).map(({ record: r, charge, year }) => {
          const target = draft.additionalTargets?.find((item) => item.studentId === r.studentId && item.chargeId === charge.id);
          return <div key={`${r.studentId}-${charge.id}`}><FormControlLabel sx={{ display: "flex", alignItems: "flex-start", m: 0 }} control={<Checkbox checked={Boolean(target)} onChange={(event) => update({ additionalTargets: event.target.checked ? [...(draft.additionalTargets ?? []), { studentId: r.studentId, chargeId: charge.id }] : draft.additionalTargets?.filter((item) => item.chargeId !== charge.id || item.studentId !== r.studentId) })}/>} label={<span className="text-sm">{charge.description} · {year} · {formatCurrency(getChargeBalance(r, charge))}</span>}/>{target && <TextField size="small" fullWidth type="number" label={`Aplicar a ${charge.description} · ${year} (MT)`} value={target.amount ?? ""} placeholder="Até ao saldo disponível" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ additionalTargets: draft.additionalTargets?.map((item) => item === target ? { ...item, amount: event.target.value } : item) })}/>}</div>;

        })}</details>}
        {Boolean(draft.additionalTargets?.length) && <TextField label="Aplicar ao item seleccionado (MT)" type="number" value={draft.primaryAllocationAmount ?? ""} placeholder="Até ao saldo do item" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ primaryAllocationAmount: event.target.value })}/>}
        {preview.receipt && <section className="rounded-lg bg-slate-50 p-4 text-sm" aria-label="Prévia da distribuição"><h3 className="font-bold">Distribuição antes de confirmar</h3>{preview.receipt.items.map((item, index) => <div className="mt-3 flex justify-between gap-3" key={`${item.chargeId}-${index}`}><span>{item.label} · {item.academicYearId}<small className="block text-slate-500">Saldo após: {formatCurrency(item.balanceAfter)}</small></span><strong>{formatCurrency(item.amount)}</strong></div>)}<p className="mt-4 font-semibold">Crédito após este recebimento: {formatCurrency(preview.receipt.unallocatedAmount)}</p></section>}
        {preview.details.length > 0 && <Alert severity="warning">{preview.details.map((detail) => <p key={detail}>{detail}</p>)}</Alert>}
        {preview.error && <div className="text-sm text-slate-600"><p>{preview.error}</p>{/caixa/i.test(preview.error) && onOpenCash && <Button onClick={onOpenCash}>Consultar caixa e conservar preenchimento</Button>}</div>}
      </form>}
    </DialogContent>
    <DialogActions sx={{ flexWrap: "wrap", gap: 1, p: 2 }}><Button onClick={onClose} disabled={busy}>{receipt || outcome ? "Fechar" : "Fechar e conservar preenchimento"}</Button>
      {receipt ? <Button onClick={() => { try { window.print(); } catch { setError("O recibo está guardado. Tente imprimir novamente."); } }}>Imprimir / Guardar PDF</Button> : !outcome && <>{!correction && draft.method !== "Numerário" && <Button disabled={busy} onClick={(event) => submit(event, true)}>Guardar para conferência</Button>}<Button type="submit" form="payment-service-form" variant="contained" disabled={busy}>{busy ? "A guardar…" : correction ? "Confirmar correcção" : draft.method === "Numerário" ? "Confirmar pagamento" : "Confirmar após conferência"}</Button></>}
    </DialogActions>
  </Dialog>;
}
