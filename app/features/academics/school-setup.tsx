"use client";

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { monthOptions } from "../../lib/school-demo-data";
import type { DemoState } from "../demo/demo-state";
import { academicStateFor, groupOccupancy, schoolDate } from "./model";
import { formatDateTime } from "../../components/school-admin-demo.model";
import { AcademicError, type AcademicCommand } from "./operations";
import type { AcademicExecute } from "./enrollment-dialog";

export function SchoolSetup({ state, yearId, canWrite, execute, onYear }: { state: DemoState; yearId: string; canWrite: boolean; execute: AcademicExecute; onYear: (yearId: string) => void }) {
  const academic = academicStateFor(state), year = academic.years.find((year) => year.id === yearId) ?? academic.years[0];
  const [step, setStep] = useState(0), [kind, setKind] = useState<"room" | "group">("room");
  const [error, setError] = useState<AcademicError | null>(null), [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [levelId, setLevelId] = useState(""), [levelName, setLevelName] = useState("");
  const [months, setMonths] = useState(year?.billingMonths ?? []), [days, setDays] = useState([1, 2, 3, 4, 5]);
  function seed(index: number, mode = kind): Record<string, string> {
    if (index === 0) return { name: academic.institution.name, contact: academic.institution.contact, logoText: academic.institution.logoText };
    if (index === 1 || index === 4) return { id: year?.id ?? String(new Date().getFullYear()), label: year?.label ?? "", startsOn: year?.startsOn ?? "", endsOn: year?.endsOn ?? "", monthlyFee: String(year?.settings.monthlyFee ?? 0), inscriptionRenewalFee: String(year?.settings.inscriptionRenewalFee ?? 0), monthlyDueDay: String(year?.settings.monthlyDueDay ?? 10), reason: "" };
    if (index === 2) return { id: "", name: "", levelId: state.academicStages[0]?.id ?? "" };
    if (mode === "room") return { id: "", name: "", block: "", capacity: "30", reason: "" };
    const room = state.rooms.find((item) => item.status === "active");
    return { id: "", name: "", classId: state.classes.find((item) => item.academicYear === yearId)?.id ?? "", roomId: room?.id ?? "", shift: "Manhã", capacity: String(room?.capacity ?? 30), startsAt: "07:00", endsAt: "12:00", reason: "" };
  }
  const [form, setForm] = useState<Record<string, string>>(() => seed(0));
  const change = (name: string, value: string) => { setDirty(true); setError(null); setNotice(""); setForm((current) => ({ ...current, [name]: value })); };
  function openStep(index: number, mode = kind) { if (dirty && !window.confirm("Mudar de etapa sem guardar estas alterações?")) return; setDirty(false); setStep(index); setKind(mode); setForm(seed(index, mode)); setMonths(year?.billingMonths ?? []); setError(null); setNotice(""); }
  function run(command: AcademicCommand) {
    try { const result = execute(command, crypto.randomUUID()); setError(null); setNotice("Os dados foram actualizados."); return result; }
    catch (failure) { setError(failure instanceof AcademicError ? failure : new AcademicError(failure instanceof Error ? failure.message : "Não foi possível guardar.")); return null; }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    let command: AcademicCommand;
    if (step === 0) command = { type: "institution", name: form.name, contact: form.contact, logoText: form.logoText };
    else if (step === 1 || step === 4) command = { type: "year", id: form.id, label: form.label, startsOn: form.startsOn, endsOn: form.endsOn, billingMonths: months, settings: { ...year!.settings, academicYear: form.id, monthlyFee: Number(form.monthlyFee), inscriptionRenewalFee: Number(form.inscriptionRenewalFee), monthlyDueDay: Number(form.monthlyDueDay) } };
    else if (step === 2) command = { type: "class", id: form.id || undefined, name: form.name, levelId: form.levelId, yearId };
    else if (kind === "room") command = { type: "room", id: form.id || undefined, name: form.name, block: form.block, capacity: Number(form.capacity), reason: form.reason };
    else command = { type: "group", id: form.id || undefined, name: form.name, classId: form.classId, roomId: form.roomId, shift: form.shift, capacity: Number(form.capacity), startsAt: form.startsAt, endsAt: form.endsAt, days, reason: form.reason };
    const result = run(command);
    if (result) setDirty(false);
    if (result && command.type === "year" && command.id !== yearId) onYear(command.id);
  }
  const field = (key: string, label: string, type = "text") => <TextField key={key} label={label} type={type} value={form[key] ?? ""} onChange={(event) => change(key, event.target.value)} error={error?.field === key} helperText={error?.field === key ? error.message : undefined} required={!["contact", "block", "reason"].includes(key)} slotProps={type === "date" || type === "time" ? { inputLabel: { shrink: true } } : type === "number" ? { htmlInput: { step: key.endsWith("Fee") ? "0.01" : "1", min: "0" } } : undefined}/>;
  const select = (key: string, label: string, items: Array<{ id: string; label: string }>) => <TextField select label={label} value={form[key] ?? ""} onChange={(event) => change(key, event.target.value)} slotProps={{ select: { native: true } }} error={error?.field === key}><option value="">Escolha uma opção</option>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</TextField>;
  const missing = [!academic.institution.contact && "contactos da escola", !year?.calendarReviewed && "calendário", !state.classes.some((item) => item.academicYear === yearId) && "classes do ano", !state.rooms.length && "salas", !state.groups.some((item) => state.classes.find((schoolClass) => schoolClass.id === item.classId)?.academicYear === yearId) && "turmas"].filter(Boolean);
  const reference = year ? [year.startsOn, schoolDate(new Date().toISOString())].sort().at(-1)! > year.endsOn ? year.endsOn : [year.startsOn, schoolDate(new Date().toISOString())].sort().at(-1)! : "";
  return <div className="grid gap-5">
    <section className="lss-responsive-card"><h2 className="text-xl font-bold">Configuração da escola</h2>{missing.length > 0 && <Alert severity="info" sx={{ mt: 2 }}>Por completar: {missing.join(", ")}. Escolha a etapa correspondente para resolver.</Alert>}<nav aria-label="Etapas de configuração" className="mt-4 flex flex-wrap gap-2">{["Escola", "Ano e calendário", "Níveis e classes", "Salas e turmas", "Regras de pagamento"].map((label, index) => <Button key={label} variant={step === index ? "contained" : "outlined"} aria-current={step === index ? "step" : undefined} onClick={() => openStep(index)}>{index + 1}. {label}</Button>)}</nav></section>
    {error && <Alert severity="error">{error.message}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    {canWrite && <section className="lss-responsive-card"><form onSubmit={save} className="grid gap-5">
      <h3 className="font-bold">{["Identificação da escola", "Calendário lectivo", "Cadastrar classe", kind === "room" ? "Cadastrar sala" : "Configurar turma", "Valores e vencimento"][step]}</h3>
      {step === 0 && <>{field("name", "Nome da escola")}{field("logoText", "Sigla da escola")}{field("contact", "Contactos da escola")}</>}
      {(step === 1 || step === 4) && <>
        {step === 1 && <><Button variant="outlined" onClick={() => { const id = String(Math.max(Number(yearId), ...academic.years.map((item) => Number(item.id))) + 1); setForm({ ...seed(1), id, label: id, startsOn: `${id}-01-01`, endsOn: `${id}-12-31` }); setMonths(year?.billingMonths ?? []); }}>Preparar próximo ano</Button><div className="grid gap-5 sm:grid-cols-2">{field("id", "Ano", "number")}{field("label", "Designação do ano")}{field("startsOn", "Início do ano lectivo", "date")}{field("endsOn", "Fim do ano lectivo", "date")}</div><fieldset><legend className="text-sm font-semibold">Meses cobráveis</legend><div className="mt-2 flex flex-wrap">{monthOptions.map((month) => <FormControlLabel key={month.key} control={<Checkbox checked={months.includes(month.key)} onChange={(event) => setMonths(event.target.checked ? [...months, month.key] : months.filter((key) => key !== month.key))}/>} label={month.label}/>)}</div></fieldset></>}
        <div className="grid gap-5 sm:grid-cols-3">{field("inscriptionRenewalFee", "Inscrição e renovação (MT)", "number")}{field("monthlyFee", "Mensalidade de referência (MT)", "number")}{field("monthlyDueDay", "Dia de vencimento", "number")}</div><p className="text-sm text-slate-600">Um valor zero é permitido. Alterações não reescrevem cobranças ou recibos existentes. O vencimento usa o último dia quando o mês não tiver o dia indicado.</p>
      </>}
      {step === 2 && <>
        <TextField select label="Classe do catálogo" value={form.id ?? ""} onChange={(event) => { const definition = state.classDefinitions.find((item) => item.id === event.target.value); setForm(definition ? { id: definition.id, name: definition.name, levelId: definition.stageId } : seed(2)); }} slotProps={{ select: { native: true } }}><option value="">Nova classe</option>{state.classDefinitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</TextField>
        {field("name", "Nome da classe")}{select("levelId", "Nível de ensino", state.academicStages.filter((item) => item.status === "active").map((item) => ({ id: item.id, label: item.name })))}<p className="text-sm text-slate-600">Guardar cadastra a classe uma vez e disponibiliza-a no ano {year?.label}.</p>
      </>}
      {step === 3 && <>
        <div className="flex flex-wrap gap-2"><Button variant={kind === "room" ? "contained" : "outlined"} onClick={() => openStep(3, "room")}>Sala</Button><Button variant={kind === "group" ? "contained" : "outlined"} onClick={() => openStep(3, "group")}>Turma</Button></div>
        {field("name", kind === "room" ? "Nome da sala" : "Nome da turma")}
        {kind === "room" ? field("block", "Localização da sala") : <>{select("classId", "Classe da turma", state.classes.filter((item) => item.academicYear === yearId && item.status === "active").map((item) => ({ id: item.id, label: item.name })))}{select("roomId", "Sala da turma", state.rooms.filter((item) => item.status === "active").map((item) => ({ id: item.id, label: `${item.name} · ${item.capacity} lugares` })))}{field("shift", "Turno")}<div className="grid gap-5 sm:grid-cols-2">{field("startsAt", "Hora de início", "time")}{field("endsAt", "Hora de fim", "time")}</div><fieldset><legend>Dias da semana</legend><div className="flex flex-wrap">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label, index) => <FormControlLabel key={label} control={<Checkbox checked={days.includes(index + 1)} onChange={(event) => setDays(event.target.checked ? [...days, index + 1] : days.filter((day) => day !== index + 1))}/>} label={label}/>)}</div></fieldset></>}
        {field("capacity", "Capacidade", "number")}{form.id && field("reason", "Motivo da alteração de capacidade")}
      </>}
      <div className="flex flex-wrap gap-3"><Button type="submit" variant="contained">Guardar configuração</Button>{step < 4 && <Button onClick={() => openStep(step + 1)}>Etapa seguinte</Button>}</div>
    </form></section>}
    {step === 0 && <section className="lss-responsive-card"><h3 className="font-bold">{academic.institution.name}</h3><p>{academic.institution.contact || "Contactos por completar"}</p><p className="mt-2 text-sm text-slate-600">Moeda: MT · Fuso horário: Africa/Maputo</p></section>}
    {(step === 1 || step === 4) && <section className="lss-responsive-card"><h3 className="font-bold">Anos lectivos</h3><div className="mt-4 grid gap-3">{academic.years.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3"><div><strong>{item.label}</strong><p className="text-sm">{item.startsOn} a {item.endsOn} · {item.status === "active" ? "Em curso" : item.status === "closed" ? "Encerrado" : "Em preparação"}</p></div><Button onClick={() => onYear(item.id)}>Consultar {item.label}</Button></div>)}</div>{canWrite && year && year.status !== "closed" && <div className="mt-5 grid gap-3">{field("reason", "Motivo para iniciar ou encerrar o ano")}<Button variant="outlined" onClick={() => { if (window.confirm(year.status === "active" ? "Encerrar este ano? Os movimentos, dívidas, créditos e matrículas ficam no histórico." : "Iniciar este ano como único ano operacional?")) run({ type: "year-status", yearId: year.id, status: year.status === "active" ? "closed" : "active", reason: form.reason ?? "" }); }}>{year.status === "active" ? "Encerrar ano lectivo" : "Iniciar ano lectivo"}</Button></div>}</section>}
    {step === 2 && <>
      <section className="lss-responsive-card"><h3 className="font-bold">Níveis de ensino</h3><div className="mt-3 flex flex-wrap gap-2">{state.academicStages.map((item) => <Chip key={item.id} label={item.name} onClick={canWrite ? () => { setLevelId(item.id); setLevelName(item.name); } : undefined}/>)}</div>{canWrite && <form className="mt-5 flex flex-wrap items-start gap-3" onSubmit={(event) => { event.preventDefault(); const saved = run({ type: "level", id: levelId || undefined, name: levelName }); if (saved) { setLevelId(""); setLevelName(""); } }}><TextField name="levelName" label="Nome do nível" value={levelName} onChange={(event) => setLevelName(event.target.value)} required sx={{ flex: "1 1 240px" }}/><Button type="submit" variant="outlined">{levelId ? "Guardar nível" : "Adicionar nível"}</Button></form>}</section>
      <section className="lss-responsive-card"><h3 className="font-bold">Classes de {year?.label}</h3><ul className="mt-3 divide-y divide-slate-100">{state.classes.filter((item) => item.academicYear === yearId).map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{item.name} · {item.stage}</span>{canWrite && <Button onClick={() => { const definition = state.classDefinitions.find((definition) => definition.id === (item.definitionId ?? item.id)); if (definition) setForm({ id: definition.id, name: definition.name, levelId: definition.stageId }); }}>Editar {item.name}</Button>}</li>)}</ul></section>
    </>}
    {step === 3 && <section className="lss-responsive-card"><h3 className="font-bold">Salas e turmas</h3><div className="mt-4 grid gap-3">{state.rooms.map((room) => <div key={room.id} className="rounded-md border border-slate-200 p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{room.name} · {room.capacity} lugares</strong>{canWrite && <Button onClick={() => { setKind("room"); setForm({ id: room.id, name: room.name, block: room.block, capacity: String(room.capacity), reason: "" }); }}>Editar {room.name}</Button>}</div>{state.groups.filter((group) => group.roomId === room.id && state.classes.find((item) => item.id === group.classId)?.academicYear === yearId).map((group) => { const occupied = groupOccupancy(academic, group.id, reference); return <div key={group.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm"><span>{state.classes.find((item) => item.id === group.classId)?.name} · {group.name} · {group.shift} · {occupied}/{group.capacity} {occupied >= group.capacity * .9 && <strong className="text-amber-800">{occupied >= group.capacity ? "Lotada" : "Poucas vagas"}</strong>}</span>{canWrite && <Button onClick={() => { setKind("group"); setDays(group.schedule?.days ?? [1, 2, 3, 4, 5]); setForm({ id: group.id, name: group.name, classId: group.classId, roomId: group.roomId, capacity: String(group.capacity), shift: group.shift, startsAt: group.schedule?.startsAt ?? (group.shift === "Tarde" ? "12:30" : "07:00"), endsAt: group.schedule?.endsAt ?? (group.shift === "Tarde" ? "18:00" : "12:30"), reason: "" }); }}>Editar {group.name}</Button>}</div>; })}</div>)}</div></section>}
    <section className="lss-responsive-card"><h3 className="font-bold">Histórico de configuração</h3><ul className="mt-3 grid gap-3">{academic.events.filter((item) => !item.personId).slice(-20).reverse().map((item) => <li key={item.id} className="border-t border-slate-100 pt-3 text-sm"><strong>{item.action}</strong><p>{item.recordedAt ? formatDateTime(item.recordedAt) : "Instante não registado"} · {item.actorId === "demo-secretaria" ? "Marta — Secretaria" : "Autor não registado"}</p>{item.reason && <p>Motivo: {item.reason}</p>}</li>)}</ul>{!academic.events.some((item) => !item.personId) && <p className="mt-3 text-sm">Sem alterações de configuração registadas.</p>}</section>
  </div>;
}
