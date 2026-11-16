"use client";

import { useState, type FormEvent } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { apiRequest, type Schema } from "./client";
import { Paging, RecordList, ResourceState } from "./controls";
import { useRemote } from "./use-remote";

export type Student = Schema<"AcademicStudent">;

export function StudentSearch({ open, selected, label = "Consultar aluno" }: {
  open(student: Student): void;
  selected?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const list = useRemote(JSON.stringify([search, page]), (signal) => search
    ? apiRequest("POST", "/api/v1/students/search", { body: { query: search }, query: { page, limit: 12 }, signal })
    : apiRequest("GET", "/api/v1/students", { query: { page, limit: 12 }, signal }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  }

  return <section className="lss-responsive-card min-w-0 grid gap-3" aria-label="Pesquisa de alunos">
    <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
      <TextField label="Pesquisar alunos" placeholder="Nome ou número" value={draft}
        onChange={(event) => setDraft(event.target.value)} size="small" className="min-w-0 flex-1"
        slotProps={{ htmlInput: { maxLength: 160 } }} />
      <Button variant="outlined" type="submit">Pesquisar</Button>
    </form>
    <ResourceState {...list} retry={list.refresh} />
    {list.value && <>
      <RecordList rows={list.value.items} empty={search ? "Nenhum aluno corresponde à pesquisa." : "Ainda não há alunos registados."}
        render={(student) => <>
          <div className="min-w-0">
            <strong className="break-words">{student.fullName}</strong>
            <p className="text-sm text-slate-600">{student.permanentNumber ?? "Número atribuído após a matrícula"}</p>
          </div>
          <Button onClick={() => open(student)} aria-label={label + " " + student.fullName}
            variant={selected === student.id ? "contained" : "outlined"} size="small">{label}</Button>
        </>} />
      <Paging {...list.value} change={setPage} />
    </>}
  </section>;
}
