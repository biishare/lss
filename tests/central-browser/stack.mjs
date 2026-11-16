import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const appOrigin = "http://127.0.0.1:3108";
const apiOrigin = "http://127.0.0.1:4108";
const apiCheckout = resolve(process.env.LSS_API_CHECKOUT ?? "../lss-api");
const requireApi = createRequire(resolve(apiCheckout, "package.json"));
const { MongoMemoryReplSet } = requireApi("mongodb-memory-server-core");
const replica = await MongoMemoryReplSet.create({
  binary: { version: "7.0.24" },
  replSet: { count: 1, args: ["--nounixsocket"], spawn: { detached: true } },
});
const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Maputo" }).format(new Date());
const currentYear = Number(day.slice(0, 4));
const billingMonths = Array.from({ length: 12 }, (_, index) => currentYear + "-" + String(index + 1).padStart(2, "0"));
const password = process.env.LSS_TEST_PASSWORD;
if (!password) throw new Error("Inicie este ensaio através do Playwright.");

Object.assign(process.env, {
  MONGODB_URI: replica.getUri(), MONGODB_DB_NAME: "lss_school_test",
  BETTER_AUTH_URL: apiOrigin, BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
  LSS_TRUSTED_ORIGINS: appOrigin,
});
delete process.env.CLOUDINARY_URL;
const { bootstrapAdmin } = await import(pathToFileURL(resolve(apiCheckout, "src/identity/accounts.ts")).href);
const { closeMongo } = await import(pathToFileURL(resolve(apiCheckout, "src/services/mongo.ts")).href);
const { default: api } = await import(pathToFileURL(resolve(apiCheckout, "src/index.ts")).href);
let listener;
let next;
try {
  await bootstrapAdmin({ institutionId: "lss", name: "Administrador de teste", email: "admin@example.test", password });
  listener = api.listen(4108, "127.0.0.1");
  await once(listener, "listening");

  async function command(path, body, cookie, status) {
    const headers = { "Content-Type": "application/json", Origin: appOrigin, "Idempotency-Key": randomUUID() };
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(apiOrigin + path, { headers, method: "POST", body: JSON.stringify(body) });
    const result = response.status === 204 ? undefined : await response.json();
    if (response.status !== status) throw new Error("Falha da preparação isolada " + path + " " + response.status + " " + (result?.code ?? ""));
    return { result, cookie: response.headers.getSetCookie()[0]?.split(";")[0] };
  }
  const signin = (email) => command("/api/auth/sign-in/email", { email, password }, undefined, 200);
  const admin = await signin("admin@example.test");
  for (const [role, name] of [["secretaria", "Secretaria de teste"], ["director", "Director de teste"]]) {
    const account = await command("/api/v1/admin/users", { role, name, email: role + "@example.test" }, admin.cookie, 201);
    const access = await command("/api/v1/admin/users/" + account.result.id + "/access-reset", {}, admin.cookie, 201);
    await command("/api/v1/access-reset/complete", { code: access.result.code, newPassword: password }, undefined, 204);
  }
  const staff = await signin("secretaria@example.test");
  const create = (path, body) => command("/api/v1/" + path, body, staff.cookie, 201).then((reply) => reply.result);
  const year = await create("academic-years", {
    year: currentYear, label: "Ano lectivo de teste", startsOn: currentYear + "-01-01",
    endsOn: currentYear + "-12-31", billingMonths,
  });
  const level = await create("levels", { name: "Ensino de teste" });
  const schoolClass = await create("classes", { yearId: year.id, levelId: level.id, name: "Classe de teste" });
  const room = await create("rooms", { name: "Sala de teste", capacity: 30 });
  await create("groups", { name: "Turma de teste", classId: schoolClass.id, roomId: room.id, shift: "manha",
    days: [1, 2, 3, 4, 5], startsAt: "07:30", endsAt: "11:00", capacity: 20 });
  await command("/api/v1/academic-years/" + year.id + "/activate", { revision: year.revision, reason: "Ensaio de integração" }, staff.cookie, 200);
  await create("finance/policies", { yearId: year.id, levelId: level.id, classId: null, expectedRevision: 0,
    effectiveOn: year.startsOn, registrationCents: 5000, renewalCents: 4000, tuitionCents: 25050,
    billingMonths, registrationGraceDays: 5, tuitionDueDay: 10, penaltyRules: [], reason: "Valores sintéticos do ensaio" });

  next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3108"], {
    stdio: "inherit",
    env: { ...process.env, LSS_DATA_MODE: "central", LSS_API_ORIGIN: apiOrigin, LSS_SCHOOL_ORIGINS: appOrigin },
  });
  process.once("SIGTERM", () => next.kill("SIGTERM"));
  process.once("SIGINT", () => next.kill("SIGINT"));
  const [code] = await once(next, "exit");
  process.exitCode = code ?? 0;
} finally {
  next?.kill("SIGTERM");
  listener?.closeAllConnections();
  if (listener) await new Promise(done => listener.close(done));
  await closeMongo();
  await replica.stop();
}
