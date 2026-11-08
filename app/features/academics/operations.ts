import type { ClassGroup, PaymentSettings, Student } from "../../lib/school-demo-data";
import { monthOptions } from "../../lib/school-demo-data";
import { buildDefaultPaymentRuleVersions, buildPaymentRecord } from "../../components/school-admin-demo.model";
import { effectiveAmount } from "../finance/domain/billing";
import { prepareBilling } from "../finance/billing-commands";
import { cloneJson, type DemoData, type DemoState } from "../demo/demo-state";
import type { DemoRepository } from "../demo/local-repository";
import { academicStateFor, assertPlacementCapacity, dayBefore, groupOccupancy, isEnrollmentInput, lastPlacement, monthIndex, nextPermanentNumber, nextRosterNumber, possibleDuplicates, projectStudents, roomConflict, schoolDate, textKey, validDate, type AcademicEvent, type AcademicState, type AcademicYear, type EnrollmentInput } from "./model";

export class AcademicError extends Error {
  readonly field: string;
  constructor(message: string, field = "") { super(message); this.name = "AcademicError"; this.field = field; }
}
export type AcademicCommand =
  | { type: "institution"; name: string; contact: string; logoText: string }
  | { type: "year"; id: string; label: string; startsOn: string; endsOn: string; billingMonths: string[]; settings: PaymentSettings }
  | { type: "year-status"; yearId: string; status: AcademicYear["status"]; reason: string }
  | { type: "level"; id?: string; name: string }
  | { type: "class"; id?: string; name: string; levelId: string; yearId: string }
  | { type: "room"; id?: string; name: string; block: string; capacity: number; reason: string }
  | { type: "group"; id?: string; name: string; classId: string; roomId: string; shift: string; capacity: number; days: number[]; startsAt: string; endsAt: string; reason: string }
  | { type: "draft"; input: EnrollmentInput; draftId?: string }
  | { type: "enroll"; input: EnrollmentInput; draftId?: string }
  | { type: "person"; personId: string; fullName: string; guardianName: string; guardianPhone: string; reason: string; permanentNumber?: string }
  | { type: "transfer"; enrollmentId: string; groupId: string; effectiveOn: string; reason: string }
  | { type: "exit"; enrollmentId: string; status: "withdrawn" | "cancelled"; effectiveOn: string; reason: string };

const required = (value: string, field: string, label: string) => {
  if (typeof value !== "string" || !value.trim()) throw new AcademicError(`Preencha ${label}.`, field);
  return value.trim();
};
function amount(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > .00001) throw new AcademicError("Indique um valor positivo ou zero, com até duas casas decimais.", field);
}
function positiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) throw new AcademicError("Indique uma capacidade inteira superior a zero.", field);
}
function date(value: string, field: string) {
  if (!validDate(value)) throw new AcademicError("Indique uma data válida.", field);
}
function yearFor(academic: AcademicState, id: string, allowClosed = false) {
  const year = academic.years.find((year) => year.id === id);
  if (!year) throw new AcademicError("Escolha um ano lectivo válido.", "yearId");
  if (!allowClosed && year.status === "closed") throw new AcademicError("O ano lectivo está encerrado. Consulte o histórico ou escolha outro ano.", "yearId");
  return year;
}
function withinYear(value: string, year: AcademicYear, field: string) {
  date(value, field);
  if (value < year.startsOn || value > year.endsOn) throw new AcademicError("A data deve pertencer ao calendário do ano lectivo.", field);
}

