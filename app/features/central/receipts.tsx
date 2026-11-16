"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Image from "next/image";
import { TaskSurface } from "../../components/task-surface";
import { apiRequest, type Schema } from "./client";
import { RecordList, ResourceState } from "./controls";
import { dateLabel, methods, money } from "./format";
import { useRemote } from "./use-remote";

export function Receipt({ id, initial, close }: {
  id: string; initial?: Schema<"FinanceReceipt">; close(): void;
}) {
  const stored = useRemote(initial ? null : id, (signal) =>
    apiRequest("GET", "/api/v1/finance/receipts/{id}", { params: { id }, signal }));
  const receipt = initial ?? stored.value;
  return <TaskSurface title="Recibo" subtitle={receipt?.number} onClose={close} mobile="full-screen" maxWidth="md"
    actions={(cancel) => <><Button onClick={cancel}>Fechar</Button>
      {receipt && <Button variant="outlined" onClick={() => window.print()}>Imprimir / PDF</Button>}</>}>
    <ResourceState {...stored} retry={stored.refresh} />
    {receipt && <article className="lss-print-target lss-receipt-print grid gap-4">
      {receipt.status === "cancelled" && <Alert severity="warning">Recibo anulado.</Alert>}
      <header>
        {receipt.institution.logoUrl && <Image unoptimized src={receipt.institution.logoUrl} width={96} height={60}
          alt={"Logótipo de " + receipt.institution.name} className="mb-3 h-[60px] w-24 object-contain" />}
        <p className="text-lg font-bold">{receipt.institution.name}</p>
        <p className="text-sm text-slate-600">{[receipt.institution.address, receipt.institution.phone, receipt.institution.email].filter(Boolean).join(" · ")}</p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-600">Recibo</dt><dd className="font-semibold">{receipt.number}</dd></div>
        <div><dt className="text-sm text-slate-600">Data efectiva</dt><dd>{dateLabel(receipt.effectiveOn)}</dd></div>
        <div><dt className="text-sm text-slate-600">Aluno</dt><dd>{receipt.student.name} {receipt.student.permanentNumber}</dd></div>
        <div><dt className="text-sm text-slate-600">Atendido por</dt><dd>{receipt.employee.name}</dd></div>
      </dl>
      <RecordList rows={receipt.lines.map((line) => ({ ...line, id: line.chargeId }))} empty="O valor ficou em crédito."
        render={line => <><span>{line.label} · {line.competence}</span><strong>{money(line.principalCents + line.penaltyCents)}</strong></>} />
      <p>Total recebido <strong>{money(receipt.amountCents)}</strong> · {methods[receipt.method]}</p>
      <p>Crédito deste recebimento <strong>{money(receipt.creditCents)}</strong></p>
      {receipt.reference && <p>Referência {receipt.reference}</p>}
    </article>}
  </TaskSurface>;
}
