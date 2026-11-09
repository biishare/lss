import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { phase6Fixture } from "../helpers/phase6-fixture";
import { demoStorageKey, type DemoState } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";

const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = []; failures.set(page, errors);
  page.on("dialog", async (dialog) => { errors.push(`Diálogo nativo: ${dialog.type()}`); await dialog.dismiss(); });
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));
async function seed(page: Page, paid = false) {
  const f = phase6Fixture();
  if (paid) { f.pay({ amount: "600" }); f.pay({ amount: "200", creditOnly: true, method: "M-Pesa", evidenceReference: "MPESA-UI4-CONFERIDO" }); }
  await page.clock.setFixedTime(new Date(f.time));
  await page.addInitScript(({ state, key, session }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    sessionStorage.setItem(session, JSON.stringify({ source: "demo", accountId: "demo-secretaria" }));
  }, { state: f.state, key: demoStorageKey, session: demoSessionKey });
  return f;
}
const snapshot = (page: Page): Promise<DemoState> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), demoStorageKey);
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
}

for (const width of [320, 390]) test(`pagamentos abre na lista do mês e conserva selecção entre lista e planilha a ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 }); await seed(page); await page.goto("/payments");
  const list = page.getByRole("region", { name: "Lista compacta de pagamentos", exact: true });
  await expect(list).toBeVisible();
  await expect(page.getByLabel("Mês de mensalidade", { exact: true })).toHaveValue("may");
  await expect(page.getByLabel("Período da planilha", { exact: true })).toHaveValue("month");
  await page.getByRole("searchbox").fill("LSS-2026-001");
  await expect(list.getByRole("article")).toHaveCount(1);
  await list.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele", exact: true }).check();
  await page.screenshot({ path: info.outputPath(`pagamentos-lista-${width}.png`), fullPage: true });
  const cell = list.getByRole("button", { name: /^Maio, Ana Júlia Mucavele/ });
  await cell.click();
  await page.getByRole("dialog").getByLabel("Valor recebido", { exact: false }).fill("625");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator('[data-finance-cell="tuition:student-001:may"]')).toBeFocused();
  await page.setViewportSize({ width, height: 844 });
  await page.getByRole("button", { name: "Ver planilha completa", exact: true }).click();
  await expect(list).toHaveCount(0);
  await expect(page.getByLabel("Período da planilha", { exact: true })).toHaveValue("year");
  await expect(page.getByRole("checkbox", { name: "Seleccionar Ana Júlia Mucavele", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Ver lista compacta", exact: true }).click();
  await expect(list.getByRole("checkbox")).toBeChecked();
  await cell.click();
  await expect(page.getByRole("dialog").getByLabel("Valor recebido", { exact: false })).toHaveValue("625");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(cell).toBeFocused();
  expect((await snapshot(page)).receipts).toHaveLength(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(list).toBeVisible();
  await expect(list.getByRole("checkbox")).toBeChecked();
  await page.setViewportSize({ width, height: 844 });
  await noOverflow(page);
});

for (const width of [360, 1440]) test(`filtros do relatório só aplicam a cópia e CSV/PDF coincidem a ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); await seed(page, true); await page.goto("/reports");
  const before = await snapshot(page);
  await expect(page.getByText("2 registos · Total 800 MT", { exact: true })).toBeVisible();
  const trigger = () => page.getByRole("button", { name: /^Filtros(?: \(\d+\))?$/ });
  await trigger().click();
  await page.getByLabel("Forma no relatório", { exact: true }).selectOption("M-Pesa");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("2 registos · Total 800 MT", { exact: true })).toBeVisible();
  await trigger().click(); await expect(page.getByLabel("Forma no relatório", { exact: true })).toHaveValue("");
  await page.getByLabel("Forma no relatório", { exact: true }).selectOption("M-Pesa");
  if (width < 768) {
    await page.screenshot({ path: info.outputPath("filtros-relatorio-360.png"), animations: "disabled" });
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.getByLabel("Forma no relatório", { exact: true })).toHaveValue("M-Pesa");
  }
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  if (width < 768) await page.setViewportSize({ width, height: 900 });
  await expect(page.getByText("1 registo · Total 200 MT", { exact: true })).toBeVisible();
  await expect(trigger()).toHaveText("Filtros (1)");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const csv = await readFile((await (await download).path())!, "utf8");
  expect(csv).toContain("M-Pesa"); expect(csv).not.toContain("Numerário");
  await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
  const print = page.locator(".lss-report-print");
  await expect(print).toContainText("Total: 200 MT"); await expect(print).toContainText("Forma: M-Pesa");
  await expect(print).not.toContainText("Numerário");
  await page.pdf({ path: info.outputPath(`relatorio-filtrado-${width}.pdf`), format: "A4", printBackground: true });
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await trigger().click(); await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("1 registo · Total 200 MT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remover filtro M-Pesa", exact: true }).click();
  await expect(page.getByText("2 registos · Total 800 MT", { exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath(`relatorios-resultados-${width}.png`), fullPage: true });
  await noOverflow(page);
});

