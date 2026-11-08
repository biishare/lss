import assert from "node:assert/strict";
import test from "node:test";
import { readDemoDrafts, writeDemoDrafts, demoDraftKey, type DemoDrafts } from "../app/features/demo/draft-storage.ts";

const drafts: DemoDrafts = {
  datasetId: "scenario-a", paymentCommandId: "same-attempt",
  payment: { studentId: "student", category: "tuition", monthKey: "jun", targetChargeId: "", amount: "1234",
    paidOn: "2026-06-08", method: "Numerário", description: "", allowFutureAllocation: false },
  enrollment: { fullName: "Aluno Exemplo", guardianName: "Encarregado Exemplo", guardianPhone: "000000000",
    enrollmentType: "new", enrollmentDate: "2026-06-01", tuitionStartMonth: "jun", financeStatus: "regular",
    discountPercent: "0", exceptionStartMonth: "jun", exceptionEndMonth: "nov", exceptionReason: "", classId: "7", groupId: "7A" },
};

test("rascunhos preservam campos e ID da tentativa apenas no cenário de origem", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  writeDemoDrafts(storage, drafts);
  const restored = readDemoDrafts(storage, "scenario-a");
  assert.equal(restored?.payment.amount, "1234");
  assert.equal(restored?.enrollment.fullName, "Aluno Exemplo");
  assert.equal(restored?.paymentCommandId, "same-attempt");
  assert.equal(readDemoDrafts(storage, "scenario-b"), null);
});

test("rascunho inválido ou armazenamento bloqueado não altera dados nem impede carregamento", () => {
  let writes = 0;
  const storage = { getItem: () => "{bad", setItem: () => { writes++; } };
  assert.equal(readDemoDrafts(storage, "scenario-a"), null);
  assert.equal(writes, 0);
  assert.equal(readDemoDrafts({ ...storage, getItem: () => { throw new Error("blocked"); } }, "scenario-a"), null);
  const invalid = JSON.stringify({ ...drafts, version: 1, payment: { amount: [] } });
  assert.equal(readDemoDrafts({ ...storage, getItem: (key) => key === demoDraftKey ? invalid : null }, "scenario-a"), null);
});
