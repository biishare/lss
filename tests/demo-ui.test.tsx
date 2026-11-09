import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { render, screen, fireEvent, waitFor, cleanup, within, act, configure } from "@testing-library/react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { WorkspaceEntry as SchoolAdminDemo } from "../app/components/workspace-entry";
import { createDemoState, demoStorageKey } from "../app/features/demo/demo-state";
import { domWindow } from "./dom-environment";
import { prepareBilling } from "../app/features/finance/billing-commands";
import type { WorkspaceView } from "../app/components/school-admin-demo.model";

// The workspace is now imported only after session recognition. The cold import
// includes TSX transformation in Node; these tests assert results, not load time.
configure({ asyncUtilTimeout: 5000 });

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
  const initial = createDemoState("example", { now: "2026-11-08T12:00:00.000Z", datasetId: "ui-scenario" });
  const seed = { ...initial, ...prepareBilling(initial, "2026-11-08T12:00:00.000Z") };
  storage.values.set(demoStorageKey, JSON.stringify({ ...seed, revision: 1 }));
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  window.sessionStorage.clear();
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ profile: "secretaria", accountName: "Marta — Secretaria" }));
});
afterEach(() => { cleanup(); });
after(async () => { await domWindow.happyDOM.close(); });

function open(view: WorkspaceView = "overview", developerToolsEnabled = false) {
  return render(<AppRouterContext.Provider value={router}><SchoolAdminDemo initialView={view} developerToolsEnabled={developerToolsEnabled} /></AppRouterContext.Provider>);
}

function choosePayment() {
  const chooser = screen.queryByRole("dialog", { name: "Escolher aluno" });
  if (chooser) {
    const resume = within(chooser).queryByRole("button", { name: /^Retomar pagamento de/ });
    fireEvent.click(resume ?? within(chooser).getByRole("button", { name: /^Escolher Ana Júlia Mucavele/ }));
  }
  const charges = screen.queryByRole("dialog", { name: "Escolher cobrança" });
  if (charges) fireEvent.click(within(charges).getByRole("button", { name: "Receber Mensalidade de Junho" }));
}

test("atalho geral exige aluno e cobrança explícitos antes de permitir receber", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  const chooser = screen.getByRole("dialog", { name: "Escolher aluno" });
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
  assert.equal(screen.queryByLabelText(/^Valor recebido/), null);
  assert.equal(storage.financialWrites, 0);
  fireEvent.change(within(chooser).getByRole("searchbox"), { target: { value: "Bruno" } });
  fireEvent.click(within(chooser).getByRole("button", { name: /^Escolher Bruno Ernesto Macamo/ }));
  assert.ok(screen.getByRole("dialog", { name: "Escolher cobrança" }));
  fireEvent.click(screen.getByRole("button", { name: "Receber Mensalidade de Novembro" }));
  assert.match(screen.getByRole("region", { name: "Contexto do pagamento" }).textContent ?? "", /Bruno Ernesto Macamo/);
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "400" } });
  fireEvent.submit(document.getElementById("payment-service-form")!);
  await waitFor(() => assert.equal(JSON.parse(storage.getItem(demoStorageKey)!).receipts.length, 1));
  assert.equal(JSON.parse(storage.getItem(demoStorageKey)!).receipts[0].studentId, "student-002");
});

