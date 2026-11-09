import { monthOptions, type ClassGroup, type PaymentSettings, type Student } from "../../lib/school-demo-data";
import type { DemoState } from "../demo/demo-state";

export type AcademicYear = {
  id: string; label: string; status: "preparing" | "active" | "closed";
  startsOn: string; endsOn: string; billingMonths: string[];
  settings: PaymentSettings; calendarReviewed: boolean;
};
export type Person = {
  id: string; permanentNumber: string; fullName: string; guardianName: string;
  guardianPhone: string; createdAt?: string; numberNeedsReview?: boolean;
  legacyNumbers?: string[];
};
export type AcademicEnrollment = {
  id: string; personId: string; yearId: string; studentRecordId: string;
  status: "active" | "withdrawn" | "completed" | "cancelled";
  enrolledOn: string; startsOn: string; tuitionStartMonth: string;
  endsOn?: string; reason?: string; createdAt?: string;
};
export type Placement = {
  voided?: boolean;
  id: string; enrollmentId: string; classId: string; groupId: string;
  rosterNumber: string; startsOn: string; endsOn?: string;
  reason?: string; recordedAt?: string; actorId?: string;
};
export type AcademicEvent = {
  id: string; entityId: string; personId?: string; action: string;
  effectiveOn?: string; recordedAt?: string; actorId?: string;
  reason?: string; before?: unknown; after?: unknown; origin: "legacy" | "operation";
};
export type AcademicState = {
  version: 1;
  institution: { id: string; name: string; logoText: string; contact: string; currency: "MT"; timezone: "Africa/Maputo" };
  years: AcademicYear[]; people: Person[]; enrollments: AcademicEnrollment[];
  placements: Placement[]; events: AcademicEvent[];
  drafts: Array<EnrollmentInput & { id: string; savedAt: string }>;
};

export type EnrollmentInput = {
  benefitAppliesToRegistration?: boolean;
  personId?: string; fullName: string; guardianName: string; guardianPhone: string;
  yearId: string; groupId: string; enrolledOn: string; tuitionStartMonth: string;
  financeStatus: "regular" | "scholarship" | "partial_scholarship" | "exception";
  discountPercent: number; benefitStart: string; benefitEnd: string; benefitReason: string;
  duplicateReviewed: boolean;
};

export function isEnrollmentInput(value: unknown): value is EnrollmentInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return ["fullName", "guardianName", "guardianPhone", "yearId", "groupId", "enrolledOn", "tuitionStartMonth", "benefitStart", "benefitEnd", "benefitReason"].every((key) => typeof data[key] === "string")
    && ["regular", "scholarship", "partial_scholarship", "exception"].includes(String(data.financeStatus))
    && typeof data.discountPercent === "number" && Number.isFinite(data.discountPercent) && data.discountPercent >= 0 && data.discountPercent <= 100
    && typeof data.duplicateReviewed === "boolean" && (data.benefitAppliesToRegistration === undefined || typeof data.benefitAppliesToRegistration === "boolean") && (data.personId === undefined || typeof data.personId === "string");
}

export function textKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-MZ").replace(/\s+/g, " ").trim();
}
export function monthIndex(key: string) { return monthOptions.findIndex((month) => month.key === key); }
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function dayBefore(value: string) {
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10);
}
export function schoolDate(instant: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  return ["year", "month", "day"].map((part) => parts.find((item) => item.type === part)!.value).join("-");
}
export function monthsBetween(start: string, end: string) {
  return monthOptions.slice(Math.max(0, monthIndex(start)), monthIndex(end) + 1).map((month) => month.key);
}

