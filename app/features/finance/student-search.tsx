"use client";

import { useId, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import type { Student } from "../../lib/school-demo-data";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export function StudentSearch({ students, onChoose, label = "Pesquisar aluno" }: {
  students: Student[]; onChoose(student: Student): void; label?: string;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const matches = students.filter((item) => {
    const text = normalize([item.fullName, item.registrationNumber, item.stableNumber, item.guardianPhone, item.academicYearId].join(" "));
    return terms.every((term) => text.includes(term));
  });
  return <section aria-label="Escolha do aluno" className="grid gap-3">
    <TextField type="search" label={label} fullWidth value={query} onChange={(event) => setQuery(event.target.value)}
      helperText="Pesquise pelo nome, número ou contacto. Escolha a matrícula e o ano pretendidos."
      slotProps={{ htmlInput: { "aria-controls": id, autoComplete: "off" } }} />
    <p role="status" className="text-sm text-slate-500">{matches.length ? `${matches.length} matrícula(s) encontrada(s)${matches.length > 20 ? "; refine a pesquisa para ver as restantes" : ""}.` : "Nenhum aluno corresponde à pesquisa."}</p>
    <ul id={id} className="grid gap-2">{matches.slice(0, 20).map((item) => <li key={item.id}>
      <Button fullWidth variant="outlined" sx={{ justifyContent: "flex-start", textAlign: "left", minHeight: 56 }}
        aria-label={`Escolher ${item.fullName} · ${item.academicYearId ?? "Ano por indicar"} · ${item.registrationNumber}`} onClick={() => onChoose(item)}>
        <span className="min-w-0"><strong className="block break-words">{item.fullName}</strong><span className="block text-sm font-normal">{item.registrationNumber} · {item.academicYearId}</span></span>
      </Button>
    </li>)}</ul>
  </section>;
}
