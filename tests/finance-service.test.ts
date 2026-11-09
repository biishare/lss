import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, demoStorageKey, type DemoState } from "../app/features/demo/demo-state";
import { createLocalDemoRepository, parseDemoSnapshot, serializeDemoSnapshot } from "../app/features/demo/local-repository";
import { buildLedger, buildPaymentRecord, getChargeBalance, getMonthsInRange, type PaymentLaunchDraft } from "../app/components/school-admin-demo.model";
import { confirmDemoPayment } from "../app/features/demo/payment-command";
import { prepareBilling, executeBilling, synchronizeSchool } from "../app/features/finance/billing-commands";
import { executeService, planService, type ServiceCommand } from "../app/features/finance/service-commands";
import { cashReceived, paymentCredit, recordCredit, receiptStatus } from "../app/features/finance/service-model";
import { executeAcademic, type AcademicCommand } from "../app/features/academics/operations";

function fixture() {
  let time = "2026-05-05T08:00:00Z", failed = false, writes = 0, index = 0;
  const values = new Map<string, string>();
  const repository = createLocalDemoRepository({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { if (failed) throw new Error("Quota"); values.set(key, value); writes++; } }, { now: () => time });
  const seed = createDemoState("example", { now: time, datasetId: "service" });
  seed.paymentProofs = [];
  for (const student of seed.students.slice(0, 2)) {
    student.financialProfile = { status: "regular", discountPercent: 0 };
    const record = seed.paymentRecords.findIndex((item) => item.studentId === student.id);
    seed.paymentRecords[record] = { ...buildPaymentRecord(student.id), billingVersion: 3, financialAid: [] };
  }
  Object.assign(seed, prepareBilling(seed, time));
  for (const rule of seed.paymentRuleVersions.filter((item) => item.calculationVersion === "v3")) { rule.monthlyFee = 1000; rule.penaltyPolicy!.firstPercent = 5; }
  // Recreate only the two test records against the exact 1 000 MT rule.
  seed.paymentRecords = seed.paymentRecords.map((item) => seed.students.slice(0, 2).some((student) => student.id === item.studentId) ? { ...buildPaymentRecord(item.studentId), billingVersion: 3, financialAid: [] } : item);
  let state = repository.initialize({ ...seed, ...prepareBilling(seed, time) });
  const draft = (patch: Partial<PaymentLaunchDraft> = {}): PaymentLaunchDraft => ({ studentId: "student-001", category: "tuition", monthKey: "may", targetChargeId: "", amount: "1000", paidOn: time.slice(0, 10), method: "Numerário", description: "", allowFutureAllocation: true, selectedChargeIds: [], ...patch });
  return { repository, values, draft, get time() { return time; }, get state() { return state; }, get writes() { return writes; }, failed(value: boolean) { failed = value; }, advance(date: string) { time = `${date}T08:00:00Z`; },
    sync() { state = synchronizeSchool(repository, state, "secretaria", time); },
    record(id = "student-001") { return state.paymentRecords.find((item) => item.studentId === id)!; },
    pay(patch: Partial<PaymentLaunchDraft> = {}, id = `pay-${++index}`) { const result = confirmDemoPayment(repository, { expected: state, commandId: id, role: "secretaria", recordedAt: time, draft: draft(patch) }); state = result.state; return result; },
    run(command: ServiceCommand, id = `service-${++index}`) { const result = executeService(repository, state, command, { id, role: "secretaria", recordedAt: time }); state = result.state; return result; },
    academic(command: AcademicCommand) { const result = executeAcademic(repository, state, command, { id: `academic-${++index}`, role: "secretaria", recordedAt: time }); state = result.state; return result; },
    benefit() { state = executeBilling(repository, state, { type: "aid", studentId: "student-001", retroactive: true, aid: { id: "test", enrollmentId: "student-001", kind: "partial_scholarship", percent: 50, appliesToRegistration: false, appliesToTuition: true, startMonth: "may", endMonth: "may", effectiveFrom: "2026-05-01", reason: "Apoio retroactivo", authorizedBy: "Direcção", registeredBy: "Secretaria", registeredAt: time } }, { id: `aid-${++index}`, role: "secretaria", recordedAt: time }).state; },
  };
}

