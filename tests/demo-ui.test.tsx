import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";
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
  window.history.replaceState(null, "", "/");
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

function mainNavigation() {
  return within(screen.getByRole("complementary", { name: "Navegação principal" }));
}

test("entrada única de demonstração abre o papel da conta e sair conserva a escola", async () => {
  const raw = storage.getItem(demoStorageKey);
  window.sessionStorage.removeItem("lss-demo-session-v1");
  open();
  await screen.findByRole("heading", { name: "Entrar no LSS" });
  fireEvent.change(screen.getByRole("combobox", { name: "Conta de exemplo" }), { target: { value: "demo-director" } });
  fireEvent.click(screen.getByRole("button", { name: "Abrir demonstração" }));
  await screen.findByRole("heading", { level: 1, name: "Início" });
  assert.ok(screen.getByText("António — Director"));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  await screen.findByRole("heading", { name: "Entrar no LSS" });
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.financialWrites, 0);
  assert.equal(window.sessionStorage.getItem("lss-demo-session-v1"), null);
});

test("layout partilhado conserva pesquisa, selecção e rascunho entre áreas", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }));
  fireEvent.change(screen.getByLabelText("Valor recebido"), { target: { value: "1234" } });
  fireEvent.click(mainNavigation().getByRole("button", { name: "Relatórios" }));
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  assert.equal(window.location.pathname, "/reports");
  assert.ok(!window.location.href.includes("Ana"));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Ana");
  assert.equal((screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }) as HTMLInputElement).checked, true);
  assert.equal((screen.getByLabelText("Valor recebido") as HTMLInputElement).value, "1234");
  assert.equal(storage.financialWrites, 0);
});

test("recarregar recupera classe, turma, pesquisa, selecção e rascunho da mesma sessão", async () => {
  const page = open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Bruno" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Bruno Ernesto Macamo" }));
  fireEvent.change(screen.getByLabelText("Valor recebido"), { target: { value: "567" } });
  const href = window.location.href;
  page.unmount();
  open();
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(window.location.href, href);
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Bruno");
  assert.equal((screen.getByRole("checkbox", { name: "Seleccionar Bruno Ernesto Macamo" }) as HTMLInputElement).checked, true);
  assert.equal((screen.getByLabelText("Valor recebido") as HTMLInputElement).value, "567");
  assert.equal(storage.financialWrites, 0);
});

test("Voltar e Avançar recuperam as áreas sem repor os dados ou perder o filtro", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
  fireEvent.click(mainNavigation().getByRole("button", { name: "Relatórios" }));
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  await act(async () => { window.history.back(); });
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Ana");
  await act(async () => { window.history.forward(); });
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  assert.equal(storage.financialWrites, 0);
});

test("vista expandida e Escape conservam a selecção, o formulário e a preferência desktop", async () => {
  storage.values.set("lss-demo-sidebar-collapsed", "false");
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Carla" } });
  fireEvent.change(screen.getByLabelText("Valor recebido"), { target: { value: "987" } });
  const region = screen.getByRole("region", { name: "Tabela com deslocamento horizontal" });
  region.scrollLeft = 250;
  fireEvent.click(screen.getByRole("button", { name: "Expandir planilha" }));
  assert.ok(screen.getByRole("button", { name: "Sair da vista expandida" }));
  assert.equal(region.scrollLeft, 250);
  fireEvent.keyDown(window, { key: "Escape" });
  assert.ok(screen.getByRole("button", { name: "Expandir planilha" }));
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Carla");
  assert.equal((screen.getByLabelText("Valor recebido") as HTMLInputElement).value, "987");
  assert.equal(storage.getItem("lss-demo-sidebar-collapsed"), "false");
});

test("Drawer fecha por Escape, por destino e por toque fora, devolvendo o foco", async () => {
  storage.values.set("lss-demo-sidebar-collapsed", "true");
  open();
  await screen.findByRole("heading", { level: 1, name: "Início" });
  const trigger = screen.getByRole("button", { name: "Abrir menu" });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  let drawer = await screen.findByRole("dialog", { name: "Navegação" });
  assert.equal(drawer.getAttribute("aria-modal"), "true");
  fireEvent.keyDown(drawer, { key: "Escape" });
  await waitFor(() => assert.equal(Boolean(screen.queryByRole("dialog", { name: "Navegação" })), false));
  assert.ok(document.activeElement === trigger, "o foco deve regressar ao botão de abertura");
  fireEvent.click(trigger);
  drawer = await screen.findByRole("dialog", { name: "Navegação" });
  fireEvent.click(within(drawer).getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  await waitFor(() => assert.equal(Boolean(screen.queryByRole("dialog", { name: "Navegação" })), false));
  fireEvent.click(trigger);
  await screen.findByRole("dialog", { name: "Navegação" });
  const backdrop = document.querySelector(".MuiDrawer-root .MuiBackdrop-root");
  assert.ok(backdrop);
  fireEvent.click(backdrop);
  await waitFor(() => assert.equal(Boolean(screen.queryByRole("dialog", { name: "Navegação" })), false));
  assert.equal(storage.getItem("lss-demo-sidebar-collapsed"), "true");
  assert.equal(storage.financialWrites, 0);
});

test("ligação directa recupera os IDs da turma; parâmetro de papel não permite escrita pelo Director", async () => {
  const state = JSON.parse(storage.getItem(demoStorageKey)!);
  const selectedClass = state.classes[1];
  const group = state.groups.find((group: { classId: string }) => group.classId === selectedClass.id);
  window.history.replaceState(null, "", `/payments?class=${selectedClass.id}&group=${group.id}&month=jun&section=settings&role=secretaria`);
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ source: "demo", accountId: "demo-director" }));
  open();
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal((screen.getByLabelText("Filtrar por classe") as HTMLSelectElement).value, selectedClass.id);
  assert.equal((screen.getByLabelText("Filtrar por turma") as HTMLSelectElement).value, group.id);
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
  assert.equal(storage.financialWrites, 0);
});

test("posição horizontal da planilha é restaurada depois de visitar outra área", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  await act(async () => { await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())); });
  const region = screen.getByRole("region", { name: "Tabela com deslocamento horizontal" });
  region.scrollLeft = 420;
  fireEvent.scroll(region);
  fireEvent.click(mainNavigation().getByRole("button", { name: "Relatórios" }));
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  await waitFor(() => assert.equal(screen.getByRole("region", { name: "Tabela com deslocamento horizontal" }).scrollLeft, 420));
  assert.equal(storage.financialWrites, 0);
});
