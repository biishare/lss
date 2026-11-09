import { test, expect, type Page } from "@playwright/test";
import { phase6Fixture } from "../helpers/phase6-fixture";
import { demoStorageKey, type DemoState } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";
import { choiceForCell } from "../../app/features/finance/payment-context";

const dialogs = new WeakMap<Page, string[]>(), errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const native: string[] = [], failures: string[] = [];
  dialogs.set(page, native); errors.set(page, failures);
  page.on("dialog", async (dialog) => { native.push(dialog.type()); await dialog.dismiss(); });
  page.on("pageerror", (error) => failures.push(error.message));
});
test.afterEach(({ page }) => { expect(dialogs.get(page)).toEqual([]); expect(errors.get(page)).toEqual([]); });

async function seed(page: Page, role: "secretaria" | "director" = "secretaria", credit = false) {
  const f = phase6Fixture();
  if (credit) f.pay({ creditOnly: true, amount: "300" });
  await page.clock.setFixedTime(new Date(f.time));
  await page.addInitScript(({ state, stateKey, sessionKey, account }) => {
    if (!localStorage.getItem(stateKey)) localStorage.setItem(stateKey, JSON.stringify(state));
    sessionStorage.setItem(sessionKey, JSON.stringify({ source: "demo", accountId: `demo-${account}` }));
  }, { state: f.state, stateKey: demoStorageKey, sessionKey: demoSessionKey, account: role });
  return f;
}
const snapshot = (page: Page): Promise<DemoState> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), demoStorageKey);
async function openCell(page: Page) {
  await page.goto("/payments");
  await page.getByRole("searchbox").fill("Ana");
  await page.getByLabel("Mês de mensalidade", { exact: true }).selectOption("may");
  await page.getByLabel("Período da planilha", { exact: true }).selectOption("month");
  const cell = page.getByRole("button", { name: /^Maio.*Ana Júlia Mucavele/ });
  await cell.click();
  return cell;
}

for (const width of [360, 1440]) {
  test(`atalho geral exige escolha explícita e recebe para outro aluno a ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const f = await seed(page);
    const student = f.state.students.slice(1).find((item) => choiceForCell(f.state, { kind: "tuition", studentId: item.id, monthKey: "may" }, f.time)?.forecast === false)!;
    expect(student).toBeDefined(); expect(student.id).not.toBe("student-001");
    await page.goto("/payments");
    await page.getByRole("button", { name: "Registar pagamento", exact: true }).click();
    const chooser = page.getByRole("dialog", { name: "Escolher aluno", exact: true });
    await expect(chooser).toBeVisible();
    await expect(chooser.getByRole("button", { name: "Confirmar pagamento", exact: true })).toHaveCount(0);
    await expect(chooser.getByLabel("Valor recebido", { exact: false })).toHaveCount(0);
    await chooser.getByRole("searchbox").fill(student.fullName);
    await page.screenshot({ path: info.outputPath(`escolha-aluno-${width}.png`), animations: "disabled" });
    await chooser.getByRole("button", { name: `Escolher ${student.fullName} · ${student.academicYearId} · ${student.registrationNumber}`, exact: true }).click();
    const charge = page.getByRole("dialog", { name: "Escolher cobrança", exact: true });
    await charge.getByRole("button", { name: "Receber Mensalidade de Maio", exact: true }).click();
    const payment = page.getByRole("dialog", { name: "Registar pagamento", exact: true });
    await expect(payment.getByRole("region", { name: "Contexto do pagamento" })).toContainText(student.fullName);
    await expect(payment.getByLabel("Aluno", { exact: true })).toHaveCount(0);
    await expect(payment.getByLabel("Item", { exact: true })).toHaveCount(0);
    await payment.getByLabel("Valor recebido", { exact: false }).fill("600");
    await page.screenshot({ path: info.outputPath(`pagamento-contextual-${width}.png`), animations: "disabled" });
    await payment.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
    await expect(page.locator(".lss-receipt-print")).toContainText(student.fullName);
    const result = await snapshot(page);
    expect(result.receipts).toHaveLength(1); expect(result.receipts[0].studentId).toBe(student.id);
    expect(result.receipts[0].amount).toBe(600);
  });

  test(`comprovativo passa de análise a recibo único após conferência a ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await seed(page); await openCell(page);
    const payment = page.getByRole("dialog", { name: "Registar pagamento", exact: true });
    await payment.getByLabel("Valor recebido", { exact: false }).fill("600");
    await payment.getByLabel("Forma de pagamento", { exact: true }).selectOption("M-Pesa");
    await payment.getByLabel("Referência do comprovativo", { exact: true }).fill(`MPESA-UI3-${width}`);
    await expect(payment.getByRole("button", { name: "Confirmar após conferência", exact: true })).toHaveCount(0);
    await payment.getByRole("button", { name: "Guardar para conferência", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Comprovativo guardado", exact: true })).toContainText("Não foi emitido recibo");
    let result = await snapshot(page);
    expect(result.receipts).toHaveLength(0); expect(result.paymentProofs).toHaveLength(1);
    expect(result.paymentProofs![0].status).toBe("pending");
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await openCell(page);
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(`MPESA-UI3-${width}`);
    await page.getByRole("dialog").getByRole("button", { name: "Conferir comprovativo", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: `Conferir comprovativo MPESA-UI3-${width}`, exact: true }).click();
    const review = page.getByRole("dialog", { name: "Conferir comprovativo", exact: true });
    await expect(review).toContainText("600 MT");
    await review.getByLabel("Resultado da conferência / Motivo", { exact: false }).fill("Referência, valor e data verificados");
    await review.getByRole("button", { name: "Rever efeito", exact: true }).click();
    expect((await snapshot(page)).receipts).toHaveLength(0);
    await page.screenshot({ path: info.outputPath(`conferencia-comprovativo-${width}.png`), animations: "disabled" });
    await review.getByRole("button", { name: "Confirmar operação", exact: true }).click();
    await expect(page.locator(".lss-receipt-print")).toContainText("600 MT");
    expect(await page.getByRole("dialog").count()).toBe(1);
    result = await snapshot(page);
    expect(result.receipts).toHaveLength(1); expect(result.paymentProofs![0].status).toBe("confirmed");
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Conferir comprovativos", exact: true })).toBeFocused();
    expect((await snapshot(page)).receipts).toHaveLength(1);
  });
}

test("devolução conserva rascunho e ID ao fechar, retomar e mudar de largura", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await seed(page, "secretaria", true);
  await page.goto("/payments");
  await page.getByRole("button", { name: "Crédito e devoluções", exact: true }).click();
  await page.getByRole("button", { name: "Escolher aluno", exact: true }).click();
  await page.getByRole("region", { name: "Escolha do aluno" }).getByRole("searchbox").fill("Ana");
  await page.getByRole("button", { name: /^Escolher Ana Júlia Mucavele/ }).click();
  await page.getByRole("button", { name: "Registar devolução", exact: true }).click();
  let task = page.getByRole("dialog", { name: "Registar devolução", exact: true });
  await expect(task).toHaveAccessibleDescription("Ana Júlia Mucavele · LSS-2026-001 · 2026");
  await expect(task.getByRole("region", { name: "Origem do crédito" })).toContainText("Recibo LSS-2026-000001");
  await task.getByLabel("Valor (MT)", { exact: false }).fill("100");
  await task.getByLabel("Motivo", { exact: false }).fill("Pedido do encarregado");
  const id = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).tasks[0].id, `lss-service-tasks-v2-${f.state.datasetId}`);
  await task.getByRole("button", { name: "Rever efeito", exact: true }).click();
  await page.screenshot({ path: info.outputPath("devolucao-revisao-390.png"), animations: "disabled" });
  await task.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(task).toBeHidden();
  expect((await snapshot(page)).paymentRecords.flatMap((item) => item.creditDebits ?? [])).toHaveLength(0);
  await page.getByRole("button", { name: "Retomar devolução", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  task = page.getByRole("dialog", { name: "Registar devolução", exact: true });
  await expect(task.getByLabel("Valor (MT)", { exact: false })).toHaveValue("100");
  await expect(task.getByLabel("Motivo", { exact: false })).toHaveValue("Pedido do encarregado");
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).tasks[0].id, `lss-service-tasks-v2-${f.state.datasetId}`)).toBe(id);
  await task.getByRole("button", { name: "Rever efeito", exact: true }).click();
  await page.screenshot({ path: info.outputPath("devolucao-revisao-1440.png"), animations: "disabled" });
  await task.getByRole("button", { name: "Confirmar operação", exact: true }).click();
  await expect(task).toBeHidden();
  const result = await snapshot(page);
  expect(result.paymentRecords.flatMap((item) => item.creditDebits ?? [])).toHaveLength(1);
  expect(result.operations.filter((item) => item.id === id)).toHaveLength(1);
});

