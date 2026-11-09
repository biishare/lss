import assert from "node:assert/strict";
import test from "node:test";
import { initialStudents, monthOptions, type Student, type StudentPaymentRecord } from "../app/lib/school-demo-data";
import type { FinancialAid, PaymentRuleVersion } from "../app/features/finance/domain/entities";
import { addDays, assessPenalties, balanceCents, calendarFor, effectiveAmount, projectedCharge, schoolToday, synchronizeRecord, validateRule } from "../app/features/finance/domain/billing";
import { cents, money, percentage } from "../app/features/finance/domain/money";
import { buildLedger, buildPaymentRecord, getMonthCellState } from "../app/components/school-admin-demo.model";
import { createDemoState, demoStorageKey } from "../app/features/demo/demo-state";
import { createLocalDemoRepository, serializeDemoSnapshot, parseDemoSnapshot } from "../app/features/demo/local-repository";
import { confirmDemoPayment } from "../app/features/demo/payment-command";
import { executeBilling, prepareBilling, synchronizeSchool } from "../app/features/finance/billing-commands";
import { executeAcademic } from "../app/features/academics/operations";

const months = monthOptions.map((month) => month.key);
const student: Student = { ...initialStudents[0], id: "v3-student", enrollmentId: "v3-enrollment", academicYearId: "2026", educationLevelId: "7", enrollmentDate: "2026-01-05", tuitionStartMonth: "jan", billingMonths: months, financialProfile: { status: "regular", discountPercent: 0 } };
const rule: PaymentRuleVersion = { id: "rule-v3", academicYearId: "2026", educationLevelId: "7", version: 2, status: "active", calculationVersion: "v3", inscriptionFee: 500, monthlyFee: 1000, coveredMonthKeys: months, monthlyDueDay: 10, validFrom: "2026-01-01", registeredBy: "Secretaria", registeredAt: "2026-01-01T08:00:00Z", firstPenalty: { thresholdDay: 1, percent: 5 }, secondPenalty: { thresholdDay: 11, percent: 10 }, penaltyPolicy: { firstAfterDays: 1, firstPercent: 5, secondEnabled: true, secondAfterDays: 11, secondPercent: 10 } };
const aid = (patch: Partial<FinancialAid> = {}): FinancialAid => ({ id: "aid", enrollmentId: student.enrollmentId!, kind: "partial_scholarship", percent: 50, appliesToRegistration: true, appliesToTuition: true, registeredAt: "2026-01-01T08:00:00Z", registeredBy: "Secretaria", authorizedBy: "Direcção", reason: "Mérito", ...patch });
function record(on = "2026-01-01", rules = [rule], financialAid: FinancialAid[] = []) {
  const record = { ...buildPaymentRecord(student.id), billingVersion: 3 as const, financialAid };
  return synchronizeRecord(record, student, months, rules, on, `${on}T08:00:00Z`);
}
function allocate(record: StudentPaymentRecord, amount: number, date: string, month = "jan") {
  const id = `payment-${record.payments.length}`, charge = record.charges.find((item) => item.monthKey === month)!;
  record.payments.push({ id, studentId: record.studentId, amount, paidOn: date, effectivePaymentDate: date, recordedAt: `${date}T08:00:00Z`, method: "Numerário" });
  record.allocations.push({ id: `allocation-${id}`, paymentId: id, chargeId: charge.id, amount });
}
const due = (record: StudentPaymentRecord) => money([...record.charges.filter((charge) => charge.monthKey === "jan"), ...(record.penaltyCharges ?? []).filter((penalty) => penalty.baseChargeId.includes("TUI-JAN"))].reduce((total, charge) => total + balanceCents(record, charge), 0));

