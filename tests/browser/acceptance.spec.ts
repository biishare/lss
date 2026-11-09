import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { phase6Fixture } from "../helpers/phase6-fixture";
import { demoStorageKey, type DemoState } from "../../app/features/demo/demo-state";
import { demoSessionKey } from "../../app/features/demo/demo-session";

// These fixtures run only against the isolated local production build. They
// never authenticate to Vercel or substitute for the future API/security tests.
async function seed(page: Page, role: "secretaria" | "director" | null = "secretaria", paid = false) {
  const f = phase6Fixture();
  if (paid) f.pay({ amount: "600" });
  await page.clock.setFixedTime(new Date(f.time));
  await page.addInitScript(({ state, role, stateKey, sessionKey }) => {
    if (!localStorage.getItem(stateKey)) localStorage.setItem(stateKey, JSON.stringify(state));
    if (!sessionStorage.getItem("lss-e2e-initialized")) {
      sessionStorage.setItem("lss-e2e-initialized", "true");
      if (role) sessionStorage.setItem(sessionKey, JSON.stringify({ source: "demo", accountId: `demo-${role}` }));
    }
  }, { state: f.state, role, stateKey: demoStorageKey, sessionKey: demoSessionKey });
}

async function snapshot(page: Page): Promise<DemoState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), demoStorageKey);
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  const modalOpen = await page.getByRole("dialog").count() > 0;
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: !modalOpen, animations: "disabled" });
}

async function noPageOverflow(page: Page) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(size.document, `A página tem ${size.document}px numa janela de ${size.viewport}px`).toBeLessThanOrEqual(size.viewport + 1);
}

