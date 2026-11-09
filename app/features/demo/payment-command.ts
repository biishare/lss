import {
  applyStudentPaymentPreview, buildDefaultPaymentRuleVersions, buildLedger,
  buildPaymentReceiptFromRecord, buildPaymentRecord, getMonthsInRange, paymentMethods,
  previewStudentPayment, type PaymentLaunchDraft, type PaymentReceipt,
} from "../../components/school-admin-demo.model";
import type { DemoData, DemoState } from "./demo-state";
import type { DemoCommit, DemoRepository } from "./local-repository";
import { academicStateFor, projectStudents } from "../academics/model";
import { prepareBilling } from "../finance/billing-commands";
import { assessPenalties, schoolToday } from "../finance/domain/billing";
import { cents, money } from "../finance/domain/money";
import { allocateCredit } from "../finance/credit-allocation";
import { paymentCredit, samePerson } from "../finance/service-model";

export function validatePaymentDate(date: string, recordedAt: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Informe uma data efectiva válida.");
  if (date > schoolToday({ now: () => recordedAt })) throw new Error("A data efectiva do pagamento não pode estar no futuro.");
}

// Pure preparation is shared by immediate receipt, proof review and correction.
// Its complete patch is saved once by the repository; no intermediate payment is written.
export function prepareConfirmedPayment(current: DemoState, input: {
  commandId: string; draft: PaymentLaunchDraft; recordedAt: string; proofId?: string;
}): { patch: Partial<DemoData>; receipt: PaymentReceipt } {
  const { draft } = input, amount = money(cents(draft.amount));
  const limit = draft.primaryAllocationAmount?.trim() ? money(cents(draft.primaryAllocationAmount)) : amount;
  if (limit > amount) throw new Error("A aplicação ao item seleccionado excede o valor recebido.");
  if (amount <= 0) throw new Error("Informe um valor recebido válido.");
  validatePaymentDate(draft.paidOn, input.recordedAt);
  if (!paymentMethods.includes(draft.method)) throw new Error("Seleccione uma forma de pagamento válida.");
  const reference = (draft.evidenceReference ?? draft.reference)?.trim();
  if (draft.method !== "Numerário" && !reference) throw new Error("Indique a referência do comprovativo conferido.");
  if (reference && current.paymentProofs?.some((proof) => proof.id !== input.proofId && proof.status !== "rejected" && proof.reference.trim().toLowerCase() === reference.toLowerCase() && proof.draft.method === draft.method && !current.paymentRecords.find((record) => record.studentId === proof.studentId)?.payments.find((payment) => payment.id === proof.paymentId)?.reversedBy)) throw new Error("Este comprovativo já foi registado. Consulte a conferência existente.");
  if (reference && current.paymentRecords.some((record) => record.payments.some((payment) => !payment.reversedBy && payment.method === draft.method && payment.reference?.toLowerCase() === reference.toLowerCase()))) throw new Error("Já existe um recebimento com este comprovativo.");
  current = { ...current, ...prepareBilling(current, input.recordedAt) };
  const referenceDate = schoolToday({ now: () => input.recordedAt });
  const academic = academicStateFor(current);
  const student = projectStudents(current, academic, referenceDate).find((item) => item.id === draft.studentId);
  if (!student) throw new Error("Seleccione um aluno válido.");
  const settings = academic.years.find((year) => year.id === student.academicYearId)?.settings ?? current.paymentSettings;
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const rules = buildDefaultPaymentRuleVersions(current.students, current.classes, settings, current.paymentRuleVersions);
  const record = current.paymentRecords.find((item) => item.studentId === student.id) ?? buildPaymentRecord(student.id);
  const preview = previewStudentPayment({
    record, student, months, settings, paymentRuleVersions: rules,
    category: draft.category, monthKey: draft.monthKey, targetChargeId: draft.targetChargeId,
    selectedChargeIds: draft.selectedChargeIds ?? [], creditOnly: draft.creditOnly,
    allocationLimit: limit,
    amount, paidOn: draft.paidOn, effectivePaymentDate: draft.paidOn, recordedAt: input.recordedAt,
    recordedBy: "Marta — Secretaria", method: draft.method, reference,
    description: draft.description.trim(), allowFutureAllocation: draft.allowFutureAllocation,
  });
  const paymentId = `PAY-${input.commandId}`;
  preview.payment.id = paymentId;
  preview.allocations.forEach((allocation) => { allocation.paymentId = paymentId; });
  if (preview.items.length === 0 && !draft.creditOnly && !draft.additionalTargets?.length && draft.category !== "miscellaneous") throw new Error("A cobrança seleccionada não tem saldo. Confirme a antecipação para pagar um mês previsto ou escolha receber como crédito.");
  const nextRecord = applyStudentPaymentPreview(preview);
  if (nextRecord.billingVersion === 3) {
    const before = JSON.stringify(nextRecord.financialAdjustments ?? []);
    assessPenalties(nextRecord, referenceDate, input.recordedAt, {
      reason: draft.lateReason ?? "", evidenceReference: draft.evidenceReference ?? draft.reference ?? "",
    });
    if (before !== JSON.stringify(nextRecord.financialAdjustments ?? []) && (!draft.lateReason?.trim() || !(draft.evidenceReference ?? draft.reference)?.trim())) throw new Error("Indique o comprovativo e o motivo da correcção da multa.");
  }
  const receipt = buildPaymentReceiptFromRecord(student, nextRecord, paymentId)!;
  const year = referenceDate.slice(0, 4), prefix = `LSS-${year}-`;
  const sequence = current.receipts.reduce((max, item) => item.id.startsWith(prefix) && /^\d+$/.test(item.id.slice(prefix.length)) ? Math.max(max, Number(item.id.slice(prefix.length))) : max, 0) + 1;
  receipt.id = `${prefix}${String(sequence).padStart(6, "0")}`;
  receipt.institution = { ...academic.institution };
  receipt.academicYearId = student.academicYearId ?? settings.academicYear;
  receipt.items.forEach((item) => { item.academicYearId = receipt.academicYearId; });
  const paymentRecords = [...current.paymentRecords.filter((item) => item.studentId !== student.id), nextRecord];
  const candidate = { ...current, paymentRecords };
  const targets = draft.additionalTargets ?? [];
  const transferredCredit: Array<{ record: typeof nextRecord; paymentId: string }> = [];
  if (new Set(targets.map((item) => `${item.studentId}:${item.chargeId}`)).size !== targets.length) throw new Error("A cobrança adicional está repetida.");
  for (const [index, target] of targets.entries()) {
    const targetRecord = paymentRecords.find((item) => item.studentId === target.studentId);
    const targetStudent = current.students.find((item) => item.id === target.studentId);
    const charge = targetRecord?.charges.find((item) => item.id === target.chargeId);
    if (!samePerson(current, student.id, target.studentId)) throw new Error("As cobranças adicionais devem pertencer à mesma pessoa.");
    if (!targetRecord || !targetStudent || !charge) throw new Error("Seleccione uma cobrança da mesma pessoa.");
    if (receipt.items.some((item) => item.chargeId === charge.id)) throw new Error("A cobrança já está incluída na selecção inicial.");
    const all = [charge, ...(targetRecord.penaltyCharges ?? []).filter((item) => item.baseChargeId === charge.id)];
    const due = all.reduce((sum, item) => sum + Math.max(0, cents("baseChargeId" in item ? item.adjustedAmount ?? item.amount : item.adjustedDueAmount ?? item.dueAmount ?? item.amount) - targetRecord.allocations.filter((allocation) => allocation.chargeId === item.id).reduce((sum, allocation) => sum + cents(allocation.amount), 0)), 0);
    const available = cents(paymentCredit(nextRecord, paymentId));
    const requested = target.amount?.trim() ? cents(target.amount) : undefined;
    if (requested !== undefined && (requested > available || requested > due)) throw new Error("A aplicação adicional excede o recebido ou o saldo da cobrança.");
    const applied = requested ?? Math.min(available, due);
    if (!applied) continue;
    const result = allocateCredit(candidate, { id: `${input.commandId}-${index}`, recordedAt: input.recordedAt, recordedBy: receipt.recordedBy,
      sourceStudentId: student.id, paymentId, studentId: target.studentId, chargeIds: [target.chargeId], amount: money(applied), effectiveOn: draft.paidOn, reason: "Distribuição explícita do recebimento entre anos" });
    if (targetRecord.billingVersion === 3) assessPenalties(targetRecord, referenceDate, input.recordedAt, { reason: draft.lateReason ?? "", evidenceReference: reference ?? "" });
    if (targetRecord !== nextRecord) transferredCredit.push({ record: targetRecord, paymentId: result.paymentId });
    const detail = buildPaymentReceiptFromRecord(targetStudent, targetRecord, result.paymentId)!;
    receipt.items.push(...detail.items.filter((item) => all.some((charge) => charge.id === item.chargeId)).map((item) => ({ ...item, academicYearId: targetStudent.academicYearId })));
  }
  receipt.unallocatedAmount = money(cents(paymentCredit(nextRecord, paymentId)) + transferredCredit.reduce((sum, item) => sum + cents(paymentCredit(item.record, item.paymentId)), 0));
  receipt.penaltyTotal = money(receipt.items.filter((item) => item.kind === "penalty").reduce((sum, item) => sum + cents(item.amount), 0));
  const ledger = buildLedger(student, nextRecord, months, settings, referenceDate, rules);
  return { patch: {
    paymentRecords,
    paymentRuleVersions: current.paymentRuleVersions,
    students: current.students.map((item) => item.id === student.id ? { ...item, registrationStatus: ledger.registrationBalance === 0 ? "paid" as const : "pending" as const } : item),
    receipts: [...current.receipts, receipt],
  }, receipt };
}

export function confirmDemoPayment(repository: DemoRepository, input: {
  expected: DemoState; role: "director" | "secretaria"; commandId: string;
  draft: PaymentLaunchDraft; recordedAt: string;
}): DemoCommit & { receipt: PaymentReceipt } {
  const committed = repository.commit({
    role: input.role, action: "record-payment", expected: input.expected,
    command: { id: input.commandId, payload: input.draft },
    change(current) {
      const prepared = prepareConfirmedPayment(current, input);
      return { patch: prepared.patch, result: { receipt: prepared.receipt } };
    },
  });
  return { ...committed, receipt: committed.result.receipt as PaymentReceipt };
}
