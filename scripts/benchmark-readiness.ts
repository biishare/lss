import { performance } from "node:perf_hooks";
import { syntheticClock, syntheticSchool } from "./synthetic-school";
import { academicStateFor, searchPeople } from "../app/features/academics/model";
import { buildLedger, getMonthsInRange } from "../app/components/school-admin-demo.model";
import { queryReport, reportSource, defaultReportFilters } from "../app/features/reports/model";
import { reportCsv } from "../app/features/reports/export";

function measured<T>(run: () => T) { const start = performance.now(); const value = run(); return { value, ms: Number((performance.now() - start).toFixed(2)) }; }
const results = [];
for (const students of [100, 300]) {
  const state = syntheticSchool(students), academic = academicStateFor(state), query = "sintetico 0099";
  const search = measured(() => { for (let i = 0; i < 100; i++) searchPeople(academic, state.students, query); return searchPeople(academic, state.students, query).length; });
  const months = getMonthsInRange(state.paymentSettings.startMonth, state.paymentSettings.endMonth);
  const spreadsheet = measured(() => state.students.map((student) => buildLedger(student, state.paymentRecords.find((item) => item.studentId === student.id)!, months, state.paymentSettings, "2026-05-14", state.paymentRuleVersions)));
  const preparation = measured(() => reportSource(state, syntheticClock)), source = preparation.value;
  const filters = defaultReportFilters("2026", syntheticClock);
  const reports = measured(() => ["receipts", "refunds", "allocations", "overdue", "due", "forecast", "benefits", "credit", "enrollments", "occupancy"].map((kind) => queryReport(source, { ...filters, kind: kind as typeof filters.kind })));
  const received = reports.value[0], csv = measured(() => reportCsv(received));
  results.push({ students, searchMeanMs: Number((search.ms / 100).toFixed(2)), searchMatches: search.value, spreadsheetRows: spreadsheet.value.length, spreadsheetDomainMs: spreadsheet.ms, reportPreparationMs: preparation.ms, allTenReportsMs: reports.ms, receivedRows: received.count, receivedTotal: received.total, csvRows: csv.value.split("\r\n").length - 2, csvMs: csv.ms });
}
console.log(JSON.stringify({ clock: syntheticClock, runtime: process.version, scope: "Domínio e serialização; não mede renderização, rede ou teclado virtual.", results }, null, 2));