test("F09/F10: sobra vira crédito; aplicação explícita não recebe novamente nem muda o recibo", () => {
  const f = fixture(), paid = f.pay({ amount: "1200" }), original = JSON.stringify(paid.receipt), paymentId = paid.receipt.paymentId;
  assert.equal(paid.receipt.unallocatedAmount, 200); assert.equal(recordCredit(f.record()), 200);
  const charge = f.record().charges.find((item) => item.monthKey === "apr")!;
  const cash = cashReceived(f.record().payments), count = f.record().payments.length;
  f.run({ kind: "apply-credit", sourceStudentId: "student-001", paymentId, studentId: "student-001", chargeIds: [charge.id], amount: "200", effectiveOn: "2026-05-05", reason: "Escolha explícita de Abril" });
  assert.equal(getChargeBalance(f.record(), charge), 800); assert.equal(recordCredit(f.record()), 0);
  assert.equal(f.record().payments.length, count); assert.equal(cashReceived(f.record().payments), cash); assert.equal(JSON.stringify(f.state.receipts[0]), original);
  assert.equal(f.record().allocations.at(-1)!.effectiveOn, "2026-05-05");
});
test("F11/F12: benefício pago liberta crédito; devolução limitada, auditável e repetível", () => {
  const f = fixture(), paid = f.pay(), original = JSON.stringify(paid.receipt); f.benefit();
  assert.equal(recordCredit(f.record()), 500);
  const command: ServiceCommand = { kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "600", effectiveOn: "2026-05-05", method: "M-Pesa", reason: "Devolver excedente do benefício" };
  const raw = f.values.get(demoStorageKey); assert.throws(() => f.run(command), /excede o crédito/); assert.equal(f.values.get(demoStorageKey), raw);
  command.amount = "150"; const before = f.state, writes = f.writes; f.run(command, "refund-stable");
  assert.equal(recordCredit(f.record()), 350); assert.equal(f.writes, writes + 1); assert.equal(f.record().creditDebits![0].amount, 150);
  const replay = executeService(f.repository, before, command, { id: "refund-stable", role: "secretaria", recordedAt: f.time }); assert.equal(replay.replayed, true); assert.equal(f.writes, writes + 1);
  assert.equal(JSON.stringify(f.state.receipts[0]), original); assert.equal(cashReceived(f.record().payments), 1000);
});
test("conferência: guardar comprovativo não liquida; confirmar grava pagamento e recibo uma única vez", () => {
  const f = fixture(), before = f.record().payments.length;
  const draft = f.draft({ method: "e-Mola" });
  f.run({ kind: "save-proof", draft, reference: "EM-123", note: "Talão apresentado" });
  assert.equal(f.record().payments.length, before); assert.equal(f.state.receipts.length, 0); assert.equal(f.state.paymentProofs![0].status, "pending");
  assert.throws(() => f.run({ kind: "save-proof", draft, reference: "EM-123", note: "Repetido" }), /já foi registado/);
  const proof = f.state.paymentProofs![0], command: ServiceCommand = { kind: "review-proof", proofId: proof.id, confirm: true, decision: "Referência, valor e data correspondem ao talão" };
  const expected = f.state; f.run(command, "confirmed-proof");
  assert.equal(f.state.paymentProofs![0].status, "confirmed"); assert.equal(f.record().payments.length, before + 1); assert.equal(f.state.receipts.length, 1);
  assert.equal(f.state.receipts[0].method, "e-Mola"); assert.equal(f.record().payments.at(-1)!.reference, "EM-123");
  const replay = executeService(f.repository, expected, command, { id: "confirmed-proof", role: "secretaria", recordedAt: f.time }); assert.equal(replay.replayed, true);
  assert.throws(() => f.run(command), /já não está em análise/);
});
test("comprovativo rejeitado conserva evidência, decisão e saldo sem recebimento", () => {
  const f = fixture(); f.run({ kind: "save-proof", draft: f.draft({ method: "Transferência" }), reference: "BANK-44", note: "Comprovativo de exemplo: transferência" });
  f.run({ kind: "review-proof", proofId: f.state.paymentProofs![0].id, confirm: false, decision: "Valor não localizado na conferência" });
  assert.equal(f.state.paymentProofs![0].status, "rejected"); assert.equal(f.state.paymentProofs![0].reference, "BANK-44"); assert.equal(f.record().payments.length, 0); assert.equal(f.state.receipts.length, 0);
});
test("conferência e devolução em falha são atómicas e conservam a tentativa", () => {
  const f = fixture(); f.run({ kind: "save-proof", draft: f.draft({ method: "Transferência" }), reference: "BANK-FAIL", note: "Prova" });
  const raw = f.values.get(demoStorageKey), command: ServiceCommand = { kind: "review-proof", proofId: f.state.paymentProofs![0].id, confirm: true, decision: "Conferido" };
  f.failed(true); assert.throws(() => f.run(command, "retry-proof"), /Não foi possível guardar/); assert.equal(f.values.get(demoStorageKey), raw);
  f.failed(false); f.run(command, "retry-proof"); assert.equal(f.state.receipts.length, 1);
  const paid = f.pay({ amount: "200", creditOnly: true }); const before = f.values.get(demoStorageKey);
  f.failed(true); assert.throws(() => f.run({ kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "150", effectiveOn: "2026-05-05", method: "Numerário", reason: "Devolução" }), /Não foi possível guardar/); assert.equal(f.values.get(demoStorageKey), before);
});
test("F15: corrigir aluno estorna aplicações e liga substituto sem duplicar caixa", () => {
  const f = fixture(), paid = f.pay(), original = JSON.stringify(paid.receipt), amount = cashReceived(f.state.paymentRecords.flatMap((item) => item.payments));
  const command: ServiceCommand = { kind: "replace-payment", studentId: "student-001", paymentId: paid.receipt.paymentId, draft: f.draft({ studentId: "student-002" }), reason: "Pagamento atribuído ao aluno errado" };
  const expected = f.state, plan = planService(expected, command, { id: "replace", role: "secretaria", recordedAt: f.time });
  assert.ok(plan.details.some((item) => item.includes("uma única entrada"))); f.run(command, "replace");
  assert.equal(f.record().payments[0].reversedBy, "REV-replace"); assert.equal(f.record().allocations.length, 0);
  assert.equal(f.record("student-002").payments.at(-1)!.kind, "replacement"); assert.equal(cashReceived(f.state.paymentRecords.flatMap((item) => item.payments)), amount);
  assert.equal(JSON.stringify(f.state.receipts[0]), original); assert.equal(f.state.receipts[1].replacesReceiptId, paid.receipt.id); assert.equal(receiptStatus(f.state, paid.receipt), "Anulado por correcção");
  assert.equal(f.record().reversals![0].releasedAllocations[0].amount, 1000);
  assert.equal(executeService(f.repository, expected, command, { id: "replace", role: "secretaria", recordedAt: f.time }).replayed, true);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
});
test("série por ano de emissão e snapshot mantêm valores, escola e sequência após recarregar", () => {
  const f = fixture(), first = f.pay({ amount: "400" }), second = f.pay({ amount: "600" });
  assert.equal(first.receipt.id, "LSS-2026-000001"); assert.equal(second.receipt.id, "LSS-2026-000002"); assert.equal(first.receipt.institution!.name, "Liceu São Silvestre");
  const loaded = f.repository.load(); assert.equal(loaded.status, "ready"); if (loaded.status === "ready") assert.deepEqual(loaded.state.receipts, [first.receipt, second.receipt]);
  assert.equal(f.record().charges.find((item) => item.monthKey === "may")!.amount, 1000);
});
test("distribuição adicional é explícita e não troca a mensalidade seleccionada", () => {
  const f = fixture(), april = f.record().charges.find((item) => item.monthKey === "apr")!;
  const paid = f.pay({ amount: "1300", selectedChargeIds: [april.id] });
  assert.equal(paid.receipt.items[0].label, "Mensalidade de Mai"); assert.equal(paid.receipt.items[0].amount, 1000); assert.equal(paid.receipt.items[1].amount, 300); assert.equal(paid.receipt.unallocatedAmount, 0);
});
function renew(f: ReturnType<typeof fixture>) {
  const person = f.state.academic!.people[0];
  f.academic({ type: "year", id: "2027", label: "2027", startsOn: "2027-03-01", endsOn: "2027-11-30", billingMonths: ["mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"], settings: { ...f.state.paymentSettings, academicYear: "2027", monthlyFee: 1000, monthlyDueDay: 10 } });
  f.academic({ type: "class", name: "7.ª classe", levelId: "secondary-1", yearId: "2027" });
  const schoolClass = f.state.classes.find((item) => item.academicYear === "2027")!;
  f.academic({ type: "group", name: "Turma A", classId: schoolClass.id, roomId: "room-a1", shift: "Manhã", capacity: 30, days: [1, 2, 3, 4, 5], startsAt: "07:00", endsAt: "12:30", reason: "" });
  const group = f.state.groups.find((item) => item.classId === schoolClass.id)!;
  const result = f.academic({ type: "enroll", input: { personId: person.id, fullName: person.fullName, guardianName: person.guardianName, guardianPhone: person.guardianPhone, yearId: "2027", groupId: group.id, enrolledOn: "2027-03-01", tuitionStartMonth: "mar", financeStatus: "regular", discountPercent: 0, duplicateReviewed: true, benefitStart: "mar", benefitEnd: "nov", benefitReason: "" } });
  return String(result.result.studentId);
}
test("crédito entre anos pertence à pessoa e não aumenta recebimentos ou recibos", () => {
  const f = fixture(), paid = f.pay({ amount: "1200" }), id = renew(f); f.advance("2027-03-05"); f.sync();
  const charge = f.record(id).charges.find((item) => item.monthKey === "mar")!;
  const cash = cashReceived(f.state.paymentRecords.flatMap((item) => item.payments)), count = f.state.receipts.length;
  f.run({ kind: "apply-credit", sourceStudentId: "student-001", paymentId: paid.receipt.paymentId, studentId: id, chargeIds: [charge.id], amount: "200", effectiveOn: "2027-03-05", reason: "Utilizar crédito do ano anterior" });
  assert.equal(recordCredit(f.record()), 0); assert.equal(cashReceived(f.state.paymentRecords.flatMap((item) => item.payments)), cash); assert.equal(f.state.receipts.length, count);
  assert.equal(f.record(id).payments.at(-1)!.kind, "credit-application"); assert.equal(f.record(id).allocations.at(-1)!.amount, 200);
  const ledger = buildLedger(f.state.students.find((item) => item.id === id)!, f.record(id), getMonthsInRange("mar", "nov"), { ...f.state.paymentSettings, academicYear: "2027" }, "2027-03-05", f.state.paymentRuleVersions);
  assert.equal(ledger.totals.paid, 0); assert.equal(ledger.totals.carry, 0); assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
});
test("F16: um recebimento repartido entre anos tem um recibo e uma entrada física", () => {
  const f = fixture(), id = renew(f); f.advance("2027-03-05"); f.sync();
  const old = f.record().charges.find((item) => item.monthKey === "may")!;
  const before = cashReceived(f.state.paymentRecords.flatMap((item) => item.payments));
  const paid = f.pay({ studentId: id, monthKey: "mar", amount: "1000", primaryAllocationAmount: "700", additionalTargets: [{ studentId: "student-001", chargeId: old.id, amount: "300" }] });
  assert.equal(paid.receipt.amount, 1000); assert.ok(paid.receipt.items.some((item) => item.academicYearId === "2027")); assert.ok(paid.receipt.items.some((item) => item.academicYearId === "2026"));
  assert.equal(cashReceived(f.state.paymentRecords.flatMap((item) => item.payments)) - before, 1000);
  assert.equal(f.state.receipts.length, 1); assert.equal(paid.receipt.items.reduce((sum, item) => sum + item.amount, 0) + paid.receipt.unallocatedAmount, 1000);
});
test("Director, conflito, origem alheia e importação adulterada são recusados sem escrita", () => {
  const f = fixture(), paid = f.pay({ amount: "1200" }), command: ServiceCommand = { kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "150", effectiveOn: "2026-05-05", method: "Numerário", reason: "Pedido" };
  const raw = f.values.get(demoStorageKey);
  assert.throws(() => executeService(f.repository, f.state, command, { id: "director", role: "director", recordedAt: f.time }), /Director/);
  const old = f.state; f.pay({ studentId: "student-002", amount: "1" }); assert.throws(() => executeService(f.repository, old, command, { id: "stale", role: "secretaria", recordedAt: f.time }), /noutra aba/);
  assert.throws(() => f.run({ kind: "apply-credit", sourceStudentId: "student-001", paymentId: paid.receipt.paymentId, studentId: "student-002", chargeIds: [f.record("student-002").charges[0].id], amount: "1", effectiveOn: "2026-05-05", reason: "Outra pessoa" }), /mesma pessoa/);
  const invalid = JSON.parse(raw!) as DemoState; invalid.paymentRecords.find((item) => item.studentId === "student-001")!.creditDebits = [{ id: "bad", kind: "refund", paymentId: paid.receipt.paymentId, amount: 300, effectiveOn: "2026-05-05", recordedAt: f.time, recordedBy: "Secretaria", reason: "Valor inválido", method: "Numerário" }];
  assert.throws(() => parseDemoSnapshot(JSON.stringify(invalid)), /além do disponível/);
  assert.equal(paymentCredit(f.record(), paid.receipt.paymentId), 200);
});

