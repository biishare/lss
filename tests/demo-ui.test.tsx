import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SchoolAdminDemo } from "../app/components/school-admin-demo";
import { createDemoState, demoStorageKey } from "../app/features/demo/demo-state";
import { domWindow } from "./dom-environment";
import type { WorkspaceView } from "../app/components/school-admin-demo.model";

class TestStorage {
  values = new Map<string, string>();
  failed = false;
  financialWrites = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === demoStorageKey) {
      if (this.failed) throw new Error("Quota exceeded");
      this.financialWrites++;
    }
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

let storage: TestStorage;
const router: AppRouterInstance = {
  bfcacheId: "test-router",
  back() {}, forward() {}, refresh() {}, prefetch: async () => {},
  push: (url) => window.history.pushState(null, "", url),
  replace: (url) => window.history.replaceState(null, "", url),
};

beforeEach(() => {
  storage = new TestStorage();
  const seed = createDemoState("example", { now: "2026-11-08T12:00:00.000Z", datasetId: "ui-scenario" });
  storage.values.set(demoStorageKey, JSON.stringify({ ...seed, revision: 1 }));
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  window.sessionStorage.clear();
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ profile: "secretaria", accountName: "Marta — Secretaria" }));
});
afterEach(() => { cleanup(); });
after(async () => { await domWindow.happyDOM.close(); });

function open(view: WorkspaceView = "overview") {
  return render(<AppRouterContext.Provider value={router}><SchoolAdminDemo initialView={view} /></AppRouterContext.Provider>);
}

test("dados corrompidos não são substituídos ao abrir a aplicação", async () => {
  storage.values.set(demoStorageKey, "{incompleto");
  open();
  await screen.findByRole("heading", { name: "Não foi possível abrir os dados" });
  assert.equal(storage.getItem(demoStorageKey), "{incompleto");
  assert.equal(storage.financialWrites, 0);
  assert.ok(screen.getByRole("button", { name: "Descarregar original" }));
});

test("falha de pagamento mantém formulário e dados; nova tentativa emite um recibo", async () => {
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  const amount = screen.getByLabelText("Valor recebido") as HTMLInputElement;
  fireEvent.change(amount, { target: { value: "1000" } });
  const raw = storage.getItem(demoStorageKey);
  storage.failed = true;
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /Não foi possível guardar/));
  assert.equal(amount.value, "1000");
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(screen.queryByRole("dialog"), null);
  storage.failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  const dialog = await screen.findByRole("dialog");
  assert.match(dialog.textContent ?? "", /Recibo REC-/);
  assert.equal(storage.financialWrites, 1);
  const state = JSON.parse(storage.getItem(demoStorageKey)!);
  assert.equal(state.receipts.length, 1);
  assert.equal(state.operations.length, 1);
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
  assert.equal(storage.financialWrites, 1);
});

test("Director consulta o cenário comum sem formulários de escrita nem gravação automática", async () => {
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ profile: "director", accountName: "António — Director" }));
  const raw = storage.getItem(demoStorageKey);
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.financialWrites, 0);
});

test("cancelar reposição deixa o cenário intacto", async () => {
  const raw = storage.getItem(demoStorageKey);
  window.confirm = () => false;
  open("catalog");
  const reset = await screen.findByRole("button", { name: "Repor dados iniciais" });
  fireEvent.click(reset);
  await screen.findByText(/Reposição cancelada/);
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.financialWrites, 0);
});

test("primeiro arranque oferece escolha e não cria exemplos ao recarregar", async () => {
  storage.values.delete(demoStorageKey);
  const page = open();
  await screen.findByRole("button", { name: "Abrir escola de exemplo" });
  assert.equal(storage.financialWrites, 0);
  assert.equal(storage.getItem(demoStorageKey), null);
  page.unmount();
  open();
  await screen.findByRole("button", { name: "Configurar do início" });
  assert.equal(storage.financialWrites, 0);
});

test("rascunho de pagamento é retomado ao reabrir sem alterar o cenário", async () => {
  const page = open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  fireEvent.change(screen.getByLabelText("Valor recebido"), { target: { value: "1234" } });
  // Navegar imediatamente também conserva o último valor, antes do temporizador.
  page.unmount();
  assert.match(window.sessionStorage.getItem("lss-demo-drafts-v1") ?? "", /1234/);
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  assert.equal((screen.getByLabelText("Valor recebido") as HTMLInputElement).value, "1234");
  assert.equal(storage.financialWrites, 0);
});

test("erro de importação não substitui o estado nem pede confirmação", async () => {
  const raw = storage.getItem(demoStorageKey);
  let confirmations = 0;
  window.confirm = () => { confirmations++; return true; };
  open("catalog");
  const input = await screen.findByLabelText("Importar JSON");
  fireEvent.change(input, { target: { files: [new File(["{invalid"], "invalid.json", { type: "application/json" })] } });
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /JSON válido/));
  assert.equal(confirmations, 0);
  assert.equal(storage.getItem(demoStorageKey), raw);
});

test("outra aba invalida a prévia e não emite recibo", async () => {
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  const current = JSON.parse(storage.getItem(demoStorageKey)!);
  current.revision++;
  storage.values.set(demoStorageKey, JSON.stringify(current));
  const raw = storage.getItem(demoStorageKey);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /noutra aba/));
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(screen.queryByRole("dialog"), null);
});

test("preferência de menu é lida antes de qualquer gravação da preferência", async () => {
  storage.values.set("lss-demo-sidebar-collapsed", "true");
  open();
  await screen.findByRole("button", { name: "Expandir menu" });
  assert.equal(storage.getItem("lss-demo-sidebar-collapsed"), "true");
  assert.equal(storage.financialWrites, 0);
});

test("matrícula conserva formulário em falha e guarda aluno e financeiro juntos", async () => {
  const raw = storage.getItem(demoStorageKey);
  open("enrollments");
  const name = await screen.findByLabelText("Nome completo do aluno");
  fireEvent.change(name, { target: { value: "Aluno Novo Exemplo" } });
  storage.failed = true;
  fireEvent.click(screen.getByRole("button", { name: "Guardar matricula" }));
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /Não foi possível guardar/));
  assert.equal((name as HTMLInputElement).value, "Aluno Novo Exemplo");
  assert.equal(storage.getItem(demoStorageKey), raw);
  storage.failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Guardar matricula" }));
  await waitFor(() => assert.equal(storage.financialWrites, 1));
  const state = JSON.parse(storage.getItem(demoStorageKey)!);
  const student = state.students.find((student: { fullName: string }) => student.fullName === "Aluno Novo Exemplo");
  assert.ok(student);
  assert.ok(state.paymentRecords.find((record: { studentId: string }) => record.studentId === student.id));
  assert.equal(state.students.length, 13);
});
