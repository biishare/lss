"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import { apiRequest } from "./client";
import { DateField, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { dateLabel, schoolDay } from "./format";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

export function AcademicGroups({ year, openStudent }: { year: Year; openStudent(id: string): void }) {
  const today = schoolDay();
  const [on, setOn] = useState(today < year.startsOn ? year.startsOn : today > year.endsOn ? year.endsOn : today);
  const [classId, setClassId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [page, setPage] = useState(1);
  const [rosterPage, setRosterPage] = useState(1);
  const classes = useRemote(year.id, signal =>
    apiRequest("GET", "/api/v1/classes", { query: { yearId: year.id, page: 1, limit: 100 }, signal }));
  const groups = useRemote(JSON.stringify([year.id, classId, page]), signal =>
    apiRequest("GET", "/api/v1/groups", { query: { yearId: year.id, classId: classId || undefined, page, limit: 12 }, signal }));
  const group = groups.value?.items.find(item => item.id === groupId);
  const summary = useRemote(groupId && on ? groupId + ":" + on : null, signal =>
    apiRequest("GET", "/api/v1/groups/{id}/availability", { params: { id: groupId }, query: { on }, signal }));
  const roster = useRemote(groupId && on ? JSON.stringify([groupId, on, rosterPage]) : null, async signal => {
    const result = await apiRequest("GET", "/api/v1/groups/{id}/roster", {
      params: { id: groupId }, query: { on, page: rosterPage, limit: 10 }, signal,
    });
    const items = await Promise.all(result.items.map(async placement => ({
      ...placement,
      person: await apiRequest("GET", "/api/v1/students/{id}", { params: { id: placement.studentId }, signal }),
    })));
    return { ...result, items };
  });

  return <div className="grid gap-4">
    <section className="lss-responsive-card grid gap-3" data-wide="true">
      <Heading title="Turmas" detail={year.label} />
      <ResourceState {...classes} retry={classes.refresh} />
      {classes.value && <Select label="Classe" value={classId} onChange={(event) => {
        setClassId(event.target.value); setGroupId(""); setPage(1);
      }}>
        <option value="">Todas as classes</option>
        {classes.value.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>}
      <ResourceState {...groups} retry={groups.refresh} />
      {groups.value && <>
        <RecordList rows={groups.value.items} empty="Sem turmas para a classe seleccionada." render={item => <>
          <div><strong>{item.name}</strong><p className="text-sm text-slate-600">{item.startsAt}–{item.endsAt} · {item.capacity} lugares</p></div>
          <Button variant={item.id === groupId ? "contained" : "outlined"} onClick={() => {
            setGroupId(item.id); setRosterPage(1);
          }}>Ver pauta</Button>
        </>} />
        <Paging {...groups.value} change={next => { setPage(next); setGroupId(""); }} />
      </>}
    </section>
    {groupId && <section className="lss-responsive-card grid gap-3" data-wide="true">
      <Heading title={group?.name ?? "Pauta"} detail={"Colocações em " + dateLabel(on)} />
      <DateField className="max-w-xs" label="Consultar em" value={on}
        onChange={(event) => { setOn(event.target.value); setRosterPage(1); }}
        slotProps={{ htmlInput: { min: year.startsOn, max: year.endsOn } }} />
      <ResourceState {...summary} retry={summary.refresh} />
      {summary.value && <p>{summary.value.occupied} ocupados · <strong>{summary.value.available} disponíveis</strong></p>}
      <ResourceState {...roster} retry={roster.refresh} />
      {roster.value && <>
        <RecordList rows={roster.value.items} empty="Sem alunos colocados nesta data." render={row => <>
          <div><strong>{row.person.fullName}</strong><p className="text-sm text-slate-600">N.º de pauta {row.rosterNumber}</p></div>
          <Button onClick={() => openStudent(row.studentId)}>Consultar ficha</Button>
        </>} />
        <Paging {...roster.value} change={setRosterPage} />
      </>}
    </section>}
  </div>;
}
