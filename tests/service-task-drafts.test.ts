import assert from "node:assert/strict";
import { test } from "node:test";
import { readServiceTaskDrafts, saveServiceTaskDrafts, serviceDraftsKey, serviceTaskKey, isPaymentForm, type ServiceTaskDraft } from "../app/features/finance/service-task-drafts";
import { choiceForCell, paymentContext } from "../app/features/finance/payment-context";
import { phase6Fixture } from "./helpers/phase6-fixture";

test("rascunhos de operações distintas conservam campos, datas e IDs próprios", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const refund: ServiceTaskDraft = { id: "refund-id", recordedAt: "2026-05-05T08:00:00Z", command: { kind: "refund", studentId: "s1", paymentId: "p1", amount: "150", effectiveOn: "2026-05-05", reason: "Pedido", method: "Numerário" } };
  const proof: ServiceTaskDraft = { id: "review-id", recordedAt: "2026-05-05T09:00:00Z", command: { kind: "review-proof", proofId: "proof-1", confirm: false, decision: "Evidência por completar" } };
  const tasks = { [serviceTaskKey(refund.command)]: refund, [serviceTaskKey(proof.command)]: proof };
  saveServiceTaskDrafts(storage, "school", tasks);
  assert.deepEqual(readServiceTaskDrafts(storage, "school"), tasks);
  assert.equal(values.size, 1);
  const raw = values.get(serviceDraftsKey("school"));
  assert.throws(() => saveServiceTaskDrafts({ setItem() { throw new Error("Quota"); } }, "school", tasks));
  assert.equal(values.get(serviceDraftsKey("school")), raw);
});

test("leitura de rascunho recusa dados inválidos, outro cenário e operações já aplicadas", () => {
  const key = serviceDraftsKey("school");
  const values = new Map([[key, "{incompleto"]]);
  const storage = { getItem: (name: string) => values.get(name) ?? null };
  assert.deepEqual(readServiceTaskDrafts(storage, "school"), {});
  assert.equal(values.get(key), "{incompleto");
  values.set(key, JSON.stringify({ version: 2, datasetId: "other", tasks: [] }));
  assert.deepEqual(readServiceTaskDrafts(storage, "school"), {});
  values.delete(key);
  values.set("lss-service-draft-school", JSON.stringify({ id: "previous", command: { kind: "review-proof", proofId: "proof", confirm: true, decision: "Conferido" } }));
  assert.equal(Object.values(readServiceTaskDrafts(storage, "school"))[0].id, "previous");
  assert.deepEqual(readServiceTaskDrafts(storage, "school", ["previous"]), {});
  values.set("lss-service-draft-school", JSON.stringify({ id: "unsafe", command: { kind: "refund", amount: {}, studentId: "s" } }));
  assert.deepEqual(readServiceTaskDrafts(storage, "school"), {});
});

test("formulário recuperado valida também os destinos adicionais", () => {
  const f = phase6Fixture();
  assert.equal(isPaymentForm(f.draft()), true);
  assert.equal(isPaymentForm({ ...f.draft(), additionalTargets: [{ studentId: "s", chargeId: "c", amount: {} }] }), false);
  assert.equal(isPaymentForm({ ...f.draft(), category: "unknown" }), false);
});

test("escolhas de cobrança reutilizam o ledger sem gravar e deixam de oferecer item liquidado", () => {
  const f = phase6Fixture(), before = JSON.stringify(f.state), writes = f.writes;
  const selection = { kind: "tuition" as const, studentId: "student-001", monthKey: "may" };
  const choice = choiceForCell(f.state, selection, f.time);
  assert.equal(choice?.draft.studentId, "student-001");
  assert.equal(choice?.draft.monthKey, "may");
  assert.equal(choice?.balance, 1000);
  assert.equal(choice?.forecast, false);
  assert.equal(choice?.requiresAnticipation, false);
  assert.ok(paymentContext(f.state, "student-001", f.time)?.choices.some((item) => item.forecast));
  assert.equal(JSON.stringify(f.state), before);
  assert.equal(f.writes, writes);
  f.pay();
  assert.equal(choiceForCell(f.state, selection, f.time), undefined);
  assert.equal(choiceForCell(f.state, { kind: "debt", studentId: "student-001" }, f.time), undefined);
});
