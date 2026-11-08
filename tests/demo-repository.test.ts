import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, demoStorageKey, hydrateDemoState, cloneJson } from "../app/features/demo/demo-state.ts";
import { createLocalDemoRepository, parseDemoSnapshot, serializeDemoSnapshot, DemoConflictError } from "../app/features/demo/local-repository.ts";
import { confirmDemoPayment } from "../app/features/demo/payment-command.ts";
import { initialStudents, initialClasses, initialGroups, initialRooms, initialClassDefinitions,
  initialAcademicStages, initialRoomDefinitions, initialPaymentSettings, initialPaymentRecords,
} from "../app/lib/school-demo-data.ts";
import type { PaymentLaunchDraft } from "../app/components/school-admin-demo.model.ts";

const timestamp = "2026-11-08T12:00:00.000Z";

class MemoryStorage {
  values = new Map<string, string>();
  writes = 0;
  failWrites = false;
  failReads = false;
  getItem(key: string) {
    if (this.failReads) throw new Error("Leitura bloqueada");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("Quota excedida");
    this.writes++;
    this.values.set(key, value);
  }
}

function fixture() {
  const storage = new MemoryStorage();
  let id = 0;
  const repository = createLocalDemoRepository(storage, { now: () => timestamp, newId: () => `scenario-${++id}` });
  const state = repository.initialize(createDemoState("example", { now: timestamp, datasetId: "scenario-original" }));
  const draft: PaymentLaunchDraft = {
    studentId: state.students[0].id, category: "tuition", monthKey: "jun", targetChargeId: "",
    amount: "1000", paidOn: "2026-11-08", method: "Numerário", description: "Teste", allowFutureAllocation: false,
  };
  const pay = (commandId = "command-payment", expected = state, input = draft) => confirmDemoPayment(repository, {
    role: "secretaria", expected, commandId, draft: input, recordedAt: timestamp,
  });
  return { storage, repository, state, draft, pay };
}

test("primeiro arranque é vazio; carregar não semeia nem grava", () => {
  const storage = new MemoryStorage();
  const repository = createLocalDemoRepository(storage);
  assert.deepEqual(repository.load(), { status: "empty" });
  assert.equal(storage.writes, 0);
});

test("exemplos têm relógio fixo, números permanentes únicos e pelo menos dois preços", () => {
  const a = createDemoState("example", { now: timestamp, datasetId: "scenario" });
  const b = createDemoState("example", { now: timestamp, datasetId: "scenario" });
  assert.deepEqual(a, b);
  assert.equal(new Set(a.students.map((student) => student.registrationNumber)).size, a.students.length);
  assert.ok(new Set(a.paymentRuleVersions.map((rule) => rule.monthlyFee)).size >= 2);
  assert.deepEqual(a.scenario.years?.map((year) => year.status), ["active", "preparing"]);
});

test("recarregar e abrir outro repositório conservam exactamente os dados guardados", () => {
  const { storage, state } = fixture();
  const raw = storage.getItem(demoStorageKey);
  const second = createLocalDemoRepository(storage);
  for (let count = 0; count < 3; count++) {
    const loaded = second.load();
    assert.equal(loaded.status, "ready");
    if (loaded.status === "ready") assert.deepEqual(loaded.state, state);
  }
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.writes, 1);
});

test("JSON ilegível e leitura bloqueada não repõem nem apagam o cenário", () => {
  const { storage, repository } = fixture();
  storage.values.set(demoStorageKey, "{incompleto");
  const result = repository.load();
  assert.equal(result.status, "error");
  assert.equal(storage.getItem(demoStorageKey), "{incompleto");
  assert.throws(() => repository.initialize(createDemoState("empty", { now: timestamp, datasetId: "other" })), /Já existem/);
  storage.failReads = true;
  assert.equal(repository.load().status, "error");
  assert.equal(storage.writes, 1);
});

