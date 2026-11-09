import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { PaymentDialog } from "../app/features/finance/payment-dialog";
import { FinanceServicePanel } from "../app/features/finance/service-panel";
import { createDemoState, demoStorageKey, type DemoState } from "../app/features/demo/demo-state";
import { createLocalDemoRepository } from "../app/features/demo/local-repository";
import { confirmDemoPayment } from "../app/features/demo/payment-command";
import { executeService } from "../app/features/finance/service-commands";
import { prepareBilling } from "../app/features/finance/billing-commands";
import { buildPaymentRecord, type PaymentLaunchDraft } from "../app/components/school-admin-demo.model";
import { recordCredit } from "../app/features/finance/service-model";
import { domWindow } from "./dom-environment";

function fixture(mode: "payment" | "panel" = "payment", readOnly = false, initialCredit = false, initialProof = false) {
  window.sessionStorage.clear();
  const time = new Date().toISOString(), values = new Map<string, string>(); let failed = false, writes = 0;
  const repository = createLocalDemoRepository({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { if (failed) throw new Error("Quota"); values.set(key, value); writes++; } }, { now: () => time });
  const seed = createDemoState("example", { now: time, datasetId: "service-ui" });
  seed.paymentProofs = [];
  for (const student of seed.students.slice(0, 2)) {
    student.financialProfile = { status: "regular", discountPercent: 0 };
    seed.paymentRecords = seed.paymentRecords.map((record) => record.studentId === student.id ? { ...buildPaymentRecord(student.id), billingVersion: 3, financialAid: [] } : record);
  }
  let saved = repository.initialize({ ...seed, ...prepareBilling(seed, time) });
  const draft: PaymentLaunchDraft = { studentId: "student-001", category: "tuition", monthKey: "nov", targetChargeId: "", amount: "400", paidOn: time.slice(0, 10), method: "Numerário", description: "", allowFutureAllocation: true, selectedChargeIds: [] };
  if (initialCredit) saved = confirmDemoPayment(repository, { expected: saved, role: "secretaria", commandId: "credit-seed", recordedAt: time, draft: { ...draft, amount: "200", creditOnly: true } }).state;
  if (initialProof) saved = executeService(repository, saved, { kind: "save-proof", draft: { ...draft, method: "e-Mola" }, reference: "EMOLA-CONFERIR", note: "Evidência de exemplo para consulta" }, { id: "proof-seed", role: "secretaria", recordedAt: time }).state;
  const initialWrites = writes;
  const executedIds: string[] = [];
  function Harness() {
    const [state, setState] = useState(saved), [form, setForm] = useState(draft), [open, setOpen] = useState(true);
    const execute = (command: Parameters<typeof executeService>[2], id: string) => {
      executedIds.push(id);
      const result = executeService(repository, state, command, { id, role: readOnly ? "director" : "secretaria", recordedAt: time }); saved = result.state; setState(saved);
      return { receipt: result.result.receipt as DemoState["receipts"][number] | null, message: String(result.result.message) };
    };
    return mode === "payment" ? open && <PaymentDialog state={state} draft={form} onChange={setForm} onClose={() => setOpen(false)} execute={execute} confirm={(next, id) => { const result = confirmDemoPayment(repository, { expected: state, role: "secretaria", commandId: id, recordedAt: time, draft: next }); saved = result.state; setState(saved); return result.receipt; }}/> : <FinanceServicePanel state={state} studentId="student-001" yearId="2026" readOnly={readOnly} execute={execute} correctionTarget={null} onCloseCorrection={() => {}}/>;
  }
  render(<Harness/>);
  return { ids: executedIds, get state() { return saved; }, get writes() { return writes - initialWrites; }, get raw() { return values.get(demoStorageKey); }, fail(value: boolean) { failed = value; } };
}
const submitPayment = () => fireEvent.submit(document.getElementById("payment-service-form")!);
const submitService = () => fireEvent.submit(document.getElementById("finance-service-operation")!);
afterEach(cleanup); after(async () => { await domWindow.happyDOM.close(); });

