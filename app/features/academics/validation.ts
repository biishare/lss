import { monthOptions } from "../../lib/school-demo-data";
import { isEnrollmentInput, validDate } from "./model";

type Row = Record<string, unknown>;
const object = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (message: string): never => { throw new Error(`Os dados académicos não são válidos: ${message}`); };
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
function rows(value: unknown, label: string): Row[] {
  if (!Array.isArray(value) || value.some((item) => !object(item))) return fail(`${label} deve conter registos.`);
  return value;
}
function ids(items: Row[], label: string) {
  const set = new Set<string>();
  for (const row of items) {
    if (!text(row.id) || set.has(row.id)) fail(`identificador inválido ou repetido em ${label}.`);
    set.add(row.id as string);
  }
  return set;
}
export function validateAcademicState(value: unknown, state: Row) {
  if (!object(value) || value.version !== 1) return fail("versão desconhecida.");
  if (!object(value.institution) || !text(value.institution.name) || value.institution.currency !== "MT" || value.institution.timezone !== "Africa/Maputo") fail("a escola está incompleta.");
  const years = rows(value.years, "anos"), people = rows(value.people, "pessoas"), enrollments = rows(value.enrollments, "matrículas"), placements = rows(value.placements, "colocações");
  const yearIds = ids(years, "anos"), personIds = ids(people, "pessoas"), enrollmentIds = ids(enrollments, "matrículas"); ids(placements, "colocações");
  const students = rows(state.students, "alunos"), groups = rows(state.groups, "turmas"), classes = rows(state.classes, "classes");
  const studentIds = ids(students, "alunos");
  if (years.filter((year) => year.status === "active").length > 1) fail("há mais de um ano em curso.");
  for (const year of years) {
    if (!text(year.label) || !["active", "preparing", "closed"].includes(String(year.status)) || typeof year.startsOn !== "string" || !validDate(year.startsOn) || typeof year.endsOn !== "string" || !validDate(year.endsOn) || year.endsOn < year.startsOn || !object(year.settings)) fail("o calendário está incompleto.");
    if (!Array.isArray(year.billingMonths) || !year.billingMonths.length || new Set(year.billingMonths).size !== year.billingMonths.length || year.billingMonths.some((key) => !monthOptions.some((month) => month.key === key))) fail("meses cobráveis inválidos.");
  }
  const numbers = new Map<string, Row>();
  for (const person of people) {
    if (!text(person.fullName) || !text(person.permanentNumber) || typeof person.guardianPhone !== "string" || typeof person.guardianName !== "string") fail("uma pessoa está incompleta.");
    const previous = numbers.get(String(person.permanentNumber));
    if (previous && !(person.numberNeedsReview === true && previous.numberNeedsReview === true)) fail("número permanente repetido.");
    numbers.set(String(person.permanentNumber), person);
  }
  const annualKeys = new Set<string>(), studentLinks = new Set<string>();
  for (const enrollment of enrollments) {
    if (!personIds.has(String(enrollment.personId)) || !yearIds.has(String(enrollment.yearId)) || !studentIds.has(String(enrollment.studentRecordId))) fail("a matrícula perdeu uma relação.");
    const key = `${enrollment.personId}:${enrollment.yearId}`;
    if (annualKeys.has(key) || studentLinks.has(String(enrollment.studentRecordId))) fail("matrícula anual repetida.");
    annualKeys.add(key); studentLinks.add(String(enrollment.studentRecordId));
    if (!["active", "withdrawn", "completed", "cancelled"].includes(String(enrollment.status)) || typeof enrollment.startsOn !== "string" || !validDate(enrollment.startsOn) || typeof enrollment.enrolledOn !== "string" || !validDate(enrollment.enrolledOn)) fail("datas ou estado de matrícula inválidos.");
    const year = years.find((item) => item.id === enrollment.yearId)!;
    if (!(year.billingMonths as string[]).includes(String(enrollment.tuitionStartMonth))) fail("mês inicial fora do calendário.");
    const student = students.find((item) => item.id === enrollment.studentRecordId)!;
    if (student.personId !== undefined && student.personId !== enrollment.personId) fail("o aluno pertence a outra pessoa.");
    if (student.enrollmentId !== undefined && student.enrollmentId !== enrollment.id) fail("o registo do aluno pertence a outra matrícula.");
    if (student.academicYearId !== undefined && student.academicYearId !== enrollment.yearId) fail("o registo do aluno pertence a outro ano.");
  }
  if (studentLinks.size !== students.length) fail("há alunos sem matrícula anual.");
  const rosterKeys = new Set<string>();
  for (const placement of placements) {
    const group = groups.find((item) => item.id === placement.groupId);
    const enrollment = enrollments.find((item) => item.id === placement.enrollmentId);
    if (!enrollmentIds.has(String(placement.enrollmentId)) || !group || group.classId !== placement.classId) fail("a colocação perdeu a turma ou classe.");
    const schoolClass = classes.find((item) => item.id === placement.classId);
    if (schoolClass?.academicYear !== enrollment!.yearId) fail("a colocação pertence a outro ano.");
    const key = `${placement.groupId}:${placement.rosterNumber}`;
    if (!/^\d+$/.test(String(placement.rosterNumber)) || rosterKeys.has(key)) fail("número da pauta repetido ou inválido.");
    rosterKeys.add(key);
    if (typeof placement.startsOn !== "string" || !validDate(placement.startsOn) || (placement.endsOn !== undefined && (typeof placement.endsOn !== "string" || !validDate(placement.endsOn) || (!placement.voided && placement.endsOn < placement.startsOn)))) fail("datas da colocação inválidas.");
  }
  for (const enrollment of enrollments) {
    if (!placements.some((item) => item.enrollmentId === enrollment.id)) fail("matrícula sem colocação.");
    const timeline = placements.filter((item) => item.enrollmentId === enrollment.id && !item.voided).sort((a, b) => String(a.startsOn).localeCompare(String(b.startsOn)));
    for (let index = 1; index < timeline.length; index++) if (!timeline[index - 1].endsOn || String(timeline[index - 1].endsOn) >= String(timeline[index].startsOn)) fail("colocações simultâneas na mesma matrícula.");
  }
  const events = rows(value.events, "histórico"); ids(events, "histórico");
  for (const event of events) if (!text(event.action) || !text(event.entityId) || !["legacy", "operation"].includes(String(event.origin)) || (event.origin === "operation" && (!text(event.actorId) || !text(event.recordedAt)))) fail("o histórico está incompleto.");
  const drafts = rows(value.drafts, "rascunhos"); ids(drafts, "rascunhos");
  for (const draft of drafts) if (typeof draft.savedAt !== "string" || !text(draft.fullName) || !isEnrollmentInput(draft)) fail("rascunho incompleto.");
}
