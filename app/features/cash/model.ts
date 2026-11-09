import type { DemoState } from "../demo/demo-state";
import { cloneJson } from "../demo/demo-state";
import { cents, money } from "../finance/domain/money";
import { schoolToday } from "../finance/domain/billing";

export const cashActor = { id: "demo-secretaria", name: "Marta — Secretaria" };
export type CashMovement = {
  id: string; sessionId: string; kind: "receipt" | "refund" | "expense" | "float";
  amount: number; method: string; effectiveOn: string; recordedAt: string;
  actorId: string; actorName: string; studentName?: string; registrationNumber?: string; description: string; category?: string; document?: string;
  source?: { studentId: string; paymentId: string; refundId?: string };
};
export type CashAdjustment = {
  id: string; movementId: string; reason: string; recordedAt: string; actorId: string; actorName: string;
  before: { studentId: string; paymentId: string; method: string; effectiveOn: string; studentName?: string; registrationNumber?: string };
  after: { studentId: string; paymentId: string; method: string; effectiveOn: string; studentName?: string; registrationNumber?: string };
};
export type CashTotals = {
  receipts: number; refunds: number; expenses: number; floats: number; expectedCashCents: number;
  methods: Array<{ method: string; receipts: number; refunds: number; expenses: number; floats: number; netCents: number }>;
};
export type CashSession = {
  id: string; businessDate: string; actorId: string; actorName: string;
  openedAt: string; openingAmount: number; openingMode: "manual" | "automatic";
  status: "open" | "closed"; closedAt?: string; countedAmount?: number;
  differenceCents?: number; reason?: string;
  snapshot?: { movements: CashMovement[]; totals: CashTotals; recordedAt: string; schoolName?: string; adjustmentIds?: string[] };
};
export type CashBook = { version: 1; sessions: CashSession[]; movements: CashMovement[]; adjustments: CashAdjustment[] };
export const emptyCashBook = (): CashBook => ({ version: 1, sessions: [], movements: [], adjustments: [] });
export const activeCashSession = (book?: CashBook) => book?.sessions.find((item) => item.status === "open");
export const signedMoney = (value: number) => value / 100;

export function restateCashMovement(book: CashBook, movement: CashMovement, until?: string, adjustmentIds?: string[]): CashMovement {
  const next = cloneJson(movement);
  for (const item of book.adjustments.filter((item) => item.movementId === movement.id && (adjustmentIds ? adjustmentIds.includes(item.id) : !until || item.recordedAt <= until))) {
    next.method = item.after.method; next.effectiveOn = item.after.effectiveOn; next.studentName = item.after.studentName; next.registrationNumber = item.after.registrationNumber;
    if (next.source) next.source = { ...next.source, studentId: item.after.studentId, paymentId: item.after.paymentId };
  }
  return next;
}
export function sessionMovements(book: CashBook, sessionId: string, until?: string, adjustmentIds?: string[]) {
  return book.movements.filter((item) => item.sessionId === sessionId).map((item) => restateCashMovement(book, item, until, adjustmentIds));
}
export function cashTotals(openingAmount: number, movements: CashMovement[]): CashTotals {
  const methods = [...new Set(movements.map((item) => item.method))].sort().map((method) => {
    const sum = (kind: CashMovement["kind"]) => money(movements.filter((item) => item.method === method && item.kind === kind).reduce((sum, item) => sum + cents(item.amount), 0));
    const receipts = sum("receipt"), refunds = sum("refund"), expenses = sum("expense"), floats = sum("float");
    return { method, receipts, refunds, expenses, floats, netCents: cents(receipts) + cents(floats) - cents(refunds) - cents(expenses) };
  });
  const total = (kind: CashMovement["kind"]) => money(movements.filter((item) => item.kind === kind).reduce((sum, item) => sum + cents(item.amount), 0));
  return { receipts: total("receipt"), refunds: total("refund"), expenses: total("expense"), floats: total("float"),
    expectedCashCents: cents(openingAmount) + (methods.find((item) => item.method === "Numerário")?.netCents ?? 0), methods };
}
export function ensureOpenCash(book: CashBook, recordedAt: string, id: string) {
  const day = schoolToday({ now: () => recordedAt });
  let session = activeCashSession(book);
  if (session && session.businessDate !== day) throw new Error(`Feche o caixa de ${session.businessDate} antes de registar movimentos de outro dia.`);
  if (!session) {
    session = { id: `CASH-${id}`, businessDate: day, actorId: cashActor.id, actorName: cashActor.name,
      openedAt: recordedAt, openingAmount: 0, openingMode: "automatic", status: "open" };
    book.sessions.push(session);
  }
  return session;
}
export function captureCashMovement(book: CashBook, input: Omit<CashMovement, "sessionId" | "actorId" | "actorName">) {
  if (book.movements.some((item) => item.id === input.id)) throw new Error("O movimento de caixa já foi registado.");
  const session = ensureOpenCash(book, input.recordedAt, input.id);
  book.movements.push({ ...input, sessionId: session.id, actorId: cashActor.id, actorName: cashActor.name });
  return book;
}
export function cashForPayment(state: DemoState, input: { id: string; studentId: string; paymentId: string; amount: number; method: string; effectiveOn: string; recordedAt: string; replaces?: { studentId: string; paymentId: string }; reason?: string }) {
  const book = cloneJson(state.cashBook ?? emptyCashBook());
  if (input.replaces) {
    const current = book.movements.find((item) => {
      const row = restateCashMovement(book, item);
      return row.kind === "receipt" && row.source?.studentId === input.replaces!.studentId && row.source.paymentId === input.replaces!.paymentId;
    });
    // An older receipt without a cash session stays explicitly unassigned.
    if (!current) return state.cashBook;
    const previous = restateCashMovement(book, current);
    book.adjustments.push({ id: `CASH-ADJ-${input.id}`, movementId: current.id, reason: input.reason ?? "Correcção de recebimento", recordedAt: input.recordedAt,
      actorId: cashActor.id, actorName: cashActor.name, before: { studentId: previous.source!.studentId, paymentId: previous.source!.paymentId, method: previous.method, effectiveOn: previous.effectiveOn, studentName: previous.studentName, registrationNumber: previous.registrationNumber },
      after: { studentId: input.studentId, paymentId: input.paymentId, method: input.method, effectiveOn: input.effectiveOn, studentName: state.students.find((item) => item.id === input.studentId)?.fullName, registrationNumber: state.students.find((item) => item.id === input.studentId)?.registrationNumber } });
    return book;
  }
  return captureCashMovement(book, { id: `CASH-PAY-${input.id}`, kind: "receipt", amount: input.amount, method: input.method,
    effectiveOn: input.effectiveOn, recordedAt: input.recordedAt, description: "Recebimento confirmado", studentName: state.students.find((item) => item.id === input.studentId)?.fullName, registrationNumber: state.students.find((item) => item.id === input.studentId)?.registrationNumber, source: { studentId: input.studentId, paymentId: input.paymentId } });
}