// Leitura determinística, sem gravação ou fusão de pessoas por semelhança de nome.
export function academicStateFor(state: DemoState): AcademicState {
  if (state.academic) return state.academic;
  const currentYear = state.paymentSettings.academicYear;
  const yearIds = [...new Set([currentYear, ...state.classes.map((item) => item.academicYearId ?? item.academicYear), ...(state.scenario.years ?? []).map((year) => year.id)])];
  const years = yearIds.map((id): AcademicYear => ({
    id, label: id, status: id === currentYear ? "active" : "preparing",
    startsOn: `${id}-01-01`, endsOn: `${id}-12-31`,
    billingMonths: monthsBetween(state.paymentSettings.startMonth, state.paymentSettings.endMonth),
    settings: { ...state.paymentSettings, academicYear: id }, calendarReviewed: false,
  }));
  const people: Person[] = [];
  const enrollments: AcademicEnrollment[] = [];
  const placements: Placement[] = [];
  const events: AcademicEvent[] = [];
  for (const student of state.students) {
    const personId = student.personId ?? student.id;
    if (!people.some((person) => person.id === personId)) people.push({
      id: personId, permanentNumber: student.registrationNumber, fullName: student.fullName,
      guardianName: student.guardianName === "Por registar" ? "" : student.guardianName,
      guardianPhone: student.guardianPhone === "Por registar" ? "" : student.guardianPhone,
      createdAt: student.createdAt,
    });
    const yearId = student.academicYearId ?? state.classes.find((item) => item.id === student.classId)?.academicYear ?? currentYear;
    const id = student.enrollmentId ?? `ENR-${yearId}-${student.id}`;
    enrollments.push({ id, personId, yearId, studentRecordId: student.id, status: student.enrollmentStatus ?? "active",
      enrolledOn: student.enrollmentDate, startsOn: student.enrollmentDate < `${yearId}-01-01` ? `${yearId}-01-01` : student.enrollmentDate,
      tuitionStartMonth: student.tuitionStartMonth, createdAt: student.createdAt });
    placements.push({ id: `PLC-${id}-LEGACY`, enrollmentId: id, classId: student.classId, groupId: student.groupId,
      rosterNumber: student.stableNumber ?? "001", startsOn: enrollments.at(-1)!.startsOn });
    events.push({ id: `HIS-${id}-LEGACY`, entityId: id, personId, action: "Matrícula importada", effectiveOn: student.enrollmentDate,
      origin: "legacy", after: { studentRecordId: student.id, registrationNumber: student.registrationNumber, groupId: student.groupId },
      reason: "Dados anteriores preservados; autor e instante originais indisponíveis quando não constavam do registo." });
  }
  for (const person of people) person.numberNeedsReview = people.some((other) => other.id !== person.id && other.permanentNumber === person.permanentNumber);
  return { version: 1, institution: { id: "lss", name: "Liceu São Silvestre", logoText: "LSS", contact: "", currency: "MT", timezone: "Africa/Maputo" }, years, people, enrollments, placements, events, drafts: [] };
}

export function placementOn(academic: AcademicState, enrollmentId: string, on: string) {
  return academic.placements.filter((item) => !item.voided && item.enrollmentId === enrollmentId && item.startsOn <= on && (!item.endsOn || item.endsOn >= on)).reverse()
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}
export function lastPlacement(academic: AcademicState, enrollmentId: string) {
  return academic.placements.filter((item) => item.enrollmentId === enrollmentId && !item.voided).reverse().sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}
export function enrollmentOccupies(enrollment: AcademicEnrollment, on: string) {
  return enrollment.status !== "cancelled" && enrollment.startsOn <= on && (!enrollment.endsOn || enrollment.endsOn >= on);
}
export function groupOccupancy(academic: AcademicState, groupId: string, on: string, excludeEnrollmentId?: string) {
  return academic.enrollments.filter((enrollment) => enrollment.id !== excludeEnrollmentId && enrollmentOccupies(enrollment, on)
    && placementOn(academic, enrollment.id, on)?.groupId === groupId).length;
}
export function assertPlacementCapacity(state: DemoState, academic: AcademicState, groupId: string, startsOn: string, endsOn: string, excludeEnrollmentId?: string) {
  const group = state.groups.find((group) => group.id === groupId);
  const room = state.rooms.find((room) => room.id === group?.roomId);
  if (!group || group.status !== "active" || !room || room.status !== "active") throw new Error("Escolha uma turma e uma sala activas.");
  const capacity = Math.min(group.capacity, room.capacity);
  const points = new Set([startsOn, ...academic.placements.filter((item) => item.groupId === groupId && item.startsOn >= startsOn && item.startsOn <= endsOn).map((item) => item.startsOn)]);
  for (const point of points) if (groupOccupancy(academic, groupId, point, excludeEnrollmentId) >= capacity) throw new Error("A turma atingiu a capacidade. Escolha outra turma.");
}
export function nextRosterNumber(academic: AcademicState, groupId: string) {
  const max = Math.max(0, ...academic.placements.filter((item) => item.groupId === groupId).map((item) => Number(item.rosterNumber) || 0));
  return String(max + 1).padStart(3, "0");
}
export function nextPermanentNumber(academic: AcademicState) {
  let number = academic.people.length + 1;
  while (academic.people.some((person) => person.permanentNumber === `LSS-${String(number).padStart(6, "0")}`)) number++;
  return `LSS-${String(number).padStart(6, "0")}`;
}
export function possibleDuplicates(academic: AcademicState, name: string, phone: string) {
  const normalizedName = textKey(name), normalizedPhone = phone.replace(/\D/g, "");
  return academic.people.filter((person) => (normalizedName.length >= 3 && textKey(person.fullName) === normalizedName)
    || (normalizedPhone.length >= 6 && person.guardianPhone.replace(/\D/g, "") === normalizedPhone));
}
export function searchPeople(academic: AcademicState, students: Student[], query: string) {
  const key = textKey(query), digits = query.replace(/\D/g, "");
  return academic.people.filter((person) => !key || [person.fullName, person.permanentNumber, person.guardianName, person.guardianPhone,
    ...students.filter((student) => (student.personId ?? student.id) === person.id).map((student) => `${student.registrationNumber} ${student.stableNumber ?? ""}`)]
    .some((value) => textKey(value).includes(key)) || (digits.length >= 4 && person.guardianPhone.replace(/\D/g, "").includes(digits)));
}