test("consulta opcional e retoma conservam preenchimento e ID antes de confirmar", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.click(screen.getByRole("button", { name: /Novembro.*Ana Júlia Mucavele/ }));
  const dialog = screen.getByRole("dialog", { name: "Registar pagamento" });
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "625" } });
  await waitFor(() => assert.ok(JSON.parse(window.sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId));
  const id = JSON.parse(window.sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId;
  fireEvent.click(within(dialog).getByRole("button", { name: "Consultar detalhe da cobrança" }));
  assert.equal(screen.getByRole("dialog"), dialog);
  assert.ok(screen.getByRole("heading", { name: "Detalhes da mensalidade" }));
  assert.equal(screen.getAllByRole("dialog").length, 1);
  const back = screen.getByRole("button", { name: "Voltar ao pagamento" });
  fireEvent.click(back);
  assert.notEqual(screen.getByRole("button", { name: "Confirmar pagamento" }), back);
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "625");
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  fireEvent.change(screen.getByLabelText("Mês de mensalidade"), { target: { value: "may" } });
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  assert.ok(screen.getByRole("dialog", { name: "Escolher aluno" }));
  fireEvent.click(screen.getByRole("button", { name: "Retomar pagamento de Ana Júlia Mucavele" }));
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "625");
  await waitFor(() => assert.equal(JSON.parse(window.sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId, id));
  assert.equal(storage.financialWrites, 0);
});

test("dados corrompidos não são substituídos ao abrir a aplicação", async () => {
  storage.values.set(demoStorageKey, "{incompleto");
  open("overview", true);
  await screen.findByRole("heading", { name: "Não foi possível abrir os dados" });
  assert.equal(storage.getItem(demoStorageKey), "{incompleto");
  assert.equal(storage.financialWrites, 0);
  assert.ok(screen.getByRole("button", { name: "Descarregar original" }));
});

test("falha de pagamento mantém formulário e dados; nova tentativa emite um recibo", async () => {
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  const amount = screen.getByLabelText(/^Valor recebido/) as HTMLInputElement;
  fireEvent.change(amount, { target: { value: "1000" } });
  const raw = storage.getItem(demoStorageKey);
  storage.failed = true;
  fireEvent.submit(document.getElementById("payment-service-form")!);
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /Não foi possível guardar/));
  assert.equal(amount.value, "1000");
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.ok(screen.getByRole("dialog"));
  storage.failed = false;
  fireEvent.submit(document.getElementById("payment-service-form")!);
  const dialog = await screen.findByRole("dialog");
  assert.match(dialog.textContent ?? "", /Recibo LSS-/);
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
  open("catalog", true);
  const reset = await screen.findByRole("button", { name: "Repor dados iniciais" });
  fireEvent.click(reset);
  const confirmation = await screen.findByRole("dialog", { name: "Repor dados iniciais?" });
  assert.match(confirmation.textContent ?? "", /substituir o cenário local/);
  fireEvent.click(within(confirmation).getByRole("button", { name: "Cancelar" }));
  await screen.findByText(/Reposição cancelada/);
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.financialWrites, 0);
});

test("modo de desenvolvimento conserva a escolha inicial e não cria exemplos ao recarregar", async () => {
  storage.values.delete(demoStorageKey);
  const page = open("overview", true);
  await screen.findByRole("button", { name: "Abrir escola de exemplo" });
  assert.equal(storage.financialWrites, 0);
  assert.equal(storage.getItem(demoStorageKey), null);
  page.unmount();
  open("overview", true);
  await screen.findByRole("button", { name: "Configurar do início" });
  assert.equal(storage.financialWrites, 0);
});

test("rascunho de pagamento é retomado ao reabrir sem alterar o cenário", async () => {
  const page = open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "1234" } });
  // Navegar imediatamente também conserva o último valor, antes do temporizador.
  page.unmount();
  assert.match(window.sessionStorage.getItem("lss-demo-drafts-v1") ?? "", /1234/);
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "1234");
  assert.equal(storage.financialWrites, 0);
});

test("erro de importação não substitui o estado nem pede confirmação", async () => {
  const raw = storage.getItem(demoStorageKey);
  let confirmations = 0;
  window.confirm = () => { confirmations++; return true; };
  open("catalog", true);
  const input = await screen.findByLabelText("Importar JSON");
  fireEvent.change(input, { target: { files: [new File(["{invalid"], "invalid.json", { type: "application/json" })] } });
  await waitFor(() => assert.ok(screen.getAllByRole("alert").some((alert) => /JSON válido/.test(alert.textContent ?? ""))));
  assert.equal(confirmations, 0);
  assert.equal(storage.getItem(demoStorageKey), raw);
});

