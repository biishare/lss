import type { Charge, PenaltyCharge, Student, StudentPaymentRecord, PaymentSettings } from "../../../lib/school-demo-data";
import { monthOptions } from "../../../lib/school-demo-data";
import type { BillingCalendarItem, FinancialAid, FinancialAdjustment, PaymentRuleVersion } from "./entities";
import { cents, money, percentage } from "./money";

export type Clock = { now(): string };
export const schoolToday = (clock: Clock) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(clock.now()));
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
};
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(value: string, days: number) {
  if (!validDate(value) || !Number.isInteger(days)) throw new Error("Data ou intervalo inválido.");
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
export const effectiveAmount = (charge: Charge | PenaltyCharge) => "baseChargeId" in charge ? charge.adjustedAmount ?? charge.amount : charge.adjustedDueAmount ?? charge.dueAmount ?? charge.amount;
export const effectiveBenefitLabel = (charge: Charge) => charge.adjustedBenefit?.label ?? charge.snapshot?.ruleLabel;
export function allocatedCents(record: StudentPaymentRecord, chargeId: string, before?: string) {
  return record.allocations.filter((item) => item.chargeId === chargeId && (!before || record.payments.some((payment) => payment.id === item.paymentId && (payment.effectivePaymentDate ?? payment.paidOn) < before))).reduce((total, item) => total + cents(item.amount), 0);
}
export const balanceCents = (record: StudentPaymentRecord, charge: Charge | PenaltyCharge) => Math.max(0, cents(effectiveAmount(charge)) - allocatedCents(record, charge.id));
export function dueDate(competence: string, day: number) {
  const [year, month] = competence.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export function calendarFor(student: Student, months: string[]): BillingCalendarItem[] {
  const year = student.academicYearId!, enrollmentId = student.enrollmentId ?? student.id;
  if (student.enrollmentStatus === "cancelled") return [];
  const start = monthOptions.findIndex((item) => item.key === student.tuitionStartMonth);
  const end = student.tuitionEndMonth ? monthOptions.findIndex((item) => item.key === student.tuitionEndMonth) : 11;
  return [{ id: `CHG-${student.id}-REG`, enrollmentId, kind: "registration", competence: student.enrollmentDate.slice(0, 7), issueOn: student.enrollmentDate }, ...months.filter((key) => { const i = monthOptions.findIndex((item) => item.key === key); return i >= start && i <= end; }).map((key): BillingCalendarItem => {
    const competence = `${year}-${String(monthOptions.findIndex((item) => item.key === key) + 1).padStart(2, "0")}`;
    return { id: `CHG-${student.id}-TUI-${key.toUpperCase()}`, enrollmentId, kind: "tuition", monthKey: key, competence, issueOn: `${competence}-01` };
  })];
}
export function selectRule(rules: PaymentRuleVersion[], student: Student, on: string) {
  const level = student.pricingLevelId ?? student.educationLevelId ?? student.classId;
  return rules.filter((rule) => rule.calculationVersion === "v3" && !rule.supersededBy && rule.academicYearId === student.academicYearId && rule.educationLevelId === level && rule.validFrom <= on && (!rule.validUntil || rule.validUntil >= on)).sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.version - a.version)[0];
}
export function validateRule(rule: PaymentRuleVersion) {
  cents(rule.monthlyFee); cents(rule.inscriptionFee);
  if (!validDate(rule.validFrom) || (rule.validUntil && (!validDate(rule.validUntil) || rule.validUntil < rule.validFrom))) throw new Error("Reveja a vigência da regra.");
  if (!Number.isInteger(rule.monthlyDueDay) || rule.monthlyDueDay < 1 || rule.monthlyDueDay > 31) throw new Error("O vencimento deve ser entre 1 e 31.");
  const p = rule.penaltyPolicy;
  if (!p || !Number.isInteger(p.firstAfterDays) || p.firstAfterDays < 1 || p.firstAfterDays > 365) throw new Error("A primeira multa começa pelo menos um dia após o vencimento.");
  cents(p.firstPercent); if (p.firstPercent > 100) throw new Error("Percentagem inválida.");
  if (p.secondEnabled && (!Number.isInteger(p.secondAfterDays) || p.secondAfterDays <= p.firstAfterDays || p.secondAfterDays > 730 || p.secondPercent <= p.firstPercent || p.secondPercent > 100)) throw new Error("A segunda etapa exige intervalo e taxa acumulada superiores à primeira.");
  cents(p.secondPercent);
  if (!rule.coveredMonthKeys.length || new Set(rule.coveredMonthKeys).size !== rule.coveredMonthKeys.length || rule.coveredMonthKeys.some((key) => !monthOptions.some((item) => item.key === key))) throw new Error("Seleccione os meses cobráveis.");
}
export function defaultRule(student: Student, settings: PaymentSettings, rules: PaymentRuleVersion[], recordedAt: string): PaymentRuleVersion {
  const level = student.pricingLevelId ?? student.educationLevelId ?? student.classId;
  const old = rules.filter((rule) => rule.academicYearId === student.academicYearId && rule.educationLevelId === (student.educationLevelId ?? level)).sort((a, b) => b.version - a.version)[0];
  const monthStart = monthOptions.findIndex((item) => item.key === settings.startMonth), monthEnd = monthOptions.findIndex((item) => item.key === settings.endMonth);
  return { id: `RULE-V3-${student.academicYearId}-${level}-DEFAULT`, academicYearId: student.academicYearId!, educationLevelId: level, version: Math.max(0, ...rules.filter((rule) => rule.academicYearId === student.academicYearId && rule.educationLevelId === level).map((rule) => rule.version)) + 1, status: "active", calculationVersion: "v3", inscriptionFee: old?.inscriptionFee ?? settings.inscriptionRenewalFee, monthlyFee: old?.monthlyFee ?? settings.monthlyFee, coveredMonthKeys: student.billingMonths ?? monthOptions.slice(monthStart, monthEnd + 1).map((item) => item.key), monthlyDueDay: old?.monthlyDueDay ?? settings.monthlyDueDay ?? 10, firstPenalty: { thresholdDay: 1, percent: 5 }, secondPenalty: { thresholdDay: 11, percent: 10 }, penaltyPolicy: { firstAfterDays: 1, firstPercent: 5, secondEnabled: false, secondAfterDays: 11, secondPercent: 10 }, validFrom: `${student.academicYearId}-01-01`, registeredAt: recordedAt, registeredBy: "Secretaria", reason: "Regra inicial; cobranças anteriores conservam os seus valores e regras." };
}
export function aidFromStudent(student: Student): FinancialAid[] {
  const p = student.financialProfile;
  if (p.status === "regular" || p.status === "weighted") return [];
  return [{ id: `AID-INITIAL-${student.id}`, enrollmentId: student.enrollmentId ?? student.id, kind: p.status, percent: p.status === "scholarship" || p.status === "exception" ? 100 : p.discountPercent, appliesToRegistration: p.status === "scholarship" || (p.appliesToRegistration ?? p.status !== "exception"), appliesToTuition: true, startMonth: p.startMonth, endMonth: p.endMonth, reason: p.reason, authorizedBy: p.authorizedBy ?? "", registeredBy: p.registeredBy ?? "Origem anterior", registeredAt: p.registeredAt ?? student.createdAt }];
}
export function benefitFor(aid: FinancialAid[], item: BillingCalendarItem) {
  const index = (key: string) => monthOptions.findIndex((month) => month.key === key);
  const month = Number(item.competence.slice(5, 7)) - 1;
  const eligible = aid.filter((a) => (!a.effectiveFrom || a.effectiveFrom <= item.issueOn) && (!a.revokedOn || a.revokedOn > item.issueOn) && (item.kind === "registration" ? a.appliesToRegistration : a.appliesToTuition) && (!a.startMonth || month >= index(a.startMonth)) && (!a.endMonth || month <= index(a.endMonth)));
  const percent = Math.max(0, ...eligible.map((a) => a.percent));
  const winners = eligible.filter((a) => a.percent === percent && percent > 0);
  return { percent, ids: winners.map((a) => a.id), label: percent === 100 ? winners.some((a) => a.kind === "scholarship") ? "Bolsa integral" : "Isento" : percent ? `Bolsa/desconto de ${percent}%` : "Regular" };
}
export function projectedCharge(student: Student, item: BillingCalendarItem, rules: PaymentRuleVersion[], aid: FinancialAid[], recordedAt: string): Charge | undefined {
  const rule = selectRule(rules, item.educationLevelId ? { ...student, pricingLevelId: item.educationLevelId } : student, item.issueOn);
  if (!rule || (item.kind === "tuition" && !rule.coveredMonthKeys.includes(item.monthKey!))) return;
  const base = cents(item.kind === "registration" ? rule.inscriptionFee : rule.monthlyFee), benefit = benefitFor(aid, item), discount = percentage(base, benefit.percent), due = base - discount;
  return { id: item.id, studentId: student.id, category: item.kind, description: item.kind === "registration" ? "Inscrição/Renovação" : `Mensalidade de ${monthOptions.find((month) => month.key === item.monthKey)?.label}`, monthKey: item.monthKey, dueOn: item.kind === "registration" ? student.enrollmentDate : dueDate(item.competence, rule.monthlyDueDay), amount: money(due), dueAmount: money(due), baseAmount: money(base), discountAmount: money(discount), ruleVersionId: rule.id, createdAt: recordedAt, snapshot: { source: "rule-version", calculationVersion: "v3", originalAmount: money(base), discountPercent: benefit.percent, discountAmount: money(discount), dueAmount: money(due), ruleVersionId: rule.id, ruleVersion: rule.version, academicYearId: rule.academicYearId, educationLevelId: rule.educationLevelId, ruleLabel: benefit.label, monthlyDueDay: rule.monthlyDueDay, penaltyPolicy: rule.penaltyPolicy ? { ...rule.penaltyPolicy } : undefined, benefitIds: benefit.ids, publishedAt: recordedAt } };
}
// Adjust the effective amount while keeping the issued object/snapshot and receipt immutable.
export function adjustCharge(record: StudentPaymentRecord, charge: Charge | PenaltyCharge, nextCents: number, context: Omit<FinancialAdjustment, "id" | "chargeId" | "previousAmount" | "nextAmount" | "releasedAllocations">) {
  const previous = cents(effectiveAmount(charge));
  if (previous === nextCents) return;
  let excess = Math.max(0, allocatedCents(record, charge.id) - nextCents);
  const released: FinancialAdjustment["releasedAllocations"] = [];
  for (const allocation of [...record.allocations].reverse()) {
    if (allocation.chargeId !== charge.id || excess === 0) continue;
    const value = Math.min(cents(allocation.amount), excess);
    released.push({ ...allocation, amount: money(value) });
    allocation.amount = money(cents(allocation.amount) - value); excess -= value;
  }
  record.allocations = record.allocations.filter((item) => item.amount > 0);
  if ("baseChargeId" in charge) charge.adjustedAmount = money(nextCents); else charge.adjustedDueAmount = money(nextCents);
  record.financialAdjustments = [...(record.financialAdjustments ?? []), { ...context, id: `ADJ-${charge.id}-${(record.financialAdjustments ?? []).length + 1}`, chargeId: charge.id, previousAmount: money(previous), nextAmount: money(nextCents), releasedAllocations: released }];
}
export function assessPenalties(record: StudentPaymentRecord, on: string, recordedAt: string, correction?: { reason: string; evidenceReference: string; kind?: "benefit" | "late-proof" }) {
  for (const charge of record.charges) {
    if (charge.snapshot?.calculationVersion !== "v3" || charge.category !== "tuition" || !charge.dueOn || charge.academicCancellation) continue;
    const policy = charge.snapshot.penaltyPolicy;
    if (!policy) continue;
    const stages = [{ name: "first" as const, days: policy.firstAfterDays, percent: policy.firstPercent, previousPercent: 0 }, ...(policy.secondEnabled ? [{ name: "second" as const, days: policy.secondAfterDays, percent: policy.secondPercent, previousPercent: policy.firstPercent }] : [])];
    for (const stage of stages) {
      const starts = addDays(charge.dueOn, stage.days);
      if (starts > on) continue;
      const principal = Math.max(0, cents(effectiveAmount(charge)) - allocatedCents(record, charge.id, starts));
      const amount = percentage(principal, stage.percent - stage.previousPercent);
      const existing = (record.penaltyCharges ?? []).find((item) => item.baseChargeId === charge.id && item.stage === stage.name);
      if (existing) {
        if (cents(effectiveAmount(existing)) !== amount && correction) {
          if (!correction.reason.trim() || !correction.evidenceReference.trim()) throw new Error("Indique o comprovativo e o motivo da correcção da multa.");
          adjustCharge(record, existing, amount, { ...correction, kind: correction.kind ?? "late-proof", recordedBy: "Secretaria", recordedAt });
        }
      } else if (amount > 0) {
        const penalty: PenaltyCharge = { id: `PEN-${charge.id}-${stage.name.toUpperCase()}`, studentId: record.studentId, baseChargeId: charge.id, stage: stage.name, amount: money(amount), effectiveOn: starts, createdAt: recordedAt, snapshot: { calculationVersion: "v3", thresholdDay: stage.days, percent: stage.percent - stage.previousPercent, baseBalance: money(principal), targetTotal: money(amount), previousPenaltyTotal: 0, ruleVersionId: charge.ruleVersionId } };
        record.penaltyCharges = [...(record.penaltyCharges ?? []), penalty];
      }
    }
  }
  return record;
}
export function synchronizeRecord(record: StudentPaymentRecord, student: Student, months: string[], rules: PaymentRuleVersion[], on: string, recordedAt: string, issueSelectedId?: string, studentAt?: (on: string) => Student) {
  record.billingVersion = 3;
  record.financialAid ??= aidFromStudent(student);
  record.billingCalendar = calendarFor(student, months);
  record.billingCalendar.forEach((item) => { const placed = studentAt?.(item.issueOn) ?? student; item.educationLevelId = placed.pricingLevelId ?? placed.educationLevelId; });
  for (const item of record.billingCalendar) {
    if (record.charges.some((charge) => charge.id === item.id) || (item.issueOn > on && item.id !== issueSelectedId)) continue;
    const charge = projectedCharge(student, item, rules, record.financialAid, recordedAt);
    if (charge) record.charges.push(charge);
  }
  return assessPenalties(record, on, recordedAt);
}
