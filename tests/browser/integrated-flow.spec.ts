import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { demoStorageKey, type DemoState } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";
import { formatCurrency } from "../../app/components/school-admin-demo.model";

// Only the fictional accounts of the isolated local presentation adapter.
// No session or school data are injected: this exercises the entry boundary.
async function signIn(page: Page, role: "secretaria" | "director") {
  await expect(page.getByRole("heading", { name: "Entrar no LSS", exact: true })).toBeVisible();
  await page.getByLabel("Utilizador", { exact: false }).fill(role === "secretaria" ? "marta" : "antonio");
  await page.getByLabel("Palavra-passe", { exact: false }).fill(role === "secretaria" ? "Lss!Marta2026" : "Lss!Antonio2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

const snapshot = (page: Page): Promise<DemoState> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), demoStorageKey);
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
}

for (const width of [390, 1440]) {
  test(`entrada limpa, matrícula, pagamento e conferência pelo Director a ${width}px`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", async (dialog) => { errors.push(`Diálogo nativo: ${dialog.type()}`); await dialog.dismiss(); });
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.clock.setFixedTime(new Date("2026-09-02T08:00:00.000Z"));
    await page.goto("/students?year=2026&agroup=7A2026");
    expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBeNull();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), demoSessionKey)).toBeNull();
    await signIn(page, "secretaria");
    await expect(page.getByRole("heading", { level: 1, name: "Alunos e turmas", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("agroup")).toBe("7A2026");
    await expect(page.getByRole("button", { name: "Nova matrícula", exact: true })).toBeVisible();
    await expect.poll(() => snapshot(page)).not.toBeNull();
    const initial = await snapshot(page);

    const name = `Ensaio integrado UI5 ${width}`;
    const phone = "840000005";
    await page.getByRole("button", { name: "Nova matrícula", exact: true }).click();
    const task = page.getByRole("dialog");
    await task.getByLabel("Nome completo do aluno", { exact: true }).fill(name);
    await task.getByLabel("Nome do encarregado", { exact: true }).fill("Encarregado do ensaio integrado");
    await task.getByLabel("Contacto do encarregado", { exact: true }).fill(phone);
    await task.getByRole("button", { name: "Continuar", exact: true }).click();
    await task.getByLabel("Turma da matrícula", { exact: true }).selectOption("7A2026");
    await task.getByRole("button", { name: "Continuar", exact: true }).click();
    await task.getByRole("button", { name: "Guardar e pagar", exact: true }).click();
    const payment = page.getByRole("dialog", { name: "Registar pagamento", exact: true });
    await expect(payment.getByRole("region", { name: "Contexto do pagamento" })).toContainText(name);
    await expect(payment).toContainText("Inscrição / Renovação");
    const amount = Number(await payment.getByLabel("Valor recebido", { exact: false }).inputValue());
    expect(amount).toBeGreaterThan(0);
    await payment.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
    const receipt = page.locator(".lss-receipt-print");
    await expect(receipt).toContainText(name);
    await expect(receipt).toContainText(formatCurrency(amount));
    const saved = await snapshot(page);
    const student = saved.students.find((item) => item.fullName === name)!;
    expect(student).toBeDefined();
    expect(saved.students).toHaveLength(initial.students.length + 1);
    expect(saved.receipts).toHaveLength(initial.receipts.length + 1);
    const ownReceipt = saved.receipts.find((item) => item.studentId === student.id)!;
    expect(ownReceipt.amount).toBe(amount);
    await expect(receipt).toContainText(ownReceipt.id);
    await page.screenshot({ path: info.outputPath(`integrado-recibo-${width}.png`), animations: "disabled" });
    await noOverflow(page);
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    expect(await snapshot(page)).toEqual(saved);
    expect(page.url()).not.toContain(encodeURIComponent(name));
    expect(page.url()).not.toContain(phone);

    await page.getByRole("banner").getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Entrar no LSS", exact: true })).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), demoSessionKey)).toBeNull();
    expect(await snapshot(page)).toEqual(saved);
    await page.goto("/reports?year=2026");
    await signIn(page, "director");
    await expect(page.getByRole("heading", { level: 1, name: "Relatórios", exact: true })).toBeVisible();
    await page.getByLabel("Pesquisar no relatório", { exact: true }).fill(name);
    await expect(page.getByText(`1 registo · Total ${formatCurrency(amount)}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Recibo", exact: true }).click();
    await expect(receipt).toContainText(ownReceipt.id);
    await expect(receipt).toContainText(name);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Confirmar pagamento", exact: true })).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
    const csv = await readFile((await (await download).path())!, "utf8");
    expect(csv).toContain(name);
    expect(csv).toContain(ownReceipt.paymentId);
    expect(csv).not.toContain(initial.students[0].fullName);
    await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
    const print = page.locator(".lss-report-print");
    await expect(print).toContainText(name);
    await expect(print).toContainText(`Total: ${formatCurrency(amount)}`);
    await expect(print).not.toContainText(initial.students[0].fullName);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".lss-workspace")).toBeHidden();
    const pdf = await page.pdf({ path: info.outputPath(`integrado-relatorio-${width}.pdf`), format: "A4", printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await page.reload();
    await expect(page.getByLabel("Pesquisar no relatório", { exact: true })).toHaveValue(name);
    await expect(page.getByText(`1 registo · Total ${formatCurrency(amount)}`, { exact: true })).toBeVisible();
    expect(await snapshot(page)).toEqual(saved);
    expect(page.url()).not.toContain(encodeURIComponent(name));
    expect(page.url()).not.toContain(phone);
    await page.screenshot({ path: info.outputPath(`integrado-relatorio-${width}.png`), fullPage: true });
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}
