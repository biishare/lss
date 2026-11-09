import {
  applyStudentPaymentPreview, buildDefaultPaymentRuleVersions, buildLedger,
  buildPaymentReceipt, buildPaymentReceiptFromRecord, buildPaymentRecord, getMonthsInRange, parseMoney,
  previewStudentPayment, type PaymentLaunchDraft, type PaymentReceipt,
} from "../../components/school-admin-demo.model";
import type { DemoState } from "./demo-state";
import type { DemoCommit, DemoRepository } from "./local-repository";
import { academicStateFor, projectStudents } from "../academics/model";
import { prepareBilling } from "../finance/billing-commands";
import { assessPenalties, schoolToday } from "../finance/domain/billing";
import { cents } from "../finance/domain/money";

export function confirmDemoPayment(repository: DemoRepository, input: {
  expected: DemoState;
  role: "director" | "secretaria";
  commandId: string;
  draft: PaymentLaunchDraft;
  recordedAt: string;
}): DemoCommit & { receipt: PaymentReceipt } {
  const { draft } = input;
  const amount = parseMoney(draft.amount);
  cents(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor recebido válido.");
  const paidOn = draft.paidOn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) ||
      Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`)) ||
      new Date(`${paidOn}T00:00:00Z`).toISOString().slice(0, 10) !== paidOn) {
    throw new Error("Informe uma data efectiva válida.");
  }
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(input.recordedAt));
  const referenceDate = ["year", "month", "day"].map((type) => dateParts.find((part) => part.type === type)!.value).join("-");
  if (paidOn > referenceDate) throw new Error("A data efectiva do pagamento não pode estar no futuro.");
  const committed = repository.commit({
    role: input.role, action: "record-payment", expected: input.expected,
    command: { id: input.commandId, payload: { ...draft, amount } },
    change(current) {
      current = { ...current, ...prepareBilling(current, input.recordedAt) };
      const student = projectStudents(current, academicStateFor(current), referenceDate).find((student) => student.id === draft.studentId);
      if (!student) throw new Error("Seleccione um aluno válido.");
      const settings = current.academic?.years.find((year) => year.id === student.academicYearId)?.settings ?? current.paymentSettings;
      const months = getMonthsInRange(settings.startMonth, settings.endMonth);
      const rules = buildDefaultPaymentRuleVersions(current.students, current.classes, settings, current.paymentRuleVersions);
      const record = current.paymentRecords.find((record) => record.studentId === student.id) ?? buildPaymentRecord(student.id);
      const preview = previewStudentPayment({
        record, student, months, settings, paymentRuleVersions: rules,
        category: draft.category, monthKey: draft.monthKey, targetChargeId: draft.targetChargeId,
        amount, paidOn, effectivePaymentDate: paidOn, recordedAt: input.recordedAt,
        recordedBy: "Marta — Secretaria", method: draft.method,
        description: draft.description.trim(), allowFutureAllocation: draft.allowFutureAllocation,
      });
      if (preview.normalizedRecord.billingVersion === 3) {
        const paymentId = `PAY-${input.commandId}`;
        preview.payment.id = paymentId;
        preview.allocations.forEach((allocation) => { allocation.paymentId = paymentId; });
        if (preview.items.length === 0 && draft.category !== "miscellaneous") throw new Error("A cobrança seleccionada não tem saldo ou ainda não foi emitida. Confirme a antecipação para pagar um mês previsto.");
      }
      const nextRecord = applyStudentPaymentPreview(preview);
      if (nextRecord.billingVersion === 3) {
        const before = JSON.stringify(nextRecord.financialAdjustments ?? []);
        assessPenalties(nextRecord, schoolToday({ now: () => input.recordedAt }), input.recordedAt, {
          reason: draft.lateReason ?? "", evidenceReference: draft.evidenceReference ?? draft.reference ?? "",
        });
        if (before !== JSON.stringify(nextRecord.financialAdjustments ?? []) && (!draft.lateReason?.trim() || !(draft.evidenceReference ?? draft.reference)?.trim())) throw new Error("Indique o comprovativo e o motivo da correcção da multa.");
      }
      const receipt = nextRecord.billingVersion === 3 ? buildPaymentReceiptFromRecord(student, nextRecord, preview.payment.id)! : buildPaymentReceipt(student, preview);
      const ledger = buildLedger(student, nextRecord, months, settings, referenceDate, rules);
      return {
        patch: {
          paymentRecords: [...current.paymentRecords.filter((record) => record.studentId !== student.id), nextRecord],
          paymentRuleVersions: current.paymentRuleVersions,
          students: current.students.map((item) => item.id === student.id
            ? { ...item, registrationStatus: ledger.registrationBalance === 0 ? "paid" as const : "pending" as const } : item),
          receipts: [...current.receipts, receipt],
        },
        result: { receipt },
      };
    },
  });
  return { ...committed, receipt: committed.result.receipt as PaymentReceipt };
}