test("grava pagamento, aplicações, recibo e histórico numa única escrita", () => {
  const { storage, state, pay } = fixture();
  const result = pay();
  assert.equal(storage.writes, 2);
  assert.equal(result.state.revision, state.revision + 1);
  assert.equal(result.state.operations.length, 1);
  assert.equal(result.state.receipts.length, 1);
  const record = result.state.paymentRecords.find((record) => record.studentId === result.receipt.studentId)!;
  assert.ok(record.payments.some((payment) => payment.id === result.receipt.paymentId));
  assert.ok(record.allocations.some((allocation) => allocation.paymentId === result.receipt.paymentId));
  assert.deepEqual(parseDemoSnapshot(storage.getItem(demoStorageKey)!).receipts, [result.receipt]);
});

test("duplo envio e resposta perdida recuperam o mesmo recibo, sem executar outra vez", () => {
  const { storage, pay } = fixture();
  const first = pay();
  const retry = pay();
  assert.equal(retry.replayed, true);
  assert.deepEqual(retry.receipt, first.receipt);
  assert.deepEqual(retry.state, first.state);
  assert.equal(storage.writes, 2);
});

test("mesmo ID com conteúdo diferente é rejeitado sem alteração", () => {
  const { storage, pay, draft, state } = fixture();
  pay();
  const raw = storage.getItem(demoStorageKey);
  assert.throws(() => pay("command-payment", state, { ...draft, amount: "1200" }), /operação diferente/);
  assert.equal(storage.getItem(demoStorageKey), raw);
});

test("falha de gravação conserva tudo e repetir a mesma tentativa grava uma vez", () => {
  const { storage, state, pay, draft } = fixture();
  const raw = storage.getItem(demoStorageKey);
  const originalDraft = cloneJson(draft);
  storage.failWrites = true;
  assert.throws(() => pay(), /Não foi possível guardar/);
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(state.operations.length, 0);
  assert.deepEqual(draft, originalDraft);
  storage.failWrites = false;
  assert.equal(pay().state.receipts.length, 1);
  assert.equal(storage.writes, 2);
});

test("revisão de outra aba bloqueia uma confirmação desactualizada", () => {
  const { storage, state, pay, draft } = fixture();
  pay("first-tab");
  const raw = storage.getItem(demoStorageKey);
  assert.throws(() => pay("second-tab", state, { ...draft, amount: "200" }), DemoConflictError);
  assert.equal(storage.getItem(demoStorageKey), raw);
});

test("Director é recusado no serviço, inclusive numa repetição já confirmada", () => {
  const { storage, repository, state, draft, pay } = fixture();
  pay();
  const raw = storage.getItem(demoStorageKey);
  assert.throws(() => confirmDemoPayment(repository, {
    role: "director", expected: state, commandId: "command-payment", draft, recordedAt: timestamp,
  }), /Director/);
  assert.throws(() => repository.replace(state, state, "director"), /Director/);
  assert.throws(() => repository.commit({ role: "director", action: "read-finance", expected: state,
    command: { id: "false-read", payload: {} }, change: () => ({ patch: { students: [] } }) }), /Director/);
  assert.equal(storage.getItem(demoStorageKey), raw);
});

test("substituir duas vezes o mesmo snapshot mantém contagens e saldos", () => {
  const { repository, state, pay } = fixture();
  const paid = pay().state;
  const raw = serializeDemoSnapshot(paid, timestamp);
  const imported = hydrateDemoState(parseDemoSnapshot(raw), raw, timestamp, "imported");
  const first = repository.replace(paid, imported, "secretaria");
  const second = repository.replace(first, imported, "secretaria");
  assert.deepEqual(second.students, paid.students);
  assert.deepEqual(second.paymentRecords, paid.paymentRecords);
  assert.deepEqual(second.receipts, paid.receipts);
  assert.equal(second.revision, state.revision + 3);
});

test("importação/reinicialização invalida uma aba aberta antes da substituição", () => {
  const { repository, state, pay } = fixture();
  repository.replace(state, createDemoState("empty", { now: timestamp, datasetId: "empty" }), "secretaria");
  assert.throws(() => pay(), DemoConflictError);
});

