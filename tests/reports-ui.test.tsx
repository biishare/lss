import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReportsWorkspace } from "../app/features/reports/workspace";
import { defaultReportFilters } from "../app/features/reports/model";
import { DashboardWorkspace } from "../app/features/reports/dashboard";
import { defaultWorkspaceContext, type WorkspaceContext } from "../app/features/demo/workspace-context";
import { executeCash } from "../app/features/cash/commands";
import { phase6Fixture } from "./helpers/phase6-fixture";
import { configureBackups, storeBackup } from "../app/features/continuity/backups";
import { domWindow } from "./dom-environment";

afterEach(cleanup); after(async () => { await domWindow.happyDOM.close(); });
function fixture(section: "reports" | "cash" | "continuity" = "reports", role: "secretaria" | "director" = "secretaria") {
  const f = phase6Fixture(); f.pay({ amount: "1200" });
  configureBackups(f.storage, true, 3); storeBackup(f.storage, f.state, "Cópia de teste", f.time);
  Object.defineProperty(window, "localStorage", { value: f.storage, configurable: true });
  let context: WorkspaceContext = { ...defaultWorkspaceContext("reports"), yearId: "2026", reportSection: section, reportFilters: defaultReportFilters("2026", f.time) };
  let failed = false;
  function Harness() {
    const [state, setState] = useState(f.state), [current, setCurrent] = useState<WorkspaceContext>(context);
    return <ReportsWorkspace state={state} role={role} context={current} onContext={(patch) => { context = { ...context, ...patch }; setCurrent(context); }} repository={f.repository} onRestore={(restored) => { f.setState(restored); setState(restored); }} executeService={() => { throw new Error("Não usado neste percurso"); }} executeCash={(command, id) => { if (failed) throw new Error("Não foi possível guardar. Preenchimento conservado."); const result = executeCash(f.repository, state, command, { id, role, recordedAt: f.time }); f.setState(result.state); setState(result.state); return String(result.result.message); }}/ >;
  }
  render(<Harness/>);
  return { f, get context() { return context; }, fail(value: boolean) { failed = value; } };
}
const submitCash = () => fireEvent.submit(document.getElementById("cash-command-form")!);

