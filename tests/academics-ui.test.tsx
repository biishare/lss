import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within, configure } from "@testing-library/react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { WorkspaceEntry as SchoolAdminDemo } from "../app/components/workspace-entry";
import { createDemoState, demoStorageKey, type DemoState } from "../app/features/demo/demo-state";
import { domWindow } from "./dom-environment";
import { prepareBilling } from "../app/features/finance/billing-commands";
import { executeAcademic, type AcademicCommand } from "../app/features/academics/operations";
import { createLocalDemoRepository } from "../app/features/demo/local-repository";
import type { WorkspaceView } from "../app/components/school-admin-demo.model";

// Includes the cold, deferred workspace import and Node's TSX transformation.
configure({ asyncUtilTimeout: 5000 });

let values: Map<string, string>, writes: number;
const router: AppRouterInstance = { bfcacheId: "academic-test", back() {}, forward() {}, refresh() {}, prefetch: async () => {}, push: (url) => window.history.pushState(null, "", url), replace: (url) => window.history.replaceState(null, "", url) };
beforeEach(() => {
  values = new Map(); writes = 0;
  const initial = createDemoState("example", { now: "2026-11-08T12:00:00.000Z", datasetId: "academic-ui" });
  values.set(demoStorageKey, JSON.stringify({ ...initial, ...prepareBilling(initial, "2026-11-08T12:00:00.000Z") }));
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); if (key === demoStorageKey) writes++; } } });
  window.sessionStorage.clear(); window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ source: "demo", accountId: "demo-secretaria" }));
  window.history.replaceState(null, "", "/"); window.confirm = () => true;
});
afterEach(cleanup); after(async () => { await domWindow.happyDOM.close(); });
function open(view: WorkspaceView = "enrollments") { return render(<AppRouterContext.Provider value={router}><SchoolAdminDemo initialView={view}/></AppRouterContext.Provider>); }
function saved(): DemoState { return JSON.parse(values.get(demoStorageKey)!); }
async function identify(name = "Aluno da matrícula guiada") {
  fireEvent.click(await screen.findByRole("button", { name: /^Nova matrícula$/ }));
  fireEvent.change(screen.getByLabelText("Nome completo do aluno"), { target: { value: name } });
}
function placement() {
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.change(screen.getByLabelText("Turma da matrícula"), { target: { value: "7A2026" } });
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
}
test("Guardar e pagar confirma matrícula e abre a inscrição do aluno correcto no modal", async () => {
  open(); await identify(); placement();
  fireEvent.click(screen.getByRole("button", { name: /^Guardar e pagar$/ }));
  const payment = await screen.findByRole("dialog", { name: /Registar pagamento/ });
  assert.equal(saved().students.length, 13); assert.equal(saved().receipts.length, 0);
  assert.ok(Number((within(payment).getByLabelText(/^Valor recebido/) as HTMLInputElement).value) > 0);
  // Happy DOM incorrectly rejects valid step="0.01" values via floating remainder.
  // Submit the form to exercise the application's money/date validation.
  fireEvent.submit(document.getElementById("payment-service-form")!);
  await waitFor(() => assert.equal(saved().receipts.length, 1, screen.queryAllByRole("alert").map((alert) => alert.textContent).join(" ")));
  const receipt = await screen.findByRole("dialog", { name: /Recibo LSS-/ });
  assert.match(receipt.textContent ?? "", /Aluno da matrícula guiada/);
  assert.equal(saved().receipts.length, 1); assert.equal(writes, 2);
  fireEvent.click(within(receipt).getByRole("button", { name: /^Fechar$/ }));
  assert.ok(screen.getByRole("heading", { name: "Aluno da matrícula guiada" }));
});
test("Guardar rascunho e retomar conserva dados sem matricular ou cobrar", async () => {
  open(); await identify("Rascunho de atendimento");
  fireEvent.click(screen.getByRole("button", { name: "Guardar rascunho" }));
  const resume = await screen.findByRole("button", { name: "Continuar Rascunho de atendimento" });
  assert.equal(saved().students.length, 12); assert.equal(saved().academic!.drafts.length, 1);
  fireEvent.click(resume);
  assert.equal((screen.getByLabelText("Nome completo do aluno") as HTMLInputElement).value, "Rascunho de atendimento");
  placement(); fireEvent.click(screen.getByRole("button", { name: /^Guardar matrícula$/ }));
  await screen.findByRole("heading", { name: "Rascunho de atendimento" });
  assert.equal(saved().academic!.drafts.length, 0); assert.equal(saved().students.length, 13);
});
test("ficha e contacto corrigido sobrevivem a recarregar sem colocar pesquisa pessoal no URL", async () => {
  const page = open();
  fireEvent.click(await screen.findByRole("button", { name: /^Ana Júlia Mucavele$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Corrigir dados do aluno" }));
  const dialog = await screen.findByRole("dialog", { name: "Corrigir dados do aluno" });
  fireEvent.change(within(dialog).getByLabelText("Contacto do encarregado"), { target: { value: "849991234" } });
  fireEvent.change(within(dialog).getByLabelText(/Motivo da correcção/), { target: { value: "Contacto confirmado" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Guardar correcção" }));
  await waitFor(() => assert.equal(saved().students[0].guardianPhone, "849991234"));
  fireEvent.click(screen.getByRole("button", { name: /^Histórico$/ }));
  assert.match(screen.getByRole("heading", { name: "Histórico do aluno" }).parentElement!.textContent ?? "", /Contacto confirmado/);
  assert.ok(window.location.search.includes("student=")); assert.ok(!window.location.href.includes("849991234"));
  page.unmount(); open();
  await screen.findByRole("heading", { name: "Histórico do aluno" });
  assert.ok(screen.getByRole("heading", { name: "Ana Júlia Mucavele" }));
});
test("Director consulta ficha, matrículas e configuração sem acções de escrita", async () => {
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ source: "demo", accountId: "demo-director" }));
  open(); fireEvent.click(await screen.findByRole("button", { name: /^Ana Júlia Mucavele$/ }));
  assert.equal(screen.queryByRole("button", { name: "Nova matrícula" }), null); assert.equal(screen.queryByRole("button", { name: "Corrigir dados do aluno" }), null);
  fireEvent.click(screen.getByRole("button", { name: /^Matrículas$/ }));
  assert.equal(screen.queryByRole("button", { name: "Transferir de turma" }), null);
  assert.equal(screen.queryByRole("button", { name: "Registar saída" }), null); assert.equal(writes, 0);
});
test("sala é cadastrada uma vez e fica disponível nas turmas sem activação repetida", async () => {
  open("catalog"); fireEvent.click(await screen.findByRole("button", { name: "4. Salas e turmas" }));
  fireEvent.change(screen.getByLabelText(/Nome da sala/), { target: { value: "Sala da biblioteca" } });
  fireEvent.change(screen.getByLabelText("Localização da sala"), { target: { value: "Bloco C" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar configuração" }));
  await waitFor(() => assert.equal(saved().rooms.filter((item) => item.name === "Sala da biblioteca").length, 1));
  assert.equal(saved().roomDefinitions.filter((item) => item.name === "Sala da biblioteca").length, 1);
  fireEvent.click(screen.getByRole("button", { name: /^Turma$/ }));
  assert.ok(within(screen.getByLabelText("Sala da turma")).getByRole("option", { name: /Sala da biblioteca/ }));
});
test("renovação pela ficha reutiliza a pessoa e conserva o financeiro anterior", async () => {
  const repository = createLocalDemoRepository(window.localStorage);
  let state = saved(), number = 0;
  const run = (command: AcademicCommand) => { state = executeAcademic(repository, state, command, { id: `prepare-${++number}`, role: "secretaria", recordedAt: "2026-11-08T12:00:00.000Z" }).state; };
  run({ type: "class", name: "7.ª classe", levelId: "secondary-1", yearId: "2027" });
  const schoolClass = state.classes.find((item) => item.academicYear === "2027")!;
  run({ type: "group", name: "Turma A", classId: schoolClass.id, roomId: "room-a1", shift: "Manhã", capacity: 30, days: [1, 2, 3, 4, 5], startsAt: "07:00", endsAt: "12:30", reason: "" });
  const original = state.paymentRecords.find((item) => item.studentId === "student-001");
  writes = 0; open(); fireEvent.click(await screen.findByRole("button", { name: /^Ana Júlia Mucavele$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Renovar matrícula" }));
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  assert.equal((screen.getByLabelText("Ano lectivo") as HTMLSelectElement).value, "2027");
  fireEvent.change(screen.getByLabelText("Turma da matrícula"), { target: { value: state.groups.find((item) => item.classId === schoolClass.id)!.id } });
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Guardar matrícula$/ }));
  await waitFor(() => assert.equal(saved().students.length, 13));
  assert.equal(saved().academic!.people.length, 12); assert.equal(saved().academic!.enrollments.filter((item) => item.personId === "student-001").length, 2);
  assert.deepEqual(saved().paymentRecords.find((item) => item.studentId === "student-001"), original);
});
test("transferência pela ficha mostra prévia e conserva a colocação anterior no histórico", async () => {
  open(); fireEvent.click(await screen.findByRole("button", { name: /^Ana Júlia Mucavele$/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Matrículas$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Transferir de turma" }));
  const dialog = await screen.findByRole("dialog", { name: "Transferir aluno" });
  fireEvent.change(within(dialog).getByLabelText("Nova turma"), { target: { value: "7B2026" } });
  fireEvent.change(within(dialog).getByLabelText(/^Motivo/), { target: { value: "Pedido do encarregado" } });
  assert.match(dialog.textContent ?? "", /Colocação anterior/);
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar alteração" }));
  await waitFor(() => assert.equal(saved().students[0].groupId, "7B2026"));
  fireEvent.click(screen.getByRole("button", { name: /^Histórico$/ }));
  assert.ok(screen.getByRole("heading", { name: "Transferência de turma" })); assert.equal(saved().academic!.placements.length, 13);
});

test("fechar matrícula conserva o preenchimento e respeita cancelamento do aviso", async () => {
  open(); await identify("Matrícula por concluir"); window.confirm = () => false;
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Fechar$/ }));
  assert.ok(screen.getByRole("dialog")); window.confirm = () => true;
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Fechar$/ }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  fireEvent.click(screen.getByRole("button", { name: /^Nova matrícula$/ }));
  assert.equal((screen.getByLabelText("Nome completo do aluno") as HTMLInputElement).value, "Matrícula por concluir"); assert.equal(saved().students.length, 12);
});

test("rascunho de inscrição é retomado depois de fechar e recarregar sem duplicar matrícula", async () => {
  const page = open(); await identify("Aluno com pagamento por concluir"); placement();
  fireEvent.click(screen.getByRole("button", { name: /^Guardar e pagar$/ }));
  const dialog = await screen.findByRole("dialog", { name: /Registar pagamento/ });
  fireEvent.change(within(dialog).getByLabelText(/^Valor recebido/), { target: { value: "1234.56" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar e conservar preenchimento" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null)); page.unmount(); open();
  fireEvent.click(await screen.findByRole("button", { name: /^Pagar inscrição$/ }));
  const resumed = await screen.findByRole("dialog", { name: /Registar pagamento/ });
  assert.equal((within(resumed).getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "1234.56"); assert.equal(saved().students.length, 13); assert.equal(saved().receipts.length, 0);
});

test("paginação de alunos conserva a página ao regressar da ficha e ao recarregar", async () => {
  const state = saved(), source = state.students[0];
  state.students = Array.from({ length: 55 }, (_, index) => ({ ...source, id: `page-${index}`, enrollmentId: `ENR-page-${index}`, fullName: `Aluno de paginação ${index + 1}`, stableNumber: String(index + 1).padStart(3, "0"), registrationNumber: `LSS-P-${index + 1}` }));
  state.academic = undefined; state.paymentRecords = []; state.receipts = []; state.paymentProofs = []; state.groups[0].capacity = 100; state.rooms[0].capacity = 100;
  values.set(demoStorageKey, JSON.stringify(state));
  const page = open();
  fireEvent.click(await screen.findByRole("button", { name: "Página seguinte de alunos" }));
  fireEvent.click(screen.getByRole("button", { name: "Aluno de paginação 51" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar à lista de alunos" }));
  assert.ok(screen.getByRole("button", { name: "Aluno de paginação 51" })); assert.ok(window.location.search.includes("page=1"));
  page.unmount(); open();
  assert.ok(await screen.findByRole("button", { name: "Aluno de paginação 51" })); assert.equal(writes, 0);
});
