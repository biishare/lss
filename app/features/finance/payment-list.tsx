"use client";

import Button from "@mui/material/Button";
import { FinanceCell } from "../../components/school-admin-demo.components";
import { formatCurrency, getMonthCellState, getRegistrationCellState, type FinanceCellSelection, type StudentLedgerRow } from "../../components/school-admin-demo.model";
import type { PaymentSettings } from "../../lib/school-demo-data";
import type { DemoState } from "../demo/demo-state";
import { pendingProofFor } from "./service-model";

export const financeCellKey = (selection: FinanceCellSelection) => `${selection.kind}:${selection.studentId}:${selection.kind === "tuition" ? selection.monthKey : ""}`;

export function PaymentList({ rows, state, settings, monthKeys, selected, onSelect, onCell, onStudent }: {
  rows: StudentLedgerRow[]; state: DemoState | null; settings: PaymentSettings;
  monthKeys: Set<string>; selected: Set<string>;
  onSelect(id: string): void; onCell(selection: FinanceCellSelection): void; onStudent(id: string): void;
}) {
  return <section aria-label="Lista compacta de pagamentos" className="divide-y divide-slate-200">
    {rows.map((row) => <article key={row.student.id} className="p-4">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><Button sx={{ justifyContent: "flex-start", textAlign: "left", px: 0 }} onClick={() => onStudent(row.student.personId ?? row.student.id)}>{row.student.fullName}</Button><p className="text-xs text-slate-500">{row.student.registrationNumber} · {row.student.academicYearId ?? settings.academicYear}</p></div><label className="grid min-h-11 min-w-11 shrink-0 place-items-center"><span className="sr-only">Seleccionar {row.student.fullName}</span><input type="checkbox" className="size-5" checked={selected.has(row.student.id)} onChange={() => onSelect(row.student.id)}/></label></div>
      <div className="mt-3 grid gap-2">
        {row.ledger.monthly.filter((month) => monthKeys.has(month.month.key)).map((month) => {
          const status = getMonthCellState(month, settings), balance = month.balance + month.fineBalance;
          const proof = state ? pendingProofFor(state, row.student.id, undefined, month.month.key) : undefined;
          return <div key={month.month.key} className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Mensalidade de {month.month.label}</p><p className="text-xs text-slate-500">{month.applicable ? `Saldo ${formatCurrency(balance)}` : status.detail}</p></div><FinanceCell focusKey={financeCellKey({ kind: "tuition", studentId: row.student.id, monthKey: month.month.key })} label={status.label} supporting={proof ? "Em análise · saldo mantido" : month.applicable ? formatCurrency(balance) : status.detail} tone={status.tone} symbol={status.symbol} title={`${month.month.label}, ${row.student.fullName}, ${status.label}, saldo ${formatCurrency(balance)}. Abrir cobrança.`} onClick={() => onCell({ kind: "tuition", studentId: row.student.id, monthKey: month.month.key })}/></div>;
        })}
      </div>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-teal-800">Inscrição e outros valores</summary><div className="mt-2 flex flex-wrap gap-2"><FinanceCell focusKey={financeCellKey({ kind: "registration", studentId: row.student.id })} label={getRegistrationCellState(row.ledger, settings).label} supporting={`Inscrição · ${formatCurrency(row.ledger.registrationBalance + row.ledger.registrationPenaltyBalance)}`} tone={getRegistrationCellState(row.ledger, settings).tone} title={`Inscrição, ${row.student.fullName}. Abrir cobrança.`} onClick={() => onCell({ kind: "registration", studentId: row.student.id })}/><Button data-finance-cell={financeCellKey({ kind: "miscellaneous", studentId: row.student.id })} onClick={() => onCell({ kind: "miscellaneous", studentId: row.student.id })}>Diversos</Button><Button data-finance-cell={financeCellKey({ kind: "debt", studentId: row.student.id })} onClick={() => onCell({ kind: "debt", studentId: row.student.id })}>Síntese financeira</Button></div></details>
    </article>)}
    {!rows.length && <p className="p-5 text-sm text-slate-500">Sem alunos para os filtros seleccionados.</p>}
  </section>;
}
