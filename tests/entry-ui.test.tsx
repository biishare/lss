import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent, cleanup, configure, within, waitFor, act } from "@testing-library/react";
import { WorkspaceEntry as SchoolAdminDemo } from "../app/components/workspace-entry";
import { WorkspaceStartup } from "../app/components/workspace-startup";
import { WorkspaceFrame, WorkspaceShell } from "../app/components/workspace-shell";
import { createDemoState, demoStorageKey } from "../app/features/demo/demo-state";
import { demoSessionFor, demoSessionKey } from "../app/features/demo/demo-session";
import { entryDestination, sidebarPreferenceKey } from "../app/lib/workspace-navigation";
import { domWindow } from "./dom-environment";

configure({ asyncUtilTimeout: 5000 });

class EntryStorage {
  values = new Map<string, string>();
  reads = 0;
  writes = 0;
  blocked = false;
  getItem(key: string) {
    if (key === demoStorageKey) this.reads++;
    if (this.blocked) throw new Error("Storage blocked");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.blocked) throw new Error("Storage blocked");
    if (key === demoStorageKey) this.writes++;
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

let storage: EntryStorage;
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  storage = new EntryStorage();
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  window.sessionStorage.clear();
});
afterEach(cleanup);
after(async () => { await domWindow.happyDOM.close(); });

