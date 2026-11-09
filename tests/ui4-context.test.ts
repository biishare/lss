import assert from "node:assert/strict";
import { test } from "node:test";
import { cashTaskKey, readCashTasks, type CashTask } from "../app/features/cash/task-drafts";
import { contextFromLocation, defaultWorkspaceContext, readWorkspaceContext, validateWorkspaceContext, workspaceUrl } from "../app/features/demo/workspace-context";

test("apresentação automática distingue-se da planilha anual explícita ao restaurar e voltar", () => {
  const fallback = { ...defaultWorkspaceContext("payments"), yearId: "2026", paymentPeriod: "year" as const, paymentDisplay: "sheet" as const };
  assert.equal(contextFromLocation("/payments", "year=2026", fallback).paymentPeriod, undefined);
  assert.equal(contextFromLocation("/payments", "year=2026", fallback).paymentDisplay, undefined);
  const restored = contextFromLocation("/payments", workspaceUrl(fallback, "2026").split("?")[1], defaultWorkspaceContext());
  assert.equal(restored.paymentPeriod, "year"); assert.equal(restored.paymentDisplay, "sheet");
  assert.equal(readWorkspaceContext(JSON.stringify({ datasetId: "school", context: {} }), "school").paymentPeriod, undefined);
  const valid = validateWorkspaceContext(defaultWorkspaceContext("payments"), { classes: [], groups: [], students: [], months: ["mar", "may"], defaultYearId: "2026", defaultMonth: "may", years: [{ id: "2026", billingMonths: ["mar", "may"] }] });
  assert.equal(valid.month, "may");
});

test("filtros de alunos usam IDs no URL, recuperam o conjunto e limpam ao voltar à lista sem filtros", () => {
  const selected = { ...defaultWorkspaceContext("enrollments"), yearId: "2026", studentClassId: "class-7", studentGroupId: "group-7", studentStatus: "active", search: "Contacto 840000000" };
  const url = workspaceUrl(selected, "2026");
  assert.ok(!url.includes("840000000"));
  const restored = contextFromLocation("/students", url.split("?")[1], defaultWorkspaceContext());
  assert.equal(restored.studentClassId, "class-7"); assert.equal(restored.studentGroupId, "group-7"); assert.equal(restored.studentStatus, "active");
  const back = contextFromLocation("/students", "year=2026", selected);
  assert.equal(back.studentClassId, ""); assert.equal(back.studentGroupId, ""); assert.equal(back.studentStatus, "");
  const validated = validateWorkspaceContext({ ...selected, studentClassId: "other-year", studentGroupId: "other-group" }, { classes: [{ id: "other-year", academicYear: "2027" }], groups: [{ id: "other-group", classId: "other-year" }], students: [], years: [{ id: "2026", billingMonths: [] }], months: [] });
  assert.equal(validated.studentClassId, ""); assert.equal(validated.studentGroupId, "");
});

test("rascunhos de caixa conservam tentativas independentes e excluem dados inválidos, de outra escola ou já aplicados", () => {
  const expense: CashTask = { id: "expense-id", recordedAt: "2026-05-05T08:00:00.000Z", sessionId: "cash-a", command: { kind: "expense", amount: "", method: "Numerário", category: "Material", reason: "Por concluir", document: "" } };
  const close: CashTask = { ...expense, id: "close-id", command: { kind: "close", sessionId: "cash-a", countedAmount: "1200", reason: "" } };
  const raw = JSON.stringify({ version: 1, datasetId: "school", tasks: [expense, close, { ...expense, id: "bad", recordedAt: "invalid" }, { ...close, id: "foreign-session", sessionId: "cash-b" }] });
  const drafts = readCashTasks(raw, "school", []);
  assert.equal(Object.keys(drafts).length, 2); assert.equal(drafts[cashTaskKey(expense)].command.kind, "expense"); assert.equal(drafts[cashTaskKey(close)].id, "close-id");
  assert.equal(readCashTasks(raw, "school", ["expense-id"])[cashTaskKey(expense)], undefined);
  assert.deepEqual(readCashTasks(raw, "other-school", []), {}); assert.deepEqual(readCashTasks("{broken", "school", []), {});
});
