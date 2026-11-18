"use client";

import TextField from "@mui/material/TextField";
import { apiRequest } from "./client";
import { DateField, ResourceState, Select } from "./controls";
import { cents, dateLabel, money, schoolDay, text } from "./format";
import { PreviewTask } from "./preview-task";
import type { Student } from "./students";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

export const extraChargeTitle = "Emitir cobrança extra";

function extraDetails(data: FormData) {
  return { label: text(data, "label"), amountCents: cents(data.get("amount")), dueOn: text(data, "dueOn"), reason: text(data, "reason") };
}

function ExtraChargeFields() {
  return <>
    <TextField label="Descrição" name="label" required />
    <TextField label="Valor em MT" name="amount" required slotProps={{ htmlInput: { inputMode: "decimal" } }} />
    <DateField label="Vencimento" name="dueOn" defaultValue={schoolDay()} required />
    <TextField label="Motivo" name="reason" required />
  </>;
}

export function StudentExtraTask({ student, year, close, change }: {
  student: Pick<Student, "id" | "fullName">; year?: Year; close(): void; change(message: string): void;
}) {
  const enrollments = useRemote(student.id + ":" + (year?.id ?? ""), signal =>
    apiRequest("GET", "/api/v1/enrollments", { query: { studentId: student.id, yearId: year?.id, status: "active", page: 1, limit: 100 }, signal }));
  return <PreviewTask title={extraChargeTitle} subtitle={student.fullName} close={close}
    prepare={data => ({ enrollmentIds: [text(data, "enrollmentId")], ...extraDetails(data) })}
    preview={body => apiRequest("POST", "/api/v1/finance/charges/extras/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/charges/extras", { body: { ...body, previewToken }, key })}
    review={result => <p>{result.count} cobrança · Total {money(result.totalCents)}</p>}
    complete={() => change("Cobrança extra emitida.")}>
    <ResourceState {...enrollments} retry={enrollments.refresh} />
    <Select label="Matrícula" name="enrollmentId" defaultValue="" required>
      <option value="">Seleccione a matrícula</option>
      {enrollments.value?.items.map(row => <option value={row.id} key={row.id}>{row.number}</option>)}
    </Select>
    <ExtraChargeFields />
  </PreviewTask>;
}

export function SchoolExtraTask({ year, close, change }: { year: Year; close(): void; change(message: string): void }) {
  return <PreviewTask title={extraChargeTitle} subtitle={"Toda a escola · " + year.label} close={close}
    prepare={data => ({ yearId: year.id, ...extraDetails(data) })}
    preview={body => apiRequest("POST", "/api/v1/finance/charges/extras/school/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/charges/extras/school", { body: { ...body, previewToken }, key })}
    label="Emitir cobranças"
    review={(result, { label, dueOn }) => <div className="grid gap-3">
      <p className="text-lg font-semibold [overflow-wrap:anywhere]">{label}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
        <dt>Vencimento</dt><dd>{dateLabel(dueOn)}</dd>
        <dt>Alunos abrangidos</dt><dd>{result.count}</dd>
        <dt>Valor base por aluno</dt><dd>{money(result.unitCents)}</dd>
        {result.totalBenefitCents > 0 && <><dt>Benefícios aplicados</dt><dd>{money(result.totalBenefitCents)}</dd></>}
        <dt className="font-semibold">Total a cobrar</dt><dd className="font-semibold">{money(result.totalCents)}</dd>
      </dl>
    </div>}
    complete={({ count }) => change(count === 1 ? "Cobrança extra emitida para 1 aluno." : "Cobranças extra emitidas para " + count + " alunos.")}>
    <ExtraChargeFields />
  </PreviewTask>;
}
