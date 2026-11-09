import { test, expect, type Page } from "@playwright/test";
import { phase6Fixture } from "../helpers/phase6-fixture";
import { demoStorageKey } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";

const nativeDialogs = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const dialogs: string[] = [];
  nativeDialogs.set(page, dialogs);
  page.on("dialog", async (dialog) => { dialogs.push(dialog.type()); await dialog.dismiss(); });
  const fixture = phase6Fixture();
  await page.clock.setFixedTime(new Date(fixture.time));
  await page.addInitScript(({ state, stateKey, sessionKey }) => {
    if (!localStorage.getItem(stateKey)) localStorage.setItem(stateKey, JSON.stringify(state));
    sessionStorage.setItem(sessionKey, JSON.stringify({ source: "demo", accountId: "demo-secretaria" }));
  }, { state: fixture.state, stateKey: demoStorageKey, sessionKey: demoSessionKey });
});
test.afterEach(async ({ page }) => { expect(nativeDialogs.get(page)).toEqual([]); });

async function openPayment(page: Page) {
  await page.goto("/payments");
  await page.getByRole("searchbox").fill("Ana");
  await page.getByLabel("Mês de mensalidade", { exact: true }).selectOption("may");
  await page.getByLabel("Período da planilha", { exact: true }).selectOption("month");
  await page.getByRole("button", { name: /^Maio.*Ana Júlia Mucavele/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Registar pagamento", exact: true }).click();
  return page.getByRole("dialog", { name: /Registar pagamento/ });
}

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`folha de pagamento e matrícula adaptam-se a ${width}px`, async ({ page }, info) => {
    const height = width < 768 ? 800 : 900;
    await page.setViewportSize({ width, height });
    const payment = await openPayment(page);
    await expect(payment).toBeVisible();
    const box = (await payment.boundingBox())!;
    if (width < 768) {
      expect(box.x).toBeCloseTo(0, 0);
      expect(box.width).toBeCloseTo(width, 0);
      expect(box.y + box.height).toBeCloseTo(height, 0);
      expect(box.height).toBeGreaterThan(height * .8);
    } else {
      expect(box.x).toBeGreaterThan(0);
      expect(box.width).toBeLessThan(width);
      expect(box.y).toBeGreaterThan(0);
    }
    await payment.getByLabel("Valor recebido", { exact: false }).fill("625");
    await page.screenshot({ path: info.outputPath(`folha-pagamento-${width}.png`), animations: "disabled" });
    await payment.getByRole("button", { name: "Fechar e conservar preenchimento" }).click();
    await expect(payment).toBeHidden();
    await page.goto("/students");
    await page.getByRole("button", { name: "Nova matrícula", exact: true }).click();
    const enrollment = page.getByRole("dialog", { name: "Nova matrícula", exact: true });
    await expect(enrollment).toBeVisible();
    const formBox = (await enrollment.boundingBox())!;
    if (width < 768) {
      expect(formBox.x).toBeCloseTo(0, 0);
      expect(formBox.y).toBeCloseTo(0, 0);
      expect(formBox.width).toBeCloseTo(width, 0);
      expect(formBox.height).toBeCloseTo(height, 0);
      await expect(enrollment.getByRole("status")).toContainText("Passo 1 de 3");
    } else expect(formBox.width).toBeLessThan(width);
    await page.screenshot({ path: info.outputPath(`matricula-superficie-${width}.png`), animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("redimensionar após falha conserva nó, erro e tentativa; confirmar cria só um recibo", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openPayment(page);
  const amount = dialog.getByLabel("Valor recebido", { exact: false });
  await amount.fill("600");
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) { Storage.prototype.setItem = original; throw new DOMException("Quota", "QuotaExceededError"); }
      original.call(this, name, value);
    };
  }, demoStorageKey);
  await dialog.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Não foi possível guardar");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId)).toBeTruthy();
  const attempt = await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId);
  const originalInput = await amount.elementHandle();
  await amount.focus();
  for (const viewport of [{ width: 768, height: 900 }, { width: 1440, height: 900 }, { width: 360, height: 420 }]) {
    await page.setViewportSize(viewport);
    await expect(amount).toHaveValue("600");
    await expect(amount).toBeFocused();
    expect(await amount.evaluate((el, original) => el === original, originalInput)).toBe(true);
    await expect(dialog.getByRole("alert")).toContainText("Não foi possível guardar");
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-demo-drafts-v1")!).paymentCommandId)).toBe(attempt);
  }
  await page.screenshot({ path: info.outputPath("pagamento-viewport-curto.png"), animations: "disabled" });
  const confirm = dialog.getByRole("button", { name: "Confirmar pagamento", exact: true });
  await expect(confirm).toBeInViewport();
  await confirm.click();
  await expect(page.locator(".lss-print-target")).toContainText("LSS-2026-000001");
  expect(await page.getByRole("dialog").count()).toBe(1);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), demoStorageKey);
  expect(saved.receipts).toHaveLength(1);
  expect(saved.receipts[0].amount).toBe(600);
  expect(saved.operations.filter((operation: { id: string }) => operation.id === attempt)).toHaveLength(1);
});

test("Voltar fecha a tarefa antes da área e a matrícula conserva o rascunho", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/students");
  const trigger = page.getByRole("button", { name: "Nova matrícula", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome completo do aluno", { exact: true }).fill("Rascunho após Voltar");
  const attempt = await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-academic-enrollment-form-v1")!).session.id);
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Alunos e turmas", exact: true })).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Nome completo do aluno", { exact: true })).toHaveValue("Rascunho após Voltar");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("lss-academic-enrollment-form-v1")!).session.id)).toBe(attempt);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).students.length, demoStorageKey)).toBe(12);
});

test("correcção limpa fecha directamente; toque fora com alterações permite continuar", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/students");
  await page.getByRole("button", { name: "Ana Júlia Mucavele", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Corrigir dados do aluno", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Corrigir dados do aluno", exact: true });
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  const phone = dialog.getByLabel("Contacto do encarregado", { exact: true });
  await phone.fill("840000002");
  await page.mouse.click(5, 4);
  await expect(dialog.getByRole("region", { name: "Alterações por guardar" })).toBeVisible();
  expect(await page.getByRole("dialog").count()).toBe(1);
  await dialog.getByRole("button", { name: "Continuar a editar", exact: true }).click();
  await expect(phone).toHaveValue("840000002");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: info.outputPath("confirmacao-na-tarefa-390.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