export function previewExit(state: DemoState, enrollmentId: string, effectiveOn: string, cancelled: boolean) {
  const academic = academicStateFor(state);
  const enrollment = academic.enrollments.find((item) => item.id === enrollmentId);
  if (!enrollment) throw new AcademicError("Matrícula não encontrada.");
  const record = state.paymentRecords.find((item) => item.studentId === enrollment.studentRecordId);
  const charges = record?.charges.filter((charge) => cancelled || (charge.category === "tuition" && monthIndex(charge.monthKey ?? "") > Number(effectiveOn.slice(5, 7)) - 1)) ?? [];
  const ids = new Set(charges.map((charge) => charge.id));
  record?.penaltyCharges?.forEach((penalty) => { if (ids.has(penalty.baseChargeId)) ids.add(penalty.id); });
  return { charges, ids, releasedCredit: (record?.allocations ?? []).filter((item) => ids.has(item.chargeId)).reduce((sum, item) => sum + item.amount, 0) };
}

// All mutations share the repository's revision, idempotency and one-write boundary.
export function executeAcademic(repository: DemoRepository, expected: DemoState, command: AcademicCommand, options: {
  id: string; role: "secretaria" | "director"; recordedAt: string;
}) {
  return repository.commit({
    role: options.role, action: command.type === "enroll" || command.type === "draft" ? "manage-enrollment" : "manage-academic-structure",
    expected, command: { id: options.id, payload: command },
    change(current) {
      const academic = cloneJson(academicStateFor(current));
      const patch: Partial<DemoData> = { academic };
      const result: Record<string, unknown> = {};
      const effectiveToday = schoolDate(options.recordedAt);
      const event = (action: string, entityId: string, details: Partial<AcademicEvent> = {}) => {
        const entry: AcademicEvent = { id: `HIS-${options.id}-${academic.events.length}`, entityId, action, origin: "operation", recordedAt: options.recordedAt, actorId: "demo-secretaria", ...details };
        academic.events.push(entry); return entry.id;
      };
      switch (command.type) {
        case "institution": {
          const before = { ...academic.institution };
          academic.institution = { ...before, name: required(command.name, "name", "o nome da escola"), contact: command.contact.trim(), logoText: required(command.logoText, "logoText", "a sigla") };
          event("Dados da escola actualizados", academic.institution.id, { before, after: academic.institution });
          break;
        }
        case "year": {
          if (!/^\d{4}$/.test(command.id)) throw new AcademicError("Indique o ano com quatro algarismos.", "id");
          date(command.startsOn, "startsOn"); date(command.endsOn, "endsOn");
          if (command.startsOn > command.endsOn || !command.startsOn.startsWith(command.id) || !command.endsOn.startsWith(command.id)) throw new AcademicError("Reveja as datas dentro do ano indicado.", "endsOn");
          const months = monthOptions.filter((month) => command.billingMonths.includes(month.key)).map((month) => month.key);
          if (!months.length || months.length !== command.billingMonths.length) throw new AcademicError("Seleccione meses cobráveis válidos.", "billingMonths");
          if (months.some((key) => monthIndex(key) < Number(command.startsOn.slice(5, 7)) - 1 || monthIndex(key) > Number(command.endsOn.slice(5, 7)) - 1)) throw new AcademicError("Os meses cobráveis devem pertencer ao calendário.", "billingMonths");
          amount(command.settings.monthlyFee, "monthlyFee"); amount(command.settings.inscriptionRenewalFee, "inscriptionRenewalFee");
          if (!Number.isInteger(command.settings.monthlyDueDay) || command.settings.monthlyDueDay! < 1 || command.settings.monthlyDueDay! > 31) throw new AcademicError("O vencimento deve ser entre 1 e 31.", "monthlyDueDay");
          const before = academic.years.find((year) => year.id === command.id);
          if (before?.status === "closed") throw new AcademicError("O calendário encerrado conserva-se no histórico.");
          const enrollments = academic.enrollments.filter((item) => item.yearId === command.id);
          if (enrollments.some((item) => item.startsOn < command.startsOn || item.startsOn > command.endsOn || !months.includes(item.tuitionStartMonth))) throw new AcademicError("O calendário não pode excluir matrículas existentes.", "billingMonths");
          const annualStudentIds = new Set(enrollments.map((item) => item.studentRecordId));
          if (current.paymentRecords.some((record) => annualStudentIds.has(record.studentId) && record.charges.some((charge) => charge.category === "tuition" && charge.monthKey && !months.includes(charge.monthKey) && !charge.academicCancellation))) throw new AcademicError("O calendário não pode excluir cobranças já registadas.", "billingMonths");
          const next: AcademicYear = { id: command.id, label: required(command.label, "label", "a designação do ano"), status: before?.status ?? "preparing", startsOn: command.startsOn, endsOn: command.endsOn, billingMonths: months, calendarReviewed: true, settings: { ...command.settings, academicYear: command.id, startMonth: months[0], endMonth: months.at(-1)! } };
          academic.years = [...academic.years.filter((item) => item.id !== next.id), next];
          if (next.status === "active") patch.paymentSettings = next.settings;
          event("Calendário configurado", next.id, { before, after: next }); result.yearId = next.id;
          break;
        }
        case "year-status": {
          const year = yearFor(academic, command.yearId);
          const reason = required(command.reason, "reason", "o motivo");
          if (command.status === "preparing") throw new AcademicError("Um ano iniciado não regressa à preparação.");
          if (command.status === "active" && academic.years.some((item) => item.status === "active" && item.id !== year.id)) throw new AcademicError("Encerre o ano operacional anterior antes de iniciar outro.");
          if (command.status === "active" && !year.calendarReviewed) throw new AcademicError("Confirme primeiro o calendário e os valores do ano.");
          if (command.status === "closed" && year.status !== "active") throw new AcademicError("Só pode encerrar o ano em curso.");
          event(command.status === "active" ? "Ano lectivo iniciado" : "Ano lectivo encerrado", year.id, { before: { status: year.status }, after: { status: command.status }, reason });
          year.status = command.status;
          if (year.status === "active") patch.paymentSettings = year.settings;
          else academic.enrollments.filter((item) => item.yearId === year.id && item.status === "active").forEach((item) => { item.status = "completed"; item.endsOn = year.endsOn; });
          break;
        }
        case "level": {
          const name = required(command.name, "name", "o nome do nível");
          if (current.academicStages.some((item) => item.id !== command.id && textKey(item.name) === textKey(name))) throw new AcademicError("Já existe um nível com esse nome.", "name");
          const id = command.id ?? `LVL-${options.id}`;
          patch.academicStages = [...current.academicStages.filter((item) => item.id !== id), { id, name, status: "active", createdAt: current.academicStages.find((item) => item.id === id)?.createdAt ?? effectiveToday }];
          patch.classes = current.classes.map((item) => current.classDefinitions.find((definition) => definition.id === (item.definitionId ?? item.id))?.stageId === id ? { ...item, stage: name } : item);
          event("Nível configurado", id, { after: { name } }); break;
        }
        case "class": {
          const year = yearFor(academic, command.yearId);
          const level = current.academicStages.find((item) => item.id === command.levelId && item.status === "active");
          if (!level) throw new AcademicError("Escolha um nível activo.", "levelId");
          const name = required(command.name, "name", "o nome da classe");
          const definition = command.id ? current.classDefinitions.find((item) => item.id === command.id) : current.classDefinitions.find((item) => textKey(item.name) === textKey(name) && item.stageId === level.id);
          const id = definition?.id ?? `CLS-${options.id}`;
          if (current.classDefinitions.some((item) => item.id !== id && item.stageId === level.id && textKey(item.name) === textKey(name))) throw new AcademicError("A classe já está cadastrada neste nível.", "name");
          patch.classDefinitions = [...current.classDefinitions.filter((item) => item.id !== id), { id, name, stageId: level.id, status: "active", createdAt: definition?.createdAt ?? effectiveToday }];
          const offer = current.classes.find((item) => item.academicYear === year.id && (item.definitionId === id || item.id === id));
          patch.classes = current.classes.map((item) => item.definitionId === id || item.id === id ? { ...item, name, stage: level.name, definitionId: id, educationLevelId: id } : item);
          if (!offer) patch.classes.push({ id: `OFFER-${year.id}-${id}`, definitionId: id, name, stage: level.name, academicYear: year.id, academicYearId: year.id, educationLevelId: id, status: "active", createdAt: effectiveToday });
          event("Classe configurada", id, { after: { name, levelId: level.id, yearId: year.id } }); break;
        }
        case "room": {
          const name = required(command.name, "name", "o nome da sala"); positiveInteger(command.capacity, "capacity");
          if (current.rooms.some((item) => item.id !== command.id && textKey(item.name) === textKey(name))) throw new AcademicError("Já existe uma sala com esse nome.", "name");
          const before = current.rooms.find((item) => item.id === command.id);
          if (before && before.capacity !== command.capacity) required(command.reason, "reason", "o motivo da alteração de capacidade");
          if (current.groups.some((item) => item.roomId === command.id && item.status === "active" && item.capacity > command.capacity)) throw new AcademicError("A capacidade é inferior à de uma turma que utiliza esta sala.", "capacity");
          const id = before?.id ?? `ROOM-${options.id}`;
          const room = { id, name, block: command.block.trim(), capacity: command.capacity, status: "active" as const };
          patch.rooms = [...current.rooms.filter((item) => item.id !== id), room];
          patch.roomDefinitions = [...current.roomDefinitions.filter((item) => item.id !== id), { ...room, createdAt: current.roomDefinitions.find((item) => item.id === id)?.createdAt ?? effectiveToday }];
          event("Sala configurada", id, { before, after: room, reason: command.reason }); break;
        }
        case "group": {
          const schoolClass = current.classes.find((item) => item.id === command.classId && item.status === "active");
          if (!schoolClass) throw new AcademicError("Escolha uma classe activa.", "classId");
          const year = yearFor(academic, schoolClass.academicYear);
          const room = current.rooms.find((item) => item.id === command.roomId && item.status === "active");
          if (!room) throw new AcademicError("Escolha uma sala activa.", "roomId");
          positiveInteger(command.capacity, "capacity");
          if (command.capacity > room.capacity) throw new AcademicError("A capacidade da turma excede a capacidade da sala.", "capacity");
          const name = required(command.name, "name", "o nome da turma");
          const before = current.groups.find((item) => item.id === command.id);
          if (before && before.capacity !== command.capacity) required(command.reason, "reason", "o motivo da alteração de capacidade");
          if (current.groups.some((item) => item.id !== command.id && item.classId === command.classId && textKey(item.name) === textKey(name))) throw new AcademicError("Já existe uma turma com esse nome nesta classe e ano.", "name");
          if (!command.days.length || command.days.some((day) => !Number.isInteger(day) || day < 1 || day > 7) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(command.startsAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(command.endsAt) || command.startsAt >= command.endsAt) throw new AcademicError("Reveja os dias e o horário da turma.", "startsAt");
          const group: ClassGroup = { id: before?.id ?? `GRP-${options.id}`, name, classId: command.classId, roomId: room.id, shift: required(command.shift, "shift", "o turno"), capacity: command.capacity, status: "active", createdAt: before?.createdAt ?? effectiveToday, schedule: { days: [...new Set(command.days)], startsAt: command.startsAt, endsAt: command.endsAt } };
          if (roomConflict(current, academic, group)) throw new AcademicError("Esta sala já está ocupada no horário escolhido.", "roomId");
          const points = [year.startsOn, ...academic.placements.filter((item) => item.groupId === group.id).map((item) => item.startsOn)];
          if (points.some((on) => groupOccupancy(academic, group.id, on) > group.capacity)) throw new AcademicError("A capacidade não pode ficar abaixo dos alunos colocados.", "capacity");
          patch.groups = [...current.groups.filter((item) => item.id !== group.id), group];
          event("Turma configurada", group.id, { before, after: group, reason: command.reason }); break;
        }
        case "draft": {
          if (!isEnrollmentInput(command.input)) throw new AcademicError("Reveja os campos da matrícula.");
          required(command.input.fullName, "fullName", "o nome do aluno");
          const id = command.draftId ?? `DRAFT-${options.id}`;
          academic.drafts = [...academic.drafts.filter((item) => item.id !== id), { ...command.input, id, savedAt: options.recordedAt }];
          result.draftId = id; event("Rascunho de matrícula guardado", id); break;
        }
        case "enroll": {
          const input = command.input;
          if (!isEnrollmentInput(input)) throw new AcademicError("Reveja os campos da matrícula.");
          const year = yearFor(academic, input.yearId);
          const name = required(input.fullName, "fullName", "o nome do aluno");
          withinYear(input.enrolledOn, year, "enrolledOn");
          if (!year.billingMonths.includes(input.tuitionStartMonth) || monthIndex(input.tuitionStartMonth) < Number(input.enrolledOn.slice(5, 7)) - 1) throw new AcademicError("Escolha um mês cobrável a partir da entrada do aluno.", "tuitionStartMonth");
          const group = current.groups.find((item) => item.id === input.groupId);
          if (!group || current.classes.find((item) => item.id === group.classId)?.academicYear !== year.id) throw new AcademicError("Escolha uma turma do ano lectivo seleccionado.", "groupId");
          assertPlacementCapacity(current, academic, group.id, input.enrolledOn, year.endsOn);
          let person = academic.people.find((item) => item.id === input.personId);
          if (input.personId && !person) throw new AcademicError("A ficha seleccionada já não está disponível.", "personId");
          if (!person && !input.duplicateReviewed && possibleDuplicates(academic, name, input.guardianPhone).length) throw new AcademicError("Reveja as fichas correspondentes antes de criar outra pessoa.", "fullName");
          if (person && academic.enrollments.some((item) => item.personId === person!.id && item.yearId === year.id)) throw new AcademicError("Este aluno já tem matrícula neste ano. Abra a ficha para a consultar ou transferir.", "personId");
          if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) throw new AcademicError("O benefício deve estar entre 0 e 100%.", "discountPercent");
          if (input.financeStatus !== "regular") required(input.benefitReason, "benefitReason", "o motivo do benefício");
          if (input.financeStatus === "exception" && (!year.billingMonths.includes(input.benefitStart) || !year.billingMonths.includes(input.benefitEnd) || monthIndex(input.benefitEnd) < monthIndex(input.benefitStart))) throw new AcademicError("Reveja o período da isenção.", "benefitEnd");
          if (!person) {
            person = { id: `PER-${options.id}`, permanentNumber: nextPermanentNumber(academic), fullName: name, guardianName: input.guardianName.trim(), guardianPhone: input.guardianPhone.trim(), createdAt: options.recordedAt };
            academic.people.push(person);
          }
          const enrollmentId = `ENR-${options.id}`, studentId = `STU-${options.id}`;
          const schoolClass = current.classes.find((item) => item.id === group.classId)!;
          const student: Student = { id: studentId, personId: person.id, enrollmentId, academicYearId: year.id, educationLevelId: schoolClass.educationLevelId ?? schoolClass.id, stableNumber: nextRosterNumber(academic, group.id), registrationNumber: person.permanentNumber, fullName: person.fullName, guardianName: person.guardianName, guardianPhone: person.guardianPhone, enrollmentType: academic.enrollments.some((item) => item.personId === person!.id) ? "renewal" : "new", enrollmentDate: input.enrolledOn, tuitionStartMonth: input.tuitionStartMonth, billingMonths: year.billingMonths, registrationStatus: "pending", classId: group.classId, groupId: group.id, enrollmentStatus: "active", createdAt: options.recordedAt, financialProfile: { appliesToRegistration: input.financeStatus === "scholarship" || (input.benefitAppliesToRegistration ?? false), status: input.financeStatus, discountPercent: input.financeStatus === "scholarship" || input.financeStatus === "exception" ? 100 : input.financeStatus === "regular" ? 0 : input.discountPercent, startMonth: input.financeStatus === "exception" ? input.benefitStart : undefined, endMonth: input.financeStatus === "exception" ? input.benefitEnd : undefined, reason: input.benefitReason, registeredBy: "Marta — Secretaria", registeredAt: options.recordedAt } };
          const rules = buildDefaultPaymentRuleVersions([...current.students, student], current.classes, year.settings, current.paymentRuleVersions);
          const record = { ...buildPaymentRecord(student.id), billingVersion: 3 as const };
          if (record.charges.find((item) => item.category === "registration")?.amount === 0) student.registrationStatus = "paid";
          patch.students = [...current.students, student]; patch.paymentRecords = [...current.paymentRecords, record]; patch.paymentRuleVersions = rules;
          academic.enrollments.push({ id: enrollmentId, personId: person.id, yearId: year.id, studentRecordId: student.id, status: "active", enrolledOn: input.enrolledOn, startsOn: input.enrolledOn, tuitionStartMonth: input.tuitionStartMonth, createdAt: options.recordedAt });
          academic.placements.push({ id: `PLC-${options.id}`, enrollmentId, classId: group.classId, groupId: group.id, rosterNumber: student.stableNumber!, startsOn: input.enrolledOn, recordedAt: options.recordedAt, actorId: "demo-secretaria" });
          academic.drafts = academic.drafts.filter((item) => item.id !== command.draftId);
          event("Matrícula confirmada", enrollmentId, { personId: person.id, effectiveOn: input.enrolledOn, after: { groupId: group.id, rosterNumber: student.stableNumber, yearId: year.id } });
          Object.assign(result, { personId: person.id, enrollmentId, studentId }); break;
        }
        case "person": {
          const person = academic.people.find((item) => item.id === command.personId);
          if (!person) throw new AcademicError("Ficha não encontrada.");
          const before = { ...person }; required(command.reason, "reason", "o motivo da correcção");
          person.fullName = required(command.fullName, "fullName", "o nome do aluno"); person.guardianName = command.guardianName.trim(); person.guardianPhone = command.guardianPhone.trim();
          if (command.permanentNumber && command.permanentNumber !== person.permanentNumber) {
            if (!person.numberNeedsReview) throw new AcademicError("O número permanente já foi atribuído e não pode ser alterado.");
            if (academic.people.some((item) => item.id !== person.id && item.permanentNumber === command.permanentNumber)) throw new AcademicError("Esse número pertence a outra pessoa.", "permanentNumber");
            person.legacyNumbers = [...(person.legacyNumbers ?? []), person.permanentNumber]; person.permanentNumber = command.permanentNumber; person.numberNeedsReview = false;
          }
          event("Dados do aluno corrigidos", person.id, { personId: person.id, before, after: person, reason: command.reason }); break;
        }
        case "transfer": {
          const enrollment = academic.enrollments.find((item) => item.id === command.enrollmentId);
          if (!enrollment || enrollment.status !== "active") throw new AcademicError("Escolha uma matrícula activa.");
          const year = yearFor(academic, enrollment.yearId); withinYear(command.effectiveOn, year, "effectiveOn");
          const previous = lastPlacement(academic, enrollment.id)!;
          if (command.effectiveOn < previous.startsOn) throw new AcademicError("A data não pode anteceder a última colocação.", "effectiveOn");
          const group = current.groups.find((item) => item.id === command.groupId);
          if (!group || group.id === previous.groupId || current.classes.find((item) => item.id === group.classId)?.academicYear !== year.id) throw new AcademicError("Escolha outra turma do mesmo ano.", "groupId");
          required(command.reason, "reason", "o motivo da transferência"); assertPlacementCapacity(current, academic, group.id, command.effectiveOn, year.endsOn, enrollment.id);
          const before = { ...previous };
          previous.endsOn = dayBefore(command.effectiveOn); if (previous.endsOn < previous.startsOn) previous.voided = true;
          const next = { id: `PLC-${options.id}`, enrollmentId: enrollment.id, classId: group.classId, groupId: group.id, rosterNumber: nextRosterNumber(academic, group.id), startsOn: command.effectiveOn, recordedAt: options.recordedAt, actorId: "demo-secretaria", reason: command.reason };
          academic.placements.push(next); event("Transferência de turma", enrollment.id, { personId: enrollment.personId, effectiveOn: command.effectiveOn, before, after: next, reason: command.reason });
          result.personId = enrollment.personId; break;
        }
        case "exit": {
          const enrollment = academic.enrollments.find((item) => item.id === command.enrollmentId);
          if (!enrollment || enrollment.status !== "active") throw new AcademicError("Escolha uma matrícula activa.");
          const year = yearFor(academic, enrollment.yearId); withinYear(command.effectiveOn, year, "effectiveOn");
          if (command.effectiveOn < enrollment.startsOn) throw new AcademicError("A saída não pode anteceder a matrícula.", "effectiveOn");
          required(command.reason, "reason", "o motivo da saída");
          const preview = previewExit(current, enrollment.id, command.effectiveOn, command.status === "cancelled");
          const before = { ...enrollment }; enrollment.status = command.status; enrollment.endsOn = command.effectiveOn; enrollment.reason = command.reason;
          const eventId = event(command.status === "cancelled" ? "Matrícula cancelada" : "Desistência registada", enrollment.id, { personId: enrollment.personId, effectiveOn: command.effectiveOn, before, after: { ...enrollment, releasedCredit: preview.releasedCredit }, reason: command.reason });
          academic.placements.filter((item) => item.enrollmentId === enrollment.id).forEach((item) => {
            if (item.startsOn > command.effectiveOn) { item.voided = true; item.endsOn = command.effectiveOn; }
            else if (!item.endsOn || item.endsOn > command.effectiveOn) item.endsOn = command.effectiveOn;
          });
          patch.paymentRecords = current.paymentRecords.map((record) => {
            if (record.studentId !== enrollment.studentRecordId) return record;
            return { ...record, charges: record.charges.map((charge) => preview.ids.has(charge.id) ? { ...charge, amount: 0, dueAmount: 0, adjustedDueAmount: charge.adjustedDueAmount === undefined ? undefined : 0, academicCancellation: { eventId, previousDue: effectiveAmount(charge), recordedAt: options.recordedAt, reason: command.reason } } : charge), penaltyCharges: record.penaltyCharges?.map((charge) => preview.ids.has(charge.id) ? { ...charge, amount: 0, adjustedAmount: charge.adjustedAmount === undefined ? undefined : 0, academicCancellation: { eventId, previousDue: effectiveAmount(charge), recordedAt: options.recordedAt, reason: command.reason } } : charge), allocations: record.allocations.filter((item) => !preview.ids.has(item.chargeId)), academicAdjustments: [...(record.academicAdjustments ?? []), ...preview.charges.map((charge) => ({ id: `${eventId}-${charge.id}`, chargeId: charge.id, amount: effectiveAmount(charge), reason: command.reason, recordedAt: options.recordedAt, releasedAllocations: record.allocations.filter((item) => preview.ids.has(item.chargeId) && (item.chargeId === charge.id || record.penaltyCharges?.find((penalty) => penalty.id === item.chargeId)?.baseChargeId === charge.id)) }))] };
          });
          result.personId = enrollment.personId; result.releasedCredit = preview.releasedCredit; break;
        }
      }
      patch.students = projectStudents({ ...current, ...patch } as DemoState, academic, effectiveToday);
      if (command.type === "enroll" || current.paymentRecords.some((record) => record.billingVersion === 3)) Object.assign(patch, prepareBilling({ ...current, ...patch }, options.recordedAt));
      return { patch, result };
    },
  });
}