function login() {
  fireEvent.change(screen.getByLabelText("Utilizador", { exact: false }), { target: { value: "antonio" } });
  fireEvent.change(screen.getByLabelText("Palavra-passe", { exact: false }), { target: { value: "Lss!Antonio2026" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
}

test("o primeiro HTML contém o login, sem ler nem inicializar dados escolares", () => {
  const html = renderToString(<SchoolAdminDemo />);
  assert.match(html, /Entrar no LSS/);
  assert.match(html, /name="username"/);
  assert.match(html, /name="password"/);
  assert.doesNotMatch(html, /A carregar os dados|A preparar o conteúdo/);
  assert.equal(storage.reads, 0);
  assert.equal(storage.writes, 0);
});

for (const kind of ["empty", "corrupt", "blocked"] as const) {
  test(`login permanece disponível com armazenamento ${kind}, sem preparar os dados`, async () => {
    if (kind === "corrupt") storage.values.set(demoStorageKey, "{incompleto");
    storage.blocked = kind === "blocked";
    render(<SchoolAdminDemo />);
    assert.ok(screen.getByRole("heading", { name: "Entrar no LSS" }));
    fireEvent.change(screen.getByLabelText("Utilizador", { exact: false }), { target: { value: "antonio" } });
    fireEvent.change(screen.getByLabelText("Palavra-passe", { exact: false }), { target: { value: "incorrecta" } });
    fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
    await screen.findByText("Utilizador ou palavra-passe incorrectos.");
    assert.equal(storage.reads, 0);
    assert.equal(storage.writes, 0);
    assert.equal(window.sessionStorage.getItem(demoSessionKey), null);
    if (kind === "corrupt") assert.equal(storage.values.get(demoStorageKey), "{incompleto");
  });
}

test("ligação interna conserva o destino após login e só então lê a escola", async () => {
  const state = createDemoState("example", { now: "2026-11-09T10:00:00Z", datasetId: "entry-direct" });
  storage.values.set(demoStorageKey, JSON.stringify(state));
  window.history.replaceState(null, "", "/payments?year=2026&month=jun&period=month&search=contacto&role=secretaria");
  render(<SchoolAdminDemo />);
  assert.ok(screen.getByRole("heading", { name: "Entrar no LSS" }));
  assert.equal(storage.reads, 0);
  login();
  await screen.findByRole("heading", { name: "Planilha financeira da turma" });
  assert.equal(window.location.pathname, "/payments");
  assert.match(window.location.search, /month=jun/);
  assert.match(window.location.search, /period=month/);
  assert.doesNotMatch(window.location.search, /contacto|role|search/);
  assert.ok(storage.reads > 0);
  assert.equal(storage.writes, 0);
  assert.equal(screen.queryByRole("button", { name: "Confirmar pagamento" }), null);
});

test("erro de dados mantém navegação e permite tentar novamente sem repor o original", async () => {
  storage.values.set(demoStorageKey, "{incompleto");
  window.sessionStorage.setItem(demoSessionKey, JSON.stringify({ source: "demo", accountId: "demo-director" }));
  render(<SchoolAdminDemo />);
  await screen.findByRole("heading", { name: "Não foi possível abrir os dados" });
  assert.ok(screen.getByRole("complementary", { name: "Navegação principal" }));
  assert.equal(storage.values.get(demoStorageKey), "{incompleto");
  assert.equal(storage.writes, 0);
  const valid = createDemoState("example", { now: "2026-11-09T10:00:00Z", datasetId: "entry-retry" });
  storage.values.set(demoStorageKey, JSON.stringify(valid));
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("heading", { name: "Acompanhamento da escola" });
  assert.equal(storage.writes, 0);
  assert.equal(storage.values.get(demoStorageKey), JSON.stringify(valid));
});

test("skeleton conserva a conta, navegação e saída sem apresentar totais fictícios", () => {
  let signedOut = false;
  const session = demoSessionFor("demo-director")!;
  render(<WorkspaceStartup session={session} onSignOut={() => { signedOut = true; }} />);
  assert.ok(screen.getByRole("region", { name: "A preparar o conteúdo" }).getAttribute("aria-busy"));
  assert.ok(screen.getByRole("status"));
  assert.doesNotMatch(document.body.textContent ?? "", /0 alunos|0,00|Sem pagamentos/);
  fireEvent.click(within(screen.getByRole("complementary", { name: "Navegação principal" })).getByRole("button", { name: "Pagamentos" }));
  assert.equal(window.location.pathname, "/payments");
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  assert.equal(signedOut, true);
  assert.equal(storage.reads, 0);
});

test("destino de entrada aceita apenas rotas internas e parâmetros de contexto conhecidos", () => {
  assert.equal(entryDestination("https://externo.test/", "?next=https://externo.test&contacto=123"), "/dashboard");
  assert.equal(entryDestination("//externo.test", ""), "/dashboard");
  assert.equal(entryDestination("/reports", "?report=receipts&from=2026-01-01&search=pessoa"), "/reports?report=receipts&from=2026-01-01");
  assert.equal(entryDestination("/", "", "groups"), "/students?view=groups");
});

test("menu e foco sobrevivem à substituição do skeleton pelo conteúdo", async () => {
  const session = demoSessionFor("demo-director")!;
  const onSignOut = () => {};
  const pending = <WorkspaceFrame session={session} initialView="overview" onSignOut={onSignOut}>
    <WorkspaceStartup session={session} onSignOut={onSignOut} />
  </WorkspaceFrame>;
  const loaded = <WorkspaceFrame session={session} initialView="overview" onSignOut={onSignOut}>
    <WorkspaceShell activeView="overview" accountName="António" roleLabel="Director" year="2026"
      collapsed={false} onCollapsedChange={() => {}} onNavigate={() => {}} onSignOut={onSignOut}
      expanded={false} onExpandedChange={() => {}}><h2>Conteúdo pronto</h2></WorkspaceShell>
  </WorkspaceFrame>;
  const page = render(pending);
  const trigger = screen.getByRole("button", { name: "Abrir menu" });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  await screen.findByRole("dialog", { name: "Navegação" });
  page.rerender(loaded);
  assert.ok(screen.getByRole("dialog", { name: "Navegação" }));
  fireEvent.keyDown(screen.getByRole("dialog", { name: "Navegação" }), { key: "Escape" });
  await waitFor(() => assert.equal(Boolean(screen.queryByRole("dialog", { name: "Navegação" })), false));
  assert.equal(screen.getByRole("button", { name: "Abrir menu" }), trigger);
  await waitFor(() => assert.equal(document.activeElement === trigger, true));
  assert.ok(screen.getByRole("heading", { name: "Conteúdo pronto" }));
});

test("recolher o menu durante o skeleton conserva a preferência para o workspace", async () => {
  const previous = window.matchMedia;
  Object.defineProperty(window, "matchMedia", { configurable: true, value: (query: string) => ({
    media: query, matches: query.includes("min-width"), onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; },
  }) });
  try {
    const session = demoSessionFor("demo-director")!;
    render(<WorkspaceFrame session={session} initialView="overview" onSignOut={() => {}}>
      <WorkspaceStartup session={session} onSignOut={() => {}} />
    </WorkspaceFrame>);
    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }));
    await screen.findByRole("button", { name: "Expandir menu" });
    assert.equal(storage.values.get(sidebarPreferenceKey), "true");
    assert.equal(storage.reads, 0);
    assert.equal(storage.writes, 0);
  } finally { cleanup(); Object.defineProperty(window, "matchMedia", { configurable: true, value: previous }); }
});
