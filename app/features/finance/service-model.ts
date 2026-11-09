import type { Payment, PaymentAllocation, StudentPaymentRecord } from "../../lib/school-demo-data";
import type { PaymentLaunchDraft, PaymentReceipt } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { cents, money } from "./domain/money";

export type CreditDebit = {
  id: string; paymentId: string; amount: number; kind: "refund" | "application";
  effectiveOn: string; recordedAt: string; recordedBy: string; reason: string; method: string;
  destination?: { studentId: string; paymentId: string; chargeId: string };
};
export type PaymentReversal = {
  id: string; paymentId: string; replacementStudentId: string; replacementPaymentId: string;
  reason: string; recordedAt: string; recordedBy: string; releasedAllocations: PaymentAllocation[];
};
export type PaymentProof = {
  id: string; studentId: string; draft: Omit<PaymentLaunchDraft, "amount" | "additionalTargets"> & { amount: number; additionalTargets?: Array<{ studentId: string; chargeId: string; amount?: number }> }; reference: string; note: string;
  status: "pending" | "confirmed" | "rejected"; recordedAt: string; recordedBy: string;
  reviewedAt?: string; reviewedBy?: string; decision?: string; paymentId?: string; receiptId?: string;
};

export function paymentCredit(record: StudentPaymentRecord, paymentId: string) {
  const payment = record.payments.find((item) => item.id === paymentId);
  if (!payment || payment.reversedBy) return 0;
  return money(Math.max(0, cents(payment.amount)
    - record.allocations.filter((item) => item.paymentId === paymentId).reduce((sum, item) => sum + cents(item.amount), 0)
    - (record.creditDebits ?? []).filter((item) => item.paymentId === paymentId).reduce((sum, item) => sum + cents(item.amount), 0)));
}
export function recordCredit(record?: StudentPaymentRecord) {
  return record ? money(record.payments.reduce((sum, payment) => sum + cents(paymentCredit(record, payment.id)), 0)) : 0;
}
export function samePerson(state: DemoState, firstId: string, secondId: string) {
  const a = state.students.find((item) => item.id === firstId), b = state.students.find((item) => item.id === secondId);
  if (!a || !b) return false;
  return (a.personId ?? a.id) === (b.personId ?? b.id);
}
export function personCreditSources(state: DemoState, studentId: string) {
  return state.paymentRecords.filter((record) => samePerson(state, studentId, record.studentId))
    .flatMap((record) => record.payments.filter((payment) => paymentCredit(record, payment.id) > 0)
      .map((payment) => ({ studentId: record.studentId, payment, available: paymentCredit(record, payment.id),
        year: state.students.find((item) => item.id === record.studentId)?.academicYearId ?? state.paymentSettings.academicYear })));
}
export function receiptStatus(state: DemoState, receipt: PaymentReceipt) {
  const payment = state.paymentRecords.find((item) => item.studentId === receipt.studentId)?.payments.find((item) => item.id === receipt.paymentId);
  return payment?.reversedBy ? "Anulado por correcção" : "Confirmado";
}
export function cashReceived(payments: Payment[]) {
  return money(payments.filter((item) => !item.reversedBy && item.kind !== "credit-application").reduce((sum, item) => sum + cents(item.amount), 0));
}
export function pendingProofFor(state: DemoState, studentId: string, chargeId?: string, monthKey?: string) {
  const charge = state.paymentRecords.find((record) => record.studentId === studentId)?.charges.find((item) => item.id === chargeId || (monthKey && item.monthKey === monthKey));
  return state.paymentProofs?.find((item) => {
    if (item.status !== "pending" || item.draft.creditOnly) return false;
    const draft = item.draft;
    const primary = item.studentId === studentId && (monthKey ? draft.category === "tuition" && draft.monthKey === monthKey : charge ? draft.category === charge.category && (charge.category === "registration" || draft.targetChargeId === charge.id || draft.monthKey === charge.monthKey) : !chargeId);
    return primary || Boolean(charge && ((item.studentId === studentId && draft.selectedChargeIds?.includes(charge.id)) || draft.additionalTargets?.some((target) => target.studentId === studentId && target.chargeId === charge.id)));
  });
}
