import type { Charge, Payment, StudentPaymentRecord } from "../../lib/school-demo-data";
import { monthOptions } from "../../lib/school-demo-data";
import { normalizeText } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import { academicStateFor, groupOccupancy, projectStudents } from "../academics/model";
import { prepareBilling } from "../finance/billing-commands";
import { effectiveAmount, projectedCharge, schoolToday, validDate } from "../finance/domain/billing";
import { cents, money } from "../finance/domain/money";
import { paymentCredit, pendingProofFor } from "../finance/service-model";
import { restateCashMovement } from "../cash/model";

export const reportDefinitions = {
  receipts: { title: "Recebimentos", definition: "Dinheiro confirmado pela data efectiva, excluindo estornos de erro e aplicações de crédito. Abrange todos os anos lectivos.", scope: "movements" },
  refunds: { title: "Devoluções", definition: "Dinheiro devolvido pela data efectiva. Apresentado separadamente do recebido e ligado à origem.", scope: "movements" },
  allocations: { title: "Liquidado por competência", definition: "Aplicações às cobranças do período e ano seleccionados, incluindo crédito existente. Não equivale a novo dinheiro recebido.", scope: "academic" },
  overdue: { title: "Dívida vencida", definition: "Principal e multas em aberto com prazo anterior à data final. Não inclui previsões, dispensas ou obrigações no prazo.", scope: "academic" },
  due: { title: "A vencer", definition: "Obrigações já emitidas, com saldo e vencimento igual ou posterior à data final. Não inclui previsões.", scope: "academic" },
  forecast: { title: "Previsto", definition: "Calendário individual ainda não emitido, no período seleccionado. Não é recebido nem dívida vencida.", scope: "academic" },
  benefits: { title: "Bolsas e descontos", definition: "Valor dispensado nas cobranças emitidas da competência seleccionada. Não é dinheiro recebido.", scope: "academic" },
  credit: { title: "Crédito disponível", definition: "Saldo actual ainda não aplicado nem devolvido, por origem. Inclui outros anos da mesma pessoa; não depende do intervalo de datas.", scope: "current" },
  enrollments: { title: "Matrículas confirmadas", definition: "Matrículas anuais activas, desistentes ou concluídas. Exclui rascunhos e canceladas; os estados são apresentados separadamente.", scope: "current" },
  occupancy: { title: "Vagas por turma", definition: "Capacidade e ocupação por colocações válidas no ano seleccionado. O próximo ano é consultado na sua data de início.", scope: "current" },
} as const;
export type ReportKind = keyof typeof reportDefinitions;
export type ReportFilters = { kind: ReportKind; from: string; to: string; yearId: string; classId: string; groupId: string; method: string; actorId: string; search: string };
export type ReportRow = {
  id: string; amount: number; label: string; name: string; number: string; studentId?: string; personId?: string;
  yearId: string; originYear?: string; classId: string; groupId: string; date: string; recordedAt: string;
  method: string; actorId: string; actorName: string; status: string; sourceId: string; receiptId?: string;
  dueOn?: string; principal?: number; penalty?: number; pending?: boolean; guardianName?: string; guardianPhone?: string;
  capacity?: number; occupied?: number; applicationDate?: string;
};
export type ReportResult = { kind: ReportKind; title: string; definition: string; filters: ReportFilters; rows: ReportRow[]; total: number; count: number; unit: "money" | "count"; generatedAt: string; schoolName: string; schoolDate: string; scope: string; filterLabels: { className: string; groupName: string; actorName: string } };
export function defaultReportFilters(yearId: string, recordedAt: string): ReportFilters {
  const today = schoolToday({ now: () => recordedAt });
  return { kind: "receipts", from: `${today.slice(0, 7)}-01`, to: today, yearId, classId: "", groupId: "", method: "", actorId: "", search: "" };
}
export function reportSource(input: DemoState, recordedAt: string) {
  const state = { ...input, ...prepareBilling(input, recordedAt) }, academic = academicStateFor(state), today = schoolToday({ now: () => recordedAt });
  const students = projectStudents(state, academic, today);
  return { state, academic, students, recordedAt, today };
}
export type ReportSource = ReturnType<typeof reportSource>;
export function sourcePayment(state: DemoState, studentId: string, payment: Payment): { studentId: string; payment: Payment } {
  const visited = new Set<string>(); let current = { studentId, payment };
  while (current.payment.origin) {
    const key = `${current.studentId}:${current.payment.id}`;
    if (visited.has(key)) throw new Error("A origem do crédito contém uma relação circular."); visited.add(key);
    const origin = current.payment.origin;
    const parent = state.paymentRecords.find((item) => item.studentId === origin.studentId)?.payments.find((item) => item.id === origin.paymentId);
    if (!parent) throw new Error("A origem do crédito não está disponível."); current = { studentId: origin.studentId, payment: parent };
  }
  return current;
}
function actor(payment?: Payment) {
  return { actorId: payment?.recordedBy === "Marta — Secretaria" ? "demo-secretaria" : "previous-author", actorName: payment?.recordedBy ?? "Autor anterior não registado" };
}
function studentFields(source: ReportSource, studentId: string) {
  const student = source.students.find((item) => item.id === studentId);
  return { studentId, personId: student?.personId ?? studentId, name: student?.fullName ?? "Aluno anterior indisponível", number: student?.registrationNumber ?? "", yearId: student?.academicYearId ?? "", classId: student?.classId ?? "", groupId: student?.groupId ?? "", guardianName: student?.guardianName, guardianPhone: student?.guardianPhone };
}
function row(source: ReportSource, studentId: string, patch: Partial<ReportRow> & { id: string; amount: number; label: string }): ReportRow {
  return { date: "", recordedAt: "", method: "", actorId: "previous-author", actorName: "Autor anterior não registado", status: "", sourceId: "", ...studentFields(source, studentId), ...patch };
}
function competence(source: ReportSource, studentId: string, charge: Charge) {
  const student = source.students.find((item) => item.id === studentId), year = student?.academicYearId ?? "";
  if (charge.category === "tuition" && charge.monthKey) return `${year}-${String(monthOptions.findIndex((item) => item.key === charge.monthKey) + 1).padStart(2, "0")}`;
  return (charge.dueOn ?? (charge.category === "registration" ? student?.enrollmentDate : charge.createdAt) ?? "").slice(0, 7);
}
function appliedUntil(record: StudentPaymentRecord, id: string, on: string) {
  return record.allocations.filter((allocation) => allocation.chargeId === id && record.payments.some((payment) => payment.id === allocation.paymentId && !payment.reversedBy && (allocation.effectiveOn ?? payment.effectivePaymentDate ?? payment.paidOn) <= on)).reduce((sum, item) => sum + cents(item.amount), 0);
}
const positiveBalance = (record: StudentPaymentRecord, charge: Parameters<typeof effectiveAmount>[0], on: string) => Math.max(0, cents(effectiveAmount(charge)) - appliedUntil(record, charge.id, on));
function compatible(candidate: ReportRow, filters: ReportFilters, academic = true) {
  if (academic && filters.yearId && candidate.yearId !== filters.yearId) return false;
  if (filters.classId && candidate.classId !== filters.classId) return false;
  if (filters.groupId && candidate.groupId !== filters.groupId) return false;
  const query = normalizeText(filters.search);
  return !query || normalizeText(`${candidate.name} ${candidate.number} ${candidate.label} ${candidate.sourceId}`).includes(query);
}

