import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { RulesWorkspace } from "../app/features/finance/rules-workspace";
import { createDemoState, type DemoState } from "../app/features/demo/demo-state";
import { executeBilling, prepareBilling, type BillingCommand } from "../app/features/finance/billing-commands";
import { createLocalDemoRepository } from "../app/features/demo/local-repository";
import { domWindow } from "./dom-environment";

const time = "2026-11-08T12:00:00Z";
function fixture(mode: "rules" | "aid", readOnly = false) {
  const values = new Map<string, string>(); let failed = false;
  const repository = createLocalDemoRepository({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { if (failed) throw new Error("Quota"); values.set(key, value); } }, { now: () => time });
  const seed = createDemoState("example", { now: time, datasetId: "rules-ui" });
  let saved = repository.initialize({ ...seed, ...prepareBilling(seed, time) });
  function Harness() {
    const [state, setState] = useState<DemoState>(saved);
    const execute = (command: BillingCommand, id: string) => { saved = executeBilling(repository, state, command, { id, role: readOnly ? "director" : "secretaria", recordedAt: time }).state; setState(saved); };
    return <RulesWorkspace state={state} yearId="2026" mode={mode} readOnly={readOnly} execute={execute} recordedAt={time} />;
  }
  render(<Harness/>);
  return { get saved() { return saved; }, fail(value: boolean) { failed = value; } };
}
function submit() { fireEvent.submit(screen.getByRole("dialog").querySelector("form")!); }
afterEach(cleanup); after(async () => { await domWindow.happyDOM.close(); });
test("nova vigência mostra prévia; segunda etapa começa desligada e histórico fica intacto", async () => {
  const f = fixture("rules"), before = JSON.stringify(f.saved.paymentRecords);
  fireEvent.click(screen.getByRole("button", { name: "Nova vigência" }));
  assert.equal((screen.getByRole("checkbox", { name: "Activar segunda etapa" }) as HTMLInputElement).checked, false);
  fireEvent.change(screen.getByLabelText(/Mensalidade \(MT\)/), { target: { value: "1200.10" } });
  fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Novo preço a partir desta data" } });
  submit(); assert.ok(screen.getByRole("button", { name: "Confirmar alteração" }));
  assert.equal(JSON.stringify(f.saved.paymentRecords), before);
  submit(); await waitFor(() => assert.ok(!screen.queryByRole("dialog"))); assert.equal(f.saved.paymentRuleVersions.at(-1)!.monthlyFee, 1200.10);
  assert.equal(JSON.stringify(f.saved.paymentRecords), before);
});
test("zero é legítimo e um campo vazio não vira preço zero", () => {
  const f = fixture("rules"), count = f.saved.paymentRuleVersions.length;
  fireEvent.click(screen.getByRole("button", { name: "Nova vigência" }));
  fireEvent.change(screen.getByLabelText(/Inscrição \(MT\)/), { target: { value: "" } }); submit();
  assert.match(screen.getByRole("alert").textContent ?? "", /valor positivo ou zero/); assert.equal(f.saved.paymentRuleVersions.length, count);
  fireEvent.change(screen.getByLabelText(/Inscrição \(MT\)/), { target: { value: "0" } }); fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Inscrição gratuita" } }); submit(); submit();
  assert.equal(f.saved.paymentRuleVersions.at(-1)!.inscriptionFee, 0);
});
test("falha conserva formulário e tentativa; repetir guarda uma única regra", () => {
  const f = fixture("rules"), count = f.saved.paymentRuleVersions.length;
  fireEvent.click(screen.getByRole("button", { name: "Nova vigência" })); fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Revisão anual" } }); submit();
  f.fail(true); submit(); assert.ok(screen.getAllByRole("alert").some((alert) => /Não foi possível guardar/.test(alert.textContent ?? "")));
  assert.equal((screen.getByLabelText(/^Motivo/) as HTMLInputElement).value, "Revisão anual"); assert.equal(f.saved.paymentRuleVersions.length, count);
  f.fail(false); submit(); assert.equal(f.saved.paymentRuleVersions.length, count + 1);
});
test("benefício permite âmbito explícito, prova de autorização e prévia antes de guardar", () => {
  const f = fixture("aid"), count = f.saved.paymentRecords[0].financialAid?.length ?? 0;
  fireEvent.click(screen.getByRole("button", { name: "Adicionar benefício" }));
  const dialog = screen.getByRole("dialog"); assert.equal((within(dialog).getByRole("checkbox", { name: "Abrange inscrição" }) as HTMLInputElement).checked, false);
  fireEvent.change(within(dialog).getByLabelText(/^Motivo/), { target: { value: "Apoio ao aluno" } }); fireEvent.change(within(dialog).getByLabelText(/Referência de autorização/), { target: { value: "AUT-2026-15" } });
  submit(); assert.equal(f.saved.paymentRecords[0].financialAid?.length ?? 0, count); submit();
  const added = f.saved.paymentRecords[0].financialAid!.at(-1)!;
  assert.equal(added.appliesToRegistration, false); assert.equal(added.authorizationReference, "AUT-2026-15"); assert.equal(added.registeredBy, "Secretaria");
});
test("Director consulta regras e calendário sem acções de escrita", () => {
  fixture("rules", true); assert.equal(screen.queryByRole("button", { name: "Nova vigência" }), null); assert.ok(screen.getByRole("table")); cleanup();
  fixture("aid", true); assert.equal(screen.queryByRole("button", { name: "Adicionar benefício" }), null); assert.equal(screen.queryByRole("button", { name: "Terminar benefício" }), null);
});