test("F01: half-up por parcela; 1 000,10 × 15% = 150,02; devido 850,08", () => {
  const issued = record("2026-01-06", [{ ...rule, monthlyFee: 1000.10 }], [aid({ percent: 15 })]).charges.find((item) => item.monthKey === "jan")!;
  assert.equal(issued.discountAmount, 150.02); assert.equal(issued.dueAmount, 850.08);
  assert.equal(percentage(cents("1000.10"), 15), 15002);
  for (const bad of ["", "-1", "0.001", "NaN", "Infinity"]) assert.throws(() => cents(bad));
});
test("F02/F03: bolsa integral abrange inscrição e propinas; sobreposição usa maior benefício", () => {
  const full = record("2026-01-21", [rule], [aid({ kind: "scholarship", percent: 100 })]);
  assert.ok(full.charges.every((item) => item.dueAmount === 0)); assert.equal(full.payments.length, 0); assert.equal(full.penaltyCharges?.length ?? 0, 0);
  const partial = record("2026-01-06", [rule], [aid(), aid({ id: "other", percent: 20 })]);
  assert.equal(partial.charges.find((item) => item.monthKey === "jan")!.dueAmount, 500);
});
test("F04: datas reais, 5% + incremento de 5%; não capitaliza multas", () => {
  const r = record("2026-01-21");
  assert.deepEqual(r.penaltyCharges!.map((item) => [item.effectiveOn, item.amount]), [["2026-01-11", 50], ["2026-01-21", 50]]); assert.equal(due(r), 1100);
});
test("F05: vencimento inclusivo; pagamento no início da multa já paga multa", () => {
  const last = record("2026-01-10"); allocate(last, 1000, "2026-01-10"); assessPenalties(last, "2026-01-21", "2026-01-21T08:00:00Z"); assert.equal(due(last), 0);
  const next = record("2026-01-10"); allocate(next, 1000, "2026-01-11"); assessPenalties(next, "2026-01-21", "2026-01-21T08:00:00Z"); assert.equal(due(next), 50);
});
test("F06: prova tardia neutraliza multa mantendo original, evidência e história; é repetível", () => {
  const r = record("2026-01-14"), original = JSON.stringify(r.penaltyCharges![0]);
  allocate(r, 1000, "2026-01-08");
  assert.throws(() => assessPenalties(r, "2026-01-14", "2026-01-14T08:00:00Z", { reason: "", evidenceReference: "" }), /comprovativo/);
  assessPenalties(r, "2026-01-14", "2026-01-14T08:00:00Z", { reason: "Entregue dia 14", evidenceReference: "TALAO-08" });
  assert.equal(r.penaltyCharges![0].amount, 50); assert.equal(effectiveAmount(r.penaltyCharges![0]), 0); assert.equal(due(r), 0);
  assert.equal(JSON.stringify({ ...r.penaltyCharges![0], adjustedAmount: undefined }), original);
  assert.equal(r.financialAdjustments![0].evidenceReference, "TALAO-08");
  assessPenalties(r, "2026-01-14", "2026-01-14T09:00:00Z", { reason: "Entregue dia 14", evidenceReference: "TALAO-08" }); assert.equal(r.financialAdjustments!.length, 1);
});
test("F07: pagamentos por data efectiva dão principal 200 e multas 20 + 10", () => {
  const r = record("2026-01-09"); allocate(r, 600, "2026-01-09");
  assessPenalties(r, "2026-01-11", "2026-01-11T08:00:00Z"); allocate(r, 200, "2026-01-15");
  assessPenalties(r, "2026-01-21", "2026-01-21T08:00:00Z");
  assert.deepEqual(r.penaltyCharges!.map((item) => item.amount), [20, 10]); assert.equal(due(r), 230);
});
test("F08: principal liquidado mantém primeira multa e impede segunda", () => {
  const r = record("2026-01-11"); allocate(r, 1000, "2026-01-15"); assessPenalties(r, "2026-01-21", "2026-01-21T08:00:00Z");
  assert.equal(due(r), 50); assert.equal(r.penaltyCharges!.length, 1);
});
test("F17: segunda etapa desligada, 60 dias e múltiplas sincronizações deixam multa única", () => {
  const simple = { ...rule, penaltyPolicy: { ...rule.penaltyPolicy!, secondEnabled: false } }, r = record("2026-01-11", [simple]);
  for (let i = 0; i < 5; i++) synchronizeRecord(r, student, months, [simple], "2026-03-11", "2026-03-11T08:00:00Z");
  assert.equal(r.penaltyCharges!.filter((item) => item.baseChargeId.endsWith("TUI-JAN")).length, 1); assert.equal(due(r), 1050);
});
test("calendário respeita entrada, saída e meses; última data e intervalos cruzam mês/ano", () => {
  const calendar = calendarFor({ ...student, tuitionStartMonth: "may", tuitionEndMonth: "jul" }, ["mar", "may", "jun", "jul", "sep"]);
  assert.deepEqual(calendar.filter((item) => item.kind === "tuition").map((item) => item.monthKey), ["may", "jun", "jul"]);
  const feb = calendarFor(student, months).find((item) => item.monthKey === "feb")!;
  assert.equal(projectedCharge(student, feb, [{ ...rule, monthlyDueDay: 31 }], [], "2026-02-01T08:00:00Z")!.dueOn, "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01"); assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(schoolToday({ now: () => "2026-01-10T22:01:00Z" }), "2026-01-11");
  assert.throws(() => validateRule({ ...rule, penaltyPolicy: { ...rule.penaltyPolicy!, secondPercent: 4 } }));
});

