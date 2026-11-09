import assert from "node:assert/strict";
import test from "node:test";
import { phase6Fixture, renewForPhase6 } from "./helpers/phase6-fixture";
import { defaultReportFilters, reminderDraft, reportSource, queryReport } from "../app/features/reports/model";
import { reportCsv } from "../app/features/reports/export";
import { effectiveAmount } from "../app/features/finance/domain/billing";
import { workspaceUrl, contextFromLocation, defaultWorkspaceContext } from "../app/features/demo/workspace-context";

const ana = { search: "Ana Júlia Mucavele" };
test("R01: mês civil real; recebido, liquidado e crédito têm bases distintas", () => {
  const f = phase6Fixture(); f.pay({ amount: "1200" });
  assert.equal(f.report("receipts").total, 1200);
  assert.equal(f.report("allocations", ana).total, 1000);
  assert.equal(f.report("credit", ana).total, 200);
  const charge = f.record().charges.find((item) => item.monthKey === "apr")!;
  f.run({ kind: "apply-credit", sourceStudentId: "student-001", paymentId: f.state.receipts[0].paymentId, studentId: "student-001", chargeIds: [charge.id], amount: "200", effectiveOn: "2026-05-05", reason: "Regularizar Abril" });
  assert.equal(f.report("receipts").total, 1200); assert.equal(f.report("credit", ana).total, 0);
  assert.equal(f.report("allocations", { ...ana, from: "2026-04-01", to: "2026-04-30" }).total, 200);
  assert.deepEqual(defaultReportFilters("2026", "2026-11-09T22:30:00Z"), { kind: "receipts", from: "2026-11-01", to: "2026-11-10", yearId: "2026", classId: "", groupId: "", method: "", actorId: "", search: "" });
});
test("R02: recebimento repartido entre anos entra uma vez; competência permite 700/300", () => {
  const f = phase6Fixture(), id = renewForPhase6(f); f.advance("2027-03-05"); f.sync();
  const old = f.record().charges.find((item) => item.monthKey === "may")!;
  f.pay({ studentId: id, monthKey: "mar", amount: "1000", primaryAllocationAmount: "700", additionalTargets: [{ studentId: "student-001", chargeId: old.id, amount: "300" }] });
  for (const yearId of ["2026", "2027"]) assert.equal(f.report("receipts", { yearId }).total, 1000);
  const newYear = f.report("allocations", { yearId: "2027", ...ana }); assert.equal(newYear.total, 700);
  const oldYear = f.report("allocations", { yearId: "2026", from: "2026-05-01", to: "2026-05-31", ...ana }); assert.equal(oldYear.total, 300);
  assert.equal(oldYear.rows[0].originYear, "2027"); assert.equal(oldYear.rows[0].receiptId, f.state.receipts[0].id); assert.equal(f.state.cashBook!.movements.length, 1);
});
test("R03: recebimento atrasado segue a data efectiva e liquidação segue a competência", () => {
  const f = phase6Fixture(); f.pay({ monthKey: "apr", paidOn: "2026-04-30", evidenceReference: "CASH-30", lateReason: "Talão apresentado hoje" });
  assert.equal(f.report("receipts").total, 0); assert.equal(f.report("receipts", { from: "2026-04-01", to: "2026-04-30" }).total, 1000);
  assert.equal(f.report("allocations", { ...ana, from: "2026-04-01", to: "2026-04-30" }).total, 1000);
  assert.equal(f.state.cashBook!.sessions[0].businessDate, "2026-05-05");
});
test("R04: devolução e benefício não viram receita; estorno é excluído", () => {
  const f = phase6Fixture(), p = f.pay(); f.benefit();
  assert.equal(f.report("benefits", ana).total, 500); assert.equal(f.report("credit", ana).total, 500);
  f.run({ kind: "refund", studentId: "student-001", paymentId: p.receipt.paymentId, amount: "150", method: "Numerário", effectiveOn: "2026-05-05", reason: "Pedido do encarregado" });
  assert.equal(f.report("receipts").total, 1000); assert.equal(f.report("refunds").total, 150); assert.equal(f.report("credit", ana).total, 350);
  const next = phase6Fixture(), original = next.pay();
  next.run({ kind: "replace-payment", studentId: "student-001", paymentId: original.receipt.paymentId, draft: next.draft({ studentId: "student-002", method: "M-Pesa" }), reason: "Rever atribuição e forma" });
  assert.equal(next.report("receipts").count, 1); assert.equal(next.report("receipts").total, 1000); assert.equal(next.report("receipts", { method: "Numerário" }).total, 0); assert.equal(next.report("receipts", { method: "M-Pesa" }).total, 1000);
});
test("R05: vencido, emitido a vencer e previsão não se sobrepõem", () => {
  const f = phase6Fixture();
  const debt = f.report("overdue", ana), due = f.report("due", ana), forecast = f.report("forecast", { ...ana, to: "2026-11-30" });
  assert.ok(debt.rows.length); assert.ok(due.rows.some((item) => /Mai/.test(item.label))); assert.ok(forecast.rows.length);
  const debtIds = new Set(debt.rows.map((item) => item.id)); assert.ok(due.rows.every((item) => !debtIds.has(item.id)));
  const issued = new Set(f.record().charges.map((item) => item.id)); assert.ok(forecast.rows.every((item) => !issued.has(item.id)));
  const outstanding = [...f.record().charges, ...(f.record().penaltyCharges ?? [])].reduce((sum, item) => sum + effectiveAmount(item), 0);
  assert.equal(debt.total + due.total, outstanding); assert.ok(debt.rows.every((item) => (item.dueOn ?? "") < "2026-05-05" || item.penalty));
});
test("R06: filtros mantêm exactamente a lista, total e CSV com protecção de fórmulas", () => {
  const f = phase6Fixture(); f.pay({ amount: "100.35" }); f.pay({ studentId: "student-002", amount: "200.65", method: "M-Pesa", evidenceReference: "MP-200" });
  const filters = { ...ana, method: "Numerário", actorId: "demo-secretaria", classId: f.state.students[0].classId, groupId: f.state.students[0].groupId };
  const result = f.report("receipts", filters); assert.equal(result.count, 1); assert.equal(result.total, 100.35); assert.equal(result.rows[0].name, ana.search);
  const csv = reportCsv(result); assert.equal(csv.split("\r\n").length, result.count + 2); assert.ok(csv.startsWith("\uFEFF")); assert.match(csv, /"100,35"/); assert.ok(!csv.includes("200,65"));
  result.rows[0].name = '=HYPERLINK("bad")'; assert.match(reportCsv(result), /"'=HYPERLINK/);
  assert.equal(f.report("receipts", { actorId: "previous-author" }).count, 0);
  assert.throws(() => f.report("receipts", { from: "2026-06-01", to: "2026-05-01" }), /intervalo/);
});
test("R07: comprovativo pendente suspende a mensagem e mantém a dívida", () => {
  const f = phase6Fixture(), before = f.report("overdue", ana).total;
  f.run({ kind: "save-proof", draft: f.draft({ monthKey: "apr", method: "Transferência" }), reference: "BANK-APR", note: "Apresentado" });
  const result = f.report("overdue", ana), pending = result.rows.find((item) => /Abr/.test(item.label))!;
  assert.equal(result.total, before); assert.equal(pending.pending, true);
  const message = reminderDraft(result, pending.personId!); assert.ok(!message.message.includes("Abr")); assert.match(message.message, /Ana Júlia/); assert.ok(message.amount < result.total);
  assert.throws(() => reminderDraft({ ...result, rows: [pending] }, pending.personId!), /suspensos/);
});
test("R08: matrículas, vagas e crédito por pessoa respeitam ano e ficam consultáveis", () => {
  const f = phase6Fixture(); f.pay({ creditOnly: true, amount: "50" }); const id = renewForPhase6(f);
  assert.equal(f.report("credit", { yearId: "2027", ...ana }).total, 50);
  const enrolled = f.report("enrollments", { yearId: "2027" }); assert.equal(enrolled.total, 1); assert.equal(enrolled.rows[0].studentId, id);
  const occupancy = f.report("occupancy", { yearId: "2027" }); assert.equal(occupancy.rows[0].occupied, 1); assert.equal(occupancy.total, 29);
  const source = reportSource(f.state, f.time), filters = { ...defaultReportFilters("2026", f.time), kind: "receipts" as const, search: "Contacto privado 841234567", method: "M-Pesa", actorId: "demo-secretaria" };
  const context = { ...defaultWorkspaceContext("reports"), yearId: "2026", reportFilters: filters, reportSection: "cash" as const, reportPage: 2 };
  const url = workspaceUrl(context, "2026"); assert.ok(!url.includes("841234567")); assert.ok(url.includes("rsection=cash"));
  const restored = contextFromLocation("/reports", url.split("?")[1], defaultWorkspaceContext()); assert.equal(restored.reportPage, 2); assert.equal(restored.reportFilters!.method, "M-Pesa"); assert.equal(restored.reportFilters!.search, undefined);
  assert.deepEqual(queryReport(source, { ...filters, search: "" }).rows, f.report("receipts", { method: "M-Pesa", actorId: "demo-secretaria" }).rows);
});
