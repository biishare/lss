"use client";

import { useRef, useState } from "react";
import { TaskSurface } from "../../components/task-surface";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import { calculateRegistrationDue, formatCurrency } from "../../components/school-admin-demo.model";
import type { DemoState } from "../demo/demo-state";
import type { Student } from "../../lib/school-demo-data";
import { monthOptions } from "../../lib/school-demo-data";
import { AcademicError, type AcademicCommand } from "./operations";
import { academicStateFor, groupOccupancy, monthIndex, possibleDuplicates, type EnrollmentInput } from "./model";

export type EnrollmentSession = { input: EnrollmentInput; id: string; step: number; draftId?: string };
export type AcademicExecute = (command: AcademicCommand, id: string) => { state: DemoState; result: Record<string, unknown> };
export const enrollmentFormKey = "lss-academic-enrollment-form-v1";

export function EnrollmentDialog({ state, session, onChange, execute, onClose, onSaved, draftNotice }: {
  draftNotice?: string; state: DemoState; session: EnrollmentSession;
  onChange: (session: EnrollmentSession) => void; execute: AcademicExecute;
  onClose: () => void; onSaved: (result: { state: DemoState; result: Record<string, unknown> }, pay: boolean) => void;
}) {
  const academic = academicStateFor(state), input = session.input;
  const [error, setError] = useState<AcademicError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const year = academic.years.find((item) => item.id === input.yearId);
  const group = state.groups.find((item) => item.id === input.groupId);
  const schoolClass = state.classes.find((item) => item.id === group?.classId);
  const matches = possibleDuplicates(academic, input.fullName, input.guardianPhone);
  const availableGroups = state.groups.filter((item) => item.status === "active" && state.classes.find((schoolClass) => schoolClass.id === item.classId)?.academicYear === year?.id);
  const provisional = { pricingLevelId: state.classDefinitions.find((definition) => definition.id === (schoolClass?.definitionId ?? schoolClass?.educationLevelId ?? schoolClass?.id))?.stageId, id: "preview", fullName: input.fullName, enrollmentDate: input.enrolledOn, academicYearId: input.yearId, educationLevelId: schoolClass?.educationLevelId ?? schoolClass?.id, classId: schoolClass?.id, tuitionStartMonth: input.tuitionStartMonth, financialProfile: { appliesToRegistration: input.financeStatus === "scholarship" || Boolean(input.benefitAppliesToRegistration), status: input.financeStatus, discountPercent: input.financeStatus === "scholarship" || input.financeStatus === "exception" ? 100 : input.discountPercent, startMonth: input.financeStatus === "exception" ? input.benefitStart : undefined, endMonth: input.financeStatus === "exception" ? input.benefitEnd : undefined } } as Student;
  const registrationDue = year && schoolClass ? calculateRegistrationDue(provisional, year.settings, state.paymentRuleVersions).due : 0;
  function change(patch: Partial<EnrollmentInput>) { setError(null); onChange({ ...session, input: { ...input, ...patch } }); }
  function chooseYear(id: string) {
    const next = academic.years.find((item) => item.id === id)!;
    const enrolledOn = input.enrolledOn < next.startsOn || input.enrolledOn > next.endsOn ? next.startsOn : input.enrolledOn;
    change({ yearId: id, groupId: "", enrolledOn, tuitionStartMonth: next.billingMonths.find((key) => monthIndex(key) >= Number(enrolledOn.slice(5, 7)) - 1) ?? "", benefitStart: next.billingMonths[0], benefitEnd: next.billingMonths.at(-1)! });
  }
  function advance() {
    if (!input.fullName.trim()) { setError(new AcademicError("Preencha o nome do aluno.", "fullName")); return; }
    if (!input.personId && matches.length && !input.duplicateReviewed) { setError(new AcademicError("Reveja as fichas correspondentes ou confirme que se trata de outra pessoa.", "fullName")); return; }
    if (session.step === 1 && (!year || !group)) { setError(new AcademicError("Escolha o ano e uma turma.", "groupId")); return; }
    onChange({ ...session, step: Math.min(2, session.step + 1) }); setError(null);
  }
  function save(kind: "draft" | "enroll", pay = false) {
    if (inFlight.current) return;
    inFlight.current = true; setSubmitting(true); setError(null);
    try {
      const result = execute({ type: kind, input, draftId: session.draftId }, `${session.id}-${kind}`);
      onSaved(result, pay);
    } catch (failure) { setError(failure instanceof AcademicError ? failure : new AcademicError(failure instanceof Error ? failure.message : "Não foi possível guardar a matrícula.")); }
    finally { inFlight.current = false; setSubmitting(false); }
  }
  const field = (name: keyof EnrollmentInput, label: string, options: { type?: string; disabled?: boolean } = {}) => <TextField key={name} label={label} type={options.type ?? "text"} value={input[name] ?? ""} disabled={options.disabled} onChange={(event) => {
    const value = event.target.value;
    if (name === "enrolledOn") change({ enrolledOn: value, tuitionStartMonth: year?.billingMonths.find((key) => monthIndex(key) >= Number(value.slice(5, 7)) - 1) ?? "" });
    else change({ [name]: name === "discountPercent" ? Number(value) : value });
  }} error={error?.field === name} helperText={error?.field === name ? error.message : undefined} slotProps={options.type === "date" ? { inputLabel: { shrink: true } } : undefined} fullWidth />;
  return <TaskSurface title={input.personId ? "Renovar matrícula" : "Nova matrícula"} mobile="full-screen"
    onClose={onClose} busy={submitting} closeNotice={draftNotice || "O preenchimento está conservado neste separador."}
    actions={(close) => <>
      <Button onClick={close}>Fechar</Button>
      <Button onClick={() => save("draft")} disabled={submitting}>Guardar rascunho</Button>
      {session.step > 0 && <Button onClick={() => { onChange({ ...session, step: session.step - 1 }); setError(null); }}>Anterior</Button>}
      {session.step < 2 ? <Button variant="contained" onClick={advance}>Continuar</Button> : <><Button variant="outlined" disabled={submitting} onClick={() => save("enroll")}>Guardar matrícula</Button><Button variant="contained" disabled={submitting} onClick={() => save("enroll", true)}>Guardar e pagar</Button></>}
    </>}>
      <p className="lss-enrollment-step-label mb-4 text-sm font-semibold" role="status">Passo {session.step + 1} de 3 — {["Identificação", "Colocação", "Condições e revisão"][session.step]}</p>
      <Stepper className="lss-enrollment-steps" activeStep={session.step} alternativeLabel sx={{ mb: 3 }}>{["Identificação", "Colocação", "Condições e revisão"].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
      <div className="grid gap-5">
        {error && <Alert severity="error">{error.message}</Alert>}
        {session.step === 0 && <>
          {field("fullName", "Nome completo do aluno", { disabled: Boolean(input.personId) })}
          {field("guardianName", "Nome do encarregado", { disabled: Boolean(input.personId) })}
          {field("guardianPhone", "Contacto do encarregado", { disabled: Boolean(input.personId) })}
          {(!input.guardianName || !input.guardianPhone) && <Alert severity="info">Os dados do encarregado em falta ficam assinalados como pendência na ficha.</Alert>}
          {!input.personId && matches.length > 0 && <section className="grid gap-2"><h3 className="font-semibold">Fichas correspondentes</h3>{matches.slice(0, 8).map((person) => <Button key={person.id} variant="outlined" onClick={() => change({ personId: person.id, fullName: person.fullName, guardianName: person.guardianName, guardianPhone: person.guardianPhone })}>Usar ficha de {person.fullName} · {person.permanentNumber}</Button>)}<FormControlLabel control={<Checkbox checked={input.duplicateReviewed} onChange={(event) => change({ duplicateReviewed: event.target.checked })}/>} label="Confirmei que se trata de outra pessoa"/></section>}
          {input.personId && <Alert severity="info">A ficha permanente e os contactos serão reutilizados. A dívida anterior permanece no ano de origem.</Alert>}
        </>}
        {session.step === 1 && <>
          <TextField select label="Ano lectivo" value={input.yearId} onChange={(event) => chooseYear(event.target.value)} slotProps={{ select: { native: true } }}><option value="">Escolha um ano</option>{academic.years.filter((item) => item.status !== "closed").map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</TextField>
          <TextField select label="Turma da matrícula" value={input.groupId} onChange={(event) => change({ groupId: event.target.value })} error={error?.field === "groupId"} slotProps={{ select: { native: true } }}><option value="">Escolha uma turma</option>{availableGroups.map((item) => { const room = state.rooms.find((room) => room.id === item.roomId); const occupied = groupOccupancy(academic, item.id, input.enrolledOn); return <option key={item.id} value={item.id} disabled={occupied >= Math.min(item.capacity, room?.capacity ?? 0)}>{state.classes.find((schoolClass) => schoolClass.id === item.classId)?.name} · {item.name} · {Math.max(0, Math.min(item.capacity, room?.capacity ?? 0) - occupied)} vagas</option>; })}</TextField>
          {group && <p className="text-sm text-slate-600">{group.shift} · {state.rooms.find((room) => room.id === group.roomId)?.name}</p>}
          {field("enrolledOn", "Data da matrícula", { type: "date" })}
        </>}
        {session.step === 2 && <>
          <TextField select label="Primeiro mês de cobrança" value={input.tuitionStartMonth} onChange={(event) => change({ tuitionStartMonth: event.target.value })} error={error?.field === "tuitionStartMonth"} slotProps={{ select: { native: true } }}><option value="">Escolha o mês</option>{monthOptions.filter((month) => year?.billingMonths.includes(month.key)).map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}</TextField>
          <TextField select label="Condição financeira" value={input.financeStatus} onChange={(event) => change({ financeStatus: event.target.value as EnrollmentInput["financeStatus"], discountPercent: 0 })} slotProps={{ select: { native: true } }}><option value="regular">Regular</option><option value="scholarship">Bolsa integral</option><option value="partial_scholarship">Bolsa parcial</option><option value="exception">Isenção temporária</option></TextField>
          {input.financeStatus === "partial_scholarship" && field("discountPercent", "Percentagem de bolsa", { type: "number" })}
          {input.financeStatus !== "regular" && input.financeStatus !== "scholarship" && <FormControlLabel control={<Checkbox checked={Boolean(input.benefitAppliesToRegistration)} onChange={(event) => change({ benefitAppliesToRegistration: event.target.checked })}/>} label="O benefício abrange também a inscrição"/>}
          {input.financeStatus === "exception" && <div className="grid gap-4 sm:grid-cols-2">{([ ["benefitStart", "Início da isenção"], ["benefitEnd", "Fim da isenção"] ] as const).map(([key, label]) => <TextField key={key} select label={label} value={input[key]} onChange={(event) => change({ [key]: event.target.value })} slotProps={{ select: { native: true } }}>{monthOptions.filter((month) => year?.billingMonths.includes(month.key)).map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}</TextField>)}</div>}
          {input.financeStatus !== "regular" && field("benefitReason", "Motivo do benefício")}
          <section className="rounded-lg bg-slate-50 p-4 text-sm leading-7"><h3 className="font-bold">Rever matrícula</h3><p>{input.fullName} · {year?.label}</p><p>{schoolClass?.name} · {group?.name} · {group?.shift}</p><p>Inscrição: <strong>{formatCurrency(registrationDue)}</strong></p><p>Primeiro mês integral: {monthOptions.find((month) => month.key === input.tuitionStartMonth)?.label ?? "Por escolher"}.</p><p>Pode guardar a matrícula e pagar a inscrição depois.</p></section>
        </>}
      </div>
  </TaskSurface>;
}
