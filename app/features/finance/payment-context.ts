import { buildDefaultPaymentRuleVersions, buildLedger, buildPaymentRecord, getChargeBalance, getMonthsInRange, getStudentTuitionStartMonth, type FinanceCellSelection, type PaymentLaunchDraft } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { academicStateFor, projectStudents } from "../academics/model";
import { schoolToday } from "./domain/billing";
import { sumMoney } from "./domain/money";
import { monthOptions } from "../../lib/school-demo-data";

export type PaymentChoice = {
  key: string; label: string; balance: number; forecast: boolean; requiresAnticipation: boolean;
  draft: Pick<PaymentLaunchDraft, "studentId" | "category" | "monthKey" | "targetChargeId" | "amount" | "description">;
};

// Presentation of the existing ledger. Issuing, allocation, penalties and
// confirmation remain in the financial services; this helper never writes.
export function paymentContext(state: DemoState, studentId: string, recordedAt: string) {
  const today = schoolToday({ now: () => recordedAt });
  const academic = academicStateFor(state);
  const student = projectStudents(state, academic, today).find((item) => item.id === studentId);
  if (!student) return null;
  const settings = academic.years.find((item) => item.id === student.academicYearId)?.settings ?? state.paymentSettings;
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const rules = buildDefaultPaymentRuleVersions(state.students, state.classes, settings, state.paymentRuleVersions);
  const record = state.paymentRecords.find((item) => item.studentId === student.id) ?? buildPaymentRecord(student.id);
  const ledger = buildLedger(student, record, months, settings, today, rules);
  const choices: PaymentChoice[] = [];
  const registration = sumMoney([ledger.registrationBalance, ledger.registrationPenaltyBalance]);
  if (registration > 0) choices.push({ key: "registration", label: "Inscrição / Renovação", balance: registration, forecast: false, requiresAnticipation: false,
    draft: { studentId, category: "registration", monthKey: getStudentTuitionStartMonth(student, settings), targetChargeId: record.charges.find((item) => item.category === "registration")?.id ?? "", amount: String(registration), description: "Inscrição / Renovação" } });
  for (const month of ledger.monthly) {
    const balance = sumMoney([month.balance, month.fineBalance]);
    if (!month.applicable || balance <= 0) continue;
    const issued = record.charges.find((item) => item.category === "tuition" && item.monthKey === month.month.key);
    const futureMonth = Number(settings.academicYear) > Number(today.slice(0, 4)) || (settings.academicYear === today.slice(0, 4) && monthOptions.findIndex((item) => item.key === month.month.key) > Number(today.slice(5, 7)) - 1);
    choices.push({ key: `tuition-${month.month.key}`, label: `Mensalidade de ${month.month.label}`, balance,
      forecast: !issued, requiresAnticipation: !issued || futureMonth,
      draft: { studentId, category: "tuition", monthKey: month.month.key, targetChargeId: record.charges.find((item) => item.category === "tuition" && item.monthKey === month.month.key)?.id ?? "", amount: String(balance), description: `Mensalidade de ${month.month.label}` } });
  }
  for (const charge of record.charges.filter((item) => item.category === "miscellaneous")) {
    const balance = sumMoney([getChargeBalance(record, charge), ...(record.penaltyCharges ?? []).filter((item) => item.baseChargeId === charge.id).map((item) => getChargeBalance(record, item))]);
    if (balance <= 0) continue;
    choices.push({ key: charge.id, label: charge.description, balance, forecast: false, requiresAnticipation: false,
      draft: { studentId, category: "miscellaneous", monthKey: "", targetChargeId: charge.id, amount: String(balance), description: charge.description } });
  }
  return { row: { student, record, ledger }, settings, months, choices };
}

export function choiceForCell(state: DemoState, selection: FinanceCellSelection, recordedAt: string) {
  const context = paymentContext(state, selection.studentId, recordedAt);
  if (selection.kind !== "registration" && selection.kind !== "tuition") return undefined;
  return context?.choices.find((choice) => choice.draft.category === selection.kind && (selection.kind !== "tuition" || choice.draft.monthKey === selection.monthKey));
}
