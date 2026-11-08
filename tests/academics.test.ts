import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, demoStorageKey, type DemoState } from "../app/features/demo/demo-state";
import { createLocalDemoRepository, serializeDemoSnapshot, parseDemoSnapshot } from "../app/features/demo/local-repository";
import { confirmDemoPayment } from "../app/features/demo/payment-command";
import { academicStateFor, groupOccupancy, projectStudents, searchPeople, type EnrollmentInput } from "../app/features/academics/model";
import { executeAcademic, previewExit, type AcademicCommand } from "../app/features/academics/operations";
import { isTuitionMonthApplicable } from "../app/components/school-admin-demo.model";

const now = "2026-11-08T12:00:00.000Z";
function fixture(initial?: DemoState) {
  const values = new Map<string, string>(); let failed = false, writes = 0, sequence = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (failed) throw new Error("Quota"); writes++; values.set(key, value); } };
  const repository = createLocalDemoRepository(storage, { now: () => now, newId: () => `scenario-${++sequence}` });
  let state = repository.initialize(initial ?? createDemoState("example", { now, datasetId: "academic-school" }));
  const run = (command: AcademicCommand, id = `command-${++sequence}`) => { const result = executeAcademic(repository, state, command, { id, role: "secretaria", recordedAt: now }); state = result.state; return result; };
  return { repository, run, values, get state() { return state; }, setFailed(value: boolean) { failed = value; }, get writes() { return writes; } };
}
function input(patch: Partial<EnrollmentInput> = {}): EnrollmentInput {
  return { fullName: "Aluno de atendimento", guardianName: "Encarregada", guardianPhone: "841234567", yearId: "2026", groupId: "7A2026", enrolledOn: "2026-05-04", tuitionStartMonth: "may", financeStatus: "regular", discountPercent: 0, benefitStart: "mar", benefitEnd: "nov", benefitReason: "", duplicateReviewed: false, ...patch };
}
test("matrícula confirma pessoa, vínculo anual, pauta e financeiro numa escrita repetível", () => {
  const f = fixture(), previousWrites = f.writes, expected = f.state;
  const command: AcademicCommand = { type: "enroll", input: input() };
  const result = f.run(command, "same-enrollment");
  assert.equal(f.writes, previousWrites + 1);
  assert.equal(f.state.academic!.people.length, 13); assert.equal(f.state.students.length, 13);
  const student = f.state.students.find((item) => item.id === result.result.studentId)!;
  assert.equal(student.stableNumber, "004"); assert.equal(student.registrationStatus, "pending");
  assert.equal(student.tuitionStartMonth, "may"); assert.equal(isTuitionMonthApplicable(student, "apr", f.state.paymentSettings), false);
  assert.ok(f.state.paymentRecords.find((item) => item.studentId === student.id));
  const replay = executeAcademic(f.repository, expected, command, { id: "same-enrollment", role: "secretaria", recordedAt: now });
  assert.equal(replay.replayed, true); assert.deepEqual(replay.result, result.result); assert.equal(f.writes, previousWrites + 1);
  assert.throws(() => executeAcademic(f.repository, f.state, { type: "enroll", input: input({ fullName: "Outro nome" }) }, { id: "same-enrollment", role: "secretaria", recordedAt: now }), /operação diferente/);
});
test("rascunho não ocupa vagas, não cria pessoa nem cobranças e pode ser confirmado", () => {
  const f = fixture(), before = f.state;
  const draft = f.run({ type: "draft", input: input({ groupId: "" }) });
  assert.equal(f.state.students.length, before.students.length); assert.equal(f.state.paymentRecords.length, before.paymentRecords.length);
  assert.equal(groupOccupancy(f.state.academic!, "7A2026", "2026-05-04"), 3);
  f.run({ type: "enroll", input: input(), draftId: String(draft.result.draftId) });
  assert.equal(f.state.academic!.drafts.length, 0); assert.equal(f.state.students.length, 13);
});
test("falha de gravação conserva original, rascunho e tentativa sem sucesso parcial", () => {
  const f = fixture(); const before = f.values.get(demoStorageKey);
  f.setFailed(true);
  assert.throws(() => f.run({ type: "enroll", input: input() }, "failed-enrollment"), /Não foi possível guardar/);
  assert.equal(f.values.get(demoStorageKey), before); assert.equal(f.state.students.length, 12);
  f.setFailed(false); f.run({ type: "enroll", input: input() }, "failed-enrollment"); assert.equal(f.state.students.length, 13);
});
test("vagas respeitam sala e turma e prévia de outra revisão é recusada", () => {
  const seed = createDemoState("example", { now, datasetId: "last-place" }); seed.groups[0].capacity = 4;
  const f = fixture(seed), old = f.state;
  f.run({ type: "enroll", input: input() });
  assert.throws(() => f.run({ type: "enroll", input: input({ fullName: "Aluno diferente", guardianPhone: "" }) }), /capacidade/);
  assert.throws(() => executeAcademic(f.repository, old, { type: "enroll", input: input({ fullName: "Outra tentativa" }) }, { id: "other-tab", role: "secretaria", recordedAt: now }), /noutra aba/);
  assert.equal(f.state.students.length, 13);
});
test("duplicados são revistos sem fundir nomes iguais; pesquisa ignora acentos e encontra contactos e pauta", () => {
  const f = fixture();
  assert.throws(() => f.run({ type: "enroll", input: input({ fullName: "ANA JULIA MUCAVELE", guardianPhone: "" }) }), /Reveja as fichas/);
  f.run({ type: "enroll", input: input({ fullName: "ANA JULIA MUCAVELE", guardianPhone: "", duplicateReviewed: true }) });
  const academic = f.state.academic!;
  assert.equal(searchPeople(academic, f.state.students, "ana julia").length, 2);
  assert.ok(searchPeople(academic, f.state.students, academic.people[0].permanentNumber).some((item) => item.id === academic.people[0].id));
  assert.ok(searchPeople(academic, f.state.students, "004").length);
});
test("renovação reutiliza a pessoa, cria matrícula de outro ano e preserva dívida e pagamentos", () => {
  const f = fixture(), person = f.state.academic!.people[0], original = f.state.paymentRecords.find((item) => item.studentId === "student-001");
  const year = f.state.academic!.years.find((item) => item.id === "2027")!;
  f.run({ type: "year", ...year, settings: { ...year.settings, monthlyDueDay: 10 } });
  f.run({ type: "class", name: "7.ª classe", levelId: "secondary-1", yearId: "2027" });
  const schoolClass = f.state.classes.find((item) => item.academicYear === "2027")!;
  f.run({ type: "group", name: "Turma A", classId: schoolClass.id, roomId: "room-a1", shift: "Manhã", capacity: 30, days: [1, 2, 3, 4, 5], startsAt: "07:00", endsAt: "12:30", reason: "" });
  const group = f.state.groups.find((item) => item.classId === schoolClass.id)!;
  f.run({ type: "enroll", input: input({ personId: person.id, yearId: "2027", groupId: group.id, enrolledOn: "2027-03-01", tuitionStartMonth: "mar" }) });
  assert.equal(f.state.academic!.people.length, 12); assert.equal(f.state.academic!.enrollments.filter((item) => item.personId === person.id).length, 2);
  assert.deepEqual(f.state.paymentRecords.find((item) => item.studentId === "student-001"), original);
  assert.equal(f.state.students.filter((item) => item.personId === person.id).length, 2);
  assert.throws(() => f.run({ type: "enroll", input: input({ personId: person.id, yearId: "2027", groupId: group.id, enrolledOn: "2027-03-01", tuitionStartMonth: "mar" }) }), /já tem matrícula/);
});
test("transferência preserva matrícula, pagamentos e números antigos sem reutilizar a pauta", () => {
  const f = fixture(), before = JSON.stringify(f.state.paymentRecords), enrollment = f.state.academic!.enrollments[0];
  const old = f.state.academic!.placements[0];
  f.run({ type: "transfer", enrollmentId: enrollment.id, groupId: "7B2026", effectiveOn: "2026-06-01", reason: "Mudança de turno" });
  assert.equal(f.state.academic!.enrollments.length, 12); assert.equal(f.state.academic!.placements.find((item) => item.id === old.id)!.endsOn, "2026-05-31");
  assert.equal(f.state.students.find((item) => item.id === enrollment.studentRecordId)!.stableNumber, "004"); assert.equal(JSON.stringify(f.state.paymentRecords), before);
  f.run({ type: "transfer", enrollmentId: enrollment.id, groupId: "7A2026", effectiveOn: "2026-07-01", reason: "Regresso" });
  assert.equal(f.state.students.find((item) => item.id === enrollment.studentRecordId)!.stableNumber, "004");
  const created = f.run({ type: "enroll", input: input({ enrolledOn: "2026-08-01", tuitionStartMonth: "aug" }) });
  assert.equal(f.state.students.find((item) => item.id === created.result.studentId)!.stableNumber, "005");
});
test("transferência no próprio dia conserva a colocação anterior como evento sem dupla ocupação", () => {
  const f = fixture(); const result = f.run({ type: "enroll", input: input() });
  f.run({ type: "transfer", enrollmentId: String(result.result.enrollmentId), groupId: "7B2026", effectiveOn: "2026-05-04", reason: "Correcção da colocação" });
  assert.equal(groupOccupancy(f.state.academic!, "7A2026", "2026-05-04"), 3);
  assert.equal(groupOccupancy(f.state.academic!, "7B2026", "2026-05-04"), 4);
  assert.ok(f.state.academic!.placements.some((item) => item.enrollmentId === result.result.enrollmentId && item.voided));
});
test("sala única, conflitos por horário e capacidade são validados antes de escrever", () => {
  const f = fixture(); const before = f.values.get(demoStorageKey);
  assert.throws(() => f.run({ type: "group", name: "Turma C", classId: "7", roomId: "room-a1", shift: "Manhã", capacity: 30, days: [1], startsAt: "08:00", endsAt: "12:00", reason: "" }), /ocupada/);
  assert.throws(() => f.run({ type: "group", name: "Turma C", classId: "7", roomId: "room-a1", shift: "Tarde", capacity: 33, days: [1], startsAt: "13:00", endsAt: "17:00", reason: "" }), /capacidade da sala/);
  assert.throws(() => f.run({ type: "room", id: "room-a1", name: "Sala A1", block: "Bloco A", capacity: 31, reason: "" }), /motivo/);
  assert.equal(f.values.get(demoStorageKey), before);
  f.run({ type: "room", name: "Sala nova", block: "Anexo", capacity: 20, reason: "" });
  const room = f.state.rooms.at(-1)!; assert.equal(f.state.roomDefinitions.filter((item) => item.id === room.id).length, 1);
});
test("calendário não presume Março, aceita zero e preserva o ano actual ao preparar outro", () => {
  const f = fixture(), current = f.state.paymentSettings;
  f.run({ type: "year", id: "2028", label: "2028", startsOn: "2028-02-01", endsOn: "2028-10-31", billingMonths: ["feb", "apr", "oct"], settings: { ...current, academicYear: "2028", monthlyFee: 0, inscriptionRenewalFee: 0, monthlyDueDay: 31 } });
  assert.deepEqual(f.state.paymentSettings, current); assert.equal(f.state.academic!.years.find((item) => item.id === "2028")!.settings.monthlyFee, 0);
  assert.throws(() => f.run({ type: "year-status", yearId: "2028", status: "active", reason: "Início" }), /Encerre/);
  f.run({ type: "year-status", yearId: "2026", status: "closed", reason: "Ano concluído" });
  f.run({ type: "year-status", yearId: "2028", status: "active", reason: "Início" });
  assert.equal(f.state.academic!.years.filter((item) => item.status === "active").length, 1); assert.equal(f.state.paymentSettings.academicYear, "2028");
});
test("correcção de contacto conserva anterior, novo valor, motivo e autor sem afectar pagamentos", () => {
  const f = fixture(), person = f.state.academic!.people[0], records = JSON.stringify(f.state.paymentRecords);
  f.run({ type: "person", personId: person.id, fullName: person.fullName, guardianName: "Nome corrigido", guardianPhone: "849999999", reason: "Contacto confirmado pelo encarregado" });
  assert.equal(f.state.students[0].guardianPhone, "849999999"); assert.equal(JSON.stringify(f.state.paymentRecords), records);
  const event = f.state.academic!.events.at(-1)!; assert.equal(event.actorId, "demo-secretaria"); assert.equal((event.before as PersonBefore).guardianPhone, person.guardianPhone);
});
type PersonBefore = { guardianPhone: string };
test("bolsa integral confirma matrícula sem pagamento fictício e inscrição sem dívida", () => {
  const f = fixture(); const result = f.run({ type: "enroll", input: input({ financeStatus: "scholarship", benefitReason: "Mérito" }) });
  const record = f.state.paymentRecords.find((item) => item.studentId === result.result.studentId)!;
  assert.equal(record.payments.length, 0); assert.equal(record.charges.find((item) => item.category === "registration")!.amount, 0);
  assert.equal(f.state.students.find((item) => item.id === result.result.studentId)!.registrationStatus, "paid");
});
test("desistência conserva mês da saída; antecipação futura torna-se crédito sem apagar recebido ou recibo", () => {
  const f = fixture(); const result = f.run({ type: "enroll", input: input() }); const studentId = String(result.result.studentId);
  const charge = f.state.paymentRecords.find((item) => item.studentId === studentId)!.charges.find((item) => item.monthKey === "jul")!;
  const paid = confirmDemoPayment(f.repository, { expected: f.state, role: "secretaria", commandId: "advance", recordedAt: now, draft: { studentId, category: "tuition", monthKey: "jul", targetChargeId: charge.id, amount: String(charge.amount), paidOn: "2026-05-05", method: "Numerário", description: "Antecipação", allowFutureAllocation: true } });
  const loaded = fixture(paid.state);
  const preview = previewExit(loaded.state, String(result.result.enrollmentId), "2026-06-10", false); assert.ok(preview.releasedCredit > 0);
  loaded.run({ type: "exit", enrollmentId: String(result.result.enrollmentId), status: "withdrawn", effectiveOn: "2026-06-10", reason: "Mudança de escola" }, "withdrawal");
  const record = loaded.state.paymentRecords.find((item) => item.studentId === studentId)!;
  assert.ok(record.charges.find((item) => item.monthKey === "jun")!.amount > 0); assert.equal(record.charges.find((item) => item.monthKey === "jul")!.amount, 0);
  assert.deepEqual(record.payments, paid.state.paymentRecords.find((item) => item.studentId === studentId)!.payments); assert.deepEqual(loaded.state.receipts, paid.state.receipts);
  assert.ok(record.academicAdjustments!.some((item) => item.releasedAllocations.length));
});
test("Director não executa comandos por acesso directo ao serviço", () => {
  const f = fixture(), before = f.values.get(demoStorageKey);
  assert.throws(() => executeAcademic(f.repository, f.state, { type: "enroll", input: input() }, { id: "forbidden", role: "director", recordedAt: now }), /Director/);
  assert.equal(f.values.get(demoStorageKey), before);
});
test("importação académica valida relações e preserva snapshot anterior sem inventar autores", () => {
  const f = fixture(), academic = academicStateFor(f.state);
  assert.equal(academic.events[0].origin, "legacy"); assert.equal(academic.events[0].actorId, undefined);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
  const invalid = structuredClone(f.state); invalid.academic!.placements[0].enrollmentId = "missing";
  assert.throws(() => parseDemoSnapshot(JSON.stringify(invalid)), /colocação/);
  const wrongVersion = structuredClone(f.state); (wrongVersion.academic as unknown as { version: number }).version = 2;
  assert.throws(() => parseDemoSnapshot(JSON.stringify(wrongVersion)), /versão/);
});

