import { createDemoState, demoStorageKey, type DemoState } from "../../app/features/demo/demo-state";
import { createLocalDemoRepository } from "../../app/features/demo/local-repository";
import { buildPaymentRecord, type PaymentLaunchDraft } from "../../app/components/school-admin-demo.model";
import { prepareBilling, synchronizeSchool, executeBilling } from "../../app/features/finance/billing-commands";
import { confirmDemoPayment } from "../../app/features/demo/payment-command";
import { executeService, type ServiceCommand } from "../../app/features/finance/service-commands";
import { executeAcademic, type AcademicCommand } from "../../app/features/academics/operations";
import { executeCash, type CashCommand } from "../../app/features/cash/commands";
import { defaultReportFilters, buildReport, type ReportFilters, type ReportKind } from "../../app/features/reports/model";
import { backupArchiveKey } from "../../app/features/continuity/backups";

export function phase6Fixture() {
  let time = "2026-05-05T08:00:00.000Z", failedMain = false, failedBackup = false, writes = 0, index = 0, backupIssue = "";
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem(key: string, value: string) {
    if ((key === demoStorageKey && failedMain) || (key === backupArchiveKey && failedBackup)) throw new Error("Quota");
    values.set(key, value); if (key === demoStorageKey) writes++;
  } };
  const repository = createLocalDemoRepository(storage, { now: () => time, onBackupIssue: (message) => { backupIssue = message; } });
  const seed = createDemoState("example", { now: time, datasetId: "phase-6" });
  seed.paymentProofs = [];
  for (const student of seed.students) student.financialProfile = { status: "regular", discountPercent: 0 };
  Object.assign(seed, prepareBilling(seed, time));
  for (const rule of seed.paymentRuleVersions.filter((item) => item.calculationVersion === "v3")) rule.monthlyFee = 1000;
  seed.paymentRecords = seed.students.map((student) => ({ ...buildPaymentRecord(student.id), billingVersion: 3, financialAid: [] }));
  let state = repository.initialize({ ...seed, ...prepareBilling(seed, time) });
  const draft = (patch: Partial<PaymentLaunchDraft> = {}): PaymentLaunchDraft => ({ studentId: "student-001", category: "tuition", monthKey: "may", targetChargeId: "", amount: "1000", paidOn: time.slice(0, 10), method: "Numerário", description: "", allowFutureAllocation: true, selectedChargeIds: [], ...patch });
  const f = { repository, storage, values, draft,
    get state() { return state; }, get time() { return time; }, get writes() { return writes; }, get backupIssue() { return backupIssue; },
    failMain(value: boolean) { failedMain = value; }, failBackup(value: boolean) { failedBackup = value; },
    advance(date: string) { time = `${date}T08:00:00.000Z`; },
    setState(value: DemoState) { state = value; },
    sync() { state = synchronizeSchool(repository, state, "secretaria", time); },
    record(id = "student-001") { return state.paymentRecords.find((item) => item.studentId === id)!; },
    pay(patch: Partial<PaymentLaunchDraft> = {}, id = `pay-${++index}`) { const result = confirmDemoPayment(repository, { expected: state, commandId: id, role: "secretaria", recordedAt: time, draft: draft(patch) }); state = result.state; return result; },
    run(command: ServiceCommand, id = `service-${++index}`) { const result = executeService(repository, state, command, { id, role: "secretaria", recordedAt: time }); state = result.state; return result; },
    cash(command: CashCommand, id = `cash-${++index}`) { const result = executeCash(repository, state, command, { id, role: "secretaria", recordedAt: time }); state = result.state; return result; },
    academic(command: AcademicCommand) { const result = executeAcademic(repository, state, command, { id: `academic-${++index}`, role: "secretaria", recordedAt: time }); state = result.state; return result; },
    report(kind: ReportKind, patch: Partial<ReportFilters> = {}) { return buildReport(state, { ...defaultReportFilters("2026", time), kind, ...patch }, time); },
    benefit() { state = executeBilling(repository, state, { type: "aid", studentId: "student-001", retroactive: true, aid: { id: "test-benefit", enrollmentId: "student-001", kind: "partial_scholarship", percent: 50, appliesToRegistration: false, appliesToTuition: true, startMonth: "may", endMonth: "may", effectiveFrom: "2026-05-01", reason: "Apoio autorizado", authorizedBy: "Direcção", registeredBy: "Secretaria", registeredAt: time } }, { id: `aid-${++index}`, role: "secretaria", recordedAt: time }).state; },
  };
  return f;
}
export function renewForPhase6(f: ReturnType<typeof phase6Fixture>) {
  const person = f.state.academic!.people[0];
  f.academic({ type: "year", id: "2027", label: "2027", startsOn: "2027-03-01", endsOn: "2027-11-30", billingMonths: ["mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"], settings: { ...f.state.paymentSettings, academicYear: "2027", monthlyFee: 1000, monthlyDueDay: 10 } });
  f.academic({ type: "class", name: "7.ª classe", levelId: "secondary-1", yearId: "2027" });
  const schoolClass = f.state.classes.find((item) => item.academicYear === "2027")!;
  f.academic({ type: "group", name: "Turma A", classId: schoolClass.id, roomId: "room-a1", shift: "Manhã", capacity: 30, days: [1, 2, 3, 4, 5], startsAt: "07:00", endsAt: "12:30", reason: "" });
  const group = f.state.groups.find((item) => item.classId === schoolClass.id)!;
  const result = f.academic({ type: "enroll", input: { personId: person.id, fullName: person.fullName, guardianName: person.guardianName, guardianPhone: person.guardianPhone, yearId: "2027", groupId: group.id, enrolledOn: "2027-03-01", tuitionStartMonth: "mar", financeStatus: "regular", discountPercent: 0, duplicateReviewed: true, benefitStart: "mar", benefitEnd: "nov", benefitReason: "" } });
  return String(result.result.studentId);
}