for (const width of [390, 1440]) test(`caixa conserva saída ao retomar e imprime só o detalhe filtrado a ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); const f = await seed(page, true); await page.goto("/reports?rsection=cash");
  await page.getByRole("button", { name: "Registar saída", exact: true }).click();
  let task = page.getByRole("dialog", { name: "Registar saída", exact: true });
  await task.getByLabel("Valor (MT)", { exact: false }).fill("100"); await task.getByLabel("Motivo", { exact: false }).fill("Material autorizado");
  const id = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).tasks[0].id, `lss-cash-tasks-v1-${f.state.datasetId}`);
  await task.getByRole("button", { name: "Rever efeito", exact: true }).click();
  await page.screenshot({ path: info.outputPath(`caixa-saida-${width}.png`), animations: "disabled" });
  await task.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Retomar saída", exact: true }).click();
  await page.setViewportSize({ width: width < 768 ? 1440 : 390, height: 900 });
  task = page.getByRole("dialog", { name: "Registar saída", exact: true });
  await expect(task.getByLabel("Motivo", { exact: false })).toHaveValue("Material autorizado");
  await task.getByRole("button", { name: "Rever efeito", exact: true }).click();
  await task.getByRole("button", { name: "Confirmar saída", exact: true }).click();
  await expect(task).toHaveCount(0);
  expect((await snapshot(page)).operations.filter((item) => item.id === id)).toHaveLength(1);
  await page.setViewportSize({ width, height: 900 });
  await page.getByLabel("Forma no detalhe", { exact: true }).selectOption("M-Pesa");
  await expect(page.getByRole("status")).toContainText("1 movimento · M-Pesa · Líquido apresentado: 200 MT");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Exportar detalhe CSV", exact: true }).click();
  const csv = await readFile((await (await download).path())!, "utf8"); expect(csv).toContain("M-Pesa"); expect(csv).not.toContain("Numerário");
  await page.getByRole("button", { name: "Imprimir detalhe / PDF", exact: true }).click();
  const print = page.locator(".lss-report-print"); await expect(print).toContainText("Líquido apresentado: 200 MT"); await expect(print).not.toContainText("Numerário");
  await page.pdf({ path: info.outputPath(`caixa-filtrado-${width}.pdf`), format: "A4", printBackground: true });
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({ path: info.outputPath(`caixa-movimentos-${width}.png`), fullPage: true }); await noOverflow(page);
});

test("lista móvel de alunos filtra explicitamente e conserva o conjunto ao voltar da ficha", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await seed(page); await page.goto("/students");
  const list = page.getByRole("region", { name: "Lista de alunos", exact: true });
  await expect(list.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Turma dos alunos", { exact: true }).selectOption("7A2026");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  const count = await list.getByRole("article").count(); expect(count).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("alunos-lista-390.png"), fullPage: true });
  await list.getByRole("button", { name: "Ana Júlia Mucavele", exact: true }).click();
  await page.getByRole("button", { name: "Voltar à lista de alunos", exact: true }).click();
  await expect(list.getByRole("article")).toHaveCount(count);
  await expect(page.getByRole("button", { name: /^Filtros \(1\)$/ })).toBeVisible();
  await page.reload(); await expect(list.getByRole("article")).toHaveCount(count);
  await noOverflow(page);
});