function schedule(group: ClassGroup) {
  if (group.schedule) return group.schedule;
  const shift = textKey(group.shift);
  const times = shift.includes("manha") ? ["07:00", "12:30"] : shift.includes("tarde") ? ["12:30", "18:00"] : shift.includes("noite") ? ["18:00", "23:00"] : ["00:00", "23:59"];
  return { days: [1, 2, 3, 4, 5], startsAt: times[0], endsAt: times[1] };
}
export function roomConflict(state: DemoState, academic: AcademicState, candidate: ClassGroup) {
  const yearId = state.classes.find((item) => item.id === candidate.classId)?.academicYear;
  const year = academic.years.find((item) => item.id === yearId);
  const proposed = schedule(candidate);
  return state.groups.find((group) => {
    if (group.id === candidate.id || group.status !== "active" || group.roomId !== candidate.roomId) return false;
    const otherYearId = state.classes.find((item) => item.id === group.classId)?.academicYear;
    const otherYear = academic.years.find((item) => item.id === otherYearId);
    if (year && otherYear && (year.endsOn < otherYear.startsOn || otherYear.endsOn < year.startsOn)) return false;
    const other = schedule(group);
    return proposed.days.some((day) => other.days.includes(day)) && proposed.startsAt < other.endsAt && other.startsAt < proposed.endsAt;
  });
}

export function settingsForYear(state: DemoState, yearId: string) {
  return academicStateFor(state).years.find((year) => year.id === yearId)?.settings ?? state.paymentSettings;
}
export function monthsForYear(state: DemoState, yearId: string) {
  const year = academicStateFor(state).years.find((year) => year.id === yearId);
  return monthOptions.filter((month) => (year?.billingMonths ?? monthsBetween(state.paymentSettings.startMonth, state.paymentSettings.endMonth)).includes(month.key));
}
export function projectStudents(state: DemoState, academic: AcademicState, asOf: string): Student[] {
  return state.students.map((student) => {
    const enrollment = academic.enrollments.find((item) => item.studentRecordId === student.id);
    const person = academic.people.find((item) => item.id === enrollment?.personId);
    if (!enrollment || !person) return student;
    const placements = academic.placements.filter((item) => item.enrollmentId === enrollment.id && !item.voided).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    const placement = placementOn(academic, enrollment.id, asOf) ?? placements.filter((item) => item.startsOn <= asOf).at(-1) ?? placements[0];
    return { ...student, personId: person.id, enrollmentId: enrollment.id, academicYearId: enrollment.yearId,
      registrationNumber: person.permanentNumber, fullName: person.fullName, guardianName: person.guardianName, guardianPhone: person.guardianPhone,
      enrollmentStatus: enrollment.status, tuitionEndMonth: enrollment.endsOn ? monthOptions[Number(enrollment.endsOn.slice(5, 7)) - 1].key : undefined,
      billingMonths: academic.years.find((year) => year.id === enrollment.yearId)?.billingMonths,
      ...(placement ? { classId: placement.classId, groupId: placement.groupId, stableNumber: placement.rosterNumber,
        pricingLevelId: state.classDefinitions.find((item) => item.id === (state.classes.find((item) => item.id === placement.classId)?.definitionId ?? state.classes.find((item) => item.id === placement.classId)?.educationLevelId ?? placement.classId))?.stageId,
        educationLevelId: state.classes.find((item) => item.id === placement.classId)?.educationLevelId ?? placement.classId } : {}),
    };
  });
}
