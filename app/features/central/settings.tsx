"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import { apiRequest, type Schema } from "./client";
import { CommandDialog, DateField, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { cents, dateLabel, integer, money, schoolDay, statuses, text } from "./format";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

type Institution = Schema<"Institution">;
type Catalog = "levels" | "classes" | "rooms" | "groups";
type CatalogRow = Schema<"AcademicLevel"> | Schema<"AcademicClass"> | Schema<"AcademicRoom"> | Schema<"AcademicGroup">;
const catalogLabels = { levels: "Níveis", classes: "Classes", rooms: "Salas", groups: "Turmas" };
const shiftLabels = { manha: "Manhã", tarde: "Tarde", noite: "Noite" } as const;

function months(value: string) {
  return value.split(/[,\s]+/u).filter(Boolean);
}

function YearEditor({ year, action, close, saved }: {
  year?: Year; action?: "activate" | "close"; close(): void; saved(message: string): void;
}) {
  const initialYear = year?.year ?? Number(schoolDay().slice(0, 4));
  if (year && action) {
    const title = action === "activate" ? "Activar ano lectivo" : "Fechar ano lectivo";
    return <CommandDialog title={title} subtitle={year.label} close={close} label={title}
      submit={(data, key) => apiRequest("POST", action === "activate" ? "/api/v1/academic-years/{id}/activate" : "/api/v1/academic-years/{id}/close", {
        params: { id: year.id }, key, body: { revision: year.revision, reason: text(data, "reason") },
      })} completed={() => saved(action === "activate" ? "Ano lectivo activado." : "Ano lectivo fechado.")}>
      <TextField label="Motivo" name="reason" required />
    </CommandDialog>;
  }
  return <CommandDialog title={year ? "Editar ano lectivo" : "Novo ano lectivo"} close={close}
    submit={(data, key) => {
      const values = { label: text(data, "label"), startsOn: text(data, "startsOn"),
        endsOn: text(data, "endsOn"), billingMonths: months(text(data, "months")) };
      return year
        ? apiRequest("PATCH", "/api/v1/academic-years/{id}", { params: { id: year.id }, key,
          body: { ...values, revision: year.revision, reason: text(data, "reason") } })
        : apiRequest("POST", "/api/v1/academic-years", { key, body: { ...values, year: integer(data, "year") } });
    }} completed={() => saved("Ano lectivo guardado.")}>
    {!year && <TextField label="Ano" name="year" type="number" defaultValue={initialYear} required />}
    <TextField label="Nome do ano lectivo" name="label" defaultValue={year?.label ?? "Ano lectivo " + initialYear} required />
    <DateField label="Início do ano lectivo" name="startsOn" defaultValue={year?.startsOn ?? initialYear + "-02-01"} required />
    <DateField label="Fim do ano lectivo" name="endsOn" defaultValue={year?.endsOn ?? initialYear + "-11-30"} required />
    <TextField label="Competências das propinas" name="months" required
      defaultValue={year?.billingMonths.join(", ") ?? Array.from({ length: 10 }, (_, index) => initialYear + "-" + String(index + 2).padStart(2, "0")).join(", ")}
      helperText="Separe os meses no formato AAAA-MM por vírgulas." />
    {year && <TextField label="Motivo" name="reason" required />}
  </CommandDialog>;
}

function CatalogEditor({ kind, year, record, close, saved }: {
  kind: Catalog; year?: Year; record?: CatalogRow; close(): void; saved(message: string): void;
}) {
  const segment = { levels: "nível", classes: "classe", rooms: "sala", groups: "turma" }[kind];
  const levels = useRemote(kind === "classes" && !record ? "levels" : null, signal =>
    apiRequest("GET", "/api/v1/levels", { query: { page: 1, limit: 100 }, signal }));
  const classes = useRemote(kind === "groups" && year && !record ? year.id : null, signal =>
    apiRequest("GET", "/api/v1/classes", { query: { yearId: year?.id, page: 1, limit: 100 }, signal }));
  const rooms = useRemote(kind === "groups" ? "rooms" : null, signal =>
    apiRequest("GET", "/api/v1/rooms", { query: { page: 1, limit: 100 }, signal }));
  const group = record && "startsAt" in record ? record : undefined;
  const room = record && "block" in record ? record : undefined;

  async function submit(data: FormData, key: string): Promise<CatalogRow> {
    const name = text(data, "name");
    if (kind === "levels") return record
      ? apiRequest("PATCH", "/api/v1/levels/{id}", { params: { id: record.id }, key,
        body: { name, revision: record.revision, reason: text(data, "reason") } })
      : apiRequest("POST", "/api/v1/levels", { body: { name }, key });
    if (kind === "classes") return record
      ? apiRequest("PATCH", "/api/v1/classes/{id}", { params: { id: record.id }, key,
        body: { name, revision: record.revision, reason: text(data, "reason") } })
      : apiRequest("POST", "/api/v1/classes", { body: { name, levelId: text(data, "levelId"), yearId: year!.id }, key });
    if (kind === "rooms") {
      const body = { name, block: text(data, "block"), capacity: integer(data, "capacity") };
      return record
        ? apiRequest("PATCH", "/api/v1/rooms/{id}", { params: { id: record.id }, key,
          body: { ...body, revision: record.revision, reason: text(data, "reason") } })
        : apiRequest("POST", "/api/v1/rooms", { body, key });
    }
    const body = { name, roomId: text(data, "roomId"), shift: text(data, "shift") as keyof typeof shiftLabels,
      days: data.getAll("days").map(Number), startsAt: text(data, "startsAt"),
      endsAt: text(data, "endsAt"), capacity: integer(data, "capacity") };
    return record
      ? apiRequest("PATCH", "/api/v1/groups/{id}", { params: { id: record.id }, key,
        body: { ...body, revision: record.revision, reason: text(data, "reason") } })
      : apiRequest("POST", "/api/v1/groups", { body: { ...body, classId: text(data, "classId") }, key });
  }

  return <CommandDialog title={(record ? "Editar " : "Criar ") + segment} close={close} submit={submit}
    completed={() => saved("Alteração guardada.")}>
    <TextField label="Nome" name="name" required defaultValue={record?.name ?? ""} />
    {kind === "classes" && !record && <>
      <ResourceState {...levels} retry={levels.refresh} />
      <Select label="Nível" name="levelId" defaultValue="" required>
        <option value="">Seleccione o nível</option>{levels.value?.items.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </Select>
    </>}
    {kind === "rooms" && <TextField label="Bloco" name="block" defaultValue={room?.block ?? ""} />}
    {(kind === "rooms" || kind === "groups") && <TextField label="Capacidade" name="capacity" type="number"
      defaultValue={room?.capacity ?? group?.capacity ?? 30} required />}
    {kind === "groups" && <>
      {!record && <>
        <ResourceState {...classes} retry={classes.refresh} />
        <Select label="Classe" name="classId" defaultValue="" required><option value="">Seleccione uma classe</option>
          {classes.value?.items.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select>
      </>}
      <ResourceState {...rooms} retry={rooms.refresh} />
      <Select label="Sala" name="roomId" defaultValue={group?.roomId ?? ""} required>
        <option value="">Seleccione uma sala</option>
        {rooms.value?.items.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </Select>
      <Select label="Turno" name="shift" defaultValue={group?.shift ?? "manha"} required>
        {Object.entries(shiftLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
      </Select>
      <fieldset className="border-0 p-0"><legend className="text-sm font-medium">Dias da semana</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, index) =>
            <label className="flex min-h-8 items-center gap-2" key={day}>
              <input type="checkbox" name="days" value={index + 1} defaultChecked={group?.days.includes(index + 1) ?? index < 5} />{day}
            </label>)}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField type="time" label="Início" name="startsAt" defaultValue={group?.startsAt ?? "07:30"} required />
        <DateField type="time" label="Fim" name="endsAt" defaultValue={group?.endsAt ?? "11:00"} required />
      </div>
    </>}
    {record && <TextField label="Motivo da alteração" name="reason" required />}
  </CommandDialog>;
}

type Policy = Schema<"FinancePolicy">;

function PolicyEditor({ year, close, saved, policy }: {
  year: Year; close(): void; saved(message: string): void; policy?: Policy;
}) {
  const levels = useRemote("levels", signal => apiRequest("GET", "/api/v1/levels", { query: { page: 1, limit: 100 }, signal }));
  const classes = useRemote(year.id, signal => apiRequest("GET", "/api/v1/classes", { query: { yearId: year.id, page: 1, limit: 100 }, signal }));
  const [levelId, setLevelId] = useState(policy?.levelId ?? "");
  const [classId, setClassId] = useState(policy?.classId ?? "");
  const firstDay = schoolDay() < year.startsOn ? year.startsOn : schoolDay();
  return <CommandDialog title="Guardar vigência de propinas" subtitle={year.label} close={close}
    submit={(data, key) => apiRequest("POST", "/api/v1/finance/policies", { key, body: {
      yearId: year.id, levelId, classId: classId || null, expectedRevision: policy?.revision ?? 0,
      effectiveOn: text(data, "effectiveOn"), registrationCents: cents(data.get("registration")),
      renewalCents: cents(data.get("renewal")), tuitionCents: cents(data.get("tuition")),
      billingMonths: months(text(data, "months")), registrationGraceDays: integer(data, "registrationGraceDays"),
      tuitionDueDay: integer(data, "tuitionDueDay"), reason: text(data, "reason"), penaltyRules: [1, 2].flatMap((number) => {
        const percentage = text(data, "rate" + number);
        const days = text(data, "delay" + number);
        return percentage || days ? [{ afterDays: integer(data, "delay" + number), cumulativeBasisPoints: cents(percentage) }] : [];
      }),
    } })} completed={() => saved("Vigência de propinas guardada.")}>
    <ResourceState {...levels} retry={levels.refresh} />
    <ResourceState {...classes} retry={classes.refresh} />
    <Select label="Nível" name="levelId" required disabled={Boolean(policy)} value={levelId}
      onChange={(event) => { setLevelId(event.target.value); setClassId(""); }}>
      <option value="">Seleccione o nível</option>{levels.value?.items.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
    </Select>
    <Select label="Classe" name="classId" disabled={Boolean(policy)} value={classId}
      onChange={(event) => setClassId(event.target.value)}>
      <option value="">Todas as classes do nível</option>
      {classes.value?.items.filter(row => row.levelId === levelId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
    </Select>
    <DateField label="Data da vigência" name="effectiveOn" defaultValue={firstDay} required />
    <TextField label="Inscrição em MT" name="registration" defaultValue={policy ? amountInput(policy.registrationCents) : ""} required />
    <TextField label="Renovação em MT" name="renewal" defaultValue={policy ? amountInput(policy.renewalCents) : ""} required />
    <TextField label="Propina em MT" name="tuition" defaultValue={policy ? amountInput(policy.tuitionCents) : ""} required />
    <TextField label="Competências" name="months" defaultValue={(policy?.billingMonths ?? year.billingMonths).join(", ")}
      helperText="Meses no formato AAAA-MM separados por vírgula." />
    <TextField label="Prazo da inscrição em dias" name="registrationGraceDays" type="number" defaultValue={policy?.registrationGraceDays ?? 0} required />
    <TextField label="Dia de vencimento da propina" name="tuitionDueDay" type="number" defaultValue={policy?.tuitionDueDay ?? 10} required />
    {[1, 2].map((index) => <div key={index} className="grid gap-3 sm:grid-cols-2">
      <TextField label={"Dias de atraso da etapa " + index} name={"delay" + index} type="number"
        defaultValue={policy?.penaltyRules[index - 1]?.afterDays ?? ""} />
      <TextField label={"Multa acumulada (%) da etapa " + index} name={"rate" + index}
        defaultValue={policy?.penaltyRules[index - 1] ? amountInput(policy.penaltyRules[index - 1].cumulativeBasisPoints) : ""} />
    </div>)}
    <TextField label="Motivo da vigência" name="reason" required />
  </CommandDialog>;
}

function amountInput(value: number) {
  return Math.floor(value / 100) + "." + String(value % 100).padStart(2, "0");
}

type Section = "institution" | "years" | "policies" | Catalog;
const sections: [Section, string][] = [
  ["institution", "Instituição"], ["years", "Anos lectivos"], ["levels", "Níveis"], ["classes", "Classes"],
  ["rooms", "Salas"], ["groups", "Turmas"], ["policies", "Propinas"],
];

export function Settings({ institution, year, years, canWrite, refresh }: {
  institution: Institution; year?: Year; years: Year[]; canWrite: boolean; refresh(): void;
}) {
  const [section, setSection] = useState<Section>("institution");
  const [page, setPage] = useState(1);
  const [yearTask, setYearTask] = useState<{ record?: Year; action?: "activate" | "close" }>();
  const [editor, setEditor] = useState<"new" | CatalogRow>();
  const [policy, setPolicy] = useState<"new" | Policy>();
  const [notice, setNotice] = useState("");
  const selectedCatalog = section === "levels" || section === "classes" || section === "rooms" || section === "groups" ? section : null;
  const needsYear = selectedCatalog === "classes" || selectedCatalog === "groups";
  const skip = needsYear && !year;
  const records = useRemote<{ items: CatalogRow[]; page: number; limit: number; total: number }>(
    selectedCatalog && !skip ? JSON.stringify([selectedCatalog, year?.id, page]) : null,
    (signal) => {
      const query = { page, limit: 12 };
      if (selectedCatalog === "levels") return apiRequest("GET", "/api/v1/levels", { query, signal });
      if (selectedCatalog === "rooms") return apiRequest("GET", "/api/v1/rooms", { query, signal });
      const path = selectedCatalog === "classes" ? "/api/v1/classes" : "/api/v1/groups";
      return apiRequest("GET", path, { query: { ...query, yearId: year?.id }, signal });
    },
  );
  const policies = useRemote(section === "policies" && year ? JSON.stringify([year.id, page]) : null,
    signal => apiRequest("GET", "/api/v1/finance/policies", { query: { yearId: year?.id, page, limit: 12 }, signal }));

  function saved(message: string) {
    const catalogueChanged = Boolean(editor);
    setYearTask(undefined);
    setEditor(undefined);
    setPolicy(undefined);
    setNotice(message);
    if (yearTask) refresh();
    if (catalogueChanged) records.refresh();
    if (policy) policies.refresh();
  }

  return <div className="grid gap-4">
    <Heading title="Configurações escolares" />
    <nav className="lss-action-row" data-edge-to-edge aria-label="Configurações escolares">
      {sections.map(([key, label]) => <Button key={key} variant={section === key ? "contained" : "text"}
        aria-pressed={section === key} onClick={() => { setSection(key); setPage(1); setNotice(""); }}>{label}</Button>)}
    </nav>
    {notice && <Alert severity="success">{notice}</Alert>}
    {section === "institution" && <section className="lss-responsive-card grid gap-4">
      <Heading title={institution.name} detail={[institution.email, institution.phone, institution.address].filter(Boolean).join(" · ")} />
      {institution.logo && <Image unoptimized src={institution.logo.url} width={institution.logo.width} height={institution.logo.height}
        alt={"Logótipo de " + institution.name} className="h-auto max-h-24 w-auto max-w-44 object-contain" />}
      <p className="text-sm text-slate-600">Moeda {institution.currency} · Fuso horário {institution.timeZone}</p>
    </section>}
    {section === "years" && <section className="lss-responsive-card grid gap-4">
      <Heading title="Anos lectivos" action={canWrite && <Button variant="contained" onClick={() => setYearTask({})}>Novo ano lectivo</Button>} />
      <RecordList rows={years} empty="Ainda não há anos lectivos." render={row => <>
        <div><strong>{row.label}</strong><p className="text-sm text-slate-600">
          {statuses[row.status]} · {dateLabel(row.startsOn)} a {dateLabel(row.endsOn)}</p></div>
        {canWrite && row.status !== "closed" && <div className="flex flex-wrap gap-2">
          <Button onClick={() => setYearTask({ record: row })}>Editar</Button>
          {row.status === "preparing" && <Button onClick={() => setYearTask({ record: row, action: "activate" })}>Activar</Button>}
          {row.status === "active" && <Button onClick={() => setYearTask({ record: row, action: "close" })}>Fechar ano</Button>}
        </div>}
      </>} />
    </section>}
    {selectedCatalog && <section className="lss-responsive-card grid gap-4">
      <Heading title={catalogLabels[selectedCatalog]} action={canWrite && !skip && <Button variant="contained" onClick={() => setEditor("new")}>Criar</Button>} />
      {skip && <p className="text-sm text-slate-600">Seleccione ou crie um ano lectivo.</p>}
      <ResourceState {...records} retry={records.refresh} />
      {records.value && <>
        <RecordList rows={records.value.items} empty="Sem registos nesta área." render={row => <>
          <div><strong>{row.name}</strong>
            {"capacity" in row && <p className="text-sm text-slate-600">{row.capacity} lugares
              {"shift" in row ? " · " + shiftLabels[row.shift] + " · " + row.startsAt + "–" + row.endsAt : "block" in row && row.block ? " · " + row.block : ""}
            </p>}
          </div>
          {canWrite && <Button onClick={() => setEditor(row)}>Editar</Button>}
        </>} />
        <Paging {...records.value} change={setPage} />
      </>}
    </section>}
    {section === "policies" && <section className="lss-responsive-card grid gap-4">
      <Heading title="Propinas e inscrição" action={canWrite && year && year.status !== "closed" &&
        <Button variant="contained" onClick={() => setPolicy("new")}>Nova vigência</Button>} />
      {!year && <p className="text-sm text-slate-600">Seleccione ou crie um ano lectivo.</p>}
      <ResourceState {...policies} retry={policies.refresh} />
      {policies.value && <>
        <RecordList rows={policies.value.items} empty="Sem preços configurados para este ano." render={row => <>
          <div><strong>Propina {money(row.tuitionCents)}</strong><p className="text-sm text-slate-600">
            Inscrição {money(row.registrationCents)} · Renovação {money(row.renewalCents)} · Vigência {dateLabel(row.effectiveOn)}</p></div>
          {canWrite && year?.status !== "closed" && <Button onClick={() => setPolicy(row)}>Alterar vigência</Button>}
        </>} />
        <Paging {...policies.value} change={setPage} />
      </>}
    </section>}
    {yearTask && <YearEditor year={yearTask.record} action={yearTask.action} saved={saved} close={() => setYearTask(undefined)} />}
    {selectedCatalog && editor && <CatalogEditor kind={selectedCatalog} year={year}
      record={editor === "new" ? undefined : editor} saved={saved} close={() => setEditor(undefined)} />}
    {policy && year && <PolicyEditor year={year} policy={policy === "new" ? undefined : policy}
      saved={saved} close={() => setPolicy(undefined)} />}
  </div>;
}
