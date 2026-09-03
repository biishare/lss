import assert from "node:assert/strict";
import test from "node:test";
import {
  demoSnapshotSchema,
  demoSnapshotVersion,
  parseDemoSnapshot,
  serializeDemoSnapshot,
} from "../app/features/demo/local-repository.ts";

const sampleState = {
  students: [{ id: "student-1", fullName: "Ana Demo" }],
  classes: [],
  paymentRecords: [],
  paymentSettings: { academicYear: "2026" },
};

test("exporta e reimporta um snapshot v2 sem alterar os dados", () => {
  const exportedAt = "2026-09-03T12:00:00.000Z";
  const raw = serializeDemoSnapshot(sampleState, exportedAt);
  const envelope = JSON.parse(raw) as Record<string, unknown>;

  assert.equal(envelope.schema, demoSnapshotSchema);
  assert.equal(envelope.version, demoSnapshotVersion);
  assert.equal(envelope.exportedAt, exportedAt);
  assert.deepEqual(parseDemoSnapshot(raw), sampleState);
});

test("aceita o formato local antigo para preservar trabalho existente", () => {
  assert.deepEqual(parseDemoSnapshot(JSON.stringify(sampleState)), sampleState);
});

test("recusa JSON inválido e não devolve um estado parcial", () => {
  assert.throws(() => parseDemoSnapshot("{incompleto"), /JSON válido/);
});

test("recusa versões futuras sem substituir os dados atuais", () => {
  assert.throws(
    () =>
      parseDemoSnapshot(
        JSON.stringify({
          schema: demoSnapshotSchema,
          version: demoSnapshotVersion + 1,
          data: sampleState,
        }),
      ),
    /versão.*não é suportada/i,
  );
});

test("recusa campos de coleção com tipos incompatíveis", () => {
  assert.throws(
    () => parseDemoSnapshot(JSON.stringify({ students: "Ana" })),
    /students.*lista/,
  );
});