test("modal confirma parcial, mostra o recibo no mesmo Dialog e fecha sem novo recebimento", () => {
  const f = fixture(), dialog = screen.getByRole("dialog");
  assert.match(dialog.textContent ?? "", /Ana Júlia Mucavele/); assert.ok(screen.getByRole("region", { name: "Prévia da distribuição" }));
  submitPayment(); assert.equal(screen.getByRole("dialog"), dialog); assert.match(dialog.textContent ?? "", /Recibo LSS-2026-000001/); assert.equal(f.writes, 1);
  assert.equal(f.state.receipts[0].amount, 400); assert.equal(f.state.paymentRecords.find((item) => item.studentId === "student-001")!.payments.length, 1);
  fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ })); assert.equal(f.writes, 1);
});
test("falha mantém campos e ID; nova tentativa grava recibo único e a impressão não grava", () => {
  const f = fixture(), raw = f.raw; f.fail(true); submitPayment();
  assert.match(screen.getByRole("alert").textContent ?? "", /Não foi possível guardar/); assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "400"); assert.equal(f.raw, raw);
  f.fail(false); submitPayment(); assert.equal(f.writes, 1); const confirmed = f.raw;
  window.print = () => { throw new Error("Print blocked"); }; fireEvent.click(screen.getByRole("button", { name: "Imprimir / Guardar PDF" }));
  assert.match(screen.getByRole("alert").textContent ?? "", /recibo está guardado/); assert.equal(f.raw, confirmed); assert.equal(f.writes, 1);
});
test("guardar comprovativo para conferência conserva a dívida e não mostra recibo", () => {
  const f = fixture(); fireEvent.change(screen.getByLabelText("Forma de pagamento"), { target: { value: "M-Pesa" } });
  fireEvent.change(screen.getByLabelText("Referência do comprovativo"), { target: { value: "MPESA-UI-42" } });
  assert.ok(screen.getByRole("button", { name: "Guardar para conferência" })); submitPayment();
  assert.match(screen.getByRole("alert").textContent ?? "", /saldo mantém-se/); assert.equal(f.state.receipts.length, 0); assert.equal(f.state.paymentProofs![0].status, "pending"); assert.equal(f.state.paymentRecords.find((item) => item.studentId === "student-001")!.payments.length, 0);
});
test("receber apenas crédito pede destino explícito e não emite o mês futuro", () => {
  const f = fixture(), before = f.state.paymentRecords.find((item) => item.studentId === "student-001")!.charges.length;
  fireEvent.click(screen.getByText("Outras opções do recebimento"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Receber apenas como crédito, sem liquidar cobranças" })); submitPayment();
  assert.equal(f.state.receipts[0].items.length, 0); assert.equal(f.state.receipts[0].unallocatedAmount, 400); assert.equal(f.state.paymentRecords.find((item) => item.studentId === "student-001")!.charges.length, before);
});

test("recebimento não numerário apresenta uma acção principal e exige conferência explícita", () => {
  const f = fixture();
  fireEvent.change(screen.getByLabelText("Forma de pagamento"), { target: { value: "M-Pesa" } });
  fireEvent.change(screen.getByLabelText("Referência do comprovativo"), { target: { value: "MPESA-CONFERIDO-UI3" } });
  assert.ok(screen.getByRole("button", { name: "Guardar para conferência" }));
  assert.equal(screen.queryByRole("button", { name: "Confirmar após conferência" }), null);
  fireEvent.click(screen.getByRole("checkbox", { name: "Conferi o comprovativo, o valor e a data" }));
  assert.ok(screen.getByRole("button", { name: "Confirmar após conferência" }));
  assert.equal(screen.queryByRole("button", { name: "Guardar para conferência" }), null);
  fireEvent.change(screen.getByLabelText(/^Valor recebido/), { target: { value: "450" } });
  assert.ok(screen.getByRole("button", { name: "Guardar para conferência" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Conferi o comprovativo, o valor e a data" }));
  submitPayment();
  assert.equal(f.state.receipts.length, 1);
  assert.equal(f.state.receipts[0].amount, 450);
  assert.equal(f.writes, 1);
});

test("devolução sobrevive a falha de armazenamento e retoma a mesma tentativa após falha financeira", async () => {
  const f = fixture("panel", false, true);
  const storage = window.sessionStorage;
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: {
    getItem: storage.getItem.bind(storage), removeItem: storage.removeItem.bind(storage),
    setItem() { throw new Error("Quota"); },
  } });
  try {
    fireEvent.click(screen.getByRole("button", { name: "Crédito e devoluções" }));
    fireEvent.click(screen.getByRole("button", { name: "Registar devolução" }));
    fireEvent.change(screen.getByLabelText(/^Valor \(MT\)/), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Pedido a retomar" } });
    submitService(); f.fail(true); submitService();
    assert.equal(f.ids.length, 1); assert.equal(f.writes, 0);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
    await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
    fireEvent.click(screen.getByRole("button", { name: "Retomar devolução" }));
    assert.equal((screen.getByLabelText(/^Valor \(MT\)/) as HTMLInputElement).value, "150");
    assert.equal((screen.getByLabelText(/^Motivo/) as HTMLInputElement).value, "Pedido a retomar");
    f.fail(false); submitService(); submitService();
    assert.deepEqual(f.ids, [f.ids[0], f.ids[0]]);
    assert.equal(f.writes, 1);
    assert.equal(recordCredit(f.state.paymentRecords.find((item) => item.studentId === "student-001")), 50);
  } finally { Object.defineProperty(window, "sessionStorage", { configurable: true, value: storage }); }
});

test("correcção conserva motivo, cobrança e ID ao fechar e reabrir", async () => {
  const f = fixture("panel", false, true);
  fireEvent.click(screen.getByRole("button", { name: "Consultar movimentos" }));
  fireEvent.click(screen.getByRole("button", { name: "Corrigir recebimento" }));
  fireEvent.change(screen.getByLabelText(/^Motivo da correcção/), { target: { value: "Distribuição por corrigir" } });
  fireEvent.click(screen.getByRole("button", { name: "Alterar cobrança" }));
  fireEvent.click(screen.getByRole("button", { name: "Receber Mensalidade de Junho" }));
  assert.equal((screen.getByLabelText(/^Valor recebido/) as HTMLInputElement).value, "200");
  const key = `lss-correction-${f.state.datasetId}-student-001-${f.state.receipts[0].paymentId}`;
  const original = JSON.parse(window.sessionStorage.getItem(key)!);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  fireEvent.click(screen.getByRole("button", { name: "Corrigir recebimento" }));
  assert.equal((screen.getByLabelText(/^Motivo da correcção/) as HTMLInputElement).value, "Distribuição por corrigir");
  assert.match(screen.getByRole("region", { name: "Contexto do pagamento" }).textContent ?? "", /Junho/);
  assert.equal(JSON.parse(window.sessionStorage.getItem(key)!).id, original.id);
  assert.equal(f.writes, 0);
});
test("devolução na UI mostra o efeito antes de gravar e recusa exceder o crédito", () => {
  const f = fixture("panel", false, true); fireEvent.click(screen.getByRole("button", { name: "Crédito e devoluções" })); fireEvent.click(screen.getByRole("button", { name: "Registar devolução" }));
  assert.match(screen.getByRole("dialog").getAttribute("aria-describedby") ?? "", /context$/);
  assert.match(screen.getByRole("region", { name: "Origem do crédito" }).textContent ?? "", /Recibo LSS-2026-000001/);
  fireEvent.change(screen.getByLabelText(/^Valor \(MT\)/), { target: { value: "250" } }); fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Pedido do encarregado" } }); submitService();
  assert.match(screen.getByRole("alert").textContent ?? "", /excede o crédito/); assert.equal(f.writes, 0);
  fireEvent.change(screen.getByLabelText(/^Valor \(MT\)/), { target: { value: "150" } }); submitService(); assert.ok(screen.getByRole("button", { name: "Confirmar operação" })); assert.equal(f.writes, 0);
  submitService(); assert.equal(f.writes, 1); assert.equal(recordCredit(f.state.paymentRecords.find((item) => item.studentId === "student-001")), 50);
});
test("Director consulta movimentos e recibos sem acções para corrigir, devolver ou aplicar", () => {
  fixture("panel", true, true); fireEvent.click(screen.getByRole("button", { name: "Crédito e devoluções" }));
  for (const name of ["Aplicar crédito", "Registar devolução", "Corrigir recebimento", "Retomar preenchimento anterior"]) assert.equal(screen.queryByRole("button", { name }), null);
  fireEvent.click(screen.getByRole("button", { name: "Consultar movimentos" }));
  assert.ok(screen.getByRole("button", { name: /Abrir LSS-2026-/ }));
});
test("conferência mostra metadados e só confirma depois da revisão explícita", async () => {
  const f = fixture("panel", false, false, true); fireEvent.click(screen.getByRole("button", { name: "Conferir comprovativos" }));
  fireEvent.click(screen.getByRole("button", { name: "Conferir comprovativo EMOLA-CONFERIR" }));
  const dialog = screen.getByRole("dialog"); assert.match(dialog.textContent ?? "", /Referência: EMOLA-CONFERIR/); assert.match(dialog.textContent ?? "", /400 MT/);
  fireEvent.change(within(dialog).getByLabelText(/^Resultado da conferência/), { target: { value: "Referência, valor e data conferidos" } });
  submitService(); assert.equal(f.writes, 0); assert.ok(screen.getByRole("button", { name: "Confirmar operação" }));
  submitService(); await waitFor(() => assert.equal(f.state.receipts.length, 1)); assert.equal(f.state.paymentProofs![0].status, "confirmed"); assert.equal(f.writes, 1);
  assert.match(screen.getByRole("dialog").textContent ?? "", /Recibo LSS-2026-/);
});