test("outra aba invalida a prévia e não emite recibo", async () => {
  open("payments");
  await screen.findByRole("button", { name: "Planilha financeira" });
  fireEvent.click(screen.getByRole("button", { name: "Planilha financeira" }));
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  const current = JSON.parse(storage.getItem(demoStorageKey)!);
  current.revision++;
  storage.values.set(demoStorageKey, JSON.stringify(current));
  const raw = storage.getItem(demoStorageKey);
  fireEvent.submit(document.getElementById("payment-service-form")!);
  await waitFor(() => assert.match(screen.getByRole("alert").textContent ?? "", /noutra aba/));
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.ok(screen.getByRole("dialog"));
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
  fireEvent.click(await screen.findByRole("button", { name: /^Nova matrícula$/ }));
  const name = await screen.findByLabelText("Nome completo do aluno");
  fireEvent.change(name, { target: { value: "Aluno Novo Exemplo" } });
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.change(screen.getByLabelText("Turma da matrícula"), { target: { value: "7A2026" } });
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  storage.failed = true;
  fireEvent.click(screen.getByRole("button", { name: /^Guardar matrícula$/ }));
  await waitFor(() => assert.ok(screen.getAllByRole("alert").some((alert) => /Não foi possível guardar/.test(alert.textContent ?? ""))));
  assert.match(screen.getByRole("dialog").textContent ?? "", /Aluno Novo Exemplo/);
  assert.equal(storage.getItem(demoStorageKey), raw);
  storage.failed = false;
  fireEvent.click(screen.getByRole("button", { name: /^Guardar matrícula$/ }));
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

test("login abre o papel atribuído à conta e sair conserva a escola sem guardar credenciais", async () => {
  const raw = storage.getItem(demoStorageKey);
  window.sessionStorage.removeItem("lss-demo-session-v1");
  open();
  await screen.findByRole("heading", { name: "Entrar no LSS" });
  fireEvent.change(screen.getByLabelText("Utilizador", { exact: false }), { target: { value: "antonio" } });
  fireEvent.change(screen.getByLabelText("Palavra-passe", { exact: false }), { target: { value: "Lss!Antonio2026" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
  await screen.findByRole("heading", { level: 1, name: "Início" });
  assert.ok(screen.getByText("António", { exact: true }));
  assert.ok(!JSON.stringify([...storage.values]).includes("Lss!Antonio2026"));
  assert.ok(!window.sessionStorage.getItem("lss-demo-session-v1")?.includes("Lss!Antonio2026"));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  await screen.findByRole("heading", { name: "Entrar no LSS" });
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.financialWrites, 0);
  assert.equal(window.sessionStorage.getItem("lss-demo-session-v1"), null);
});

test("credenciais incorrectas conservam o login e não abrem sessão ou alteram os dados", async () => {
  const raw = storage.getItem(demoStorageKey);
  window.sessionStorage.removeItem("lss-demo-session-v1");
  open();
  await screen.findByRole("heading", { name: "Entrar no LSS" });
  assert.equal(screen.queryByRole("combobox"), null);
  assert.doesNotMatch(document.body.textContent ?? "", /demonstração|Conta de exemplo|fictícias/);
  fireEvent.change(screen.getByLabelText("Utilizador", { exact: false }), { target: { value: "marta" } });
  fireEvent.change(screen.getByLabelText("Palavra-passe", { exact: false }), { target: { value: "incorrecta" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
  await screen.findByText("Utilizador ou palavra-passe incorrectos.");
  assert.equal(window.sessionStorage.getItem("lss-demo-session-v1"), null);
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal((screen.getByLabelText("Utilizador", { exact: false }) as HTMLInputElement).value, "marta");
  fireEvent.change(screen.getByLabelText("Palavra-passe", { exact: false }), { target: { value: "Lss!Marta2026" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
  await screen.findByRole("heading", { level: 1, name: "Início" });
  assert.ok(screen.getByText("Marta", { exact: true }));
});

test("primeiro arranque abre a escola preparada uma vez, inclusive para Director", async () => {
  storage.values.delete(demoStorageKey);
  window.sessionStorage.setItem("lss-demo-session-v1", JSON.stringify({ source: "demo", accountId: "demo-director" }));
  const page = open();
  await screen.findByRole("heading", { level: 1, name: "Início" });
  assert.equal(storage.financialWrites, 1);
  const saved = storage.getItem(demoStorageKey);
  assert.ok(saved);
  assert.equal(screen.queryByRole("button", { name: "Abrir escola de exemplo" }), null);
  page.unmount();
  open();
  await screen.findByRole("heading", { level: 1, name: "Início" });
  assert.equal(storage.financialWrites, 1);
  assert.equal(storage.getItem(demoStorageKey), saved);
});

test("cliente não recebe controlos técnicos e dados ilegíveis continuam preservados", async () => {
  const page = open("catalog");
  await screen.findByRole("heading", { level: 1, name: "Configurações" });
  assert.equal(screen.queryByRole("button", { name: "Repor dados iniciais" }), null);
  assert.equal(screen.queryByLabelText("Importar JSON"), null);
  assert.equal(screen.queryByRole("button", { name: "Exportar JSON" }), null);
  assert.doesNotMatch(document.body.textContent ?? "", /\bDemo\b|navegador|Ferramentas de desenvolvimento/);
  page.unmount();
  storage.values.set(demoStorageKey, "{incompleto");
  open();
  await screen.findByRole("heading", { name: "Não foi possível abrir os dados" });
  assert.equal(storage.getItem(demoStorageKey), "{incompleto");
  assert.equal(storage.financialWrites, 0);
  assert.equal(screen.queryByRole("button", { name: "Descarregar original" }), null);
  assert.match(document.body.textContent ?? "", /contacte o responsável/);
});

test("falha ao preparar a primeira utilização não apresenta sucesso nem entra num cenário vazio", async () => {
  storage.values.delete(demoStorageKey);
  storage.failed = true;
  open();
  await screen.findByRole("heading", { name: "Não foi possível abrir os dados" });
  assert.equal(storage.getItem(demoStorageKey), null);
  assert.equal(screen.queryByRole("searchbox"), null);
  assert.doesNotMatch(document.body.textContent ?? "", /0 alunos|Nenhum aluno/);
});

test("layout partilhado conserva pesquisa, selecção e rascunho entre áreas", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }));
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "1234" } });
  if (screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Relatórios" }));
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  assert.equal(window.location.pathname, "/reports");
  assert.ok(!window.location.href.includes("Ana"));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Ana");
  assert.equal((screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }) as HTMLInputElement).checked, true);
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "1234");
  assert.equal(storage.financialWrites, 0);
});

test("recarregar recupera classe, turma, pesquisa, selecção e rascunho da mesma sessão", async () => {
  const page = open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Bruno" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Bruno Ernesto Macamo" }));
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "567" } });
  fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  const href = window.location.href;
  page.unmount();
  open();
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(window.location.href, href);
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Bruno");
  assert.equal((screen.getByRole("checkbox", { name: "Seleccionar Bruno Ernesto Macamo" }) as HTMLInputElement).checked, true);
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "567");
  assert.equal(storage.financialWrites, 0);
});

