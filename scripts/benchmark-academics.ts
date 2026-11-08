import { performance } from "node:perf_hooks";
import { createDemoState, type DemoState } from "../app/features/demo/demo-state";
import { academicStateFor, groupOccupancy, searchPeople } from "../app/features/academics/model";
import { buildLedger, buildPaymentRecord, getMonthsInRange } from "../app/components/school-admin-demo.model";

// Deterministic synthetic records; this measures domain work, not browser rendering.
for (const count of [100, 300]) {
  const state: DemoState = createDemoState("example", { now: "2026-11-08T12:00:00.000Z", datasetId: `benchmark-${count}` });
  const source = state.students[0];
  state.groups = Array.from({ length: Math.ceil(count / 30) }, (_, index) => ({ ...state.groups[0], id: `synthetic-group-${index}`, name: `Turma ${index + 1}`, capacity: 30, roomId: `synthetic-room-${index}` }));
  state.rooms = state.groups.map((group, index) => ({ ...state.rooms[0], id: group.roomId, name: `Sala ${index + 1}`, capacity: 30 }));
  state.students = Array.from({ length: count }, (_, index) => ({ ...source, id: `synthetic-${index}`, enrollmentId: `ENR-synthetic-${index}`, groupId: `synthetic-group-${Math.floor(index / 30)}`, stableNumber: String(index % 30 + 1).padStart(3, "0"), registrationNumber: `LSS-${String(index + 1).padStart(6, "0")}`, fullName: `Aluno sintético ${String(index + 1).padStart(4, "0")}` }));
  state.paymentRecords = state.students.map((student) => buildPaymentRecord(student.id));
  state.academic = undefined;
  const academic = academicStateFor(state);
  const startSearch = performance.now();
  for (let iteration = 0; iteration < 100; iteration++) searchPeople(academic, state.students, "sintetico 0099");
  const searchMs = (performance.now() - startSearch) / 100;
  const startOccupancy = performance.now();
  const occupancy = groupOccupancy(academic, state.groups[0].id, "2026-11-08");
  const occupancyMs = performance.now() - startOccupancy;
  const startLedger = performance.now();
  const months = getMonthsInRange(state.paymentSettings.startMonth, state.paymentSettings.endMonth);
  const rows = state.students.map((student) => buildLedger(student, state.paymentRecords.find((record) => record.studentId === student.id)!, months, state.paymentSettings, "2026-11-08", state.paymentRuleVersions));
  console.log(JSON.stringify({ students: count, searchMeanMs: Number(searchMs.toFixed(2)), occupancy, occupancyMs: Number(occupancyMs.toFixed(2)), financialRows: rows.length, financialDomainMs: Number((performance.now() - startLedger).toFixed(2)) }));
}
