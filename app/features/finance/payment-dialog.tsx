"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { getChargeBalance, formatCurrency, monthLabel, paymentMethods, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { prepareConfirmedPayment } from "../demo/payment-command";
import { samePerson, pendingProofFor, receiptStatus } from "./service-model";
import { planService, type ServiceCommand } from "./service-commands";
import { ReceiptContent } from "./receipt-view";
import { TaskSurface } from "../../components/task-surface";
import { FinanceCellDialog } from "../../components/school-admin-demo.components";
import { paymentContext, type PaymentChoice } from "./payment-context";
import { StudentSearch } from "./student-search";
import { schoolToday } from "./domain/billing";

export type ServiceExecute = (command: ServiceCommand, id: string) => { receipt?: PaymentReceipt | null; message: string };
export function PaymentDialog({ onOpenCash, state, draft, onChange, onClose, confirm, execute, commandId, correction, entryMode, canResume = false, draftNotice, correctionReason, onCorrectionReasonChange, hasUnpreservedChanges, onCommandId, onCompleted, onOpenProofs }: {
  onCommandId?(id: string): void; onCompleted?(): void;
  entryMode?: "student" | "charge" | "payment"; canResume?: boolean; draftNotice?: string;
  hasUnpreservedChanges?: boolean; correctionReason?: string; onCorrectionReasonChange?(reason: string): void;
  onOpenCash?(): void; onOpenProofs?(): void;
  state: DemoState; draft: PaymentLaunchDraft; onChange(draft: PaymentLaunchDraft): void; onClose(): void;
  confirm(draft: PaymentLaunchDraft, id: string): PaymentReceipt; execute: ServiceExecute;
  commandId?: string | null; correction?: { studentId: string; paymentId: string };
}) {
  const [id] = useState(() => commandId ?? crypto.randomUUID());
  useEffect(() => { onCommandId?.(id); }, [id, onCommandId]);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [localReason, setLocalReason] = useState("");
  const reason = correctionReason ?? localReason;
  const changeReason = (value: string) => { setLocalReason(value); onCorrectionReasonChange?.(value); setError(""); };
  const [stage, setStage] = useState<"student" | "charge" | "payment" | "detail">(() => entryMode ?? (draft.studentId ? "payment" : "student"));
  const [proofChecked, setProofChecked] = useState(false), [distributing, setDistributing] = useState(false);
  const [historicalReceipt, setHistoricalReceipt] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null), [outcome, setOutcome] = useState("");
  const [recordedAt] = useState(() => new Date().toISOString());
  const context = useMemo(() => paymentContext(state, draft.studentId, recordedAt), [state, draft.studentId, recordedAt]);
  const student = context?.row.student;
  const original = correction ? state.paymentRecords.find((item) => item.studentId === correction.studentId)?.payments.find((item) => item.id === correction.paymentId) : undefined;
  const preview = useMemo(() => {
    try {
      if (stage === "student" || stage === "charge") return { receipt: undefined, details: [], error: "" };
      if (correction) {
        const plan = planService(state, { kind: "replace-payment", ...correction, draft, reason }, { id: id, role: "secretaria", recordedAt });
        return { receipt: plan.receipt, details: plan.details, error: "" };
      }
      return { receipt: prepareConfirmedPayment(state, { commandId: id, draft, recordedAt }).receipt, details: [], error: "" };
    } catch (failure) { return { receipt: undefined, details: [], error: failure instanceof Error ? failure.message : "Reveja o pagamento." }; }
  }, [state, draft, correction, reason, recordedAt, id, stage]);
  const update = (patch: Partial<PaymentLaunchDraft>) => {
    setError("");
    if (["method", "amount", "paidOn", "evidenceReference", "studentId", "targetChargeId"].some((key) => key in patch)) setProofChecked(false);
    onChange({ ...draft, ...patch });
  };
  function chooseStudent(studentId: string) {
    update({ studentId, category: "tuition", monthKey: "", targetChargeId: "", amount: correction ? draft.amount : "", paidOn: correction ? draft.paidOn : schoolToday({ now: () => recordedAt }), method: correction ? draft.method : "Numerário", description: "", evidenceReference: correction ? draft.evidenceReference : "", reference: correction ? draft.reference : "", lateReason: correction ? draft.lateReason : "", additionalTargets: [], selectedChargeIds: [], creditOnly: false, primaryAllocationAmount: undefined, allowFutureAllocation: false });
    setStage("charge");
  }
  function chooseCharge(choice: PaymentChoice) {
    update({ ...choice.draft, amount: correction ? String(original?.amount ?? draft.amount) : choice.draft.amount, additionalTargets: [], selectedChargeIds: [], creditOnly: false, primaryAllocationAmount: undefined, allowFutureAllocation: false });
    setStage("payment");
  }
  const alternatives = state.paymentRecords.filter((item) => samePerson(state, draft.studentId, item.studentId)).flatMap((item) => item.charges.filter((charge) => getChargeBalance(item, charge) + (item.penaltyCharges ?? []).filter((penalty) => penalty.baseChargeId === charge.id).reduce((sum, penalty) => sum + getChargeBalance(item, penalty), 0) > 0).map((charge) => ({ record: item, charge, year: state.students.find((student) => student.id === item.studentId)?.academicYearId })));
  function submit(event: FormEvent, proof = false) {
    event.preventDefault(); if (submitting.current || stage !== "payment") return;
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
      onCompleted?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar. O preenchimento foi conservado."); }
    finally { submitting.current = false; setBusy(false); }
  }
  const pendingProof = pendingProofFor(state, draft.studentId, draft.targetChargeId, draft.category === "tuition" ? draft.monthKey : undefined);
  const currentChoice = context?.choices.find((choice) => choice.draft.category === draft.category && (draft.category === "tuition" ? choice.draft.monthKey === draft.monthKey : draft.category !== "miscellaneous" || choice.draft.targetChargeId === draft.targetChargeId));
  const itemLabel = draft.creditOnly ? "Recebimento como crédito" : currentChoice?.label ?? (draft.category === "tuition" ? `Mensalidade de ${monthLabel(draft.monthKey)}` : draft.category === "registration" ? "Inscrição / Renovação" : draft.description || "Outro item");
  const saveForReview = !correction && draft.method !== "Numerário" && !proofChecked;
  const title = receipt ? `Recibo ${receipt.id}` : outcome ? "Comprovativo guardado" : stage === "student" ? "Escolher aluno" : stage === "charge" ? "Escolher cobrança" : stage === "detail" ? "Consultar cobrança" : correction ? "Corrigir recebimento" : "Registar pagamento";
  const extended = Boolean(correction || ((stage === "payment" || stage === "detail") && (distributing || draft.additionalTargets?.length || draft.selectedChargeIds?.length)));
  const returnToForm = (event?: { preventDefault(): void }) => { event?.preventDefault(); setStage("payment"); };
  return <TaskSurface title={title} onClose={onClose} busy={busy}
    mobile={receipt || extended ? "full-screen" : "sheet"} tall={!receipt && !outcome}
    dirty={(!receipt || historicalReceipt) && !outcome && (hasUnpreservedChanges ?? Boolean(correction && reason))}
    closeNotice={!receipt && !outcome && stage === "payment" ? draftNotice || "O preenchimento mantém-se neste separador." : undefined}
    subtitle={stage !== "student" && student ? <>{student.fullName} · {student.registrationNumber} · {student.academicYearId ?? state.paymentSettings.academicYear}{stage === "payment" || stage === "detail" ? ` · ${itemLabel}` : ""}</> : "Pesquise e escolha o aluno para iniciar o atendimento."}
    actions={(close) => <>
      <Button key="close" type="button" onClick={close} disabled={busy}>Fechar</Button>
      {receipt ? <>{historicalReceipt && <Button key="back-to-detail" type="button" onClick={(event) => { event.preventDefault(); setReceipt(null); setHistoricalReceipt(false); setStage("detail"); }}>Voltar à cobrança</Button>}<Button key="print" type="button" variant="contained" onClick={() => { try { window.print(); } catch { setError("O recibo está guardado. Tente imprimir novamente."); } }}>Imprimir / Guardar PDF</Button></> : !outcome && stage === "payment" ? <Button key="submit-payment" type="submit" form="payment-service-form" variant="contained" disabled={busy}>{busy ? "A guardar…" : correction ? "Confirmar correcção" : saveForReview ? "Guardar para conferência" : draft.method === "Numerário" ? "Confirmar pagamento" : "Confirmar após conferência"}</Button> : stage === "detail" ? <Button key="back-to-payment" type="button" variant="contained" onClick={returnToForm}>Voltar ao pagamento</Button> : null}
    </>}>
    {error && <Alert ref={errorRef} tabIndex={-1} severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {receipt ? <ReceiptContent receipt={receipt} status={receiptStatus(state, receipt)}/> : outcome ? <Alert severity="success">{outcome} Não foi emitido recibo.</Alert> : <>
      {stage === "student" && <>
        {canResume && student && <Button variant="outlined" fullWidth sx={{ mb: 2 }} onClick={returnToForm}>Retomar pagamento de {student.fullName}</Button>}
        <StudentSearch students={state.students} onChoose={(item) => chooseStudent(item.id)} />
      </>}
      {stage === "charge" && <section className="grid gap-3" aria-label="Cobranças elegíveis">
        <Button sx={{ justifySelf: "start" }} onClick={() => setStage("student")}>Alterar aluno</Button>
        <p className="text-sm text-slate-600">Escolha o item a receber. Os meses previstos exigem confirmação da antecipação.</p>
        {context?.choices.map((choice) => <Button key={choice.key} variant="outlined" fullWidth sx={{ justifyContent: "space-between", textAlign: "left", minHeight: 56 }} onClick={() => chooseCharge(choice)} aria-label={`Receber ${choice.label}`}><span>{choice.label}{choice.forecast && <small className="block font-normal">Previsto · confirmação necessária</small>}</span><strong className="ml-3 whitespace-nowrap">{formatCurrency(choice.balance)}</strong></Button>)}
        {!context?.choices.length && <Alert severity="info">Este aluno não tem cobranças com saldo no ano escolhido.</Alert>}
        <details className="rounded border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Outras opções</summary><div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => { update({ creditOnly: true, amount: "", additionalTargets: [], selectedChargeIds: [] }); returnToForm(); }}>Receber como crédito</Button>
          <Button onClick={() => { update({ category: "miscellaneous", targetChargeId: "", amount: "", description: "", creditOnly: false, additionalTargets: [], selectedChargeIds: [] }); returnToForm(); }}>Registar outro item</Button>
        </div></details>
      </section>}
      {stage === "detail" && context && <FinanceCellDialog inline canManagePayments={false} row={context.row} months={context.months} settings={context.settings}
        selection={draft.category === "tuition" ? { kind: "tuition", studentId: draft.studentId, monthKey: draft.monthKey } : { kind: draft.category, studentId: draft.studentId }}
        studentContextLabel={[state.classes.find((item) => item.id === student?.classId)?.name, state.groups.find((item) => item.id === student?.groupId)?.name].filter(Boolean).join(" · ")}
        onClose={returnToForm} onRegisterPayment={() => {}} onCorrectPayment={() => {}} onCreateMiscellaneous={() => {}}
        onShowReceipt={(studentId, paymentId) => { const previous = state.receipts.find((item) => item.studentId === studentId && item.paymentId === paymentId); if (previous) { setReceipt(previous); setHistoricalReceipt(true); } else setError("O recibo anterior não está disponível. O preenchimento mantém-se conservado."); }} />}
      {stage === "payment" && <form id="payment-service-form" onSubmit={(event) => submit(event, saveForReview)} className="grid gap-4">
        <section aria-label="Contexto do pagamento" className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{student?.fullName}</p><p>{student?.registrationNumber} · {student?.academicYearId} · {itemLabel}</p>
          {currentChoice && <p className="mt-2">Por liquidar: <strong>{formatCurrency(currentChoice.balance)}</strong></p>}
          <div className="mt-2 flex flex-wrap gap-1"><Button size="small" onClick={() => setStage("charge")}>Alterar cobrança</Button><Button size="small" onClick={() => setStage("student")}>Alterar aluno</Button>{!draft.creditOnly && <Button size="small" onClick={() => setStage("detail")}>Consultar detalhe da cobrança</Button>}</div>
        </section>
        {!correction && pendingProof && <Alert severity="warning">Já existe um comprovativo em análise: {pendingProof.reference}. Confira-o antes de registar o mesmo recebimento novamente.{onOpenProofs && <Button onClick={onOpenProofs}>Conferir comprovativo</Button>}</Alert>}
        {correction && <><Alert severity="info">O original fica anulado e ligado ao substituto. O valor físico recebido mantém-se em {formatCurrency(original?.amount ?? 0)}.</Alert><TextField label="Motivo da correcção" value={reason} onChange={(event) => changeReason(event.target.value)} required/></>}
        {draft.category === "miscellaneous" && !draft.targetChargeId && !draft.creditOnly && <TextField label="Descrição do item" value={draft.description} onChange={(event) => update({ description: event.target.value })} required/>}
        <div className="grid gap-4 sm:grid-cols-2"><TextField name="amount" label="Valor recebido" type="number" required disabled={Boolean(correction)} value={draft.amount} slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} onChange={(event) => update({ amount: event.target.value })}/><TextField name="paidOn" label="Data efectiva do pagamento" type="date" required value={draft.paidOn} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: schoolToday({ now: () => recordedAt }) } }} onChange={(event) => update({ paidOn: event.target.value })}/></div>
        <TextField select label="Forma de pagamento" value={draft.method} slotProps={{ select: { native: true } }} onChange={(event) => update({ method: event.target.value })}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</TextField>
        {(draft.method !== "Numerário" || draft.paidOn < schoolToday({ now: () => recordedAt })) && <><TextField label="Referência do comprovativo" value={draft.evidenceReference ?? ""} onChange={(event) => update({ evidenceReference: event.target.value })}/><TextField label="Motivo da apresentação posterior / Observação" value={draft.lateReason ?? ""} onChange={(event) => update({ lateReason: event.target.value })}/></>}
        {draft.method !== "Numerário" && !correction && <><Alert severity="info">Guardar para conferência regista a evidência e mantém a dívida. Confirme o recebimento apenas depois de conferir o comprovativo.</Alert><FormControlLabel control={<Checkbox checked={proofChecked} onChange={(event) => setProofChecked(event.target.checked)} />} label="Conferi o comprovativo, o valor e a data" /></>}
        {!draft.creditOnly && currentChoice?.requiresAnticipation && <FormControlLabel control={<Checkbox checked={draft.allowFutureAllocation} onChange={(event) => update({ allowFutureAllocation: event.target.checked })}/>} label="Confirmar antecipação do mês seleccionado"/>}
        <details className="rounded border border-slate-200 p-3" open={draft.creditOnly || undefined}><summary className="cursor-pointer text-sm font-semibold">Outras opções do recebimento</summary>
          <FormControlLabel control={<Checkbox checked={Boolean(draft.creditOnly)} onChange={(event) => update({ creditOnly: event.target.checked, selectedChargeIds: [], additionalTargets: [], primaryAllocationAmount: undefined })}/>} label="Receber apenas como crédito, sem liquidar cobranças"/>
        {!draft.creditOnly && <details onToggle={(event) => setDistributing(event.currentTarget.open)} className="rounded border border-slate-200 p-3"><summary className="cursor-pointer font-semibold text-sm">Acrescentar outras cobranças desta pessoa</summary><p className="my-2 text-xs text-slate-500">A selecção inicial é mantida. As mais antigas aparecem primeiro; o excedente só é distribuído pelos itens escolhidos.</p>{alternatives.sort((a, b) => (a.charge.dueOn ?? "").localeCompare(b.charge.dueOn ?? "")).filter(({ record: r, charge }) => !(r.studentId === draft.studentId && (charge.id === draft.targetChargeId || (charge.category === draft.category && (draft.category === "registration" || charge.monthKey === draft.monthKey))))).map(({ record: r, charge, year }) => {
          const target = draft.additionalTargets?.find((item) => item.studentId === r.studentId && item.chargeId === charge.id);
          return <div key={`${r.studentId}-${charge.id}`}><FormControlLabel sx={{ display: "flex", alignItems: "flex-start", m: 0 }} control={<Checkbox checked={Boolean(target)} onChange={(event) => update({ additionalTargets: event.target.checked ? [...(draft.additionalTargets ?? []), { studentId: r.studentId, chargeId: charge.id }] : draft.additionalTargets?.filter((item) => item.chargeId !== charge.id || item.studentId !== r.studentId) })}/>} label={<span className="text-sm">{charge.description} · {year} · {formatCurrency(getChargeBalance(r, charge))}</span>}/>{target && <TextField size="small" fullWidth type="number" label={`Aplicar a ${charge.description} · ${year} (MT)`} value={target.amount ?? ""} placeholder="Até ao saldo disponível" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ additionalTargets: draft.additionalTargets?.map((item) => item === target ? { ...item, amount: event.target.value } : item) })}/>}</div>;

        })}</details>}
        {Boolean(draft.additionalTargets?.length) && <TextField label="Aplicar ao item seleccionado (MT)" type="number" value={draft.primaryAllocationAmount ?? ""} placeholder="Até ao saldo do item" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} onChange={(event) => update({ primaryAllocationAmount: event.target.value })}/>}

        </details>
        {preview.receipt && <section className="rounded-lg bg-slate-50 p-4 text-sm" aria-label="Prévia da distribuição"><h3 className="font-bold">Distribuição antes de confirmar</h3>{preview.receipt.items.map((item, index) => <div className="mt-3 flex justify-between gap-3" key={`${item.chargeId}-${index}`}><span>{item.label} · {item.academicYearId}<small className="block text-slate-500">Saldo após: {formatCurrency(item.balanceAfter)}</small></span><strong>{formatCurrency(item.amount)}</strong></div>)}<p className="mt-4 font-semibold">Crédito deste recebimento: {formatCurrency(preview.receipt.unallocatedAmount)}</p></section>}
        {preview.details.length > 0 && <Alert severity="warning">{preview.details.map((detail) => <p key={detail}>{detail}</p>)}</Alert>}
        {preview.error && <div className="text-sm text-slate-600"><p>{preview.error}</p>{/caixa/i.test(preview.error) && onOpenCash && <Button onClick={onOpenCash}>Consultar caixa e conservar preenchimento</Button>}</div>}

      </form>}
    </>}
  </TaskSurface>;
}
