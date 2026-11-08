import type { DemoState, DemoData } from "../demo/demo-state";
import { ensurePenaltyChargesForRecord } from "../../components/school-admin-demo.model";
import { cloneJson } from "../demo/demo-state";
import type { DemoRepository, DemoCommit } from "../demo/local-repository";
import { academicStateFor, projectStudents } from "../academics/model";
import type { FinancialAid, PaymentRuleVersion } from "./domain/entities";
import { monthOptions } from "../../lib/school-demo-data";
import { addDays, adjustCharge, assessPenalties, benefitFor, defaultRule, effectiveAmount, projectedCharge, schoolToday, synchronizeRecord, validateRule, validDate } from "./domain/billing";
import { cents, percentage } from "./domain/money";

export function prepareBilling(source: DemoState, recordedAt: string, selected?: { studentId: string; chargeId: string }): Partial<DemoData> {
  const state = cloneJson(source), academic = academicStateFor(state), on = schoolToday({ now: () => recordedAt });
  const students = projectStudents(state, academic, on), rules = state.paymentRuleVersions;
  for (const schoolClass of state.classes) {
    if (!academic.placements.some((placement) => placement.classId === schoolClass.id && !placement.voided)) continue;
    const year = academic.years.find((item) => item.id === schoolClass.academicYear), level = state.classDefinitions.find((item) => item.id === (schoolClass.definitionId ?? schoolClass.educationLevelId ?? schoolClass.id))?.stageId ?? schoolClass.educationLevelId ?? schoolClass.id;
    if (year && !rules.some((rule) => rule.calculationVersion === "v3" && rule.academicYearId === year.id && rule.educationLevelId === level)) rules.push(defaultRule({ ...students[0], academicYearId: year.id, pricingLevelId: level, educationLevelId: schoolClass.educationLevelId ?? schoolClass.id, billingMonths: year.billingMonths }, year.settings, rules, recordedAt));
  }
  const byDate = new Map<string, Map<string, typeof students[number]>>();
  const studentAt = (student: typeof students[number], date: string) => {
    if (!byDate.has(date)) byDate.set(date, new Map(projectStudents(state, academic, date).map((item) => [item.id, item])));
    return byDate.get(date)!.get(student.id) ?? student;
  };
  for (const student of students) {
    const settings = academic.years.find((year) => year.id === student.academicYearId)?.settings ?? state.paymentSettings;
    if (!rules.some((rule) => rule.calculationVersion === "v3" && rule.academicYearId === student.academicYearId && rule.educationLevelId === (student.pricingLevelId ?? student.educationLevelId ?? student.classId))) rules.push(defaultRule(student, settings, rules, recordedAt));
    const record = state.paymentRecords.find((item) => item.studentId === student.id);
    if (!record) continue;
    const months = academic.years.find((year) => year.id === student.academicYearId)?.billingMonths ?? student.billingMonths ?? [];
    synchronizeRecord(record, student, months, rules, on, recordedAt, selected?.studentId === student.id ? selected.chargeId : undefined, (date) => studentAt(student, date));
    // Issued legacy charges keep their own algorithm; newly reached stages are persisted too.
    state.paymentRecords[state.paymentRecords.indexOf(record)] = ensurePenaltyChargesForRecord(record, student, monthOptions.filter((month) => months.includes(month.key)), settings, rules.filter((rule) => rule.calculationVersion !== "v3"), on);
  }
  return { students: state.students.map((student) => {
    const record = state.paymentRecords.find((item) => item.studentId === student.id), registration = record?.charges.find((item) => item.category === "registration");
    if (!record || !registration) return student;
    const paid = record.allocations.filter((item) => item.chargeId === registration.id).reduce((total, item) => total + cents(item.amount), 0);
    return { ...student, registrationStatus: paid >= cents(effectiveAmount(registration)) ? "paid" as const : "pending" as const };
  }), paymentRecords: state.paymentRecords, paymentRuleVersions: rules };
}

export function synchronizeSchool(repository: DemoRepository, expected: DemoState, role: "secretaria" | "director", recordedAt: string): DemoState {
  if (role !== "secretaria") return expected;
  const patch = prepareBilling(expected, recordedAt);
  if (JSON.stringify(patch.paymentRecords) === JSON.stringify(expected.paymentRecords) && JSON.stringify(patch.paymentRuleVersions) === JSON.stringify(expected.paymentRuleVersions)) return expected;
  return repository.commit({ role, action: "publish-charges", expected, command: { id: `SYNC-${expected.datasetId}-${expected.revision}-${schoolToday({ now: () => recordedAt })}`, payload: { on: schoolToday({ now: () => recordedAt }) } }, change(current) { return { patch: prepareBilling(current, recordedAt) }; } }).state;
}

