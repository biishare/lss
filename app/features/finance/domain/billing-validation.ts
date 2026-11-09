import type { PaymentRuleVersion } from "./entities";
import { validDate, validateRule } from "./billing";
import { cents } from "./money";
import { monthOptions } from "../../../lib/school-demo-data";

type Row = Record<string, unknown>;
const object = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (message: string): never => { throw new Error(`Os dados de cobrança não são válidos: ${message}`); };
function rows(value: unknown, label: string): Row[] {
  if (!Array.isArray(value) || value.some((item) => !object(item))) fail(label);
  return value as Row[];
}
function unique(values: Row[], label: string) {
  if (values.some((item) => typeof item.id !== "string" || !item.id) || new Set(values.map((item) => item.id)).size !== values.length) fail(label);
}
export function validateBillingExtensions(state: Row) {
  const rules = rows(state.paymentRuleVersions ?? [], "regras"), v3 = rules.filter((rule) => rule.calculationVersion === "v3");
  if (rules.some((rule) => rule.calculationVersion !== undefined && rule.calculationVersion !== "v3")) fail("versão do algoritmo desconhecida");
  for (const rule of v3) {
    validateRule(rule as unknown as PaymentRuleVersion);
    if (typeof rule.academicYearId !== "string" || typeof rule.educationLevelId !== "string" || typeof rule.registeredAt !== "string" || typeof rule.registeredBy !== "string") fail("registo da regra incompleto");
    if (rule.supersededBy && !v3.some((other) => other.id === rule.supersededBy && other.academicYearId === rule.academicYearId && other.educationLevelId === rule.educationLevelId && other.validFrom === rule.validFrom)) fail("substituição de regra sem origem válida");
    if (!rule.supersededBy && v3.some((other) => !other.supersededBy && other.id !== rule.id && other.academicYearId === rule.academicYearId && other.educationLevelId === rule.educationLevelId && String(other.validFrom) <= String(rule.validUntil ?? "9999-12-31") && String(rule.validFrom) <= String(other.validUntil ?? "9999-12-31"))) fail("vigências sobrepostas");
  }
  for (const record of rows(state.paymentRecords ?? [], "registos")) {
    if (record.billingVersion === undefined) continue;
    if (record.billingVersion !== 3) fail("versão do calendário");
    const student = rows(state.students ?? [], "alunos").find((student) => student.id === record.studentId);
    if (!student) return fail("matrícula do calendário");
    const calendar = rows(record.billingCalendar ?? [], "calendário"), aid = rows(record.financialAid ?? [], "benefícios"), adjustments = rows(record.financialAdjustments ?? [], "ajustamentos"), charges = [...rows(record.charges ?? [], "cobranças"), ...rows(record.penaltyCharges ?? [], "multas")];
    unique(calendar, "itens repetidos no calendário"); unique(aid, "benefícios repetidos"); unique(adjustments, "ajustamentos repetidos");
    for (const item of calendar) {
      if (item.enrollmentId !== (student.enrollmentId ?? student.id) || !["registration", "tuition"].includes(String(item.kind)) || typeof item.issueOn !== "string" || !validDate(item.issueOn) || typeof item.competence !== "string" || !/^\d{4}-\d{2}$/.test(item.competence) || (item.kind === "tuition" && !monthOptions.some((month) => month.key === item.monthKey))) fail("item de calendário incompleto");
      if (item.kind === "tuition" && (item.issueOn !== `${item.competence}-01` || item.competence !== `${student.academicYearId}-${String(monthOptions.findIndex((month) => month.key === item.monthKey) + 1).padStart(2, "0")}` || item.id !== `CHG-${student.id}-TUI-${String(item.monthKey).toUpperCase()}`)) fail("competência do calendário");
    }
    for (const item of aid) {
      if (item.enrollmentId !== (student.enrollmentId ?? student.id) || !["scholarship", "partial_scholarship", "exception", "weighted"].includes(String(item.kind)) || typeof item.percent !== "number" || item.percent < 0 || item.percent > 100 || typeof item.appliesToRegistration !== "boolean" || typeof item.appliesToTuition !== "boolean" || typeof item.registeredAt !== "string" || typeof item.registeredBy !== "string") fail("benefício incompleto");
      for (const key of ["effectiveFrom", "revokedOn"]) if (item[key] !== undefined && (typeof item[key] !== "string" || !validDate(item[key] as string))) fail("data de benefício");
      for (const key of ["startMonth", "endMonth"]) if (item[key] !== undefined && !monthOptions.some((month) => month.key === item[key])) fail("mês do benefício");
    }
    for (const item of adjustments) {
      if (!charges.some((charge) => charge.id === item.chargeId) || !["benefit", "late-proof"].includes(String(item.kind)) || typeof item.reason !== "string" || !item.reason.trim() || typeof item.recordedAt !== "string" || typeof item.recordedBy !== "string") fail("ajustamento incompleto");
      cents(item.previousAmount as number); cents(item.nextAmount as number); rows(item.releasedAllocations, "aplicações libertadas");
    }
    for (const charge of charges) {
      if (object(charge.snapshot) && charge.snapshot.calculationVersion !== undefined && charge.snapshot.calculationVersion !== "v3") fail("versão da cobrança desconhecida");
      if (charge.adjustedBenefit !== undefined && (!object(charge.adjustedBenefit) || typeof charge.adjustedBenefit.label !== "string" || !Array.isArray(charge.adjustedBenefit.benefitIds))) fail("condição ajustada incompleta");
      const adjusted = charge.adjustedDueAmount ?? charge.adjustedAmount;
      if (adjusted !== undefined && !charge.academicCancellation) {
        const last = adjustments.filter((item) => item.chargeId === charge.id).at(-1);
        if (!last || last.nextAmount !== adjusted) fail("valor ajustado sem histórico correspondente");
      }
    }
  }
}
