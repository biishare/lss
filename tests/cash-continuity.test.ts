import assert from "node:assert/strict";
import test from "node:test";
import { phase6Fixture } from "./helpers/phase6-fixture";
import { executeCash, planCash } from "../app/features/cash/commands";
import { cashTotals, sessionMovements } from "../app/features/cash/model";
import { demoStorageKey, cloneJson } from "../app/features/demo/demo-state";
import { parseDemoSnapshot, serializeDemoSnapshot } from "../app/features/demo/local-repository";
import { backupArchiveKey, configureBackups, ensureBackupConfiguration, readBackups, restoreBackup, storeBackup, verifyBackup, recoverySummary, recordVerification } from "../app/features/continuity/backups";
const summary = (f: ReturnType<typeof phase6Fixture>) => cashTotals(f.state.cashBook!.sessions[0].openingAmount, sessionMovements(f.state.cashBook!, f.state.cashBook!.sessions[0].id));

test("C01: abertura + numerário − devoluções − saídas; banco e carteiras separados", () => {
  const f = phase6Fixture(); f.cash({ kind: "open", openingAmount: "100" });
  const paid = f.pay({ amount: "1200" }); f.pay({ amount: "300", creditOnly: true, method: "Transferência", evidenceReference: "BANK-300" });
  f.pay({ amount: "200", creditOnly: true, method: "e-Mola", evidenceReference: "EM-200" });
  f.run({ kind: "refund", studentId: "student-001", paymentId: paid.receipt.paymentId, amount: "100", method: "Numerário", effectiveOn: "2026-05-05", reason: "Devolução parcial" });
  f.cash({ kind: "expense", amount: "50", method: "Numerário", category: "Material", reason: "Papel", document: "TAL-1" });
  f.cash({ kind: "expense", amount: "25", method: "Transferência", category: "Serviço", reason: "Serviço bancário", document: "TR-25" });
  f.cash({ kind: "float", amount: "20", method: "Numerário", category: "Fundo", reason: "Reforço autorizado", document: "" });
  const totals = summary(f); assert.equal(totals.receipts, 1700); assert.equal(totals.refunds, 100); assert.equal(totals.expenses, 75); assert.equal(totals.expectedCashCents, 117000);
  assert.equal(totals.methods.find((item) => item.method === "Transferência")!.netCents, 27500);
  assert.throws(() => f.cash({ kind: "open", openingAmount: "0" }), /Já existe/);
  assert.throws(() => f.cash({ kind: "expense", amount: "2000", method: "Numerário", category: "Material", reason: "Pedido", document: "" }), /excede/);
});
test("C02: fecho exige contagem e diferença justificada; snapshot persiste no reload", () => {
  const f = phase6Fixture(); f.pay({ amount: "1200" }); const sessionId = f.state.cashBook!.sessions[0].id;
  const raw = f.values.get(demoStorageKey); assert.throws(() => f.cash({ kind: "close", sessionId, countedAmount: "1100", reason: "" }), /Justifique/); assert.equal(f.values.get(demoStorageKey), raw);
  f.cash({ kind: "close", sessionId, countedAmount: "1100", reason: "Diferença apurada em conferência" });
  const closed = f.state.cashBook!.sessions[0]; assert.equal(closed.status, "closed"); assert.equal(closed.differenceCents, -10000); assert.equal(closed.snapshot!.totals.expectedCashCents, 120000);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
  assert.throws(() => f.cash({ kind: "close", sessionId, countedAmount: "1200", reason: "Reabrir" }), /sessão.*aberta/);
});
test("C03: correcção posterior, até no mesmo milissegundo, preserva o fecho e não recebe outra vez", () => {
  const f = phase6Fixture(), paid = f.pay(); const sessionId = f.state.cashBook!.sessions[0].id;
  f.cash({ kind: "close", sessionId, countedAmount: "1000", reason: "" }); const snapshot = JSON.stringify(f.state.cashBook!.sessions[0].snapshot);
  f.run({ kind: "replace-payment", studentId: "student-001", paymentId: paid.receipt.paymentId, draft: f.draft({ studentId: "student-002", method: "M-Pesa" }), reason: "Atribuição errada e forma errada" });
  assert.equal(f.state.cashBook!.movements.length, 1); assert.equal(f.state.cashBook!.adjustments.length, 1); assert.equal(JSON.stringify(f.state.cashBook!.sessions[0].snapshot), snapshot);
  assert.equal(sessionMovements(f.state.cashBook!, sessionId)[0].method, "M-Pesa"); assert.equal(summary(f).expectedCashCents, 0);
  assert.equal(f.state.cashBook!.sessions[0].snapshot!.movements[0].method, "Numerário"); assert.equal(f.report("receipts").total, 1000);
  assert.deepEqual(parseDemoSnapshot(serializeDemoSnapshot(f.state)), f.state);
});
test("C04: dia anterior requer fecho, mas guardar comprovativo não movimenta caixa", () => {
  const f = phase6Fixture(); f.pay(); f.advance("2026-05-06");
  const raw = f.values.get(demoStorageKey); assert.throws(() => f.pay({ creditOnly: true }), /Feche o caixa/); assert.equal(f.values.get(demoStorageKey), raw);
  f.run({ kind: "save-proof", draft: f.draft({ monthKey: "apr", method: "Transferência" }), reference: "BANK-NEXT-DAY", note: "Por conferir" }); assert.equal(f.state.cashBook!.movements.length, 1);
  f.cash({ kind: "close", sessionId: f.state.cashBook!.sessions[0].id, countedAmount: "1000", reason: "" });
  f.pay({ creditOnly: true }); assert.equal(f.state.cashBook!.sessions.length, 2); assert.equal(f.state.cashBook!.sessions[1].businessDate, "2026-05-06");
});
test("C05: gravação atómica e repetição de comando não duplicam a saída", () => {
  const f = phase6Fixture(); f.cash({ kind: "open", openingAmount: "100" });
  const command = { kind: "expense" as const, amount: "20", method: "Numerário", category: "Material", reason: "Compra", document: "" }, expected = f.state, raw = f.values.get(demoStorageKey);
  f.failMain(true); assert.throws(() => f.cash(command, "cash-retry"), /Não foi possível guardar/); assert.equal(f.values.get(demoStorageKey), raw);
  f.failMain(false); f.cash(command, "cash-retry"); const writes = f.writes;
  const replay = executeCash(f.repository, expected, command, { id: "cash-retry", role: "secretaria", recordedAt: f.time }); assert.equal(replay.replayed, true); assert.equal(f.writes, writes); assert.equal(f.state.cashBook!.movements.length, 1);
  assert.throws(() => planCash(f.state, command, { id: "director", role: "director", recordedAt: f.time }), /Director/);
  assert.throws(() => executeCash(f.repository, f.state, command, { id: "director", role: "director", recordedAt: f.time }), /não pode executar/i);
});
test("C06: importação recusa caixa incoerente e fecho alterado sem substituir original", () => {
  const f = phase6Fixture(); f.pay(); f.cash({ kind: "close", sessionId: f.state.cashBook!.sessions[0].id, countedAmount: "1000", reason: "" });
  const raw = f.values.get(demoStorageKey), bad = cloneJson(f.state); bad.cashBook!.sessions[0].snapshot!.totals.expectedCashCents += 1;
  assert.throws(() => verifyBackup(serializeDemoSnapshot(bad), f.time), /inconsistentes/); assert.equal(f.values.get(demoStorageKey), raw);
  const duplicate = cloneJson(f.state); duplicate.cashBook!.movements.push(duplicate.cashBook!.movements[0]); assert.throws(() => verifyBackup(serializeDemoSnapshot(duplicate), f.time), /inconsistentes/);
});
test("B01: cópias automáticas activas, com retenção e sem duplicar revisões", () => {
  const f = phase6Fixture(); ensureBackupConfiguration(f.storage); assert.equal(readBackups(f.storage).enabled, true);
  configureBackups(f.storage, true, 2); f.pay({ amount: "10" }); f.pay({ amount: "20" }); f.pay({ amount: "30" });
  const archive = readBackups(f.storage); assert.equal(archive.items.length, 2); assert.deepEqual(archive.items.map((item) => item.revision), [f.state.revision - 1, f.state.revision]);
  storeBackup(f.storage, f.state, "Repetido", f.time); assert.equal(readBackups(f.storage).items.length, 2);
  configureBackups(f.storage, false, 2); f.pay({ amount: "40" }); assert.equal(readBackups(f.storage).items.at(-1)!.revision, f.state.revision - 1);
});
test("B02: falha da operação não cria cópia; falha da cópia preserva operação e avisa", () => {
  const f = phase6Fixture(); ensureBackupConfiguration(f.storage); f.pay({ amount: "10" }); const archived = f.values.get(backupArchiveKey), original = f.values.get(demoStorageKey);
  f.failMain(true); assert.throws(() => f.pay(), /Não foi possível guardar/); assert.equal(f.values.get(backupArchiveKey), archived); assert.equal(f.values.get(demoStorageKey), original);
  f.failMain(false); f.failBackup(true); const result = f.pay({ amount: "20" }); assert.equal(result.receipt.amount, 20); assert.equal(f.state.receipts.length, 2); assert.match(f.backupIssue, /operação foi guardada/); assert.equal(f.values.get(backupArchiveKey), archived);
});
test("B03: restauro ensaiado verifica relações, saldos, recibos e fecho num armazenamento isolado", () => {
  const f = phase6Fixture(); f.pay({ amount: "1200" }); f.cash({ kind: "close", sessionId: f.state.cashBook!.sessions[0].id, countedAmount: "1200", reason: "" });
  const raw = f.values.get(demoStorageKey), backup = serializeDemoSnapshot(f.state), checked = verifyBackup(backup, f.time);
  assert.equal(checked.isolated, true); assert.equal(checked.summary.receipts, 1); assert.equal(checked.summary.closedSessions, 1); assert.equal(checked.summary.credit, 200); assert.deepEqual(checked.summary, recoverySummary(f.state)); assert.equal(f.values.get(demoStorageKey), raw);
  recordVerification(f.storage, checked); assert.equal(readBackups(f.storage).lastVerification!.summary.credit, 200);
});
test("B04: restauro conserva estado anterior fora da retenção mínima", () => {
  const f = phase6Fixture(); configureBackups(f.storage, true, 1); f.pay({ amount: "10" }); const target = serializeDemoSnapshot(f.state);
  f.pay({ amount: "20" }); const previous = f.state; f.setState(restoreBackup(f.repository, f.storage, f.state, target, "secretaria", f.time));
  assert.equal(f.state.receipts.length, 1); assert.equal(readBackups(f.storage).items.length, 1);
  const safety = readBackups(f.storage).beforeRestore!; assert.equal(verifyBackup(safety.raw, f.time).summary.receipts, previous.receipts.length);
  f.pay({ amount: "30" }); assert.equal(readBackups(f.storage).beforeRestore!.raw, safety.raw);
});
test("B05: inválido, concorrência, Director e falha da cópia prévia preservam o original", () => {
  const f = phase6Fixture(); f.pay(); const backup = serializeDemoSnapshot(f.state), expected = f.state;
  f.pay({ amount: "1", creditOnly: true }); const raw = f.values.get(demoStorageKey);
  assert.throws(() => restoreBackup(f.repository, f.storage, expected, backup, "secretaria", f.time), /mudaram/);
  assert.throws(() => restoreBackup(f.repository, f.storage, f.state, backup, "director", f.time), /Director/);
  assert.throws(() => restoreBackup(f.repository, f.storage, f.state, "{quebrado", "secretaria", f.time), /JSON/); assert.equal(f.values.get(demoStorageKey), raw);
  f.failBackup(true); assert.throws(() => restoreBackup(f.repository, f.storage, f.state, backup, "secretaria", f.time), /cópia de segurança/); assert.equal(f.values.get(demoStorageKey), raw);
});
