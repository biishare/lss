"use client";

import { effectiveAmount } from "../finance/domain/billing";
import { recordCredit, receiptStatus } from "../finance/service-model";

import { PaymentDialog, type ServiceExecute } from "../finance/payment-dialog";
import { FinanceHistory, FinanceServicePanel, type FinanceServiceHandle } from "../finance/service-panel";

import { useState, useRef, useImperativeHandle, type Ref, type FormEvent } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FilterPanel, type ActiveFilter } from "../../components/filter-panel";
import { TaskSurface } from "../../components/task-surface";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { formatCurrency, formatDate, formatDateTime, type PaymentLaunchDraft, type PaymentReceipt } from "../../components/school-admin-demo.model";
import { PaymentReceiptDialog } from "../../components/school-admin-demo.components";
import type { DemoState } from "../demo/demo-state";
import type { WorkspaceContext } from "../demo/workspace-context";
import { EnrollmentDialog, enrollmentFormKey, type AcademicExecute, type EnrollmentSession } from "./enrollment-dialog";
import { SchoolSetup } from "./school-setup";
import { previewExit, type AcademicCommand } from "./operations";
import { academicStateFor, groupOccupancy, isEnrollmentInput, lastPlacement, monthIndex, placementOn, schoolDate, searchPeople, type AcademicEnrollment, type EnrollmentInput, type Person } from "./model";

const statuses = { active: "Activa", withdrawn: "Desistente", completed: "Concluída", cancelled: "Cancelada" };
const tabs = ["Dados", "Matrículas", "Financeiro", "Comprovativos", "Histórico"];
function moneySummary(state: DemoState, studentId: string) {
  const record = state.paymentRecords.find((item) => item.studentId === studentId);
  const allocations = record?.allocations ?? [];
  const amount = (id: string) => allocations.filter((item) => item.chargeId === id).reduce((sum, item) => sum + item.amount, 0);
  const charges = [...(record?.charges ?? []), ...(record?.penaltyCharges ?? [])];
  return { record, open: charges.reduce((sum, charge) => sum + Math.max(0, effectiveAmount(charge) - amount(charge.id)), 0), credit: recordCredit(record), allocated: amount };
}

