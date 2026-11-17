"use client";

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { TaskSurface } from "../../components/task-surface";
import { apiRequest, issueMessage, type Schema } from "./client";
import { CommandDialog, DateField, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { dateLabel, statuses, text } from "./format";
import { useCommand, useRemote } from "./use-remote";
import { StudentSearch, type Student } from "./students";
import { AcademicGroups } from "./academic-groups";
import type { Year } from "./workspace";

type Enrollment = Schema<"AcademicEnrollment">;
type Group = Schema<"AcademicGroup">;
type EnrollmentAction = "confirm" | "transfer" | "withdraw" | "cancel";

function StudentDialog({ record, close, completed }: {
  record?: Student; close(): void; completed(student: Student): void;
}) {
  return <CommandDialog title={record ? "Editar ficha do aluno" : "Novo aluno"} close={close} completed={completed}
    submit={(data, key) => {
      const values = { fullName: text(data, "fullName"), guardianName: text(data, "guardianName"), guardianPhone: text(data, "guardianPhone") };
      return record
        ? apiRequest("PATCH", "/api/v1/students/{id}", { params: { id: record.id }, key, body: {
            ...values, revision: record.revision, reason: text(data, "reason"),
          } })
        : apiRequest("POST", "/api/v1/students", { key, body: values });
    }}>
    <TextField label="Nome completo" name="fullName" defaultValue={record?.fullName ?? ""} required />
    <TextField label="Nome do encarregado" name="guardianName" defaultValue={record?.guardianName ?? ""} />
    <TextField label="Contacto do encarregado" name="guardianPhone" type="tel" defaultValue={record?.guardianPhone ?? ""} />
    {record && <TextField label="Motivo da alteração" name="reason" required />}
  </CommandDialog>;
}

const actionLabels = {
  confirm: "Confirmar matrícula", transfer: "Transferir", withdraw: "Registar desistência", cancel: "Anular matrícula",
} as const;

function EnrollmentDialog({ action, student, year, draft, groups, close, complete }: {
  action: EnrollmentAction; student: Student; year: Year; draft?: Enrollment; groups: Group[];
  close(): void; complete(enrollment: Enrollment): void;
}) {
  const [record, setRecord] = useState(draft);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [review, setReview] = useState<{
    request: Schema<"PreviewEnrollment">; result: Schema<"EnrollmentPreview">; reason: string;
  }>();
  const draftCommand = useCommand();
  const confirmation = useCommand();
  const initialDate = draft?.enrolledOn ?? year.startsOn;
  const [effective, setEffective] = useState(initialDate);
  const isMove = action === "confirm" || action === "transfer";
  const months = year.billingMonths.filter(month => month >= effective.slice(0, 7));
  const formId = "school-enrollment-form";

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    const data = new FormData(event.currentTarget);
    setError("");
    setWorking(true);
    try {
      const request: Schema<"PreviewEnrollment"> = action === "confirm"
        ? { action, groupId: text(data, "groupId"), enrolledOn: effective, tuitionStartMonth: text(data, "tuitionStartMonth") }
        : action === "transfer"
          ? { action, groupId: text(data, "groupId"), effectiveOn: effective }
          : { action, effectiveOn: effective };
      const reason = action === "confirm" ? "" : text(data, "reason");
      let enrollment = record;
      if (!enrollment && request.action === "confirm") {
        const payload = { studentId: student.id, yearId: year.id, groupId: request.groupId,
          enrolledOn: request.enrolledOn, tuitionStartMonth: request.tuitionStartMonth };
        enrollment = await draftCommand.run(JSON.stringify(payload), (key) =>
          apiRequest("POST", "/api/v1/enrollments", { body: payload, key }));
        if (!enrollment) return;
        setRecord(enrollment);
      }
      if (!enrollment) return;
      const result = await apiRequest("POST", "/api/v1/enrollments/{id}/preview", {
        params: { id: enrollment.id }, body: request,
      });
      setReview({ request, result, reason });
    } catch (cause) {
      setError(issueMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!record || !review) return;
    const { request, reason } = review;
    const params = { id: record.id };
    const revision = record.revision;
    const result = await confirmation.run(JSON.stringify([params.id, revision, request, reason]), async (key) => {
      if (request.action === "confirm") return apiRequest("POST", "/api/v1/enrollments/{id}/confirm", {
        params, key, body: { revision, groupId: request.groupId, enrolledOn: request.enrolledOn, tuitionStartMonth: request.tuitionStartMonth },
      });
      if (request.action === "transfer") return apiRequest("POST", "/api/v1/enrollments/{id}/transfer", {
        params, key, body: { revision, groupId: request.groupId, effectiveOn: request.effectiveOn, reason },
      });
      return apiRequest("POST", request.action === "withdraw" ? "/api/v1/enrollments/{id}/withdraw" : "/api/v1/enrollments/{id}/cancel", {
        params, key, body: { revision, effectiveOn: request.effectiveOn, reason },
      });
    });
    if (result) complete(result.enrollment);
  }

  return <TaskSurface title={actionLabels[action]} subtitle={student.fullName + " · " + year.label} mobile="full-screen"
    onClose={close} busy={working || confirmation.busy} dirty={dirty || draftCommand.uncertain || confirmation.uncertain}
    actions={(cancel) => <><Button onClick={cancel}>Fechar</Button>
      {review ? <>
        <Button onClick={() => setReview(undefined)} disabled={confirmation.uncertain || confirmation.busy}>Editar</Button>
        <Button variant="contained" onClick={confirm} disabled={confirmation.busy}>
          {confirmation.uncertain ? "Confirmar novamente" : actionLabels[action]}
        </Button>
      </> : <Button type="submit" form={formId} variant="contained" disabled={working}>Consultar prévia</Button>}
    </>}>
    {(error || draftCommand.error || confirmation.error) && <Alert severity="error" sx={{ mb: 2 }}>{error || draftCommand.error || confirmation.error}</Alert>}
    {review && <div className="grid gap-2">
      <p><strong>Data efectiva</strong> {dateLabel(review.result.effectiveOn)}</p>
      {"group" in review.result && <p><strong>Turma</strong> {review.result.group.name}</p>}
      {"seatsAvailable" in review.result && <p>Vagas disponíveis {review.result.seatsAvailable}</p>}
      {"billingMonths" in review.result && <p>Competências {review.result.billingMonths.join(", ") || "—"}</p>}
      {"monthsStopped" in review.result && <p>Competências interrompidas {review.result.monthsStopped.join(", ") || "—"}</p>}
      {review.reason && <p><strong>Motivo</strong> {review.reason}</p>}
    </div>}
    <div hidden={Boolean(review)}>
      <form id={formId} className="grid gap-4" onSubmit={preview} onChange={() => setDirty(true)}>
        {isMove && <Select label="Turma" name="groupId" defaultValue={action === "confirm" ? record?.groupId ?? "" : ""} required>
          <option value="">Seleccione uma turma</option>
          {groups.filter(group => action !== "transfer" || group.id !== draft?.groupId).map(group =>
            <option key={group.id} value={group.id}>{group.name}</option>)}
        </Select>}
        <DateField label="Data efectiva" name="effectiveOn" value={effective} onChange={(event) => setEffective(event.target.value)} required
          slotProps={{ htmlInput: { min: year.startsOn, max: year.endsOn }, inputLabel: { shrink: true } }} />
        {action === "confirm"
          ? <Select key={effective.slice(0, 7)} label="Primeira propina" name="tuitionStartMonth" defaultValue={draft?.tuitionStartMonth ?? months[0] ?? ""} required>
            <option value="">Seleccione a competência</option>
            {months.map(month => <option key={month} value={month}>{month}</option>)}
          </Select>
          : <TextField label="Motivo" name="reason" required multiline minRows={2} />}
      </form>
    </div>
  </TaskSurface>;
}

function AcademicHistory({ student }: { student: Student }) {
  const [page, change] = useState(1);
  const history = useRemote(student.id + ":" + page, (signal) =>
    apiRequest("GET", "/api/v1/students/{id}/history", { params: { id: student.id }, query: { page, limit: 12 }, signal }));
  return <section aria-label="Histórico escolar" className="grid gap-2">
    <Heading title="Histórico escolar" />
    <ResourceState {...history} retry={history.refresh} />
    {history.value && <>
      <RecordList rows={history.value.items} empty="Sem alterações registadas." render={event => <div>
        <strong>{event.reason || event.action}</strong>
        <p className="text-sm text-slate-600">{dateLabel(event.effectiveOn ?? event.recordedAt)}</p>
      </div>} />
      <Paging {...history.value} change={change} />
    </>}
  </section>;
}

export function Academics({ year, canWrite, selected, selectStudent, openPayment }: {
  year?: Year; canWrite: boolean; selected: string; selectStudent(id: string): void; openPayment(id: string): void;
}) {
  const [tab, setTab] = useState<"students" | "groups">("students");
  const [renewal, setRenewal] = useState(false);
  const [edit, setEdit] = useState<"new" | Student>();
  const [enroll, setEnroll] = useState<{ action: EnrollmentAction; record?: Enrollment }>();
  const [history, setHistory] = useState(false);
  const [notice, setNotice] = useState("");
  const [listVersion, setListVersion] = useState(0);
  const [page, setPage] = useState(1);
  const student = useRemote(tab === "students" && selected ? selected : null, (signal) => apiRequest("GET", "/api/v1/students/{id}", { params: { id: selected }, signal }));
  const enrollments = useRemote(tab === "students" && selected && year ? JSON.stringify([selected, year.id, page]) : null, (signal) =>
    apiRequest("GET", "/api/v1/enrollments", { query: { page, limit: 12, studentId: selected, yearId: year!.id }, signal }));
  const groupList = useRemote(enroll && year ? year.id : null, (signal) =>
    apiRequest("GET", "/api/v1/groups", { query: { yearId: year!.id, page: 1, limit: 100 }, signal }));
  const previous = useRemote(renewal && selected ? selected : null, (signal) =>
    apiRequest("GET", "/api/v1/students/{id}/enrollments", { params: { id: selected }, query: { page: 1, limit: 100 }, signal }));

  function select(id: string) {
    setTab("students");
    setNotice("");
    setHistory(false);
    setPage(1);
    selectStudent(id);
  }

  return <div className="grid gap-4">
    <Heading title="Alunos e turmas" detail="Pesquise pela ficha do aluno e acompanhe as suas matrículas."
      action={canWrite && tab === "students" && <Button variant="contained" onClick={() => setEdit("new")}>Novo aluno</Button>} />
    {year && <div className="lss-action-row" data-edge-to-edge>
      <Button aria-pressed={tab === "students"} variant={tab === "students" ? "contained" : "outlined"} onClick={() => setTab("students")}>Alunos</Button>
      <Button aria-pressed={tab === "groups"} variant={tab === "groups" ? "contained" : "outlined"} onClick={() => setTab("groups")}>Turmas</Button>
    </div>}
    {tab === "groups" && year ? <AcademicGroups year={year} openStudent={select} /> : <>
    {notice && <Alert severity="success">{notice}</Alert>}
    <StudentSearch key={listVersion} open={item => select(item.id)} selected={selected} />
    <ResourceState {...student} retry={student.refresh} />
    {student.value && <section className="lss-responsive-card grid gap-4">
      <Heading title={student.value.fullName} detail={student.value.permanentNumber ?? "Ficha em preparação"}
        action={<div className="lss-action-row" data-edge-to-edge>
          {canWrite && <Button variant="outlined" onClick={() => setEdit(student.value)}>Editar ficha</Button>}
          <Button variant="outlined" onClick={() => openPayment(selected)}>Ver pagamentos</Button>
          <Button onClick={() => setHistory(!history)} aria-expanded={history}>Histórico escolar</Button>
        </div>} />
      <p className="text-sm text-slate-600">{[student.value.guardianName, student.value.guardianPhone].filter(Boolean).join(" · ")}</p>
      {history && <AcademicHistory student={student.value} />}
      {year ? <>
        <Heading title="Matrículas" detail={year.label} action={canWrite && year.status === "active" && enrollments.value &&
          !enrollments.value.items.some(row => row.status === "active" || row.status === "draft") &&
          <div className="lss-action-row" data-edge-to-edge>
            <Button variant="contained" onClick={() => setEnroll({ action: "confirm" })}>Nova matrícula</Button>
            <Button variant="outlined" onClick={() => setRenewal(true)}>Renovar matrícula</Button>
          </div>} />
        <ResourceState {...enrollments} retry={enrollments.refresh} />
        {enrollments.value && <>
          <RecordList rows={enrollments.value.items} empty="Sem matrículas neste ano lectivo." render={(row) => <>
            <div><strong>{row.number ?? "Matrícula em preparação"}</strong>
              <p className="text-sm text-slate-600">{statuses[row.status]} · {dateLabel(row.enrolledOn)}</p></div>
            {canWrite && year.status === "active" && <div className="flex flex-wrap gap-2">
              {row.status === "draft" && <Button onClick={() => setEnroll({ action: "confirm", record: row })}>Retomar matrícula</Button>}
              {row.status === "active" && <>
                <Button onClick={() => setEnroll({ action: "transfer", record: row })}>Transferir</Button>
                <Button onClick={() => setEnroll({ action: "withdraw", record: row })}>Desistência</Button>
              </>}
              {(row.status === "draft" || row.status === "active") &&
                <Button color="error" onClick={() => setEnroll({ action: "cancel", record: row })}>Anular</Button>}
            </div>}
          </>} />
          <Paging {...enrollments.value} change={setPage} />
        </>}
      </> : <Alert severity="info">Configure um ano lectivo antes de registar matrículas.</Alert>}
    </section>}
    </>}
    {renewal && year && student.value && <CommandDialog title="Renovar matrícula" subtitle={student.value.fullName + " · " + year.label}
      close={() => setRenewal(false)} label="Preparar renovação" submit={(data, key) => apiRequest("POST", "/api/v1/enrollments/{id}/renew", {
        params: { id: text(data, "previousId") }, key, body: { yearId: year.id },
      })} completed={(record) => { setRenewal(false); setEnroll({ action: "confirm", record }); }}>
      <ResourceState {...previous} retry={previous.refresh} />
      <Select label="Matrícula anterior" name="previousId" defaultValue="" required>
        <option value="">Seleccione a matrícula de origem</option>
        {previous.value?.items.filter(item => item.yearId !== year.id && item.number && item.status !== "cancelled").map(item =>
          <option key={item.id} value={item.id}>{item.number} · {item.enrolledOn?.slice(0, 4)}</option>)}
      </Select>
    </CommandDialog>}
    {edit && <StudentDialog record={edit === "new" ? undefined : edit} close={() => setEdit(undefined)} completed={(value) => {
      select(value.id);
      setEdit(undefined);
      setListVersion(previous => previous + 1);
      student.refresh();
      setNotice("Ficha do aluno guardada.");
    }} />}
    {enroll && year && student.value && (
      groupList.value
        ? <EnrollmentDialog action={enroll.action} draft={enroll.record} year={year} student={student.value}
          groups={groupList.value.items} close={() => { setEnroll(undefined); enrollments.refresh(); }}
          complete={(value) => { setEnroll(undefined); enrollments.refresh(); student.refresh();
            setNotice(value.status === "active" ? "Matrícula guardada." : "Estado da matrícula actualizado."); }} />
        : <TaskSurface title="Matrícula" onClose={() => setEnroll(undefined)} actions={(close) => <Button onClick={close}>Fechar</Button>}>
          <ResourceState {...groupList} retry={groupList.refresh} />
        </TaskSurface>
    )}
  </div>;
}