test("transferência com data futura só muda a colocação e a pauta quando entra em vigor", () => {
  const f = fixture(), enrollment = f.state.academic!.enrollments[0];
  f.run({ type: "transfer", enrollmentId: enrollment.id, groupId: "7B2026", effectiveOn: "2026-11-20", reason: "Mudança programada" });
  assert.equal(projectStudents(f.state, f.state.academic!, "2026-11-19")[0].groupId, "7A2026");
  assert.equal(projectStudents(f.state, f.state.academic!, "2026-11-20")[0].groupId, "7B2026");
  const reloaded = parseDemoSnapshot(serializeDemoSnapshot(f.state)) as unknown as DemoState;
  assert.equal(projectStudents(reloaded, reloaded.academic!, "2026-11-20")[0].stableNumber, "004");
});
test("cancelamento conserva recebimentos e snapshots e liberta aplicações como crédito", () => {
  const f = fixture(), enrollment = f.state.academic!.enrollments[0];
  const original = structuredClone(f.state.paymentRecords[0]);
  f.run({ type: "exit", enrollmentId: enrollment.id, status: "cancelled", effectiveOn: "2026-06-01", reason: "Matrícula criada por erro" });
  const record = f.state.paymentRecords.find((item) => item.studentId === enrollment.studentRecordId)!;
  assert.deepEqual(record.payments, original.payments); assert.equal(record.allocations.length, 0);
  assert.ok(record.charges.every((item) => (item.dueAmount ?? item.amount) === 0));
  assert.deepEqual(record.charges[0].snapshot, original.charges[0].snapshot);
  assert.ok(record.academicAdjustments!.some((item) => item.releasedAllocations.length > 0));
});
test("calendário não exclui cobranças anteriores e horários recusam minutos inválidos", () => {
  const f = fixture(), year = f.state.academic!.years.find((item) => item.id === "2026")!;
  assert.throws(() => f.run({ type: "year", ...year, settings: { ...year.settings, monthlyDueDay: 10 }, billingMonths: year.billingMonths.filter((key) => key !== "jun") }), /excluir cobranças/);
  assert.throws(() => f.run({ type: "group", name: "Outra turma", classId: "7", roomId: "room-a1", shift: "Tarde", capacity: 30, days: [1], startsAt: "13:90", endsAt: "17:00", reason: "" }), /horário/);
});