export type BillingCommand =
  | { type: "rule"; rule: PaymentRuleVersion }
  | { type: "aid"; studentId: string; aid: FinancialAid; retroactive: boolean }
  | { type: "revoke-aid"; studentId: string; aidId: string; on: string; reason: string };

export function executeBilling(repository: DemoRepository, expected: DemoState, command: BillingCommand, options: { id: string; role: "secretaria" | "director"; recordedAt: string }): DemoCommit {
  return repository.commit({ role: options.role, action: command.type === "rule" ? "manage-payment-rules" : "manage-financial-aid", expected, command: { id: options.id, payload: command }, change(current) {
    const state = { ...current, ...prepareBilling(current, options.recordedAt) }, academic = academicStateFor(state), today = schoolToday({ now: () => options.recordedAt });
    if (command.type === "rule") {
      const rule = cloneJson(command.rule), year = academic.years.find((item) => item.id === rule.academicYearId);
      if (!year || year.status === "closed") throw new Error("Escolha um ano lectivo aberto.");
      if (!state.classes.some((item) => item.academicYear === year.id && (state.classDefinitions.find((definition) => definition.id === (item.definitionId ?? item.educationLevelId ?? item.id))?.stageId ?? item.educationLevelId ?? item.id) === rule.educationLevelId)) throw new Error("Seleccione um nível com classes neste ano.");
      validateRule(rule);
      if (rule.validFrom < year.startsOn || rule.validFrom > year.endsOn || (rule.validUntil && rule.validUntil > year.endsOn)) throw new Error("A vigência deve pertencer ao calendário do ano.");
      if (!rule.reason?.trim()) throw new Error("Indique o motivo da nova regra.");
      if (rule.coveredMonthKeys.some((month) => !year.billingMonths.includes(month))) throw new Error("A regra contém meses fora do calendário do ano.");
      const same = state.paymentRuleVersions.filter((item) => item.calculationVersion === "v3" && !item.supersededBy && item.academicYearId === rule.academicYearId && item.educationLevelId === rule.educationLevelId);
      const unusedDefaults = same.filter((item) => item.validFrom === rule.validFrom && item.id.endsWith("-DEFAULT") && !state.paymentRecords.some((record) => record.charges.some((charge) => charge.ruleVersionId === item.id)));
      if (same.some((item) => !unusedDefaults.includes(item) && item.validFrom >= rule.validFrom)) throw new Error("Já existe uma vigência nessa data ou posterior. Crie a nova regra após a última vigência.");
      rule.id = `RULE-${options.id}`; rule.calculationVersion = "v3"; rule.status = "active"; rule.version = Math.max(0, ...state.paymentRuleVersions.filter((item) => item.academicYearId === rule.academicYearId && item.educationLevelId === rule.educationLevelId).map((item) => item.version)) + 1;
      rule.registeredAt = options.recordedAt; rule.registeredBy = "Secretaria";
      state.paymentRuleVersions = [...state.paymentRuleVersions.map((item) => unusedDefaults.includes(item) ? { ...item, status: "inactive" as const, supersededBy: rule.id } : same.includes(item) && (!item.validUntil || item.validUntil >= rule.validFrom) ? { ...item, validUntil: addDays(rule.validFrom, -1) } : item), rule];
    } else {
      const record = state.paymentRecords.find((item) => item.studentId === command.studentId), student = projectStudents(state, academic, today).find((item) => item.id === command.studentId);
      if (!record || !student) throw new Error("Seleccione uma matrícula válida.");
      if (command.type === "revoke-aid") {
        const aid = record.financialAid?.find((item) => item.id === command.aidId);
        if (!aid || !validDate(command.on) || !command.reason.trim()) throw new Error("Indique a data e o motivo do fim do benefício.");
        if (command.on < today || (aid.effectiveFrom && command.on < aid.effectiveFrom) || (aid.revokedOn && command.on >= aid.revokedOn)) throw new Error("A revogação deve ter efeito futuro e respeitar a vigência do benefício.");
        aid.revokedOn = command.on;
        aid.reason = `${aid.reason ?? ""}\nFim: ${command.reason} (${options.recordedAt}; Secretaria)`;
      } else {
        const aid = cloneJson(command.aid), year = academic.years.find((item) => item.id === student.academicYearId)!;
        if (aid.kind === "weighted" || !["scholarship", "partial_scholarship", "exception"].includes(aid.kind)) throw new Error("Escolha uma bolsa ou isenção definida.");
        cents(aid.percent); if (aid.percent < 0 || aid.percent > 100 || ((aid.kind === "scholarship" || aid.kind === "exception") && aid.percent !== 100)) throw new Error("Reveja a percentagem do benefício.");
        if (!aid.reason?.trim() || !aid.effectiveFrom || !validDate(aid.effectiveFrom) || aid.effectiveFrom < year.startsOn || aid.effectiveFrom > year.endsOn) throw new Error("Indique o motivo e uma data de início dentro do ano lectivo.");
        if (!command.retroactive && aid.effectiveFrom < today) throw new Error("Confirme o efeito retroactivo para aplicar um benefício anterior a hoje.");
        if (!aid.appliesToRegistration && !aid.appliesToTuition) throw new Error("Seleccione os itens abrangidos.");
        if (aid.kind === "scholarship" && (!aid.appliesToRegistration || !aid.appliesToTuition)) throw new Error("A bolsa integral cobre inscrição e mensalidades.");
        if ((aid.startMonth && !year.billingMonths.includes(aid.startMonth)) || (aid.endMonth && !year.billingMonths.includes(aid.endMonth)) || (aid.startMonth && aid.endMonth && monthOptions.findIndex((m) => m.key === aid.endMonth) < monthOptions.findIndex((m) => m.key === aid.startMonth))) throw new Error("Reveja o período abrangido.");
        if (aid.kind === "exception" && (!aid.startMonth || !aid.endMonth)) throw new Error("A isenção temporária exige mês inicial e final.");
        aid.id = `AID-${options.id}`; aid.enrollmentId = student.enrollmentId ?? student.id; aid.registeredAt = options.recordedAt; aid.registeredBy = "Secretaria";
        record.financialAid = [...(record.financialAid ?? []), aid];
        if (command.retroactive) {
          for (const charge of record.charges) {
            const item = record.billingCalendar?.find((item) => item.id === charge.id);
            if (!item || charge.academicCancellation) continue;
            const benefit = benefitFor(record.financialAid, item), oldPercent = charge.snapshot?.discountPercent ?? 0;
            if (benefit.percent <= oldPercent) continue;
            const base = cents(charge.baseAmount ?? charge.snapshot?.originalAmount ?? charge.amount), next = base - percentage(base, benefit.percent);
            adjustCharge(record, charge, next, { kind: "benefit", reason: aid.reason!, evidenceReference: aid.authorizationReference, recordedBy: "Secretaria", recordedAt: options.recordedAt });
            charge.adjustedBenefit = { percent: benefit.percent, label: benefit.label, benefitIds: benefit.ids };
            if (charge.snapshot?.calculationVersion !== "v3") {
              const reduction = Math.max(0, cents(charge.dueAmount ?? charge.amount) - next);
              let previousTotal = 0;
              for (const penalty of [...(record.penaltyCharges ?? [])].filter((penalty) => penalty.baseChargeId === charge.id && !penalty.academicCancellation).sort((a, b) => (a.stage === "first" ? 0 : 1) - (b.stage === "first" ? 0 : 1))) {
                const principal = Math.max(0, cents(penalty.snapshot.baseBalance) - reduction);
                const adjusted = Math.max(0, Math.round(principal * penalty.snapshot.percent / 100) - previousTotal);
                adjustCharge(record, penalty, adjusted, { kind: "benefit", reason: aid.reason!, evidenceReference: aid.authorizationReference, recordedBy: "Secretaria", recordedAt: options.recordedAt });
                previousTotal += adjusted;
              }
            }
          }
          assessPenalties(record, today, options.recordedAt, { kind: "benefit", reason: aid.reason!, evidenceReference: aid.authorizationReference || aid.id });
        }
      }
    }
    const next = { ...state, ...prepareBilling(state, options.recordedAt) };
    return { patch: { students: next.students, paymentRecords: next.paymentRecords, paymentRuleVersions: next.paymentRuleVersions }, result: { saved: true } };
  } });
}

export function billingForecast(state: DemoState, studentId: string, recordedAt: string) {
  const academic = academicStateFor(state), student = projectStudents(state, academic, schoolToday({ now: () => recordedAt })).find((item) => item.id === studentId), record = state.paymentRecords.find((item) => item.studentId === studentId);
  if (!student || !record) return [];
  return (record.billingCalendar ?? []).map((item) => ({ item, issued: record.charges.find((charge) => charge.id === item.id), forecast: projectedCharge(student, item, state.paymentRuleVersions, record.financialAid ?? [], recordedAt) }));
}