export function queryReport(source: ReportSource, filters: ReportFilters): ReportResult {
  if (!reportDefinitions[filters.kind] || !validDate(filters.from) || !validDate(filters.to) || filters.from > filters.to) throw new Error("Reveja o intervalo de datas do relatório.");
  const { state, academic } = source, output: ReportRow[] = [];
  const scope = reportDefinitions[filters.kind].scope;
  const inPeriod = (date: string) => Boolean(date && date >= filters.from && date <= filters.to);
  const inCompetence = (period: string) => Boolean(period && period >= filters.from.slice(0, 7) && period <= filters.to.slice(0, 7));
  const add = (candidate: ReportRow, useYear = true) => { if (compatible(candidate, filters, useYear)) output.push(candidate); };
  for (const record of state.paymentRecords) {
    if (filters.kind === "receipts") for (const payment of record.payments.filter((item) => !item.reversedBy && item.kind !== "credit-application")) {
      const date = payment.effectivePaymentDate ?? payment.paidOn;
      if (!inPeriod(date)) continue;
      const cash = state.cashBook?.movements.map((movement) => restateCashMovement(state.cashBook!, movement)).find((movement) => movement.kind === "receipt" && movement.source?.studentId === record.studentId && movement.source.paymentId === payment.id);
      const owner = cash ? { actorId: cash.actorId, actorName: cash.actorName } : actor(payment);
      if ((filters.method && payment.method !== filters.method) || (filters.actorId && filters.actorId !== owner.actorId)) continue;
      add(row(source, record.studentId, { id: `${record.studentId}:${payment.id}`, label: "Recebimento confirmado", amount: payment.amount, date, recordedAt: payment.recordedAt ?? "", method: payment.method, ...owner,
        sourceId: payment.id, status: cash ? "Com sessão de caixa" : "Sessão anterior não registada", receiptId: state.receipts.find((item) => item.studentId === record.studentId && item.paymentId === payment.id)?.id }), false);
    }
    if (filters.kind === "refunds") for (const debit of record.creditDebits ?? []) {
      if (debit.kind !== "refund" || !inPeriod(debit.effectiveOn) || (filters.method && debit.method !== filters.method)) continue;
      const owner = { actorId: debit.recordedBy === "Marta — Secretaria" ? "demo-secretaria" : "previous-author", actorName: debit.recordedBy };
      if (filters.actorId && filters.actorId !== owner.actorId) continue;
      add(row(source, record.studentId, { id: debit.id, label: debit.reason, amount: debit.amount, date: debit.effectiveOn, recordedAt: debit.recordedAt, method: debit.method, ...owner, sourceId: debit.paymentId, status: "Devolução confirmada" }), false);
    }
    if (filters.kind === "allocations") for (const allocation of record.allocations) {
      const payment = record.payments.find((item) => item.id === allocation.paymentId);
      if (!payment || payment.reversedBy) continue;
      const penalty = record.penaltyCharges?.find((item) => item.id === allocation.chargeId);
      const charge = record.charges.find((item) => item.id === (penalty?.baseChargeId ?? allocation.chargeId));
      if (!charge || !inCompetence(competence(source, record.studentId, charge))) continue;
      const origin = sourcePayment(state, record.studentId, payment);
      add(row(source, record.studentId, { id: `${record.studentId}:${allocation.id}`, amount: allocation.amount,
        label: `${charge.description}${penalty ? " · Multa" : ""}`, date: `${competence(source, record.studentId, charge)}-01`,
        applicationDate: allocation.effectiveOn ?? payment.effectivePaymentDate ?? payment.paidOn, recordedAt: payment.recordedAt ?? "", method: payment.kind === "credit-application" || allocation.effectiveOn ? "Crédito existente" : payment.method,
        ...actor(payment), originYear: studentFields(source, origin.studentId).yearId, sourceId: origin.payment.id, status: "Aplicação", receiptId: state.receipts.find((item) => item.studentId === origin.studentId && item.paymentId === origin.payment.id)?.id }));
    }
    if (["overdue", "due", "benefits"].includes(filters.kind)) for (const charge of record.charges) {
      const period = competence(source, record.studentId, charge);
      if (filters.kind === "benefits") {
        if (charge.academicCancellation || !inCompetence(period)) continue;
        const amount = Math.max(0, cents(charge.baseAmount ?? charge.snapshot?.originalAmount ?? charge.amount) - cents(effectiveAmount(charge)));
        if (amount) add(row(source, record.studentId, { id: charge.id, amount: money(amount), label: charge.adjustedBenefit?.label ?? charge.snapshot?.ruleLabel ?? "Benefício registado", date: `${period}-01`, sourceId: charge.id, status: charge.description }));
        continue;
      }
      const calendar = record.billingCalendar?.find((item) => item.id === charge.id);
      if ((calendar?.issueOn ?? charge.createdAt.slice(0, 10)) > filters.to) continue;
      const principal = positiveBalance(record, charge, filters.to);
      const penalty = (record.penaltyCharges ?? []).filter((item) => item.baseChargeId === charge.id && item.effectiveOn <= filters.to).reduce((sum, item) => sum + positiveBalance(record, item, filters.to), 0);
      const isOverdue = Boolean(charge.dueOn && charge.dueOn < filters.to);
      if (!principal && !penalty) continue;
      if (filters.kind === "overdue" && !isOverdue && !penalty) continue;
      if (filters.kind === "due" && (isOverdue || penalty)) continue;
      const pending = Boolean(pendingProofFor(state, record.studentId, charge.id));
      add(row(source, record.studentId, { id: charge.id, amount: money(principal + penalty), principal: money(principal), penalty: money(penalty), dueOn: charge.dueOn, date: charge.dueOn ?? "", label: charge.description, sourceId: charge.id,
        pending, status: pending ? "Em análise · saldo mantido" : !charge.dueOn ? "Prazo anterior não registado" : penalty && !principal ? "Multa por pagar" : isOverdue ? "Em atraso" : "A vencer" }));
    }
    if (filters.kind === "forecast") {
      const student = source.students.find((item) => item.id === record.studentId);
      if (!student) continue;
      for (const calendar of record.billingCalendar ?? []) {
        if (record.charges.some((item) => item.id === calendar.id) || !inCompetence(calendar.competence)) continue;
        const projected = projectedCharge(student, calendar, state.paymentRuleVersions, record.financialAid ?? [], source.recordedAt);
        if (projected) add(row(source, record.studentId, { id: calendar.id, amount: effectiveAmount(projected), label: projected.description, date: calendar.issueOn, dueOn: projected.dueOn, sourceId: calendar.id, status: "Previsto · ainda não emitido" }));
      }
    }
  }
  if (filters.kind === "credit") {
    const eligiblePeople = new Map<string, ReturnType<typeof studentFields>>();
    for (const student of source.students) {
      const fields = studentFields(source, student.id);
      if (compatible({ ...row(source, student.id, { id: student.id, amount: 0, label: "" }) }, { ...filters, search: "" })) eligiblePeople.set(fields.personId, fields);
    }
    for (const record of state.paymentRecords) {
      const person = eligiblePeople.get(studentFields(source, record.studentId).personId);
      if (!person) continue;
      for (const payment of record.payments) {
        const available = paymentCredit(record, payment.id);
        if (!available) continue;
        const candidate = row(source, record.studentId, { id: `${record.studentId}:${payment.id}`, amount: available, label: "Crédito disponível", date: payment.effectivePaymentDate ?? payment.paidOn, method: payment.kind === "credit-application" ? "Crédito entre anos" : payment.method, sourceId: payment.id, ...actor(payment), status: `Origem no ano ${studentFields(source, record.studentId).yearId}`, originYear: studentFields(source, record.studentId).yearId, classId: person.classId, groupId: person.groupId, yearId: person.yearId });
        add(candidate);
      }
    }
  }
  if (filters.kind === "enrollments") for (const enrollment of academic.enrollments.filter((item) => item.status !== "cancelled")) {
    add(row(source, enrollment.studentRecordId, { id: enrollment.id, amount: 1, label: "Matrícula confirmada", date: enrollment.enrolledOn, sourceId: enrollment.id, status: ({ active: "Activa", withdrawn: "Desistente", completed: "Concluída", cancelled: "Cancelada" } as const)[enrollment.status] }));
  }
  if (filters.kind === "occupancy") for (const group of state.groups.filter((item) => item.status === "active")) {
    const schoolClass = state.classes.find((item) => item.id === group.classId), year = academic.years.find((item) => item.id === schoolClass?.academicYear);
    const on = year && source.today < year.startsOn ? year.startsOn : source.today;
    const capacity = Math.min(group.capacity, state.rooms.find((item) => item.id === group.roomId)?.capacity ?? group.capacity);
    const occupied = groupOccupancy(academic, group.id, on), remaining = Math.max(0, capacity - occupied);
    add({ id: group.id, studentId: undefined, name: group.name, number: "", personId: undefined, yearId: schoolClass?.academicYear ?? "", classId: group.classId, groupId: group.id, amount: remaining,
      label: schoolClass?.name ?? "Classe anterior indisponível", date: on, recordedAt: "", method: "", actorId: "", actorName: "", status: occupied >= capacity ? "Completa" : occupied >= capacity * 0.9 ? "90% de ocupação ou mais" : "Com vagas", sourceId: group.id, capacity, occupied });
  }
  const rows = output.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "pt-PT") || a.id.localeCompare(b.id));
  const unit = ["enrollments", "occupancy"].includes(filters.kind) ? "count" as const : "money" as const;
  return { kind: filters.kind, ...reportDefinitions[filters.kind], filters: { ...filters }, rows, count: rows.length,
    total: unit === "money" ? money(rows.reduce((sum, item) => sum + cents(item.amount), 0)) : rows.reduce((sum, item) => sum + item.amount, 0), unit,
    filterLabels: { className: state.classes.find((item) => item.id === filters.classId)?.name ?? "Todas", groupName: state.groups.find((item) => item.id === filters.groupId)?.name ?? "Todas", actorName: filters.actorId === "demo-secretaria" ? "Marta — Secretaria" : filters.actorId === "previous-author" ? "Identificação anterior incompleta" : "Todos" },
    generatedAt: source.recordedAt, schoolName: academic.institution.name, schoolDate: source.today, scope };
}
export function buildReport(state: DemoState, filters: ReportFilters, recordedAt: string) { return queryReport(reportSource(state, recordedAt), filters); }

export function reminderDraft(result: ReportResult, personId: string) {
  const rows = result.rows.filter((item) => item.personId === personId && !item.pending && item.amount > 0 && result.kind === "overdue");
  const first = rows[0];
  if (!first) throw new Error("Não existem cobranças vencidas disponíveis para esta mensagem. Comprovativos em análise ficam suspensos.");
  const amount = money(rows.reduce((sum, item) => sum + cents(item.amount), 0));
  const periods = [...new Set(rows.map((item) => item.label))].join(", ");
  return { guardianName: first.guardianName ?? "Encarregado de educação", guardianPhone: first.guardianPhone ?? "Contacto não registado", studentName: first.name, amount,
    message: `Exmo./a ${first.guardianName || "Encarregado/a de educação"}, informamos que ${first.name} tem ${amount.toFixed(2).replace(".", ",")} MT por regularizar em ${result.schoolName}, referente a ${periods}, situação em ${result.filters.to}. Se já efectuou o pagamento, apresente o comprovativo à Secretaria. Obrigado.` };
}
