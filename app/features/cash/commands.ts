import { cloneJson, type DemoState } from "../demo/demo-state";
import type { DemoRepository } from "../demo/local-repository";
import { schoolToday } from "../finance/domain/billing";
import { cents, money } from "../finance/domain/money";
import { paymentMethods } from "../../components/school-admin-demo.model";
import { activeCashSession, cashActor, cashTotals, emptyCashBook, sessionMovements, type CashSession } from "./model";

export type CashCommand =
  | { kind: "open"; openingAmount: string }
  | { kind: "expense" | "float"; amount: string; method: string; category: string; reason: string; document: string }
  | { kind: "close"; sessionId: string; countedAmount: string; reason: string };
export type CashOptions = { id: string; role: "director" | "secretaria"; recordedAt: string };
export function planCash(state: DemoState, command: CashCommand, options: CashOptions) {
  if (options.role !== "secretaria") throw new Error("O Director pode consultar, mas não pode alterar o caixa.");
  const book = cloneJson(state.cashBook ?? emptyCashBook()), current = activeCashSession(book);
  const today = schoolToday({ now: () => options.recordedAt });
  if (command.kind === "open") {
    if (current) throw new Error("Já existe uma sessão de caixa aberta. Feche-a antes de abrir outra.");
    const session: CashSession = { id: `CASH-${options.id}`, businessDate: today, actorId: cashActor.id, actorName: cashActor.name, openedAt: options.recordedAt,
      openingAmount: money(cents(command.openingAmount)), openingMode: "manual", status: "open" };
    book.sessions.push(session);
    return { book, message: "Caixa aberto.", details: [`Abertura: ${session.openingAmount} MT`, `Responsável: ${session.actorName}`] };
  }
  if (!current || (command.kind === "close" && current.id !== command.sessionId)) throw new Error("Seleccione a sessão de caixa aberta.");
  if (command.kind === "close") {
    const counted = cents(command.countedAmount), rows = sessionMovements(book, current.id);
    const totals = cashTotals(current.openingAmount, rows), difference = counted - totals.expectedCashCents;
    if (difference && !command.reason.trim()) throw new Error("Justifique a diferença entre o numerário esperado e o contado.");
    current.status = "closed"; current.closedAt = options.recordedAt; current.countedAmount = money(counted);
    current.differenceCents = difference; current.reason = command.reason.trim(); current.snapshot = { movements: rows, totals, recordedAt: options.recordedAt, adjustmentIds: book.adjustments.map((item) => item.id), schoolName: state.academic?.institution.name ?? "Liceu São Silvestre" };
    return { book, message: "Fecho guardado. O retrato e a contagem ficam preservados.", details: [`Numerário esperado: ${totals.expectedCashCents / 100} MT`, `Contado: ${current.countedAmount} MT`, `Diferença: ${difference / 100} MT`] };
  }
  if (current.businessDate !== today) throw new Error("Feche o caixa do dia anterior antes de registar novas saídas ou reforços.");
  const amount = cents(command.amount);
  if (!amount || !command.reason.trim() || !command.category.trim()) throw new Error("Indique valor, categoria e motivo.");
  if (!paymentMethods.includes(command.method)) throw new Error("Seleccione uma forma válida.");
  const totals = cashTotals(current.openingAmount, sessionMovements(book, current.id));
  if (command.kind === "expense" && command.method === "Numerário" && amount > totals.expectedCashCents) throw new Error("A saída excede o numerário esperado. Registe um reforço de caixa quando aplicável.");
  book.movements.push({ id: `CASH-MOV-${options.id}`, sessionId: current.id, kind: command.kind, amount: money(amount), method: command.method,
    effectiveOn: today, recordedAt: options.recordedAt, actorId: cashActor.id, actorName: cashActor.name, category: command.category.trim(),
    description: command.reason.trim(), document: command.document.trim() || undefined });
  return { book, message: command.kind === "expense" ? "Saída registada." : "Reforço de caixa registado.", details: [`${command.method}: ${money(amount)} MT`, command.reason.trim()] };
}
export function executeCash(repository: DemoRepository, expected: DemoState, command: CashCommand, options: CashOptions) {
  return repository.commit({ role: options.role, action: "manage-cash", expected, command: { id: options.id, payload: command }, change(current) {
    const planned = planCash(current, command, options);
    return { patch: { cashBook: planned.book }, result: { message: planned.message } };
  } });
}
