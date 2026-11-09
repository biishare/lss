import type { DemoState } from "../demo/demo-state";
import { cents } from "../finance/domain/money";
import { validDate, schoolToday } from "../finance/domain/billing";
import { paymentMethods } from "../../components/school-admin-demo.model";
import { cashTotals, sessionMovements, type CashBook } from "./model";

export function validateCashBook(value: Record<string, unknown>) {
  if (value.cashBook === undefined) return;
  const state = value as unknown as DemoState, book = state.cashBook as CashBook;
  const fail = (): never => { throw new Error("Os dados não são válidos: caixa, movimentos ou fecho inconsistentes."); };
  const list = (items: unknown): void => { if (!Array.isArray(items) || items.some((item) => !item || typeof item !== "object")) fail(); };
  const text = (input: unknown) => typeof input === "string" && input.trim().length > 0;
  const instant = (input: unknown) => typeof input === "string" && Number.isFinite(Date.parse(input));
  const signed = (input: unknown) => typeof input === "number" && Number.isSafeInteger(input);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!book || book.version !== 1) fail();
  list(book.sessions); list(book.movements); list(book.adjustments);
  const ids = new Set<string>(), sources = new Set<string>();
  const unique = (id: string) => { if (!text(id) || ids.has(id)) fail(); ids.add(id); };
  if (book.sessions.filter((item) => item.status === "open").length > 1) fail();
  for (const session of book.sessions) {
    unique(session.id); cents(session.openingAmount);
    if (!["open", "closed"].includes(session.status) || !["manual", "automatic"].includes(session.openingMode) || !validDate(session.businessDate) || !instant(session.openedAt) || !text(session.actorId) || !text(session.actorName) || schoolToday({ now: () => session.openedAt }) !== session.businessDate) fail();
  }
  for (const movement of book.movements) {
    unique(movement.id);
    const session = book.sessions.find((item) => item.id === movement.sessionId);
    if (!session || !["receipt", "refund", "expense", "float"].includes(movement.kind) || !paymentMethods.includes(movement.method) || !validDate(movement.effectiveOn) || !instant(movement.recordedAt) || movement.recordedAt < session.openedAt || (session.closedAt && movement.recordedAt > session.closedAt) || movement.actorId !== session.actorId || !text(movement.description) || cents(movement.amount) <= 0) fail();
    if (movement.kind === "receipt" || movement.kind === "refund") {
      const source = movement.source;
      const record = state.paymentRecords.find((item) => item.studentId === source?.studentId);
      const payment = record?.payments.find((item) => item.id === source?.paymentId);
      if (!source || !record || !payment || (movement.kind === "receipt" && payment.kind === "credit-application")) fail();
      const key = movement.kind === "refund" ? `refund:${source!.refundId}` : `payment:${source!.studentId}:${source!.paymentId}`;
      if (sources.has(key)) fail(); sources.add(key);
      if (movement.kind === "receipt" && payment!.amount !== movement.amount) fail();
      if (movement.kind === "refund" && !record!.creditDebits?.some((item) => item.kind === "refund" && item.id === source!.refundId && item.paymentId === source!.paymentId && item.amount === movement.amount && item.method === movement.method && item.effectiveOn === movement.effectiveOn)) fail();
    } else if (!text(movement.category)) fail();
  }
  const lastSource = new Map(book.movements.filter((item) => item.kind === "receipt").map((item) => [item.id, { studentId: item.source!.studentId, paymentId: item.source!.paymentId, method: item.method, effectiveOn: item.effectiveOn }]));
  for (const adjustment of book.adjustments) {
    unique(adjustment.id);
    const movement = book.movements.find((item) => item.id === adjustment.movementId);
    if (!movement || movement.kind !== "receipt" || !text(adjustment.reason) || !instant(adjustment.recordedAt) || adjustment.recordedAt < movement.recordedAt || !text(adjustment.actorId) || !adjustment.before || !adjustment.after) fail();
    const previous = lastSource.get(adjustment.movementId);
    if (!previous || previous.studentId !== adjustment.before.studentId || previous.paymentId !== adjustment.before.paymentId || previous.method !== adjustment.before.method || previous.effectiveOn !== adjustment.before.effectiveOn) fail();
    lastSource.set(adjustment.movementId, adjustment.after);
    const before = state.paymentRecords.find((item) => item.studentId === adjustment.before.studentId)?.payments.find((item) => item.id === adjustment.before.paymentId);
    const after = state.paymentRecords.find((item) => item.studentId === adjustment.after.studentId)?.payments.find((item) => item.id === adjustment.after.paymentId);
    if (!before || !after || !before.reversedBy || after.replaces?.paymentId !== before.id || after.replaces.studentId !== before.studentId || before.amount !== after.amount || adjustment.after.method !== after.method || adjustment.after.effectiveOn !== (after.effectivePaymentDate ?? after.paidOn)) fail();
  }
  for (const session of book.sessions) {
    if (session.status === "open") { if (session.snapshot || session.closedAt || session.countedAmount !== undefined) fail(); continue; }
    if (!instant(session.closedAt) || session.closedAt! < session.openedAt || !session.snapshot || session.countedAmount === undefined || !signed(session.differenceCents)) fail();
    cents(session.countedAmount!); list(session.snapshot!.movements);
    if (session.snapshot!.adjustmentIds !== undefined && (!Array.isArray(session.snapshot!.adjustmentIds) || session.snapshot!.adjustmentIds.some((id) => !book.adjustments.some((item) => item.id === id)))) fail();
    const rows = sessionMovements(book, session.id, session.closedAt, session.snapshot!.adjustmentIds), totals = cashTotals(session.openingAmount, rows);
    if (!same(session.snapshot!.movements, rows) || !same(session.snapshot!.totals, totals) || session.snapshot!.recordedAt !== session.closedAt || session.differenceCents !== cents(session.countedAmount!) - totals.expectedCashCents || (session.differenceCents && !text(session.reason))) fail();
  }
}
