import { expect, test, type Page } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3108";
const apiOrigin = "http://127.0.0.1:4108";
const password = process.env.LSS_TEST_PASSWORD!;
const schoolDay = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Maputo" }).format(new Date());

async function enter(page: Page, email: string) {
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("Secretaria confirma matrícula, recupera um pagamento com resposta perdida e consulta o caixa", async ({ page }, info) => {
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