function school(on = "2026-05-14") {
  let currentTime = `${on}T08:00:00Z`, failed = false;
  const values = new Map<string, string>(), storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (failed) throw new Error("Quota"); values.set(key, value); } };
  const repository = createLocalDemoRepository(storage, { now: () => currentTime });
  const seed = createDemoState("example", { now: currentTime, datasetId: "billing-school" }), s = seed.students[0];
  s.financialProfile = { status: "regular", discountPercent: 0 };
  s.pricingLevelId = seed.classDefinitions.find((item) => item.id === s.educationLevelId)!.stageId;
  seed.paymentRuleVersions = [...seed.paymentRuleVersions, { ...rule, academicYearId: s.academicYearId!, educationLevelId: s.pricingLevelId!, coveredMonthKeys: ["mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"] }];
  seed.paymentRecords = seed.paymentRecords.map((item) => item.studentId === s.id ? { ...buildPaymentRecord(s.id), billingVersion: 3 as const, financialAid: [] } : item);
  let state = repository.initialize({ ...seed, ...prepareBilling(seed, currentTime) });
  return { repository, values, student: s, get state() { return state; }, advance(on: string) { currentTime = `${on}T08:00:00Z`; }, fail() { failed = true; },
    pay(amount: string, paidOn: string, patch = {}) { const result = confirmDemoPayment(repository, { expected: state, role: "secretaria", commandId: `pay-${state.revision}`, recordedAt: currentTime, draft: { studentId: s.id, category: "tuition", monthKey: "may", amount, paidOn, method: "Numerário", description: "", allowFutureAllocation: true, ...patch } }); state = result.state; return result; },
    run(command: Parameters<typeof executeBilling>[2], id = `billing-${state.revision}`) { const result = executeBilling(repository, state, command, { id, role: "secretaria", recordedAt: currentTime }); state = result.state; return result; } };
}
test("F06 no serviço: prova obrigatória, falha atómica e recibo persistido uma vez", () => {
  const f = school(), raw = f.values.get(demoStorageKey);
  assert.throws(() => f.pay("1000", "2026-05-08"), /comprovativo/); assert.equal(f.values.get(demoStorageKey), raw);
  const result = f.pay("1000", "2026-05-08", { evidenceReference: "TALAO-MAIO", lateReason: "Entrega posterior" });
  const r = result.state.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.equal(r.financialAdjustments!.filter((item) => item.kind === "late-proof").length, 1); assert.equal(r.penaltyCharges!.find((item) => item.baseChargeId.endsWith("TUI-MAY"))!.amount, 50);
  assert.equal(result.receipt.amount, 1000); assert.equal(result.receipt.penaltyTotal, 0);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
});
test("F13/F14: emissão antecipada só do mês escolhido; regra futura não altera emitidas/recibos", () => {
  const f = school("2026-05-05"), r = f.state.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.ok(!r.charges.some((item) => item.monthKey === "jul"));
  const oldMay = JSON.stringify(r.charges.find((item) => item.monthKey === "may"));
  const paid = f.pay("1000", "2026-05-05", { monthKey: "jul" }); const originalReceipt = JSON.stringify(paid.receipt);
  assert.equal(paid.state.paymentRecords.find((item) => item.studentId === f.student.id)!.charges.filter((item) => item.monthKey === "jul").length, 1);
  f.run({ type: "rule", rule: { ...rule, academicYearId: f.student.academicYearId!, educationLevelId: f.student.pricingLevelId!, coveredMonthKeys: ["mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"], monthlyFee: 1200, validFrom: "2026-06-01", reason: "Novo preço" } });
  const issued = f.state.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.equal(JSON.stringify(issued.charges.find((item) => item.monthKey === "may")), oldMay);
  assert.equal(issued.charges.find((item) => item.monthKey === "jul")!.amount, 1000); assert.equal(JSON.stringify(f.state.receipts[0]), originalReceipt);
  const june = issued.billingCalendar!.find((item) => item.monthKey === "jun")!;
  assert.equal(projectedCharge(f.student, june, f.state.paymentRuleVersions, [], "2026-05-05T08:00:00Z")!.amount, 1200);
  f.advance("2026-08-01"); const synchronized = synchronizeSchool(f.repository, f.state, "secretaria", "2026-08-01T08:00:00Z");
  const again = synchronizeSchool(f.repository, synchronized, "secretaria", "2026-08-01T08:00:00Z"); assert.equal(again.revision, synchronized.revision);
  assert.equal(again.paymentRecords.find((item) => item.studentId === f.student.id)!.charges.filter((item) => item.monthKey === "jul").length, 1);
});
test("benefício retroactivo liberta crédito e conserva pagamento, recibo e snapshot; isenção termina", () => {
  const f = school("2026-05-10"); f.pay("1000", "2026-05-10");
  const before = f.state.paymentRecords.find((item) => item.studentId === f.student.id)!, receipts = JSON.stringify(f.state.receipts), payments = JSON.stringify(before.payments), snapshot = JSON.stringify(before.charges.find((item) => item.monthKey === "may")!.snapshot);
  f.run({ type: "aid", studentId: f.student.id, retroactive: true, aid: aid({ effectiveFrom: "2026-05-01", startMonth: "may", endMonth: "may", appliesToRegistration: false }) });
  const r = f.state.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.equal(r.charges.find((item) => item.monthKey === "may")!.adjustedDueAmount, 500); assert.equal(r.allocations.find((item) => item.chargeId.endsWith("TUI-MAY"))!.amount, 500);
  assert.equal(JSON.stringify(r.payments), payments); assert.equal(JSON.stringify(f.state.receipts), receipts); assert.equal(JSON.stringify(r.charges.find((item) => item.monthKey === "may")!.snapshot), snapshot);
  assert.equal(r.financialAdjustments![0].releasedAllocations[0].amount, 500);
});
test("validação de vigências, Director e falha de escrita não deixam alterações parciais", () => {
  const f = school("2026-05-05"), raw = f.values.get(demoStorageKey), command = { type: "rule" as const, rule: { ...rule, academicYearId: f.student.academicYearId!, educationLevelId: f.student.pricingLevelId!, reason: "Nova", validFrom: "2026-01-01", coveredMonthKeys: ["mar", "apr", "may"] } };
  assert.throws(() => f.run(command), /vigência/); assert.equal(f.values.get(demoStorageKey), raw);
  assert.throws(() => executeBilling(f.repository, f.state, command, { id: "director", role: "director", recordedAt: "2026-05-05T08:00:00Z" }), /Director/);
  f.fail(); assert.throws(() => f.run({ ...command, rule: { ...command.rule, validFrom: "2026-06-01" } }), /Não foi possível guardar/); assert.equal(f.values.get(demoStorageKey), raw);
});
test("planilha apresenta Previsto, bolsa/isenção e o mesmo devido exacto", () => {
  const r = record("2026-01-06", [rule], [aid({ kind: "exception", percent: 100, startMonth: "jan", endMonth: "jan", appliesToRegistration: false })]);
  const settings = { academicYear: "2026", monthlyFee: 1000, inscriptionRenewalFee: 500, startMonth: "jan", endMonth: "dec", firstPenaltyDay: 10, firstPenaltyAmount: 50, secondPenaltyDay: 20, secondPenaltyAmount: 50 };
  const ledger = buildLedger(student, r, monthOptions, settings, "2026-01-06", [rule]);
  assert.equal(getMonthCellState(ledger.monthly[0], settings).label, "Isento"); assert.equal(getMonthCellState(ledger.monthly[1], settings).label, "Previsto");
});
test("F09: receber 1 200 para uma mensalidade deixa crédito 200 sem pagar outra", () => {
  const f = school("2026-05-10"), received = f.pay("1200", "2026-05-10");
  assert.equal(received.receipt.unallocatedAmount, 200); assert.equal(received.receipt.items.length, 1);
  const r = f.state.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.deepEqual(r.allocations.map((item) => [item.chargeId, item.amount]), [[`CHG-${f.student.id}-TUI-MAY`, 1000]]);
});
test("prova tardia com excedente reflecte a distribuição final no novo recibo", () => {
  const f = school(), received = f.pay("1200", "2026-05-08", { evidenceReference: "TALAO", lateReason: "Entrega tardia" });
  assert.equal(received.receipt.penaltyTotal, 0); assert.equal(received.receipt.unallocatedAmount, 200); assert.equal(received.receipt.items.length, 1);
});
test("antecipação em falha não emite item, recebimento ou recibo parcialmente", () => {
  const f = school("2026-05-05"), raw = f.values.get(demoStorageKey); f.fail();
  assert.throws(() => f.pay("1000", "2026-05-05", { monthKey: "jul" }), /Não foi possível guardar/); assert.equal(f.values.get(demoStorageKey), raw);
});
test("isenção temporária não cria dívida retroactiva e termina no mês configurado", () => {
  const r = record("2026-02-01", [rule], [aid({ kind: "exception", percent: 100, startMonth: "jan", endMonth: "jan", appliesToRegistration: false })]);
  assert.equal(r.charges.find((item) => item.monthKey === "jan")!.dueAmount, 0);
  assert.equal(r.charges.find((item) => item.monthKey === "feb")!.dueAmount, 1000);
  assert.equal(r.charges.find((item) => item.category === "registration")!.dueAmount, 500);
});
test("transferência de nível usa colocação vigente na emissão e preserva o mês já emitido", () => {
  const f = school("2026-05-05"), target = f.state.groups.find((group) => f.state.classes.find((item) => item.id === group.classId)?.educationLevelId === "10")!;
  const enrollment = f.state.academic!.enrollments.find((item) => item.studentRecordId === f.student.id)!;
  const transferred = executeAcademic(f.repository, f.state, { type: "transfer", enrollmentId: enrollment.id, groupId: target.id, effectiveOn: "2026-07-15", reason: "Mudança de nível" }, { role: "secretaria", id: "transfer-price", recordedAt: "2026-05-05T08:00:00Z" }).state;
  const r = transferred.paymentRecords.find((item) => item.studentId === f.student.id)!;
  assert.equal(r.billingCalendar!.find((item) => item.monthKey === "jul")!.educationLevelId, f.student.pricingLevelId);
  assert.equal(r.billingCalendar!.find((item) => item.monthKey === "aug")!.educationLevelId, "secondary-2");
  assert.equal(projectedCharge(f.student, r.billingCalendar!.find((item) => item.monthKey === "aug")!, transferred.paymentRuleVersions, [], "2026-05-05T08:00:00Z")!.amount, 2000);
  assert.equal(r.charges.find((item) => item.monthKey === "may")!.ruleVersionId, rule.id);
});
test("importação rejeita vigências sobrepostas e calendário de outra matrícula", () => {
  const f = school("2026-05-05"), duplicate = structuredClone(f.state), original = f.values.get(demoStorageKey);
  duplicate.paymentRuleVersions.push({ ...duplicate.paymentRuleVersions.find((item) => item.id === rule.id)!, id: "duplicate-rule" });
  assert.throws(() => parseDemoSnapshot(JSON.stringify(duplicate)), /sobrepostas/);
  const bad = structuredClone(f.state); bad.paymentRecords[0].billingCalendar![0].enrollmentId = "other-enrollment";
  assert.throws(() => parseDemoSnapshot(JSON.stringify(bad)), /calendário/); assert.equal(f.values.get(demoStorageKey), original);
  const unsupported = structuredClone(f.state) as unknown as { paymentRuleVersions: Array<{ calculationVersion?: string }> };
  unsupported.paymentRuleVersions[0].calculationVersion = "v99";
  assert.throws(() => parseDemoSnapshot(JSON.stringify(unsupported)), /algoritmo desconhecida/);
});
test("sincronizar dados anteriores preserva cobranças e recibos originais e mantém regras antigas", () => {
  const initial = createDemoState("example", { now: "2026-11-08T12:00:00Z", datasetId: "legacy-preserved" });
  const charges = JSON.stringify(initial.paymentRecords.map((item) => item.charges)), rules = JSON.stringify(initial.paymentRuleVersions), receipts = JSON.stringify(initial.receipts);
  const patch = prepareBilling(initial, "2026-11-08T12:00:00Z");
  assert.equal(JSON.stringify(patch.paymentRecords!.map((item) => item.charges)), charges); assert.equal(JSON.stringify(patch.paymentRuleVersions!.filter((rule) => rule.calculationVersion !== "v3")), rules); assert.equal(JSON.stringify(initial.receipts), receipts);
});
test("benefício retroactivo em cobranças antigas conserva originais, neutraliza multas e não abrange extras", () => {
  const values = new Map<string, string>(), repository = createLocalDemoRepository({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
  const seed = createDemoState("example", { now: "2026-11-08T08:00:00Z", datasetId: "legacy-benefit" }), s = seed.students[0], original = seed.paymentRecords[0];
  original.charges.push({ id: "extra-independent", studentId: s.id, category: "miscellaneous", description: "Transporte", amount: 200, createdAt: "2026-05-01" });
  const state = repository.initialize({ ...seed, ...prepareBilling(seed, "2026-11-08T08:00:00Z") }), before = JSON.stringify(state.paymentRecords[0].payments), fineOriginal = state.paymentRecords[0].penaltyCharges![0].amount;
  const result = executeBilling(repository, state, { type: "aid", studentId: s.id, retroactive: true, aid: aid({ kind: "scholarship", percent: 100, effectiveFrom: "2026-01-01" }) }, { id: "full-legacy-aid", role: "secretaria", recordedAt: "2026-11-08T08:00:00Z" }).state;
  const r = result.paymentRecords[0];
  assert.ok(r.charges.filter((charge) => charge.category !== "miscellaneous").every((charge) => effectiveAmount(charge) === 0));
  assert.equal(effectiveAmount(r.charges.find((charge) => charge.id === "extra-independent")!), 200); assert.equal(JSON.stringify(r.payments), before);
  assert.equal(r.penaltyCharges![0].amount, fineOriginal); assert.ok(r.penaltyCharges!.every((penalty) => effectiveAmount(penalty) === 0));
});
test("configuração inicial pode substituir uma regra automática ainda sem cobranças emitidas", () => {
  const f = school("2026-05-05");
  const future = executeAcademic(f.repository, f.state, { type: "class", name: "7.ª classe", levelId: "secondary-1", yearId: "2027" }, { id: "next-class", role: "secretaria", recordedAt: "2026-05-05T08:00:00Z" }).state;
  const automatic = { ...rule, id: "RULE-V3-2027-secondary-1-DEFAULT", academicYearId: "2027", educationLevelId: "secondary-1", monthlyFee: 0, validFrom: "2027-01-01", coveredMonthKeys: future.academic!.years.find((year) => year.id === "2027")!.billingMonths };
  const stored = f.repository.commit({ role: "secretaria", action: "manage-payment-rules", expected: future, command: { id: "unused-rule", payload: automatic }, change(current) { return { patch: { paymentRuleVersions: [...current.paymentRuleVersions, automatic] } }; } }).state;
  const configured = executeBilling(f.repository, stored, { type: "rule", rule: { ...automatic, monthlyFee: 1200, reason: "Configuração inicial" } }, { id: "configured-next", role: "secretaria", recordedAt: "2026-05-05T08:00:00Z" }).state;
  assert.equal(configured.paymentRuleVersions.find((rule) => rule.id === automatic.id)!.supersededBy, "RULE-configured-next");
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(configured)), configured);
});