test("Voltar e Avançar recuperam as áreas sem repor os dados ou perder o filtro", async () => {
  open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
  if (screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
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
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "987" } });
  fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  const region = screen.getByRole("region", { name: "Tabela com deslocamento horizontal" });
  region.scrollLeft = 250;
  fireEvent.click(screen.getByRole("button", { name: "Expandir planilha" }));
  assert.ok(screen.getByRole("button", { name: "Sair da vista expandida" }));
  assert.equal(region.scrollLeft, 250);
  fireEvent.keyDown(window, { key: "Escape" });
  assert.ok(screen.getByRole("button", { name: "Expandir planilha" }));
  assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Carla");
  fireEvent.click(screen.getByRole("button", { name: /^Registar pagamento$/ }));
  choosePayment();
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "987");
  assert.equal(storage.getItem("lss-demo-sidebar-collapsed"), "false");
});

test("Drawer fecha por Escape, por destino e por toque fora, devolvendo o foco", async () => {
  storage.values.set("lss-demo-sidebar-collapsed", "true");
  open();
  await screen.findByRole("heading", { level: 1, name: "Início" });
  await screen.findByRole("heading", { name: "Atendimento" });
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
  if (screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  fireEvent.click(mainNavigation().getByRole("button", { name: "Relatórios" }));
  await screen.findByRole("heading", { level: 1, name: "Relatórios" });
  fireEvent.click(mainNavigation().getByRole("button", { name: "Pagamentos" }));
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  await waitFor(() => assert.equal(screen.getByRole("region", { name: "Tabela com deslocamento horizontal" }).scrollLeft, 420));
  assert.equal(storage.financialWrites, 0);
});

test("planilha abre sem formulário permanente e recupera Mês/Trimestre/Ano pelo URL", async () => {
  const page = open("payments");
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(screen.queryByLabelText(/^Valor recebido/), null);
  const region = screen.getByRole("region", { name: "Tabela com deslocamento horizontal" });
  const annualColumns = within(region).getAllByRole("columnheader").length;
  fireEvent.change(screen.getByLabelText("Período da planilha"), { target: { value: "month" } });
  assert.equal(within(region).getAllByRole("columnheader").length, annualColumns - 8);
  assert.match(window.location.search, /period=month/);
  fireEvent.change(screen.getByLabelText("Período da planilha"), { target: { value: "term" } });
  assert.equal(within(region).getAllByRole("columnheader").length, annualColumns - 6);
  page.unmount(); open(); await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal((screen.getByLabelText("Período da planilha") as HTMLSelectElement).value, "term");
  assert.equal(storage.financialWrites, 0);
});
test("célula, pagamento e recibo conservam filtro, selecção, scroll e foco na mesma célula", async () => {
  open("payments"); await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }));
  const region = screen.getByRole("region", { name: "Tabela com deslocamento horizontal" }); region.scrollLeft = 450;
  const trigger = screen.getByRole("button", { name: /Novembro.*Ana Júlia Mucavele/ });
  act(() => trigger.focus()); fireEvent.click(trigger);
  assert.ok(screen.getByRole("dialog", { name: "Registar pagamento" }));
  const paymentDialog = screen.getByRole("dialog"); assert.match(paymentDialog.textContent ?? "", /Ana Júlia Mucavele/);
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "400" } });
  fireEvent.submit(document.getElementById("payment-service-form")!);
  await waitFor(() => assert.match(screen.getByRole("dialog").textContent ?? "", /Recibo LSS-/));
  fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  await waitFor(() => assert.equal(document.activeElement, trigger));
  assert.equal(region.scrollLeft, 450); assert.equal((screen.getByRole("searchbox") as HTMLInputElement).value, "Ana");
  assert.equal((screen.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele" }) as HTMLInputElement).checked, true);
  assert.equal(storage.financialWrites, 1);
});

test("atalho do painel inicia a matrícula no formulário académico sem alterar os dados", async () => {
  open("overview");
  await screen.findByRole("heading", { name: "Atendimento" });
  const writes = storage.financialWrites;
  fireEvent.click(screen.getByRole("button", { name: "Nova matrícula" }));
  await screen.findByRole("dialog", { name: "Nova matrícula" });
  assert.equal(storage.financialWrites, writes);
  assert.equal(window.location.pathname, "/students");
});
