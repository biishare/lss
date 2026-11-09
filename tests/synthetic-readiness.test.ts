import test from "node:test";
import assert from "node:assert/strict";
import { syntheticClock, syntheticSchool } from "../scripts/synthetic-school";
import { queryReport, reportSource, defaultReportFilters } from "../app/features/reports/model";
import { reportCsv } from "../app/features/reports/export";
import { searchPeople } from "../app/features/academics/model";
import { verifyBackup } from "../app/features/continuity/backups";
import { serializeDemoSnapshot } from "../app/features/demo/local-repository";

for (const count of [100, 300]) test(`ensaio ${count} alunos: pesquisa privada, lista, CSV integral e restauro reconciliam`, () => {
  const state = syntheticSchool(count), source = reportSource(state, syntheticClock), filters = defaultReportFilters("2026", syntheticClock);
  assert.equal(source.academic.people.length, count); assert.equal(searchPeople(source.academic, state.students, "sintetico 0099").length, 1);
  const received = queryReport(source, filters); assert.equal(received.count, count); assert.equal(received.total, count * 1000);
  assert.equal(received.rows.slice(0, 50).length, 50); assert.equal(reportCsv(received).split("\r\n").length, count + 2);
  const filtered = queryReport(source, { ...filters, search: "sintético 0099" }); assert.equal(filtered.count, 1); assert.equal(filtered.total, 1000);
  const restored = verifyBackup(serializeDemoSnapshot(state), syntheticClock); assert.equal(restored.summary.people, count); assert.equal(restored.summary.received, count * 1000);
});