async function navigate(page: Page, label: string) {
  if (await page.getByRole("button", { name: "Abrir menu", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.getByRole("dialog", { name: "Navegação", exact: true }).getByRole("button", { name: label, exact: true }).click();
  } else {
    await page.getByRole("complementary", { name: "Navegação principal" }).getByRole("button", { name: label, exact: true }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
}

for (const width of [320, 360, 390, 768, 1024, 1280, 1440, 1920]) {
  test(`cinco áreas sem overflow a ${width}px`, async ({ page }, info) => {
    await seed(page, "secretaria", true);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    for (const [route, label] of [["dashboard", "Início"], ["students", "Alunos e turmas"], ["payments", "Pagamentos"], ["reports", "Relatórios"], ["settings", "Configurações"]]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
      if (route === "payments") {
        const grid = (await page.locator(".lss-payment-grid").boundingBox())!;
        const sheet = (await page.locator(".lss-payment-grid > section").first().boundingBox())!;
        expect(sheet.width, "A planilha deve ocupar toda a largura, sem reservar o formulário retirado").toBe(grid.width);
      }
      if (route === "reports") {
        for (const name of ["Classe do relatório", "Turma do relatório", "Forma no relatório", "Funcionário do relatório"]) {
          const field = page.getByLabel(name, { exact: true });
          expect(await field.evaluate((el) => el.closest(".MuiFormControl-root")?.querySelector("label")?.getAttribute("data-shrink")), `O rótulo ${name} não deve sobrepor Todas/Todos`).toBe("true");
        }
      }
      await screenshot(page, info, `${route}-${width}`);
      await noPageOverflow(page);
    }
    expect(errors).toEqual([]);
  });
}

test("sidebar ganha 192px e vista expandida conserva a preferência", async ({ page }, info) => {
  await seed(page);
  await page.goto("/payments");
  const sidebar = page.getByRole("complementary", { name: "Navegação principal" });
  const main = page.locator("#workspace-content");
  await expect(page.getByRole("button", { name: "Recolher menu", exact: true })).toBeVisible();
  const before = (await main.boundingBox())!.width;
  expect((await sidebar.boundingBox())!.width).toBe(256);
  await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Expandir menu", exact: true })).toBeVisible();
  expect((await sidebar.boundingBox())!.width).toBe(64);
  expect((await main.boundingBox())!.width - before).toBe(192);
  await page.getByRole("searchbox").fill("Ana");
  await page.getByRole("button", { name: "Expandir planilha", exact: true }).click();
  await expect(sidebar).toBeHidden();
  await screenshot(page, info, "planilha-expandida-1440");
  await page.keyboard.press("Escape");
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("Ana");
  expect(await page.evaluate(() => localStorage.getItem("lss-demo-sidebar-collapsed"))).toBe("true");
});

test("menu móvel contém o foco, fecha e devolve o foco", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: "Abrir menu", exact: true });
  const menu = page.getByRole("dialog", { name: "Navegação", exact: true });
  await trigger.click();
  await expect(menu).toBeVisible();
  expect((await menu.boundingBox())!.width).toBeLessThanOrEqual(390 - 48);
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await screenshot(page, info, "drawer-390");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(385, 400);
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await navigate(page, "Pagamentos");
  await expect(menu).toBeHidden();
  await noPageOverflow(page);
});

for (const width of [390, 1440]) {
  test(`parcial, recibo, PDF e regresso à célula a ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await seed(page);
    await page.goto("/payments");
    await page.getByRole("searchbox").fill("Ana");
    await page.getByLabel("Mês de mensalidade", { exact: true }).selectOption("may");
    await page.getByLabel("Período da planilha", { exact: true }).selectOption("month");
    const cell = page.getByRole("button", { name: /^Maio.*Ana Júlia Mucavele/ });
    await cell.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("region", { name: "Contexto do pagamento" })).toContainText("Ana Júlia Mucavele");
    await expect(dialog.getByLabel("Aluno", { exact: true })).toHaveCount(0);
    await dialog.getByLabel("Valor recebido", { exact: false }).fill("600");
    await screenshot(page, info, `pagamento-${width}`);
    await noPageOverflow(page);
    await dialog.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
    const receipt = page.locator(".lss-receipt-print");
    await expect(receipt).toContainText("LSS-2026-000001");
    await expect(receipt).toContainText("600 MT");
    await screenshot(page, info, `recibo-${width}`);
    const saved = await snapshot(page);
    expect(saved.receipts).toHaveLength(1);
    expect(saved.receipts[0].amount).toBe(600);
    await page.emulateMedia({ media: "print" });
    await expect(receipt).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
    await expect(page.locator(".lss-workspace")).toBeHidden();
    await expect(page.locator(".MuiDialogActions-root")).toBeHidden();
    const pdf = await page.pdf({ path: info.outputPath(`recibo-${width}.pdf`), format: "A4", printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    await page.emulateMedia({ media: "screen" });
    expect(await snapshot(page)).toEqual(saved);
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("Ana");
    await expect(cell).toBeFocused();
    await expect(cell).toContainText("Parcial");
    await page.reload();
    await expect(page.getByRole("searchbox")).toHaveValue("Ana");
    await expect(page.getByLabel("Período da planilha", { exact: true })).toHaveValue("month");
    await expect(page.getByLabel("Mês de mensalidade", { exact: true })).toHaveValue("may");
    expect((await snapshot(page)).receipts).toHaveLength(1);
    await navigate(page, "Relatórios");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Pagamentos", exact: true })).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue("Ana");
    await expect(page.getByLabel("Período da planilha", { exact: true })).toHaveValue("month");
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1, name: "Relatórios", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Recibo", exact: true }).click();
    await expect(page.locator(".lss-receipt-print")).toContainText("LSS-2026-000001");
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Prévia de impressão / PDF", exact: true }).click();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".lss-report-print")).toBeVisible();
    await page.pdf({ path: info.outputPath(`relatorio-${width}.pdf`), format: "A4", printBackground: true });
    expect((await snapshot(page)).receipts).toHaveLength(1);
  });
}

test("matrícula móvel conserva erro e Guardar e pagar abre o aluno correcto", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/students");
  await page.getByRole("button", { name: "Nova matrícula", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog.getByLabel("Nome completo do aluno", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Nome completo do aluno", { exact: true })).toBeFocused();
  await dialog.getByLabel("Nome completo do aluno", { exact: true }).fill("Aluno do ensaio no navegador");
  await dialog.getByLabel("Nome do encarregado", { exact: true }).fill("Encarregado do ensaio");
  await dialog.getByLabel("Contacto do encarregado", { exact: true }).fill("840000000");
  await screenshot(page, info, "matricula-identificacao-390");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByLabel("Turma da matrícula", { exact: true }).selectOption("7A2026");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await screenshot(page, info, "matricula-revisao-390");
  await noPageOverflow(page);
  await dialog.getByRole("button", { name: "Guardar e pagar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Registar pagamento/ })).toContainText("Aluno do ensaio no navegador");
  const saved = await snapshot(page);
  const student = saved.students.find((item) => item.fullName === "Aluno do ensaio no navegador")!;
  expect(student).toBeDefined();
  await expect(page.getByRole("dialog").getByRole("region", { name: "Contexto do pagamento" })).toContainText(student.registrationNumber);
  await expect(page.getByRole("dialog").getByRole("region", { name: "Contexto do pagamento" })).toContainText("Inscrição / Renovação");
  expect(saved.students).toHaveLength(13);
});

for (const role of ["secretaria", "director"] as const) {
  test(`entrada única e saída da conta ${role}`, async ({ page }) => {
    await seed(page, null, true);
    await page.goto("/");
    await page.getByLabel("Utilizador", { exact: false }).fill(role === "secretaria" ? "marta" : "antonio");
    await page.getByLabel("Palavra-passe", { exact: false }).fill("incorrecta");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("region", { name: "Entrar no LSS", exact: true }).getByRole("alert")).toContainText("Utilizador ou palavra-passe incorrectos.");
    // Public fictional test accounts; no user credentials or remote service.
    await page.getByLabel("Palavra-passe", { exact: false }).fill(role === "secretaria" ? "Lss!Marta2026" : "Lss!Antonio2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Início", exact: true })).toBeVisible();
    await navigate(page, "Pagamentos");
    if (role === "director") await expect(page.getByRole("button", { name: "Registar pagamento", exact: true })).toHaveCount(0);
    const saved = await snapshot(page);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Entrar no LSS", exact: true })).toBeVisible();
    expect(await snapshot(page)).toEqual(saved);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), demoSessionKey)).toBeNull();
  });
}
