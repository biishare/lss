import { test, expect } from "@playwright/test";
import { demoStorageKey } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";

test("a primeira resposta contém a entrada, mesmo sem executar JavaScript", async ({ browser, request }, info) => {
  for (const path of ["/", "/payments?month=jun&period=month"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("Entrar no LSS");
    expect(html).toContain('name="username"');
    expect(html).toContain('name="password"');
    expect(html).not.toContain("A carregar os dados do LSS");
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
  await expect(page.getByLabel("Utilizador", { exact: false })).toBeVisible();
  await page.screenshot({ path: info.outputPath("entrada-html-sem-javascript-360.png"), fullPage: true });
  await context.close();
});

for (const width of [360, 1440]) {
  test(`primeira entrada não cria dados escolares a ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => { dialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBeNull();
    await page.getByLabel("Utilizador", { exact: false }).fill("antonio");
    await page.getByLabel("Palavra-passe", { exact: false }).fill("incorrecta");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Utilizador ou palavra-passe incorrectos.");
    expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBeNull();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), demoSessionKey)).toBeNull();
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
    await page.screenshot({ path: info.outputPath(`entrada-${width}.png`), fullPage: true });
    expect(dialogs).toEqual([]);
  });
}

test("dados ilegíveis só são lidos depois da entrada e sair conserva o original", async ({ page }, info) => {
  await page.addInitScript(({ key }) => { localStorage.setItem(key, "{incompleto"); }, { key: demoStorageKey });
  await page.goto("/payments?year=2026&month=jun&period=month");
  await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBe("{incompleto");
  // Only the public fictional account of the local presentation adapter.
  await page.getByLabel("Utilizador", { exact: false }).fill("antonio");
  await page.getByLabel("Palavra-passe", { exact: false }).fill("Lss!Antonio2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Não foi possível abrir os dados" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("erro-dados-com-navegacao.png"), fullPage: true });
  expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBe("{incompleto");
  await page.getByRole("banner").getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  expect(await page.evaluate((key) => localStorage.getItem(key), demoStorageKey)).toBe("{incompleto");
});