export function AcademicWorkspace({ enrollmentRef, state, role, context, onContext, execute, confirmPayment, serviceExecute }: {
  enrollmentRef?: Ref<{ openEnrollment(): void }>;
  state: DemoState; role: "secretaria" | "director"; context: WorkspaceContext;
  onContext: (patch: Partial<WorkspaceContext>, push?: boolean) => void;
  execute: AcademicExecute;
  serviceExecute: ServiceExecute;
  confirmPayment: (draft: PaymentLaunchDraft, id: string) => { state: DemoState; receipt: PaymentReceipt };
}) {
  const desktop = useMediaQuery("(min-width:768px)");
  const academic = academicStateFor(state), canWrite = role === "secretaria";
  const visible = ["enrollments", "groups", "classes", "rooms", "catalog"].includes(context.view);
  const yearId = context.yearId || state.paymentSettings.academicYear;
  const year = academic.years.find((item) => item.id === yearId) ?? academic.years[0];
  const selectedPerson = academic.people.find((item) => item.id === context.personId);
  const profileTab = context.studentTab || "Dados";
  const financeService = useRef<FinanceServiceHandle>(null);
  const [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false), [session, setSession] = useState<EnrollmentSession | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [edit, setEdit] = useState<{ personId: string; fullName: string; guardianName: string; guardianPhone: string; permanentNumber: string; reason: string } | null>(null);
  const [change, setChange] = useState<{ kind: "transfer" | "exit"; enrollmentId: string; groupId: string; effectiveOn: string; reason: string; status: "withdrawn" | "cancelled" } | null>(null);
  const [initialChange, setInitialChange] = useState("");
  const [payment, setPayment] = useState<{ draft: PaymentLaunchDraft; id: string } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const today = schoolDate(new Date().toISOString());
  const className = (id: string) => state.classes.find((item) => item.id === id)?.name ?? "Classe não indicada";
  const groupName = (id: string) => state.groups.find((item) => item.id === id)?.name ?? "Turma não indicada";
  const openPerson = (id: string) => { onContext({ personId: id, studentTab: "Dados", view: "enrollments" }, true); setError(""); setNotice(""); };
  function run(command: AcademicCommand, id = crypto.randomUUID()) {
    try { const result = execute(command, id); setError(""); return result; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível guardar."); return null; }
  }
  function remember(next: EnrollmentSession) {
    setSession(next);
    try { window.sessionStorage.setItem(enrollmentFormKey, JSON.stringify({ datasetId: state.datasetId, session: next })); setSessionNotice(""); }
    catch { setSessionNotice("O preenchimento permanece nesta página. Mantenha-a aberta até concluir."); }
  }
  function openEnrollment(person?: Person, draft?: typeof academic.drafts[number]) {
    if (!canWrite) return;
    setError(""); setNotice("");
    if (!person && !draft && session) { setFormOpen(true); return; }
    if (!person && !draft) {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(enrollmentFormKey) ?? "null");
        if (saved?.datasetId === state.datasetId && saved.session?.input && typeof saved.session.id === "string" && isEnrollmentInput(saved.session.input) && Number.isInteger(saved.session.step) && saved.session.step >= 0 && saved.session.step <= 2) { setSession(saved.session); setFormOpen(true); return; }
      } catch { /* Formulário opcional; o estado confirmado permanece separado. */ }
    }
    const targetYear = person ? academic.years.find((item) => item.id === yearId && item.status !== "closed" && !academic.enrollments.some((enrollment) => enrollment.personId === person.id && enrollment.yearId === item.id)) ?? academic.years.find((item) => item.status === "preparing" && !academic.enrollments.some((enrollment) => enrollment.personId === person.id && enrollment.yearId === item.id)) : year;
    if (!targetYear || targetYear.status === "closed") { setError("Prepare o ano e as turmas em Configurações antes de matricular."); return; }
    const enrolledOn = today < targetYear.startsOn ? targetYear.startsOn : today > targetYear.endsOn ? targetYear.endsOn : today;
    const input: EnrollmentInput = draft ?? { personId: person?.id, fullName: person?.fullName ?? "", guardianName: person?.guardianName ?? "", guardianPhone: person?.guardianPhone ?? "", yearId: targetYear.id, groupId: "", enrolledOn, tuitionStartMonth: targetYear.billingMonths.find((key) => monthIndex(key) >= Number(enrolledOn.slice(5, 7)) - 1) ?? "", financeStatus: "regular", discountPercent: 0, benefitStart: targetYear.billingMonths[0], benefitEnd: targetYear.billingMonths.at(-1)!, benefitReason: "", duplicateReviewed: false };
    remember({ input, id: crypto.randomUUID(), step: 0, draftId: draft?.id }); setFormOpen(true);
  }
  useImperativeHandle(enrollmentRef, () => ({ openEnrollment: () => openEnrollment() }));
  function startPayment(studentId: string, nextState = state) {
    setPaymentCompleted(false);
    const student = nextState.students.find((item) => item.id === studentId);
    const record = nextState.paymentRecords.find((item) => item.studentId === studentId);
    const charge = record?.charges.find((item) => item.category === "registration");
    if (!student || !charge) { setNotice("A matrícula foi guardada. Consulte as condições na ficha."); return; }
    const allocated = record!.allocations.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + item.amount, 0);
    const balance = Math.max(0, (effectiveAmount(charge)) - allocated);
    if (!balance) { setNotice("A matrícula foi guardada. A inscrição não tem valor por pagar."); return; }
    setError("");
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(`lss-registration-draft-${studentId}`) ?? "null");
      if (saved?.datasetId === state.datasetId && typeof saved.id === "string" && saved.draft?.studentId === studentId && saved.draft?.targetChargeId === charge.id && saved.draft?.category === "registration" && typeof saved.draft?.amount === "string" && typeof saved.draft?.paidOn === "string" && typeof saved.draft?.method === "string" && typeof saved.draft?.description === "string") { setPayment({ id: saved.id, draft: saved.draft }); setPaymentOpen(true); return; }
    } catch { /* Um rascunho inválido nunca confirma um pagamento. */ }
    rememberPayment({ id: crypto.randomUUID(), draft: { studentId, category: "registration", monthKey: student.tuitionStartMonth, targetChargeId: charge.id, amount: String(balance), paidOn: today, method: "Numerário", description: "Inscrição", allowFutureAllocation: false } }); setPaymentOpen(true);
  }
  function rememberPayment(next: NonNullable<typeof payment>) {
    setPayment(next);
    try { window.sessionStorage.setItem(`lss-registration-draft-${next.draft.studentId}`, JSON.stringify({ datasetId: state.datasetId, ...next })); }
    catch { setSessionNotice("O pagamento permanece neste ecrã. Mantenha esta página aberta até concluir."); }
  }
  function closePayment() { setPaymentOpen(false); if (paymentCompleted) setPayment(null); }
  function saved(result: ReturnType<AcademicExecute>, pay: boolean) {
    setFormOpen(false); setSession(null);
    try { window.sessionStorage.removeItem(enrollmentFormKey); } catch { /* O resultado confirmado está guardado no repositório. */ }
    if (result.result.personId) {
      onContext({ personId: String(result.result.personId), view: "enrollments", studentTab: "Matrículas", yearId: result.state.academic!.enrollments.find((item) => item.id === result.result.enrollmentId)?.yearId ?? yearId }, true);
      setNotice("Matrícula guardada. A inscrição pode ser paga a partir da ficha.");
      if (pay) startPayment(String(result.result.studentId), result.state);
    } else setNotice("Rascunho guardado. Ainda não ocupa vaga nem cria cobranças.");
  }
  function openChange(enrollment: AcademicEnrollment, kind: "transfer" | "exit") {
    const targetYear = academic.years.find((item) => item.id === enrollment.yearId)!;
    const effectiveOn = today < enrollment.startsOn ? enrollment.startsOn : today > targetYear.endsOn ? targetYear.endsOn : today;
    const next = { kind, enrollmentId: enrollment.id, effectiveOn, groupId: "", reason: "", status: "withdrawn" as const };
    setInitialChange(JSON.stringify(next));
    setError(""); setChange(next);
  }
  const enrolledPeople = academic.people.filter((person) => academic.enrollments.some((item) => item.personId === person.id && item.yearId === yearId));
  const matching = searchPeople(academic, state.students, context.search);
  const enrollments = selectedPerson ? academic.enrollments.filter((item) => item.personId === selectedPerson.id).sort((a, b) => b.yearId.localeCompare(a.yearId)) : [];
  const primary = enrollments.find((item) => item.yearId === yearId) ?? enrollments[0];
  const displayPlacement = (enrollment: AcademicEnrollment) => {
    const year = academic.years.find((item) => item.id === enrollment.yearId)!;
    const reference = today < year.startsOn ? year.startsOn : today > year.endsOn ? year.endsOn : today;
    return placementOn(academic, enrollment.id, reference) ?? lastPlacement(academic, enrollment.id);
  };
  const people = matching.filter((person) => {
    const enrollment = academic.enrollments.find((item) => item.personId === person.id && item.yearId === yearId);
    const placement = enrollment ? displayPlacement(enrollment) : undefined;
    if (!context.search.trim() && context.studentStatus !== "unregistered" && !enrolledPeople.some((item) => item.id === person.id)) return false;
    if (context.studentClassId && placement?.classId !== context.studentClassId) return false;
    if (context.studentGroupId && placement?.groupId !== context.studentGroupId) return false;
    return !context.studentStatus || (context.studentStatus === "unregistered" ? !enrollment : enrollment?.status === context.studentStatus);
  });
  const studentPage = Math.min(context.studentPage, Math.max(0, Math.ceil(people.length / 50) - 1));
  const applyStudentFilters = (value: { studentClassId?: string; studentGroupId?: string; studentStatus?: string }) => onContext({ ...value, studentPage: 0 });
  const activeStudentFilters: ActiveFilter[] = [
    ...(context.studentClassId ? [{ key: "class", label: className(context.studentClassId), remove: () => applyStudentFilters({ studentClassId: "", studentGroupId: "" }) }] : []),
    ...(context.studentGroupId ? [{ key: "group", label: `Turma ${groupName(context.studentGroupId)}`, remove: () => applyStudentFilters({ studentGroupId: "" }) }] : []),
    ...(context.studentStatus ? [{ key: "status", label: context.studentStatus === "unregistered" ? "Por matricular" : statuses[context.studentStatus as keyof typeof statuses], remove: () => applyStudentFilters({ studentStatus: "" }) }] : []),
  ];
  const primaryPlacement = primary ? displayPlacement(primary) : undefined;
  const profileSummary = enrollments.reduce((totals, item) => { const summary = moneySummary(state, item.studentRecordId); return { open: totals.open + summary.open, credit: totals.credit + summary.credit }; }, { open: 0, credit: 0 });
  const changedEnrollment = change ? academic.enrollments.find((item) => item.id === change.enrollmentId) : undefined;
  const exitPreview = change?.kind === "exit" && changedEnrollment && /^\d{4}-\d{2}-\d{2}$/.test(change.effectiveOn) ? previewExit(state, changedEnrollment.id, change.effectiveOn, change.status === "cancelled") : null;
  const onSubmitChange = (event: FormEvent) => {
    event.preventDefault(); if (!change) return;
    const result = change.kind === "transfer" ? run({ type: "transfer", enrollmentId: change.enrollmentId, groupId: change.groupId, effectiveOn: change.effectiveOn, reason: change.reason }) : run({ type: "exit", enrollmentId: change.enrollmentId, effectiveOn: change.effectiveOn, reason: change.reason, status: change.status });
    if (result) { setChange(null); setNotice("Os dados foram actualizados. O histórico anterior foi conservado."); }
  };
  function historyValue(value: unknown) {
    if (!value || typeof value !== "object") return "";
    const data = value as Record<string, unknown>;
    return [data.fullName, data.guardianName, data.guardianPhone, data.groupId ? groupName(String(data.groupId)) : "", data.rosterNumber ? `Pauta ${data.rosterNumber}` : "", data.status ? statuses[data.status as keyof typeof statuses] ?? data.status : "", data.capacity ? `${data.capacity} lugares` : ""].filter(Boolean).join(" · ");
  }
  return <div hidden={!visible} className="grid gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><TextField select label="Ano de consulta" value={yearId} onChange={(event) => onContext({ yearId: event.target.value, classId: "", groupId: "", studentClassId: "", studentGroupId: "", studentStatus: "", studentPage: 0 }, true)} slotProps={{ select: { native: true } }} sx={{ width: { xs: "100%", sm: 220 } }}>{academic.years.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.status === "active" ? "Em curso" : item.status === "closed" ? "Encerrado" : "Em preparação"}</option>)}</TextField>{context.view !== "catalog" && <nav aria-label="Organização dos alunos" className="flex flex-wrap gap-2"><Button onClick={() => onContext({ view: "enrollments", personId: "" }, true)} variant={context.view === "enrollments" ? "contained" : "outlined"}>Alunos</Button><Button onClick={() => onContext({ view: "groups", personId: "" }, true)} variant={context.view === "groups" ? "contained" : "outlined"}>Turmas</Button></nav>}</div>
    {notice && <Alert severity="success">{notice}</Alert>}{error && !edit && !change && !payment && <Alert severity="error">{error}</Alert>}{sessionNotice && <Alert severity="warning">{sessionNotice}</Alert>}
    {context.view === "catalog" && <SchoolSetup key={yearId} state={state} yearId={yearId} canWrite={canWrite} execute={execute} onYear={(id) => onContext({ yearId: id, classId: "", groupId: "", studentClassId: "", studentGroupId: "", studentStatus: "", studentPage: 0 }, true)}/>}
    {["groups", "classes", "rooms"].includes(context.view) && <section className="lss-responsive-card"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Turmas de {year?.label}</h2>{canWrite && <Button onClick={() => onContext({ view: "catalog" }, true)}>Configurar classes, salas e turmas</Button>}</div><div className="mt-5 grid gap-3">{state.groups.filter((group) => state.classes.find((item) => item.id === group.classId)?.academicYear === yearId).map((group) => { const on = today < year.startsOn ? year.startsOn : today > year.endsOn ? year.endsOn : today; const occupied = groupOccupancy(academic, group.id, on), capacity = Math.min(group.capacity, state.rooms.find((item) => item.id === group.roomId)?.capacity ?? group.capacity); return <article key={group.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{className(group.classId)} · {group.name}</h3><Chip label={`${occupied}/${capacity} lugares`} color={occupied >= capacity * .9 ? "warning" : "default"}/></div><p className="mt-2 text-sm text-slate-600">{group.shift} · {state.rooms.find((room) => room.id === group.roomId)?.name}</p>{occupied >= capacity * .9 && <p className="mt-2 text-sm font-semibold text-amber-800">{occupied >= capacity ? "A turma atingiu a capacidade" : "A turma atingiu 90% de ocupação"}</p>}<ul className="mt-3 divide-y divide-slate-100">{academic.enrollments.filter((enrollment) => enrollment.yearId === yearId && displayPlacement(enrollment)?.groupId === group.id).map((enrollment) => { const person = academic.people.find((item) => item.id === enrollment.personId)!; return <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={enrollment.id}><span>{displayPlacement(enrollment)?.rosterNumber}</span><Button onClick={() => openPerson(person.id)}>{person.fullName}</Button><span>{statuses[enrollment.status]}</span></li>; })}</ul></article>; })}{!state.groups.some((group) => state.classes.find((item) => item.id === group.classId)?.academicYear === yearId) && <p>Sem turmas neste ano. Configure a estrutura para começar.</p>}</div></section>}
    {context.view === "enrollments" && !selectedPerson && <>
      <section className="lss-responsive-card"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Alunos e matrículas</h2>{canWrite && <Button variant="contained" onClick={() => openEnrollment()}>Nova matrícula</Button>}</div><TextField type="search" label="Pesquisar aluno, número ou contacto" value={context.search} onChange={(event) => onContext({ search: event.target.value, studentPage: 0 })} sx={{ mt: 3 }} fullWidth/><div className="mt-3"><FilterPanel title="Filtros dos alunos" value={{ studentClassId: context.studentClassId ?? "", studentGroupId: context.studentGroupId ?? "", studentStatus: context.studentStatus ?? "" }} clear={() => ({ studentClassId: "", studentGroupId: "", studentStatus: "" })} apply={applyStudentFilters} active={activeStudentFilters}>
        {(draft, change) => <><TextField select label="Classe dos alunos" value={draft.studentClassId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, studentClassId: event.target.value, studentGroupId: "" })}><option value="">Todas</option>{state.classes.filter((item) => item.academicYear === yearId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</TextField><TextField select label="Turma dos alunos" value={draft.studentGroupId} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, studentGroupId: event.target.value })}><option value="">Todas</option>{state.groups.filter((item) => state.classes.some((schoolClass) => schoolClass.id === item.classId && schoolClass.academicYear === yearId) && (!draft.studentClassId || item.classId === draft.studentClassId)).map((item) => <option key={item.id} value={item.id}>{className(item.classId)} · {item.name}</option>)}</TextField><TextField select label="Situação académica dos alunos" value={draft.studentStatus} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={(event) => change({ ...draft, studentStatus: event.target.value })}><option value="">Todas</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="unregistered">Por matricular</option></TextField></>}
      </FilterPanel></div><p className="mt-3 text-sm text-slate-600">{people.length} {people.length === 1 ? "ficha" : "fichas"} · {academic.enrollments.filter((item) => item.yearId === yearId && item.status !== "cancelled").length} matrículas confirmadas em {year?.label}</p>{desktop ? <div className="table-scroll mt-4" tabIndex={0} role="region" aria-label="Lista de alunos"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr>{["Número permanente", "Aluno", "Turma e pauta", "Situação académica", "Contacto"].map((label) => <th key={label} className="border-b border-slate-200 p-3">{label}</th>)}</tr></thead><tbody>{people.slice(studentPage * 50, studentPage * 50 + 50).map((person) => { const enrollment = academic.enrollments.find((item) => item.personId === person.id && item.yearId === yearId), placement = enrollment ? displayPlacement(enrollment) : undefined; return <tr key={person.id} className="border-b border-slate-100"><td className="p-3">{person.permanentNumber}</td><td className="p-3"><Button onClick={() => openPerson(person.id)} sx={{ textAlign: "left" }}>{person.fullName}</Button></td><td className="p-3">{placement ? `${className(placement.classId)} · ${groupName(placement.groupId)} · ${placement.rosterNumber}` : "Sem matrícula neste ano"}</td><td className="p-3">{enrollment ? statuses[enrollment.status] : "Por matricular"}</td><td className="p-3">{person.guardianPhone || "Por completar"}</td></tr>; })}</tbody></table></div> : <section role="region" aria-label="Lista de alunos" className="mt-3 divide-y divide-slate-200">{people.slice(studentPage * 50, studentPage * 50 + 50).map((person) => { const enrollment = academic.enrollments.find((item) => item.personId === person.id && item.yearId === yearId), placement = enrollment ? displayPlacement(enrollment) : undefined; return <article className="py-3 text-sm" key={person.id}><div className="flex flex-wrap items-start justify-between gap-2"><Button onClick={() => openPerson(person.id)} sx={{ px: 0, textAlign: "left", justifyContent: "flex-start" }}>{person.fullName}</Button><span className="rounded bg-slate-50 px-2 py-1 text-xs">{enrollment ? statuses[enrollment.status] : "Por matricular"}</span></div><p className="text-xs text-slate-500">{person.permanentNumber}</p><p className="mt-2">{placement ? `${className(placement.classId)} · ${groupName(placement.groupId)} · Pauta ${placement.rosterNumber}` : "Sem matrícula neste ano"}</p><p className="mt-1 text-slate-500">Contacto: {person.guardianPhone || "Por completar"}</p></article>; })}</section>}{!people.length && <p className="mt-5 text-sm">{context.search || activeStudentFilters.length ? "Não há fichas correspondentes. Reveja a pesquisa e os filtros." : "Ainda não existem matrículas neste ano."}</p>}{people.length > 50 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Página {studentPage + 1} de {Math.ceil(people.length / 50)}</span><div className="flex gap-2"><Button disabled={studentPage === 0} onClick={() => onContext({ studentPage: studentPage - 1 })}>Página anterior de alunos</Button><Button disabled={(studentPage + 1) * 50 >= people.length} onClick={() => onContext({ studentPage: studentPage + 1 })}>Página seguinte de alunos</Button></div></div>}</section>
      {canWrite && academic.drafts.length > 0 && <section className="lss-responsive-card"><h3 className="font-bold">Matrículas em rascunho</h3><div className="mt-3 flex flex-wrap gap-2">{academic.drafts.map((draft) => <Button key={draft.id} variant="outlined" onClick={() => openEnrollment(undefined, draft)}>Continuar {draft.fullName}</Button>)}</div></section>}
    </>}
    {context.view === "enrollments" && selectedPerson && <>
      <section className="lss-responsive-card"><Button onClick={() => onContext({ personId: "" }, true)}>Voltar à lista de alunos</Button><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{selectedPerson.fullName}</h2><p className="mt-2 text-sm text-slate-600">{selectedPerson.permanentNumber} · {primary ? `${primary.yearId} · ${statuses[primary.status]}` : "Sem matrícula"}</p>{primaryPlacement && <p className="mt-1 text-sm">{className(primaryPlacement.classId)} · {groupName(primaryPlacement.groupId)} · Pauta {primaryPlacement.rosterNumber}</p>}<p className="mt-2 text-sm">Encarregado: {selectedPerson.guardianName || "Por completar"} · {selectedPerson.guardianPhone || "Contacto por completar"}</p></div><div className="grid gap-2 text-sm"><span>Em aberto: <strong>{formatCurrency(profileSummary.open)}</strong></span><span>Crédito disponível: <strong>{formatCurrency(profileSummary.credit)}</strong></span>{canWrite && <Button variant="outlined" onClick={() => openEnrollment(selectedPerson)}>Renovar matrícula</Button>}</div></div>{(!selectedPerson.guardianPhone || !selectedPerson.guardianName || selectedPerson.numberNeedsReview) && <Alert severity="warning" sx={{ mt: 3 }}>{selectedPerson.numberNeedsReview ? "O número permanente anterior precisa de revisão." : "Complete os dados do encarregado na ficha."}</Alert>}<nav aria-label="Separadores da ficha do aluno" className="mt-5 flex flex-wrap gap-2">{tabs.map((tab) => <Button key={tab} aria-current={profileTab === tab ? "page" : undefined} variant={profileTab === tab ? "contained" : "outlined"} onClick={() => onContext({ studentTab: tab })}>{tab}</Button>)}</nav></section>
      {profileTab === "Dados" && <section className="lss-responsive-card"><h3 className="font-bold">Dados permanentes</h3><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-slate-500">Nome</dt><dd>{selectedPerson.fullName}</dd></div><div><dt className="text-slate-500">Número permanente</dt><dd>{selectedPerson.permanentNumber}</dd></div><div><dt className="text-slate-500">Encarregado</dt><dd>{selectedPerson.guardianName || "Por completar"}</dd></div><div><dt className="text-slate-500">Contacto</dt><dd>{selectedPerson.guardianPhone || "Por completar"}</dd></div></dl>{canWrite && <Button sx={{ mt: 3 }} variant="outlined" onClick={() => { setError(""); setEdit({ personId: selectedPerson.id, fullName: selectedPerson.fullName, guardianName: selectedPerson.guardianName, guardianPhone: selectedPerson.guardianPhone, permanentNumber: selectedPerson.permanentNumber, reason: "" }); }}>Corrigir dados do aluno</Button>}</section>}
      {profileTab === "Matrículas" && <div className="grid gap-4">{enrollments.map((enrollment) => { const placement = displayPlacement(enrollment)!; const summary = moneySummary(state, enrollment.studentRecordId); return <section key={enrollment.id} className="lss-responsive-card"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{enrollment.yearId} · {className(placement.classId)} · {groupName(placement.groupId)}</h3><Chip label={statuses[enrollment.status]}/></div><p className="mt-3 text-sm">Matrícula: {formatDate(enrollment.enrolledOn)} · Pauta: {placement.rosterNumber}</p><p className="mt-2 text-sm">Primeiro mês: {enrollment.tuitionStartMonth.toUpperCase()} · Em aberto: {formatCurrency(summary.open)}</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onContext({ studentTab: "Financeiro" })}>Consultar financeiro de {enrollment.yearId}</Button>{canWrite && <Button variant="outlined" onClick={() => startPayment(enrollment.studentRecordId)}>Pagar inscrição</Button>}{canWrite && enrollment.status === "active" && academic.years.find((item) => item.id === enrollment.yearId)?.status !== "closed" && <><Button onClick={() => openChange(enrollment, "transfer")}>Transferir de turma</Button><Button color="error" onClick={() => openChange(enrollment, "exit")}>Registar saída</Button></>}</div></section>; })}</div>}
      {profileTab === "Financeiro" && <div className="grid gap-4">{enrollments.map((enrollment) => { const summary = moneySummary(state, enrollment.studentRecordId); return <section key={enrollment.id} className="lss-responsive-card"><h3 className="font-bold">Movimentos de {enrollment.yearId}</h3><p className="mt-3 text-sm">Em aberto: {formatCurrency(summary.open)} · Crédito: {formatCurrency(summary.credit)}</p><ul className="mt-4 divide-y divide-slate-100">{summary.record?.charges.map((charge) => <li key={charge.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{charge.description} {charge.dueOn ? `· ${formatDate(charge.dueOn)}` : ""}{charge.academicCancellation ? " · Anulada por alteração da matrícula" : ""}</span><span>Saldo {formatCurrency(Math.max(0, (effectiveAmount(charge)) - summary.allocated(charge.id)))}</span></li>)}</ul><Button sx={{ mt: 3 }} onClick={() => { const placement = displayPlacement(enrollment)!; onContext({ view: "payments", yearId: enrollment.yearId, classId: placement.classId, groupId: placement.groupId, paymentSection: "entry" }, true); }}>Abrir pagamentos de {enrollment.yearId}</Button></section>; })}</div>}
      {profileTab === "Comprovativos" && <section className="lss-responsive-card"><h3 className="font-bold">Pagamentos e recibos</h3>{enrollments.flatMap((enrollment) => (moneySummary(state, enrollment.studentRecordId).record?.payments ?? []).map((item) => { const stored = state.receipts.find((receipt) => receipt.studentId === enrollment.studentRecordId && receipt.paymentId === item.id); return <div key={`${enrollment.id}-${item.id}`} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><div><strong>{formatCurrency(item.amount)} · {item.method}</strong><p>{formatDate(item.effectivePaymentDate ?? item.paidOn)} · Ano {enrollment.yearId}</p>{item.reference && <p>Referência: {item.reference}</p>}{item.reversedBy && <p>Anulado por correcção · {item.reversedBy}</p>}</div>{stored ? <Button onClick={() => setReceipt(stored)}>Abrir recibo {stored.id}</Button> : item.kind === "credit-application" ? <span>Crédito de {item.origin?.paymentId} · sem novo recebimento</span> : <span>Recibo anterior não disponível</span>}</div>; }))}{!enrollments.some((item) => moneySummary(state, item.studentRecordId).record?.payments.length) && <p className="mt-4 text-sm">Sem pagamentos ou comprovativos registados.</p>}</section>}
      {(profileTab === "Financeiro" || profileTab === "Comprovativos") && <FinanceServicePanel serviceRef={financeService} state={state} studentId={enrollments.find((item) => item.yearId === yearId)?.studentRecordId ?? enrollments[0]?.studentRecordId ?? ""} yearId={yearId} readOnly={!canWrite} execute={serviceExecute} correctionTarget={null} onCloseCorrection={() => {}}/>}
      {profileTab === "Histórico" && <FinanceHistory state={state} personId={selectedPerson.id}/>}
      {profileTab === "Histórico" && <section className="lss-responsive-card"><h3 className="font-bold">Histórico do aluno</h3><ol className="mt-4 grid gap-4">{academic.events.filter((event) => event.personId === selectedPerson.id).slice().reverse().map((event) => <li key={event.id} className="rounded-md border border-slate-200 p-4 text-sm"><h4 className="font-bold">{event.action}</h4><p className="mt-2">Data de efeito: {event.effectiveOn ? formatDate(event.effectiveOn) : "Não registada"}</p><p>Registado: {event.recordedAt ? formatDateTime(event.recordedAt) : "Instante anterior não disponível"} · {event.actorId === "demo-secretaria" ? "Marta — Secretaria" : "Autor não registado"}</p>{event.before && historyValue(event.before) ? <p className="mt-2">Anterior: {historyValue(event.before)}</p> : null}{event.after && historyValue(event.after) ? <p>Novo: {historyValue(event.after)}</p> : null}{event.reason && <p className="mt-2">Motivo: {event.reason}</p>}</li>)}</ol></section>}
    </>}
    {visible && formOpen && session && <EnrollmentDialog state={state} session={session} onChange={remember} execute={execute} draftNotice={sessionNotice} onClose={() => { setFormOpen(false); setNotice("O preenchimento da matrícula foi conservado neste separador."); }} onSaved={saved}/>}
    {visible && edit && <TaskSurface title={"Corrigir dados do aluno"} mobile="sheet" dirty={Boolean(edit.reason || edit.fullName !== selectedPerson?.fullName || edit.guardianName !== selectedPerson?.guardianName || edit.guardianPhone !== selectedPerson?.guardianPhone || edit.permanentNumber !== selectedPerson?.permanentNumber)} onClose={() => setEdit(null)} actions={(close) => <><Button onClick={close}>Fechar</Button><Button type="submit" form="edit-person-form" variant="contained">Guardar correcção</Button></>}><form id="edit-person-form" className="grid gap-5" onSubmit={(event) => { event.preventDefault(); if (run({ type: "person", ...edit })) { setEdit(null); setNotice("Dados actualizados. Os valores anteriores permanecem no histórico."); } }}>{error && <Alert severity="error">{error}</Alert>}{([ ["fullName", "Nome completo"], ["guardianName", "Nome do encarregado"], ["guardianPhone", "Contacto do encarregado"], ...(selectedPerson?.numberNeedsReview ? [["permanentNumber", "Número permanente corrigido"]] : []), ["reason", "Motivo da correcção"] ] as Array<[keyof typeof edit, string]>).map(([key, label]) => <TextField key={key} label={label} value={edit[key]} onChange={(event) => setEdit({ ...edit, [key]: event.target.value })} required={key === "fullName" || key === "reason"}/>)}</form></TaskSurface>}
    {visible && change && changedEnrollment && <TaskSurface title={change.kind === "transfer" ? "Transferir aluno" : "Registar saída do aluno"} mobile="full-screen" dirty={JSON.stringify(change) !== initialChange} onClose={() => setChange(null)} actions={(close) => <><Button onClick={close}>Fechar</Button><Button variant="contained" type="submit" form="change-enrollment-form">Confirmar alteração</Button></>}><form id="change-enrollment-form" onSubmit={onSubmitChange} className="grid gap-5">{error && <Alert severity="error">{error}</Alert>}{change.kind === "transfer" ? <TextField select label="Nova turma" value={change.groupId} onChange={(event) => setChange({ ...change, groupId: event.target.value })} slotProps={{ select: { native: true } }}><option value="">Escolha uma turma</option>{state.groups.filter((item) => state.classes.find((schoolClass) => schoolClass.id === item.classId)?.academicYear === changedEnrollment.yearId).map((item) => <option key={item.id} value={item.id}>{className(item.classId)} · {item.name} · {item.shift}</option>)}</TextField> : <TextField select label="Tipo de saída" value={change.status} onChange={(event) => setChange({ ...change, status: event.target.value as "withdrawn" | "cancelled" })} slotProps={{ select: { native: true } }}><option value="withdrawn">Desistência</option><option value="cancelled">Cancelamento por erro</option></TextField>}<TextField type="date" label="Data de efeito" value={change.effectiveOn} onChange={(event) => setChange({ ...change, effectiveOn: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required/><TextField label="Motivo" value={change.reason} onChange={(event) => setChange({ ...change, reason: event.target.value })} required/><section className="rounded-md bg-slate-50 p-4 text-sm leading-7"><p>Colocação anterior: {groupName(lastPlacement(academic, changedEnrollment.id)!.groupId)} · Pauta {lastPlacement(academic, changedEnrollment.id)!.rosterNumber}.</p>{change.kind === "transfer" ? <p>A matrícula anual, o número anterior, as cobranças emitidas e os pagamentos são conservados. A nova turma recebe um número de pauta próprio.</p> : <><p>{change.status === "withdrawn" ? "O mês da saída mantém-se devido. Os meses seguintes deixam de ser cobrados." : "As cobranças são anuladas por ajustamentos registados, conservando os originais."}</p><p>{exitPreview?.charges.length ?? 0} cobranças a interromper.</p><p>Crédito que ficará disponível: <strong>{formatCurrency(exitPreview?.releasedCredit ?? 0)}</strong>. A eventual devolução é uma operação separada.</p></>}</section></form></TaskSurface>}
    {visible && paymentOpen && payment && <PaymentDialog onOpenProofs={() => { setPaymentOpen(false); onContext({ studentTab: "Comprovativos" }); window.requestAnimationFrame(() => financeService.current?.showProofs(payment.draft.studentId)); }} draftNotice={sessionNotice} onCompleted={() => { setPaymentCompleted(true); try { window.sessionStorage.removeItem(`lss-registration-draft-${payment.draft.studentId}`); } catch { /* Confirmed state stays in the repository. */ } }} onOpenCash={() => { setPaymentOpen(false); onContext({ view: "reports", reportSection: "cash" }, true); }} state={state} draft={payment.draft} commandId={payment.id} onChange={(draft) => rememberPayment({ ...payment, draft })} onClose={closePayment} execute={serviceExecute} confirm={(draft, id) => {
      const result = confirmPayment(draft, id);
      try { window.sessionStorage.removeItem(`lss-registration-draft-${draft.studentId}`); } catch { /* The confirmed receipt is already persisted. */ }
      setError(""); setNotice("Pagamento registado e recibo emitido."); return result.receipt;
    }}/>}
    {visible && <PaymentReceiptDialog key={receipt?.id} status={receipt ? receiptStatus(state, receipt) : undefined} receipt={receipt} onClose={() => setReceipt(null)} onPrint={() => window.print()}/>}
  </div>;
}