test("recusa IDs repetidos, relações quebradas, valor inválido e aplicações excessivas", () => {
  const { state } = fixture();
  const bad = cloneJson(state);
  bad.students.push(cloneJson(bad.students[0]));
  assert.throws(() => serializeDemoSnapshot(bad), /repetidos/);
  const broken = cloneJson(state);
  broken.students[0].groupId = "missing";
  assert.throws(() => serializeDemoSnapshot(broken), /inexistente/);
  const invalid = cloneJson(state);
  invalid.paymentRecords[0].payments[0].amount = -1;
  assert.throws(() => serializeDemoSnapshot(invalid), /monetário/);
  const overflow = cloneJson(state);
  overflow.paymentRecords[0].allocations[0].amount = 999999;
  assert.throws(() => serializeDemoSnapshot(overflow), /excedem/);
});

test("formato anterior conserva IDs, pagamentos, multas e bytes originais na primeira escrita", () => {
  const storage = new MemoryStorage();
  const legacy = {
    schemaVersion: 2, academicStages: initialAcademicStages, classDefinitions: initialClassDefinitions,
    roomDefinitions: initialRoomDefinitions, classes: initialClasses, groups: initialGroups,
    rooms: initialRooms, students: initialStudents, paymentSettings: initialPaymentSettings,
    paymentRecords: initialPaymentRecords, billingRuns: [],
  };
  const raw = JSON.stringify(legacy, null, 1);
  storage.values.set(demoStorageKey, raw);
  const repository = createLocalDemoRepository(storage, { now: () => timestamp, newId: () => "legacy-identity" });
  const loaded = repository.load();
  assert.equal(loaded.status, "ready");
  if (loaded.status !== "ready") return;
  assert.equal(storage.writes, 0);
  assert.deepEqual(loaded.state.paymentRecords, legacy.paymentRecords);
  assert.deepEqual(loaded.state.students.map((student) => student.id), initialStudents.map((student) => student.id));
  assert.ok(loaded.state.migrationWarnings?.length);
  const committed = repository.commit({
    role: "secretaria", action: "manage-academic-structure", expected: loaded.state,
    command: { id: "first-write", payload: { kind: "noop-test" } }, change: () => ({ patch: {} }),
  });
  assert.equal(committed.state.legacySource?.raw, raw);
  assert.deepEqual(committed.state.paymentRecords, legacy.paymentRecords);
});

test("recuperação explícita guarda o original ilegível e recusa mudança entretanto ocorrida", () => {
  const storage = new MemoryStorage();
  storage.values.set(demoStorageKey, "{bad");
  const repository = createLocalDemoRepository(storage, { now: () => timestamp });
  const incoming = createDemoState("empty", { now: timestamp, datasetId: "incoming" });
  const restored = repository.recover("{bad", incoming, "secretaria");
  assert.equal(restored.recoverySource?.raw, "{bad");
  assert.throws(() => repository.recover("{bad", incoming, "secretaria"), DemoConflictError);
});

test("falha ao substituir/importar não apaga o cenário activo", () => {
  const { storage, repository, state } = fixture();
  const original = storage.getItem(demoStorageKey);
  storage.failWrites = true;
  assert.throws(() => repository.replace(state, createDemoState("empty", {
    now: timestamp, datasetId: "replacement",
  }), "secretaria"), /Não foi possível guardar/);
  assert.equal(storage.getItem(demoStorageKey), original);
});

test("versão desconhecida guardada não é convertida nem substituída", () => {
  const { storage, repository, state } = fixture();
  const raw = JSON.stringify({ ...state, schemaVersion: 99 });
  storage.values.set(demoStorageKey, raw);
  const result = repository.load();
  assert.equal(result.status, "error");
  assert.equal(storage.getItem(demoStorageKey), raw);
  assert.equal(storage.writes, 1);
});
