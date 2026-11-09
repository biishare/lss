import { validateAcademicState } from "../academics/validation";
import { validateBillingExtensions } from "../finance/domain/billing-validation";
import { validateServiceExtensions } from "../finance/service-validation";
import { validateCashBook } from "../cash/validation";

type JsonObject = Record<string, unknown>;

export const demoCollections = [
  "academicStages", "classDefinitions", "roomDefinitions", "classes", "rooms",
  "groups", "students", "paymentRecords", "billingRuns", "paymentRuleVersions",
] as const;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Os dados não são válidos: ${message}`);
}

function list(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value) || value.some((item) => !isObject(item))) {
    fail(`${label} deve ser uma lista de registos.`);
  }
  return value as JsonObject[];
}

function identifiers(items: JsonObject[], label: string, key = "id") {
  const ids = new Set<string>();
  for (const item of items) {
    const id = item[key];
    if (typeof id !== "string" || !id.trim()) fail(`${label} tem um identificador em falta.`);
    if (ids.has(id)) fail(`${label} contém identificadores repetidos.`);
    ids.add(id);
  }
  return ids;
}

const moneyFields = new Set([
  "amount", "baseAmount", "originalAmount", "discountAmount", "dueAmount",
  "monthlyFee", "inscriptionFee", "inscriptionRenewalFee", "expectedTotal",
  "firstPenaltyAmount", "secondPenaltyAmount", "totalAllocated", "baseTotal",
  "penaltyTotal", "unallocatedAmount", "balanceBefore", "balanceAfter",
  "adjustedAmount", "adjustedDueAmount", "previousAmount", "nextAmount",
]);

function validateNumbers(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(validateNumbers);
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (moneyFields.has(key) && child !== undefined &&
          (typeof child !== "number" || !Number.isFinite(child) || child < 0 ||
           !Number.isSafeInteger(Math.round(child * 100)) ||
           Math.abs(child * 100 - Math.round(child * 100)) > 0.00001)) {
        fail(`o valor monetário ${key} deve ser positivo ou zero, com duas casas decimais.`);
      }
      if ((key === "discountPercent" || key === "percent") && child !== undefined &&
          (typeof child !== "number" || !Number.isFinite(child) || child < 0 || child > 100)) {
        fail("a percentagem deve estar entre 0 e 100.");
      }
      // O original conservado é evidência, não dados activos a reinterpretar.
      if (key !== "legacySource" && key !== "legacySafetyExport") validateNumbers(child);
    }
  }
}

function reference(item: JsonObject, field: string, ids: Set<string>, label: string) {
  const value = item[field];
  if (value !== undefined && value !== "" && (typeof value !== "string" || !ids.has(value))) {
    fail(`${label} faz referência a um registo inexistente.`);
  }
}

function cents(value: unknown) {
  return Math.round(Number(value ?? 0) * 100);
}

export function validateDemoState(value: unknown): asserts value is JsonObject {
  if (!isObject(value)) fail("o ficheiro não contém um estado do LSS.");
  if (!demoCollections.some((key) => key in value) && !("paymentSettings" in value)) {
    fail("o ficheiro não contém dados reconhecidos do LSS.");
  }
  if (value.schemaVersion !== undefined && value.schemaVersion !== 2 && value.schemaVersion !== 3) {
    fail("a versão do estado não é suportada.");
  }
  if (value.revision !== undefined &&
      (typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0)) {
    fail("a revisão é inválida.");
  }
  const collections = new Map<string, JsonObject[]>();
  const ids = new Map<string, Set<string>>();
  for (const key of demoCollections) {
    if (key in value) {
      const rows = list(value[key], key);
      collections.set(key, rows);
      ids.set(key, identifiers(rows, key, key === "paymentRecords" ? "studentId" : "id"));
    }
  }
  const linked = (collection: string, field: string, target: string) => {
    if (ids.has(target)) {
      for (const row of collections.get(collection) ?? []) reference(row, field, ids.get(target)!, collection);
    }
  };
  linked("classDefinitions", "stageId", "academicStages");
  linked("groups", "classId", "classes");
  linked("groups", "roomId", "rooms");
  linked("students", "classId", "classes");
  linked("students", "groupId", "groups");
  linked("paymentRecords", "studentId", "students");
  linked("billingRuns", "classId", "classes");
  linked("billingRuns", "groupId", "groups");
  const groups = new Map((collections.get("groups") ?? []).map((group) => [group.id, group]));
  const stableNumbers = new Set<string>();
  const permanentNumbers = new Map<string, string>();
  for (const student of collections.get("students") ?? []) {
    if (typeof student.fullName !== "string" || !student.fullName.trim()) fail("o aluno não tem nome.");
    const group = groups.get(student.groupId);
    if (group && group.classId !== student.classId) fail("a turma não pertence à classe do aluno.");
    if (student.registrationNumber) {
      const legacy = value.schemaVersion !== 3 || (isObject(value.scenario) && value.scenario.kind === "legacy");
      const owner = String(student.personId ?? student.id);
      if (!legacy && permanentNumbers.has(String(student.registrationNumber)) && permanentNumbers.get(String(student.registrationNumber)) !== owner) fail("o número permanente do aluno está repetido.");
      permanentNumbers.set(String(student.registrationNumber), owner);
    }
    if (student.stableNumber) {
      const key = `${student.academicYearId ?? ""}:${student.groupId}:${student.stableNumber}`;
      if (stableNumbers.has(key)) fail("o número da pauta está repetido na turma/ano.");
      stableNumbers.add(key);
    }
  }
  if ("paymentSettings" in value && !isObject(value.paymentSettings)) {
    fail("as configurações de pagamento são inválidas.");
  }
  validateNumbers(value);
  validateBillingExtensions(value);
  if (value.academic !== undefined) validateAcademicState(value.academic, value);

  for (const record of collections.get("paymentRecords") ?? []) {
    if (record.monthlyPayments !== undefined && !isObject(record.monthlyPayments)) fail("as mensalidades antigas são inválidas.");
    if (record.inscriptionRenewal !== undefined && !isObject(record.inscriptionRenewal)) fail("a inscrição antiga é inválida.");
    const charges = list(record.charges ?? [], "cobranças");
    const penalties = list(record.penaltyCharges ?? [], "multas");
    const payments = list(record.payments ?? [], "pagamentos");
    const allocations = list(record.allocations ?? [], "aplicações");
    const chargeIds = identifiers([...charges, ...penalties], "cobranças e multas");
    const paymentIds = identifiers(payments, "pagamentos");
    identifiers(allocations, "aplicações");
    identifiers(list(record.corrections ?? [], "correcções"), "correcções");
    const stages = new Set<string>();
    for (const charge of [...charges, ...penalties]) {
      if (charge.studentId !== record.studentId) fail("a cobrança pertence a outro aluno.");
    }
    for (const penalty of penalties) {
      if (penalty.stage !== "first" && penalty.stage !== "second") fail("a etapa da multa é inválida.");
      reference(penalty, "baseChargeId", new Set(charges.map((charge) => String(charge.id))), "multa");
      const key = `${penalty.baseChargeId}:${penalty.stage}`;
      if (stages.has(key)) fail("a etapa da multa está repetida.");
      stages.add(key);
    }
    for (const payment of payments) {
      if (payment.studentId !== record.studentId) fail("o pagamento pertence a outro aluno.");
    }
    const paymentTotals = new Map<string, number>();
    const chargeTotals = new Map<string, number>();
    for (const allocation of allocations) {
      if (typeof allocation.amount !== "number") fail("a aplicação não tem valor.");
      if (typeof allocation.paymentId !== "string" || typeof allocation.chargeId !== "string") fail("a aplicação não tem origem e destino.");
      reference(allocation, "paymentId", paymentIds, "aplicação");
      reference(allocation, "chargeId", chargeIds, "aplicação");
      const paymentId = String(allocation.paymentId), chargeId = String(allocation.chargeId);
      paymentTotals.set(paymentId, (paymentTotals.get(paymentId) ?? 0) + cents(allocation.amount));
      chargeTotals.set(chargeId, (chargeTotals.get(chargeId) ?? 0) + cents(allocation.amount));
    }
    for (const payment of payments) {
      if ((paymentTotals.get(String(payment.id)) ?? 0) > cents(payment.amount)) fail("as aplicações excedem o recebido.");
    }
    for (const charge of [...charges, ...penalties]) {
      if ((chargeTotals.get(String(charge.id)) ?? 0) > cents(charge.adjustedDueAmount ?? charge.adjustedAmount ?? charge.dueAmount ?? charge.amount)) {
        fail("as aplicações excedem o valor devido.");
      }
    }
  }
  if (value.schemaVersion === 3) {
    validateServiceExtensions(value);
    validateCashBook(value);
    if (typeof value.revision !== "number") fail("falta a revisão do cenário.");
    if (!isObject(value.scenario) || !["example", "empty", "legacy"].includes(String(value.scenario.kind)) ||
        value.scenario.version !== 1 || typeof value.scenario.baseDate !== "string") fail("o cenário está incompleto.");
    if (!isObject(value.paymentSettings)) fail("faltam as configurações financeiras.");
    for (const key of ["academicYear", "startMonth", "endMonth"]) {
      if (typeof value.paymentSettings[key] !== "string" || !value.paymentSettings[key]) fail("o calendário de pagamento está incompleto.");
    }
    for (const key of ["monthlyFee", "inscriptionRenewalFee", "firstPenaltyAmount", "secondPenaltyAmount"]) {
      if (typeof value.paymentSettings[key] !== "number") fail("os preços estão incompletos.");
    }
    for (const student of collections.get("students") ?? []) {
      for (const key of ["classId", "groupId", "enrollmentDate", "tuitionStartMonth"]) {
        if (typeof student[key] !== "string" || !student[key]) fail("a matrícula do aluno está incompleta.");
      }
      if (!isObject(student.financialProfile)) fail("a condição financeira do aluno está incompleta.");
    }
    for (const key of demoCollections) if (!collections.has(key)) fail(`falta a colecção ${key}.`);
    if (typeof value.datasetId !== "string" || !value.datasetId) fail("falta a identidade do cenário.");
    const operations = list(value.operations, "operações");
    identifiers(operations, "operações");
    for (const operation of operations) {
      if (typeof operation.fingerprint !== "string" || typeof operation.actorId !== "string") fail("a operação está incompleta.");
    }
    const receipts = list(value.receipts, "recibos");
    const receiptKeys = new Set<string>();
    for (const receipt of receipts) {
      if (typeof receipt.id !== "string" || !receipt.id || typeof receipt.studentId !== "string" ||
          typeof receipt.paymentId !== "string") fail("o recibo está incompleto.");
      const key = `${receipt.studentId}:${receipt.paymentId}`;
      if (receiptKeys.has(key)) fail("o recibo do pagamento está repetido.");
      receiptKeys.add(key);
      const record = (collections.get("paymentRecords") ?? []).find((r) => r.studentId === receipt.studentId);
      const paymentIds = new Set(list(record?.payments ?? [], "pagamentos").map((p) => String(p.id)));
      reference(receipt, "paymentId", paymentIds, "recibo");
    }
  }
}
