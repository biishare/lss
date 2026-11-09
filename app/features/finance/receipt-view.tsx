"use client";
import { useState } from "react";
import { TaskSurface } from "../../components/task-surface";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { formatCurrency, formatDate, formatDateTime, type PaymentReceipt } from "../../components/school-admin-demo.model";

export function ReceiptContent({ receipt, status = "Confirmado" }: { receipt: PaymentReceipt; status?: string }) {
  return <article className="lss-print-target lss-receipt-print grid min-w-0 gap-5 text-sm">
    <header className="border-b border-slate-200 pb-4"><p className="font-bold text-lg">{receipt.institution?.name ?? "Liceu São Silvestre"}</p>{receipt.institution?.contact && <p>{receipt.institution.contact}</p>}<h2 className="mt-3 font-bold">Recibo interno {receipt.id}</h2><p>{status}</p>{receipt.replacesReceiptId && <p>Substitui {receipt.replacesReceiptId}</p>}</header>
    <dl className="grid gap-2"><div><dt className="text-slate-500">Aluno</dt><dd className="font-semibold">{receipt.studentName} · {receipt.registrationNumber}</dd></div><div><dt className="text-slate-500">Forma / Data efectiva</dt><dd>{receipt.method} · {formatDate(receipt.effectivePaymentDate)}</dd></div><div><dt className="text-slate-500">Emissão / Funcionário</dt><dd>{formatDateTime(receipt.recordedAt)} · {receipt.recordedBy}</dd></div></dl>
    <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Distribuição do recebimento</caption><thead><tr className="border-b border-slate-200"><th className="py-2">Item</th><th className="py-2">Ano</th><th className="py-2 text-right">Aplicado</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={`${item.chargeId}-${index}`} className="border-b border-slate-100"><td className="py-3 pr-3">{item.label}</td><td>{item.academicYearId ?? receipt.academicYearId ?? "—"}</td><td className="py-3 text-right whitespace-nowrap">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>
    <dl className="grid gap-2 border-t border-slate-200 pt-4"><div className="flex justify-between gap-3"><dt>Valor recebido</dt><dd className="font-bold">{formatCurrency(receipt.amount)}</dd></div><div className="flex justify-between gap-3"><dt>Multas incluídas</dt><dd>{formatCurrency(receipt.penaltyTotal)}</dd></div><div className="flex justify-between gap-3"><dt>Crédito criado neste recebimento</dt><dd>{formatCurrency(receipt.unallocatedAmount)}</dd></div></dl>
    <p className="break-words text-xs text-slate-500">Movimento {receipt.paymentId}</p>
  </article>;
}
export function ReceiptDialog({ receipt, onClose, onPrint, status }: { receipt: PaymentReceipt | null; onClose(): void; onPrint(): void; status?: string }) {
  const [error, setError] = useState("");
  if (!receipt) return null;
  return <TaskSurface title={`Recibo ${receipt.id}`} mobile="full-screen" onClose={onClose} actions={<><Button onClick={() => { try { onPrint(); setError(""); } catch { setError("Não foi possível abrir a impressão. O recibo está guardado; tente imprimir novamente."); } }}>Imprimir / Guardar PDF</Button><Button variant="contained" onClick={onClose}>Fechar</Button></>}>{error && <Alert severity="error">{error}</Alert>}<ReceiptContent receipt={receipt} status={status}/></TaskSurface>;
}
