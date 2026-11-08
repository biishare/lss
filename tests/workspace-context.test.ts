import assert from "node:assert/strict";
import { test } from "node:test";
import { demoSessionFor, readDemoSession, saveDemoSession } from "../app/features/demo/demo-session";
import { authenticateDemoSession } from "../app/features/demo/demo-auth";
import { contextFromLocation, defaultWorkspaceContext, readWorkspaceContext, validateWorkspaceContext, workspaceUrl } from "../app/features/demo/workspace-context";

test("a conta de exemplo determina o papel; sessão desconhecida ou da API não dá acesso à demo", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const director = demoSessionFor("demo-director")!;
  saveDemoSession(storage, director);
  assert.equal(readDemoSession(storage)?.account.role, "director");
  assert.equal(demoSessionFor("secretaria"), null);
  assert.equal(readDemoSession({ getItem: () => '{"source":"api","profile":"secretaria"}' }), null);
  assert.equal(readDemoSession({ getItem: () => '{"source":"demo","accountId":"outro","profile":"secretaria"}' }), null);
  assert.equal(readDemoSession({ getItem: () => "{incompleto" }), null);
});

test("sessão v1 é reconhecida sem aceitar nome ou papel inventado", () => {
  assert.equal(readDemoSession({ getItem: () => '{"profile":"director","accountName":"outro nome"}' })?.account.name, "António");
  assert.equal(readDemoSession({ getItem: () => '{"profile":"administrador"}' }), null);
});

test("entrada local exige o par correcto e o papel pertence à conta", async () => {
  assert.equal((await authenticateDemoSession(" Marta ", "Lss!Marta2026"))?.account.role, "secretaria");
  assert.equal((await authenticateDemoSession("ANTONIO", "Lss!Antonio2026"))?.account.role, "director");
  assert.equal(await authenticateDemoSession("marta", "Lss!Antonio2026"), null);
  assert.equal(await authenticateDemoSession("outro", "Lss!Marta2026"), null);
  assert.equal(await authenticateDemoSession("marta", ""), null);
  assert.equal(await authenticateDemoSession("marta", " Lss!Marta2026"), null);
});

test("URL recupera área e IDs, sem transportar pesquisa pessoal ou selecção em lote", () => {
  const context = { ...defaultWorkspaceContext("payments"), classId: "7", groupId: "7-a", month: "jun", paymentSection: "entry" as const, alertFilter: "debt" as const, search: "Encarregado 841234567", selectedStudentIds: ["aluno-1"] };
  const url = workspaceUrl(context, "2026");
  assert.match(url, /^\/payments\?year=2026&class=7&group=7-a&month=jun&section=entry&alert=debt$/);
  assert.ok(!url.includes("841234567") && !url.includes("aluno-1"));
  const result = contextFromLocation("/payments", url.split("?")[1], defaultWorkspaceContext());
  assert.equal(result.groupId, "7-a");
  assert.equal(result.paymentSection, "entry");
  assert.equal(result.alertFilter, "debt");
});

test("rotas só aceitam vistas e separadores conhecidos; permissões não vêm dos parâmetros", () => {
  const context = contextFromLocation("/students", "view=groups&role=secretaria", defaultWorkspaceContext());
  assert.equal(context.view, "groups");
  assert.equal(contextFromLocation("/payments", "view=catalog&section=invalid&alert=invalid", defaultWorkspaceContext()).view, "payments");
  assert.equal(contextFromLocation("/students", "view=javascript:alert(1)", defaultWorkspaceContext()).view, "enrollments");
  assert.equal(workspaceUrl(context, "2026").includes("role"), false);
});

test("contexto de outra escola ou sessão corrompida não é restaurado", () => {
  const raw = JSON.stringify({ datasetId: "escola-a", context: { search: "Ana", selectedStudentIds: ["a", null], paymentSection: "unknown" } });
  assert.deepEqual(readWorkspaceContext(raw, "escola-b"), {});
  assert.deepEqual(readWorkspaceContext("{broken", "escola-a"), {});
  const same = readWorkspaceContext(raw, "escola-a");
  assert.equal(same.search, "Ana");
  assert.equal(same.paymentSection, "entry");
  assert.deepEqual(same.selectedStudentIds, ["a"]);
});

test("IDs inválidos, turma de outra classe e alunos fora da turma são removidos", () => {
  const data = { classes: [{ id: "7" }, { id: "8" }], groups: [{ id: "7-a", classId: "7" }, { id: "8-a", classId: "8" }], students: [{ id: "a", groupId: "7-a" }, { id: "b", groupId: "8-a" }], months: ["mar", "abr"] };
  const context = validateWorkspaceContext({ ...defaultWorkspaceContext("payments"), classId: "7", groupId: "8-a", month: "invalid", selectedStudentIds: ["a", "a", "b", "unknown"] }, data);
  assert.equal(context.groupId, "7-a");
  assert.equal(context.month, "mar");
  assert.deepEqual(context.selectedStudentIds, ["a"]);
  assert.equal(validateWorkspaceContext({ ...context, classId: "invalid", groupId: "8-a" }, data).classId, "8");
});