test("relatório filtra e abre ficha conservando definições; recibo permanece consultável", () => {
  const h = fixture(); assert.ok(screen.getByRole("heading", { name: "Recebimentos" }));
  fireEvent.change(screen.getByLabelText("Pesquisar no relatório"), { target: { value: "Ana Júlia" } });
  fireEvent.change(screen.getByLabelText("Forma no relatório"), { target: { value: "Numerário" } });
  fireEvent.click(screen.getByRole("button", { name: "Recibo" })); assert.match(screen.getByRole("dialog").textContent ?? "", /LSS-2026-000001/);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
  fireEvent.click(screen.getByRole("button", { name: "Ana Júlia Mucavele" })); assert.equal(h.context.view, "enrollments"); assert.equal(h.context.studentTab, "Financeiro"); assert.equal(h.context.reportFilters!.search, "Ana Júlia"); assert.equal(h.context.reportFilters!.method, "Numerário");
});
test("datas inválidas impedem exportação e prévia contém período, definição e total", () => {
  fixture(); fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-06-01" } });
  assert.match(screen.getByRole("alert").textContent ?? "", /intervalo/); assert.equal(screen.queryByRole("button", { name: "Exportar CSV" }), null);
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-05-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Prévia de impressão / PDF" })); const dialog = screen.getByRole("dialog");
  assert.match(dialog.textContent ?? "", /Período: 2026-05-01 a 2026-05-05/); assert.match(dialog.textContent ?? "", /todos os anos lectivos/i); assert.match(dialog.textContent ?? "", /Dinheiro confirmado pela data efectiva/);
});
test("mensagem abre destinatário e valor para copiar sem efectuar envio ou gravação", () => {
  const h = fixture(), writes = h.f.writes;
  fireEvent.change(screen.getByLabelText("Relatório"), { target: { value: "overdue" } });
  fireEvent.change(screen.getByLabelText("Pesquisar no relatório"), { target: { value: "Ana Júlia" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Prévia de mensagem" })[0]); const dialog = screen.getByRole("dialog");
  assert.match(dialog.textContent ?? "", /Destinatário:/); assert.ok(within(dialog).getByRole("button", { name: "Copiar mensagem" })); assert.match(dialog.textContent ?? "", /não a envia/); assert.equal(h.f.writes, writes);
});
test("fecho mostra efeito, conserva contagem em falha e grava apenas na confirmação", () => {
  const h = fixture("cash"), writes = h.f.writes;
  fireEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
  fireEvent.change(screen.getByLabelText(/^Numerário contado/), { target: { value: "1100" } }); submitCash(); assert.match(screen.getByRole("alert").textContent ?? "", /Justifique/);
  fireEvent.change(screen.getByLabelText("Justificação da diferença / Observação"), { target: { value: "Diferença conferida" } }); submitCash();
  assert.ok(screen.getByRole("button", { name: "Confirmar operação" })); assert.equal(h.f.writes, writes);
  h.fail(true); submitCash(); assert.ok(screen.getAllByRole("alert").some((item) => /Não foi possível guardar/.test(item.textContent ?? ""))); assert.equal((screen.getByLabelText(/^Numerário contado/) as HTMLInputElement).value, "1100");
  h.fail(false); submitCash(); assert.equal(h.f.writes, writes + 1); assert.equal(h.f.state.cashBook!.sessions[0].differenceCents, -10000); assert.equal(screen.queryByRole("dialog"), null);
});
test("cópia é ensaiada sem substituir; cancelar a prévia deixa os dados intactos", () => {
  const h = fixture("continuity"), before = JSON.stringify(h.f.state), writes = h.f.writes;
  fireEvent.click(screen.getByRole("button", { name: "Verificar restauro" })); const dialog = screen.getByRole("dialog"); assert.match(dialog.textContent ?? "", /armazenamento isolado/); assert.match(dialog.textContent ?? "", /Recibos/); assert.equal(h.f.writes, writes);
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" })); fireEvent.click(screen.getByRole("button", { name: "Repor esta cópia" }));
  assert.ok(screen.getByRole("button", { name: "Confirmar substituição" })); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" })); assert.equal(JSON.stringify(h.f.state), before); assert.equal(h.f.writes, writes);
});
test("Director consulta caixa e cópias sem comandos de alteração ou mensagem", () => {
  const h = fixture("cash", "director"), writes = h.f.writes;
  for (const name of ["Fechar caixa", "Registar saída", "Registar reforço", "Abrir caixa"]) assert.equal(screen.queryByRole("button", { name }), null);
  fireEvent.click(screen.getByRole("button", { name: "Cópias de segurança" })); assert.equal(screen.queryByRole("button", { name: "Restaurar ficheiro" }), null); assert.equal(screen.queryByRole("button", { name: "Guardar configuração" }), null);
  fireEvent.click(screen.getByRole("button", { name: /^Relatórios$/ })); fireEvent.change(screen.getByLabelText("Relatório"), { target: { value: "overdue" } }); assert.equal(screen.queryByRole("button", { name: "Prévia de mensagem" }), null); assert.equal(h.f.writes, writes);
});
test("painel do Director abre o mesmo relatório do total e mostra evolução mensal", () => {
  const f = phase6Fixture(); let patch: Partial<WorkspaceContext> = {};
  render(<DashboardWorkspace state={f.state} role="director" context={{ ...defaultWorkspaceContext(), yearId: "2026" }} onContext={(value) => { patch = value; }} onEnroll={() => { throw new Error("Director"); }} onPay={() => { throw new Error("Director"); }}/ >);
  assert.ok(screen.getByRole("heading", { name: "Evolução mensal · 2026" })); assert.equal(screen.queryByRole("button", { name: "Registar pagamento" }), null);
  fireEvent.click(screen.getByRole("button", { name: /Recebido no período/ })); assert.equal(patch.view, "reports"); assert.equal(patch.reportFilters!.kind, "receipts");
});