test("detalhe e recibo anterior ocupam a mesma tarefa e conservam o pagamento por concluir", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await seed(page);
  f.pay({ amount: "400" });
  await page.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state: f.state, key: demoStorageKey });
  const cell = await openCell(page);
  const payment = page.getByRole("dialog", { name: "Registar pagamento", exact: true });
  await payment.getByLabel("Valor recebido", { exact: false }).fill("300");
  const beforeConsultation = await snapshot(page);
  const id = await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId);
  await payment.getByRole("button", { name: "Consultar detalhe da cobrança", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Recibo", exact: true }).click();
  await expect(page.locator(".lss-receipt-print")).toContainText("400 MT");
  expect(await page.getByRole("dialog").count()).toBe(1);
  await page.getByRole("dialog").getByRole("button", { name: "Voltar à cobrança", exact: true }).click();
  expect(await snapshot(page)).toEqual(beforeConsultation);
  await page.getByRole("dialog").getByRole("button", { name: "Voltar ao pagamento", exact: true }).click();
  expect(await snapshot(page)).toEqual(beforeConsultation);
  await expect(payment.getByLabel("Valor recebido", { exact: false })).toHaveValue("300");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId)).toBe(id);
  await payment.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(cell).toBeFocused();
  expect((await snapshot(page)).receipts).toHaveLength(1);
});

test("Director abre consulta da célula e dos movimentos sem acções de recebimento", async ({ page }) => {
  await seed(page, "director", true);
  await openCell(page);
  const detail = page.getByRole("dialog", { name: "Detalhes da mensalidade", exact: true });
  await expect(detail).toBeVisible();
  await expect(detail.getByLabel("Valor recebido", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar pagamento", exact: true })).toHaveCount(0);
  await detail.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Consultar movimentos", exact: true }).click();
  for (const action of ["Corrigir recebimento", "Registar devolução", "Aplicar crédito"]) await expect(page.getByRole("button", { name: action, exact: true })).toHaveCount(0);
});

test("recibo de célula liquidada substitui o detalhe e devolve o foco à célula", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await seed(page);
  f.pay();
  await page.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state: f.state, key: demoStorageKey });
  const cell = await openCell(page);
  const detail = page.getByRole("dialog", { name: "Detalhes da mensalidade", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Recibo", exact: true }).click();
  await expect(page.locator(".lss-receipt-print")).toContainText("LSS-2026-000001");
  expect(await page.getByRole("dialog").count()).toBe(1);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(cell).toBeFocused();
  expect((await snapshot(page)).receipts).toHaveLength(1);
});
