import { createDemoState, withFinanceMirror, type DemoState } from "../app/features/demo/demo-state";
import { academicStateFor } from "../app/features/academics/model";
import { buildPaymentRecord } from "../app/components/school-admin-demo.model";
import { prepareBilling } from "../app/features/finance/billing-commands";
import { cashActor, type CashBook } from "../app/features/cash/model";
import { validateDemoState } from "../app/features/demo/snapshot-validation";

export const syntheticClock = "2026-05-14T08:00:00.000Z";

// Reproducible fixtures, isolated from the example school and any browser data.
export function syntheticSchool(count: number): DemoState {
  if (!Number.isInteger(count) || count < 1 || count > 300) throw new Error("Use 1 a 300 alunos sintéticos.");
  let state = createDemoState("example", { now: syntheticClock, datasetId: `synthetic-${count}` });
  const source = state.students[0], originalRoom = state.rooms[0], originalDefinition = state.roomDefinitions[0];
  state.groups = Array.from({ length: Math.ceil(count / 30) }, (_, index) => ({ ...state.groups[0], id: `synthetic-group-${index}`, name: `Turma sintética ${index + 1}`, capacity: 30, roomId: `synthetic-room-${index}` }));
  state.rooms = state.groups.map((group, index) => ({ ...originalRoom, id: group.roomId, name: `Sala sintética ${index + 1}`, capacity: 30 }));
  state.roomDefinitions = state.rooms.map((room) => ({ ...originalDefinition, id: room.id, name: room.name, capacity: 30 }));
  state.students = Array.from({ length: count }, (_, index) => ({ ...source, id: `synthetic-${index}`, personId: `person-synthetic-${index}`, enrollmentId: `ENR-synthetic-${index}`, groupId: `synthetic-group-${Math.floor(index / 30)}`, stableNumber: String(index % 30 + 1).padStart(3, "0"), registrationNumber: `LSS-SYN-${String(index + 1).padStart(6, "0")}`, fullName: `Aluno sintético ${String(index + 1).padStart(4, "0")}`, guardianName: "Encarregado sintético", guardianPhone: "", enrollmentDate: "2026-05-01", tuitionStartMonth: "may", createdAt: "2026-05-01T08:00:00.000Z", financialProfile: { status: "regular" as const, discountPercent: 0 } }));
  state.paymentRecords = state.students.map((student) => ({ ...buildPaymentRecord(student.id), billingVersion: 3 as const, financialAid: [] }));
  state.receipts = []; state.paymentProofs = []; state.academic = undefined;
  Object.assign(state, prepareBilling(state, syntheticClock));
  for (const rule of state.paymentRuleVersions.filter((item) => item.calculationVersion === "v3")) { rule.inscriptionFee = 500; rule.monthlyFee = 1000; rule.monthlyDueDay = 10; }
  state.paymentRecords = state.students.map((student) => ({ ...buildPaymentRecord(student.id), billingVersion: 3 as const, financialAid: [] }));
  Object.assign(state, prepareBilling(state, syntheticClock));
  state.academic = academicStateFor(state);
  const book: CashBook = { version: 1, sessions: [{ id: "synthetic-cash", businessDate: "2026-05-14", actorId: cashActor.id, actorName: cashActor.name, openedAt: "2026-05-14T07:00:00.000Z", openingAmount: 100, openingMode: "manual", status: "open" }], movements: [], adjustments: [] };
  for (const [index, record] of state.paymentRecords.entries()) {
    const charge = record.charges.find((item) => item.monthKey === "may")!;
    const paymentId = `synthetic-payment-${index}`;
    record.payments.push({ id: paymentId, studentId: record.studentId, amount: 1000, paidOn: "2026-05-14", effectivePaymentDate: "2026-05-14", recordedAt: syntheticClock, recordedBy: cashActor.name, method: "Numerário" });
    record.allocations.push({ id: `synthetic-allocation-${index}`, paymentId, chargeId: charge.id, amount: 1000 });
    book.movements.push({ id: `synthetic-cash-movement-${index}`, sessionId: "synthetic-cash", kind: "receipt", amount: 1000, method: "Numerário", effectiveOn: "2026-05-14", recordedAt: syntheticClock, actorId: cashActor.id, actorName: cashActor.name, studentName: state.students[index].fullName, description: "Recebimento sintético para medição", source: { studentId: record.studentId, paymentId } });
  }
  state.cashBook = book;
  state = withFinanceMirror(state, syntheticClock);
  validateDemoState(state);
  return state;
}
