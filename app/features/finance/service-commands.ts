import type { StudentPaymentRecord } from "../../lib/school-demo-data";
import { buildPaymentReceiptFromRecord, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import { cloneJson, type DemoData, type DemoState } from "../demo/demo-state";
import { prepareConfirmedPayment, validatePaymentDate } from "../demo/payment-command";
import type { DemoRepository } from "../demo/local-repository";
import { cents, money } from "./domain/money";
import { paymentCredit, samePerson, type CreditDebit, type PaymentProof } from "./service-model";
import { prepareBilling } from "./billing-commands";
import { allocateCredit } from "./credit-allocation";
import { assessPenalties, schoolToday } from "./domain/billing";
import { captureCashMovement, emptyCashBook } from "../cash/model";

export type ServiceCommand =
  | { kind: "save-proof"; draft: PaymentLaunchDraft; reference: string; note: string }
  | { kind: "review-proof"; proofId: string; confirm: boolean; decision: string }
  | { kind: "apply-credit"; sourceStudentId: string; paymentId: string; studentId: string; chargeIds: string[]; amount: string; effectiveOn: string; reason: string }
  | { kind: "refund"; studentId: string; paymentId: string; amount: string; effectiveOn: string; method: string; reason: string }
  | { kind: "replace-payment"; studentId: string; paymentId: string; draft: PaymentLaunchDraft; reason: string };
export type ServiceOptions = { id: string; recordedAt: string; role: "secretaria" | "director" };
export type ServicePlan = { patch: Partial<DemoData>; receipt?: PaymentReceipt; message: string; details: string[] };
const author = "Marta — Secretaria";
const requiredReason = (reason: string) => { if (!reason.trim()) throw new Error("Indique o motivo da operação."); };
function paymentRecord(state: DemoState, id: string) {
  const record = state.paymentRecords.find((item) => item.studentId === id);
  if (!record) throw new Error("A matrícula não tem registo financeiro.");
  return record;
}
function activePayment(record: StudentPaymentRecord, id: string) {
  const payment = record.payments.find((item) => item.id === id);
  if (!payment || payment.reversedBy) throw new Error("Seleccione um recebimento activo.");
  return payment;
}

export function planService(state: DemoState, command: ServiceCommand, options: ServiceOptions): ServicePlan {
  const current = cloneJson(state), { id, recordedAt } = options;
  if (options.role !== "secretaria") throw new Error("O Director pode consultar, mas não pode alterar os dados.");
  if (command.kind === "save-proof") {
    if (command.draft.method === "Numerário") throw new Error("O numerário deve ser confirmado no atendimento.");
    if (!command.reference.trim()) throw new Error("Indique a referência do comprovativo.");
    prepareConfirmedPayment(current, { commandId: id, recordedAt, deferCash: true, draft: { ...command.draft, evidenceReference: command.reference, lateReason: command.draft.lateReason || command.note } });
    if (current.paymentProofs?.some((item) => item.status !== "rejected" && item.reference.trim().toLowerCase() === command.reference.trim().toLowerCase() && item.draft.method === command.draft.method)) throw new Error("Este comprovativo já foi registado. Consulte a conferência existente.");
    const proof: PaymentProof = { id: `PROOF-${id}`, studentId: command.draft.studentId, draft: { ...command.draft, amount: money(cents(command.draft.amount)), additionalTargets: command.draft.additionalTargets?.map((target) => ({ ...target, amount: target.amount?.trim() ? money(cents(target.amount)) : undefined })), evidenceReference: command.reference, reference: command.reference }, reference: command.reference.trim(), note: command.note.trim(), status: "pending", recordedAt, recordedBy: author };
    return { patch: { paymentProofs: [...(current.paymentProofs ?? []), proof] }, message: "Comprovativo guardado para conferência. O saldo mantém-se por liquidar.", details: ["Estado: Em análise", "Sem recebimento ou recibo", "Lembretes das cobranças abrangidas suspensos"] };
  }
  if (command.kind === "review-proof") {
    requiredReason(command.decision);
    const proof = current.paymentProofs?.find((item) => item.id === command.proofId);
    if (!proof || proof.status !== "pending") throw new Error("Este comprovativo já não está em análise.");
    let prepared: ReturnType<typeof prepareConfirmedPayment> | undefined;
    if (command.confirm) prepared = prepareConfirmedPayment(current, { commandId: id, recordedAt, proofId: proof.id, draft: { ...proof.draft, amount: String(proof.draft.amount), additionalTargets: proof.draft.additionalTargets?.map((target) => ({ ...target, amount: target.amount === undefined ? undefined : String(target.amount) })), evidenceReference: proof.reference, lateReason: proof.draft.lateReason || command.decision } });
    return { patch: { ...prepared?.patch, paymentProofs: current.paymentProofs!.map((item) => item.id === proof.id ? { ...item, status: command.confirm ? "confirmed" as const : "rejected" as const, reviewedAt: recordedAt, reviewedBy: author, decision: command.decision.trim(), paymentId: prepared?.receipt.paymentId, receiptId: prepared?.receipt.id } : item) }, receipt: prepared?.receipt,
      message: command.confirm ? "Conferência confirmada e recibo emitido." : "Comprovativo rejeitado. O saldo mantém-se.", details: [`Referência: ${proof.reference}`, `Data: ${proof.draft.paidOn}`, `Valor: ${proof.draft.amount} MT`, command.confirm ? "Um único recebimento após conferência" : "Nenhum movimento de dinheiro"] };
  }
  if (command.kind === "replace-payment") {
    requiredReason(command.reason);
    const original = paymentRecord(current, command.studentId), payment = activePayment(original, command.paymentId);
    if (payment.kind === "credit-application") throw new Error("Seleccione o recebimento de origem para corrigir.");
    if (cents(command.draft.amount) !== cents(payment.amount)) throw new Error("A correcção conserva o valor físico recebido. Registe uma devolução separada quando aplicável.");
    if (original.creditDebits?.some((item) => item.paymentId === payment.id)) throw new Error("O crédito deste recebimento já foi aplicado noutro ano ou devolvido. Reveja esses movimentos antes de corrigir a origem.");
    const released = original.allocations.filter((item) => item.paymentId === payment.id);
    let originalReceipt = current.receipts.find((item) => item.studentId === command.studentId && item.paymentId === payment.id);
    if (!originalReceipt) {
      originalReceipt = buildPaymentReceiptFromRecord(current.students.find((item) => item.id === command.studentId)!, original, payment.id);
      if (originalReceipt) current.receipts.push(originalReceipt);
    }
    payment.reversedBy = `REV-${id}`;
    original.allocations = original.allocations.filter((item) => item.paymentId !== payment.id);
    original.reversals = [...(original.reversals ?? []), { id: `REV-${id}`, paymentId: payment.id, replacementStudentId: command.draft.studentId, replacementPaymentId: `PAY-${id}`, reason: command.reason.trim(), recordedAt, recordedBy: author, releasedAllocations: released }];
    const prepared = prepareConfirmedPayment(current, { commandId: id, recordedAt, replaces: { studentId: command.studentId, paymentId: payment.id }, reason: command.reason, draft: { ...command.draft, lateReason: command.draft.lateReason || command.reason, evidenceReference: command.draft.evidenceReference || `Correcção ${payment.id}` } });
    const replacement = prepared.patch.paymentRecords!.find((item) => item.studentId === command.draft.studentId)!.payments.find((item) => item.id === prepared.receipt.paymentId)!;
    replacement.kind = "replacement"; replacement.replaces = { studentId: command.studentId, paymentId: payment.id };
    prepared.receipt.replacesReceiptId = originalReceipt?.id;
    return { ...prepared, message: "Recebimento corrigido. Original preservado e documento substituto ligado.", details: [`Dívida reaberta na origem: ${money(released.reduce((sum, item) => sum + cents(item.amount), 0))} MT`, `Documento anulado: ${originalReceipt?.id ?? payment.id}`, `Crédito do substituto: ${prepared.receipt.unallocatedAmount} MT`, `Caixa: uma única entrada física de ${payment.amount} MT`] };
  }
  const amount = cents(command.amount);
  if (!amount) throw new Error("Indique um valor superior a zero.");
  requiredReason(command.reason); validatePaymentDate(command.effectiveOn, recordedAt);
  const source = paymentRecord(current, command.kind === "refund" ? command.studentId : command.sourceStudentId);
  const payment = activePayment(source, command.paymentId);
  if (command.effectiveOn < (payment.effectivePaymentDate ?? payment.paidOn)) throw new Error("A data do movimento não pode anteceder o recebimento de origem.");
  if (amount > cents(paymentCredit(source, payment.id))) throw new Error("O valor excede o crédito disponível deste recebimento.");
  if (command.kind === "refund") {
    if (!["Numerário", "Transferência", "Multicaixa", "Depósito bancário", "M-Pesa", "e-Mola"].includes(command.method)) throw new Error("Seleccione uma forma de devolução válida.");
    const debit: CreditDebit = { id: `REFUND-${id}`, paymentId: payment.id, amount: money(amount), kind: "refund", effectiveOn: command.effectiveOn, method: command.method, reason: command.reason.trim(), recordedAt, recordedBy: author };
    source.creditDebits = [...(source.creditDebits ?? []), debit];
    const cashBook = captureCashMovement(current.cashBook ?? emptyCashBook(), { id: `CASH-REFUND-${id}`, kind: "refund", amount: debit.amount, method: debit.method, effectiveOn: debit.effectiveOn, recordedAt, description: debit.reason, studentName: current.students.find((item) => item.id === source.studentId)?.fullName, registrationNumber: current.students.find((item) => item.id === source.studentId)?.registrationNumber, source: { studentId: source.studentId, paymentId: payment.id, refundId: debit.id } });
    return { patch: { paymentRecords: current.paymentRecords, cashBook }, message: "Devolução registada e ligada ao recebimento de origem.", details: [`Devolução: ${money(amount)} MT por ${command.method}`, `Crédito restante: ${paymentCredit(source, payment.id)} MT`, "Recebimento e recibo originais preservados"] };
  }
  if (!samePerson(current, source.studentId, command.studentId)) throw new Error("O crédito só pode ser aplicado a outra matrícula da mesma pessoa.");
  Object.assign(current, prepareBilling(current, recordedAt));
  const result = allocateCredit(current, { ...command, id, recordedAt, recordedBy: author, amount: money(amount) });
  const target = paymentRecord(current, command.studentId);
  if (target.billingVersion === 3) assessPenalties(target, schoolToday({ now: () => recordedAt }), recordedAt, { reason: command.reason, evidenceReference: `Crédito de ${payment.id}` });
  return { patch: { paymentRecords: current.paymentRecords }, message: "Crédito aplicado sem novo recebimento.", details: [`Aplicado: ${money(amount)} MT`, `Origem: ${payment.id}`, `Destino: ${current.students.find((item) => item.id === command.studentId)?.academicYearId ?? "ano seleccionado"}`, `Crédito restante: ${result.remainingCredit} MT`, "Caixa: sem entrada de dinheiro"] };
}

export function executeService(repository: DemoRepository, expected: DemoState, command: ServiceCommand, options: ServiceOptions) {
  return repository.commit({ role: options.role, action: command.kind === "replace-payment" || command.kind === "refund" ? "correct-payment" : "record-payment", expected,
    command: { id: options.id, payload: command }, change(current) {
      const planned = planService(current, command, options);
      const synced = prepareBilling({ ...current, ...planned.patch }, options.recordedAt);
      return { patch: { ...planned.patch, ...synced }, result: { receipt: planned.receipt ?? null, message: planned.message } };
    } });
}
