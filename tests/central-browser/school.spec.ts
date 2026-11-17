import { expect, test, type Locator, type Page } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3108";
const apiOrigin = "http://127.0.0.1:4108";
const password = process.env.LSS_TEST_PASSWORD!;
const schoolDay = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Maputo" }).format(new Date());

async function enter(page: Page, email: string) {
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function actionRowLayout(row: Locator) {
  return row.evaluate(element => {
    const { left, right } = element.getBoundingClientRect();
    const buttons = Array.from(element.querySelectorAll("button"), button => button.getBoundingClientRect());
    return {
      left, right,
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      firstButtonLeft: buttons[0].left,
      lastButtonRight: buttons[buttons.length - 1].right,
      lines: new Set(buttons.map(button => Math.round(button.top))).size,
      scrollLeft: element.scrollLeft,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
      insideCard: Boolean(element.closest(".lss-responsive-card")),
    };
  });
}

test("Secretaria confirma matrícula, recupera um pagamento com resposta perdida e fecha o caixa", async ({ page }, info) => {
  const prematureReads: string[] = [];
  const record = (request: { url(): string }) => {
    if (request.url().includes("/api/v1/")) prematureReads.push(request.url());
  };
  page.on("request", record);
  await page.goto("/students");
  await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
  expect(prematureReads).toEqual([]);
  page.off("request", record);

  const readiness = await page.request.get("/api/health/ready");
  expect(readiness.status()).toBe(200);
  expect(await readiness.json()).toEqual({ status: "ready" });

  await enter(page, "secretaria@example.test");
  await expect(page.getByRole("heading", { level: 2, name: "Alunos e turmas" })).toBeVisible();
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Nome completo").fill("Aluno sintético da integração");
  await editor.getByLabel("Nome do encarregado").fill("Encarregado de teste");
  await editor.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Ficha do aluno guardada.")).toBeVisible();
  await page.getByRole("button", { name: "Nova matrícula", exact: true }).click();
  await editor.getByLabel("Turma", { exact: false }).selectOption({ label: "Turma de teste" });
  await editor.getByLabel("Data efectiva").fill(schoolDay());
  await editor.getByLabel("Primeira propina").selectOption(schoolDay().slice(0, 7));
  await editor.getByRole("button", { name: "Consultar prévia", exact: true }).click();
  await expect(editor.getByText(/Vagas disponíveis/)).toBeVisible();
  await editor.getByRole("button", { name: "Confirmar matrícula", exact: true }).click();
  await expect(page.getByText("Matrícula guardada.")).toBeVisible();
  await expect(page.getByText(/MAT-/)).toBeVisible();

  await page.getByRole("button", { name: "Ver pagamentos", exact: true }).click();
  await expect(page).toHaveURL(/\/payments\?/);
  await page.getByRole("button", { name: "Registar pagamento", exact: true }).click();
  await editor.getByLabel("Valor em MT").fill("250,50");
  await editor.getByLabel("Manter o valor como crédito").check();
  await editor.getByRole("button", { name: "Consultar prévia", exact: true }).click();
  await expect(editor.getByText("250,50 MT", { exact: true }).first()).toBeVisible();

  let committed = false;
  await page.route("**/api/v1/finance/payments", async (route) => {
    if (route.request().method() !== "POST" || committed) return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    committed = true;
    await route.abort("failed");
  });
  await editor.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recibo", exact: true })).toBeVisible();
  expect(committed).toBe(true);
  await expect(editor.getByText(/RC-/).first()).toBeVisible();
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();

  const id = new URL(page.url()).searchParams.get("student");
  const reply = await page.request.get("/api/v1/finance/payments?studentId=" + id);
  expect(reply.status()).toBe(200);
  const payments = await reply.json();
  expect(payments.total).toBe(1);
  expect(payments.items[0].amountCents).toBe(25050);
  await page.reload();
  await expect(page.getByText("Aluno sintético da integração").first()).toBeVisible();
  await page.getByRole("button", { name: "Relatórios", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Recebimentos", exact: true })).toBeVisible();
  await expect(page.getByText("1 registo · Total 250,50 MT")).toBeVisible();
  await page.screenshot({ path: info.outputPath("relatorio.png") });
  await page.getByRole("button", { name: "Caixa", exact: true }).click();
  await expect(page.getByText(/esperado em numerário/)).toBeVisible();

  await page.getByRole("button", { name: "Pagamentos", exact: true }).first().click();
  await page.getByRole("button", { name: "Voltar à planilha" }).click();
  await page.getByRole("combobox", { name: "Classe", exact: true }).selectOption({ label: "Classe de teste" });
  await page.getByRole("combobox", { name: "Turma", exact: true }).selectOption({ label: "Turma de teste" });
  const sheet = page.getByRole("region", { name: "Grelha de propinas" });
  const student = sheet.getByRole("row", { name: /Aluno sintético da integração/ });
  await expect(student).toBeVisible();
  await expect(sheet.getByRole("columnheader")).toHaveCount(4);
  await page.getByRole("button", { name: "Trimestre", exact: true }).click();
  await expect(sheet.getByRole("columnheader")).toHaveCount(6);
  await page.getByRole("button", { name: "Ano", exact: true }).click();
  await expect(sheet.getByRole("columnheader")).toHaveCount(15);
  const month = new Intl.DateTimeFormat("pt-MZ", { month: "long", timeZone: "UTC" })
    .format(new Date(schoolDay() + "T00:00:00Z"));
  const cell = student.getByRole("button", { name: new RegExp("Propina de " + month, "i") });
  await cell.click();
  await expect(editor.getByText("250,50 MT", { exact: true }).first()).toBeVisible();
  await editor.getByRole("button", { name: "Registar pagamento", exact: true }).click();
  await expect(editor.getByLabel("Valor em MT")).toHaveValue("250.50");
  await expect(editor.getByRole("checkbox", { name: /Propina/ })).toBeChecked();
  await editor.getByRole("button", { name: "Consultar prévia", exact: true }).click();
  await editor.getByRole("button", { name: "Confirmar pagamento", exact: true }).click();
  await expect(editor.getByRole("heading", { name: "Recibo", exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(cell).toHaveText("Pago");
  await expect(page.getByRole("button", { name: "Ano", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("planilha-anual.png"), animations: "disabled" });
  await student.getByRole("button", { name: "Aluno sintético da integração", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aluno sintético da integração", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar à planilha" }).click();
  await expect(cell).toHaveText("Pago");
  await expect(page.getByRole("button", { name: "Ano", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Relatórios", exact: true }).first().click();
  await page.getByRole("button", { name: "Fechar caixa", exact: true }).click();
  await expect(editor.getByText("501,00 MT", { exact: true })).toBeVisible();
  await editor.getByLabel("Numerário contado em MT").fill("501,00");
  await editor.getByRole("button", { name: "Confirmar fecho", exact: true }).click();
  await expect(page.getByText("Fecho registado.")).toBeVisible();
  await expect(page.getByText("Sem caixa aberto.")).toBeVisible();

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrar no LSS" })).toBeVisible();
  expect((await page.request.get("/api/v1/students")).status()).toBe(401);
});

test("Director acede no telemóvel e o servidor recusa a escrita", async ({ page, request }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/students");
  await enter(page, "director@example.test");
  await expect(page.getByRole("heading", { level: 2, name: "Alunos e turmas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo aluno", exact: true })).toHaveCount(0);
  expect((await page.request.post("/api/v1/students", {
    headers: { Origin: appOrigin, "Idempotency-Key": "director-write-denied" },
    data: { fullName: "Tentativa de escrita do Director" },
  })).status()).toBe(403);
  expect((await page.request.get("/api/v1/admin/users")).status()).toBe(404);
  const before = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(before).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("director-mobile.png") });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Pagamentos", exact: true }).last().click();
  await page.getByRole("combobox", { name: "Classe", exact: true }).selectOption({ label: "Classe de teste" });
  await page.getByRole("combobox", { name: "Turma", exact: true }).selectOption({ label: "Turma de teste" });
  const sheet = page.getByRole("region", { name: "Grelha de propinas" });
  const paid = sheet.getByRole("button", { name: /Propina de .+, Pago$/ });
  await expect(paid).toBeVisible();
  await paid.click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByText("Pago", { exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Registar pagamento", exact: true })).toHaveCount(0);
  await detail.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Ano", exact: true }).click();
  await expect(sheet.getByRole("columnheader")).toHaveCount(15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("planilha-mobile.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Relatórios", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Relatórios escolares" })).toBeVisible();

  await page.goto("/dashboard");
  const indicators = page.getByRole("region", { name: "Indicadores do Director" });
  const card = (title: string) => indicators.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card("Recebimentos do mês").getByText("501,00 MT", { exact: true })).toBeVisible();
  await expect(card("Dívida vencida").getByText("0,00 MT", { exact: true })).toBeVisible();
  await expect(card("Matrículas confirmadas").getByText("1", { exact: true })).toBeVisible();
  await expect(card("Vagas disponíveis").getByText("19", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("indicadores-director-mobile.png"), animations: "disabled" });
  await indicators.getByRole("button", { name: "Ver relatório de vagas disponíveis" }).click();
  await expect(page.getByRole("heading", { name: "Vagas por turma", exact: true })).toBeVisible();
  await expect(page.getByText("Ocupação 1 de 20")).toBeVisible();
  await page.goBack();
  await indicators.getByRole("button", { name: "Ver relatório de recebimentos do mês" }).click();
  await expect(page.getByRole("heading", { name: "Recebimentos", exact: true })).toBeVisible();
  await expect(page.getByText("2 registos · Total 501,00 MT")).toBeVisible();
  await page.reload();
  await expect(page.getByText("2 registos · Total 501,00 MT")).toBeVisible();

  const admin = await request.post(apiOrigin + "/api/auth/sign-in/email", {
    headers: { Origin: appOrigin }, data: { email: "admin@example.test", password },
  });
  expect(admin.status()).toBe(200);
  const cookie = admin.headersArray().find((header) => header.name === "set-cookie")?.value.split(";")[0];
  expect(cookie).toBeTruthy();
  const users = await request.get(apiOrigin + "/api/v1/admin/users", { headers: { Cookie: cookie! } });
  const director = (await users.json()).accounts.find((account: { role: string }) => account.role === "director");
  const disabled = await request.post(apiOrigin + "/api/v1/admin/users/" + director.id + "/deactivate", {
    headers: { Origin: appOrigin, Cookie: cookie! }, data: {},
  });
  expect(disabled.status()).toBe(200);
  await page.reload();
  await expect(page.getByText("A sessão expirou. Entre novamente.")).toBeVisible();
});

test("Filas de acções no telemóvel deslizam até às bordas sem barra visível", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/settings");
  await enter(page, "secretaria@example.test");
  const settings = page.getByRole("navigation", { name: "Configurações escolares" });
  const first = settings.getByRole("button", { name: "Instituição", exact: true });
  const last = settings.getByRole("button", { name: "Propinas", exact: true });
  await expect(first).toBeVisible();
  const institutionResponse = await page.request.get("/api/v1/institution");
  expect(institutionResponse.status()).toBe(200);
  const institution = await institutionResponse.json();
  await expect(page.getByRole("heading", { name: institution.name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Editar instituição|Actualizar logótipo/ })).toHaveCount(0);
  expect((await page.request.patch("/api/v1/institution", {
    headers: { Origin: appOrigin }, data: { name: "Tentativa de alteração", revision: institution.revision },
  })).status()).toBe(404);
  expect((await page.request.post("/api/v1/institution/logo", {
    headers: { Origin: appOrigin, "Content-Type": "image/png", "X-Institution-Revision": String(institution.revision) },
    data: Buffer.from("teste"),
  })).status()).toBe(404);

  const initial = await actionRowLayout(settings);
  expect(initial.left).toBe(0);
  expect(initial.right).toBe(initial.viewportWidth);
  expect(initial.pageWidth).toBe(initial.viewportWidth);
  expect(initial.firstButtonLeft).toBeGreaterThan(0);
  expect(initial.lastButtonRight).toBeGreaterThan(initial.right);
  expect(initial.lines).toBe(1);
  expect(initial.scrollbarWidth).toBe("none");

  await first.focus();
  const buttonCount = await settings.getByRole("button").count();
  for (let index = 1; index < buttonCount; index++) await page.keyboard.press("Tab");
  await expect(last).toBeFocused();
  await expect.poll(async () => (await actionRowLayout(settings)).scrollLeft).toBeGreaterThan(0);
  const scrolled = await actionRowLayout(settings);
  expect(scrolled.firstButtonLeft).toBeLessThan(initial.left);
  expect(scrolled.lastButtonRight).toBeLessThanOrEqual(initial.right);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Propinas e inscrição" })).toBeVisible();

  const catalog = Promise.withResolvers<void>();
  await page.route("**/api/v1/institution", async route => {
    await catalog.promise;
    await route.continue();
  }, { times: 1 });
  try {
    await page.goto("/dashboard");
    const skeleton = page.locator('main [aria-busy="true"] .MuiSkeleton-root').first();
    await expect(skeleton).toBeVisible();
    expect(await skeleton.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await expect(page.getByText("A carregar…", { exact: true })).toHaveCount(0);
    await expect(page.getByText("A preparar o conteúdo…", { exact: true })).toHaveCSS("width", "1px");
  } finally {
    catalog.resolve();
  }

  const shortcuts = page.getByRole("navigation", { name: "Atalhos escolares" });
  await expect(shortcuts).toBeVisible();
  await page.setViewportSize({ width: 740, height: 700 });
  const home = await actionRowLayout(shortcuts);
  expect(home.left).toBe(0);
  expect(home.right).toBe(home.viewportWidth);
  expect(home.pageWidth).toBe(home.viewportWidth);
  expect(home.firstButtonLeft).toBe(initial.firstButtonLeft);
  expect(home.lines).toBe(1);
  expect(home.insideCard).toBe(false);

  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: info.outputPath("inicio-mobile.png") });
  await shortcuts.getByRole("button", { name: "Alunos e turmas", exact: true }).click();
  const toolbar = page.getByRole("group", { name: "Acções de alunos e turmas" });
  await expect(toolbar.getByRole("button")).toHaveCount(3);
  const students = await actionRowLayout(toolbar);
  expect(students.lines).toBe(1);
  expect(students.pageWidth).toBe(students.viewportWidth);
  expect(students.lastButtonRight).toBeLessThanOrEqual(students.right);
  expect(students.insideCard).toBe(false);
  await page.screenshot({ path: info.outputPath("alunos-mobile.png") });
  await toolbar.getByRole("button", { name: "Turmas" }).click();
  await expect(toolbar.getByRole("button", { name: "Turmas" })).toHaveAttribute("aria-pressed", "true");
  await toolbar.getByRole("button", { name: "Novo aluno" }).click();
  await expect(page.getByRole("dialog", { name: "Novo aluno" })).toBeVisible();
});