test("conferência com distribuição manual conserva os limites monetários no snapshot", () => {
  const f = fixture(), old = f.record().charges.find((item) => item.monthKey === "apr")!;
  const draft = f.draft({ method: "Transferência", amount: "1000", primaryAllocationAmount: "700", additionalTargets: [{ studentId: "student-001", chargeId: old.id, amount: "300" }] });
  f.run({ kind: "save-proof", draft, reference: "SPLIT-1000", note: "Distribuição 700 em Maio e 300 em Abril" });
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
  f.run({ kind: "review-proof", proofId: f.state.paymentProofs![0].id, confirm: true, decision: "Conferidos valor, data e distribuição" });
  const receipt = f.state.receipts[0]; assert.equal(receipt.items[0].amount, 700); assert.equal(receipt.items[1].amount, 300); assert.equal(receipt.unallocatedAmount, 0);
  assert.throws(() => f.pay({ method: "Transferência", evidenceReference: "SPLIT-1000" }), /já foi registado|Já existe/);
});
test("datas e limites impedem devolver antes da origem e repartir mais do que foi recebido", () => {
  const f = fixture(), paid = f.pay({ amount: "1200" }), raw = f.values.get(demoStorageKey);
  assert.throws(() => f.run({ kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "100", effectiveOn: "2026-05-04", method: "Numerário", reason: "Data errada" }), /anteceder/);
  assert.throws(() => f.run({ kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "100", effectiveOn: "2026-05-06", method: "Numerário", reason: "Data futura" }), /futuro/);
  assert.throws(() => f.pay({ primaryAllocationAmount: "1001" }), /excede/);
  assert.throws(() => f.pay({ method: "Transferência", evidenceReference: "" }), /referência do comprovativo/);
  assert.equal(f.values.get(demoStorageKey), raw);
});

test("prova tardia repartida entre anos ajusta também a multa da cobrança de destino", () => {
  const f = fixture(), id = renew(f); f.advance("2027-03-05"); f.sync();
  const old = f.record().charges.find((item) => item.monthKey === "may")!;
  const paid = f.pay({ studentId: id, monthKey: "mar", amount: "1000", primaryAllocationAmount: "700", paidOn: "2026-05-08", evidenceReference: "BANK-MIXED-LATE", lateReason: "Comprovativo apresentado após o pagamento", additionalTargets: [{ studentId: "student-001", chargeId: old.id, amount: "300" }] });
  const penalty = f.record().penaltyCharges!.find((item) => item.baseChargeId === old.id)!;
  assert.equal(penalty.amount, 50); assert.equal(penalty.adjustedAmount, 35); assert.ok(f.record().financialAdjustments?.some((item) => item.evidenceReference === "BANK-MIXED-LATE"));
  assert.equal(paid.receipt.items.reduce((sum, item) => sum + item.amount, 0) + paid.receipt.unallocatedAmount, 1000);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
});
