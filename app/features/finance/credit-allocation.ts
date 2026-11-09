import type { DemoState } from "../demo/demo-state";
import { getChargeBalance } from "../../components/school-admin-demo.model";
import { cents, money } from "./domain/money";
import { paymentCredit, samePerson } from "./service-model";

// Mutates only an isolated transaction candidate, never the loaded UI snapshot.
export function allocateCredit(current: DemoState, input: { id: string; recordedAt: string; recordedBy: string;
  sourceStudentId: string; paymentId: string; studentId: string; chargeIds: string[]; amount: number; effectiveOn: string; reason: string;
}) {
  const from = current.paymentRecords.find((item) => item.studentId === input.sourceStudentId);
  const target = current.paymentRecords.find((item) => item.studentId === input.studentId);
  const payment = from?.payments.find((item) => item.id === input.paymentId);
  if (!from || !target || !payment || payment.reversedBy || !samePerson(current, from.studentId, target.studentId)) throw new Error("O crédito deve ter origem e destino na mesma pessoa.");
  const amount = cents(input.amount);
  if (!amount || amount > cents(paymentCredit(from, payment.id))) throw new Error("O valor excede o crédito disponível deste recebimento.");
  if (!input.chargeIds.length || new Set(input.chargeIds).size !== input.chargeIds.length) throw new Error("Seleccione as cobranças a liquidar uma única vez.");
  const charges = input.chargeIds.flatMap((id) => {
    const charge = target.charges.find((item) => item.id === id);
    if (!charge) throw new Error("A cobrança seleccionada não pertence à matrícula de destino.");
    return [charge, ...(target.penaltyCharges ?? []).filter((item) => item.baseChargeId === id)];
  });
  if (amount > charges.reduce((sum, item) => sum + cents(getChargeBalance(target, item)), 0)) throw new Error("O valor excede o saldo das cobranças seleccionadas.");
  let paymentId = payment.id;
  if (from !== target) {
    paymentId = `CREDIT-${input.id}`;
    target.payments.push({ id: paymentId, studentId: target.studentId, amount: money(amount), kind: "credit-application",
      origin: { studentId: from.studentId, paymentId: payment.id, movementId: paymentId }, paidOn: input.effectiveOn,
      effectivePaymentDate: input.effectiveOn, recordedAt: input.recordedAt, recordedBy: input.recordedBy, method: "Crédito existente", observation: input.reason });
    from.creditDebits = [...(from.creditDebits ?? []), { id: paymentId, kind: "application", paymentId: payment.id,
      amount: money(amount), effectiveOn: input.effectiveOn, recordedAt: input.recordedAt, recordedBy: input.recordedBy,
      reason: input.reason, method: "Crédito existente", destination: { studentId: target.studentId, paymentId, chargeId: input.chargeIds[0] } }];
  }
  let remaining = amount, index = 0;
  for (const charge of charges) {
    const applied = Math.min(remaining, cents(getChargeBalance(target, charge)));
    if (applied) target.allocations.push({ id: `ALLOC-${input.id}-${index++}`, paymentId, chargeId: charge.id, amount: money(applied), effectiveOn: input.effectiveOn });
    remaining -= applied;
  }
  return { paymentId, remainingCredit: paymentCredit(from, payment.id) };
}
