"use client";

import { useId, useRef, useState, type ReactNode, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import useMediaQuery from "@mui/material/useMediaQuery";
import { TaskSurface } from "./task-surface";

export type ActiveFilter = { key: string; label: string; remove(): void };

// One controlled copy is edited. Neither typing nor clearing publishes filters.
// Only the editor's presentation changes at the shell's 768px breakpoint.
export function FilterPanel<T>({ title, value, clear, apply, validate, active, children }: {
  title: string; value: T; clear(value: T): T; apply(value: T): void;
  validate?(value: T): string; active: ActiveFilter[];
  children(value: T, change: (value: T) => void): ReactNode;
}) {
  const desktop = useMediaQuery("(min-width:768px)");
  const [draft, setDraft] = useState<T | null>(null), [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null), errorRef = useRef<HTMLDivElement>(null);
  const id = useId();
  function close() { setDraft(null); setError(""); window.requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }
  function submit(event: FormEvent) {
    event.preventDefault(); if (draft === null) return;
    const invalid = validate?.(draft);
    if (invalid) { setError(invalid); window.requestAnimationFrame(() => errorRef.current?.focus()); return; }
    apply(draft); close();
  }
  const actions = <><Button key="cancel" type="button" onClick={close}>Cancelar</Button><Button key="apply" type="submit" form={id} variant="contained">Aplicar filtros</Button></>;
  const form = draft !== null && <form id={id} onSubmit={submit} className="grid gap-4">
    {error && <Alert ref={errorRef} tabIndex={-1} severity="error">{error}</Alert>}
    <div className="grid gap-4 md:grid-cols-2">{children(draft, (next) => { setDraft(next); setError(""); })}</div>
    <div><Button type="button" onClick={() => { setDraft(clear(draft)); setError(""); }}>Limpar filtros</Button><p className="text-xs text-slate-500">Limpar altera esta cópia. Os resultados só mudam ao aplicar.</p></div>
  </form>;
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-2">
      <Button ref={trigger} variant="outlined" aria-expanded={draft !== null} onClick={() => { if (draft !== null) close(); else { setDraft(structuredClone(value)); setError(""); } }}>Filtros{active.length ? ` (${active.length})` : ""}</Button>
      {active.map((item) => <Button key={item.key} type="button" variant="outlined" aria-label={`Remover filtro ${item.label}`} onClick={item.remove} sx={{ borderRadius: 8, maxWidth: "100%", minHeight: 44, whiteSpace: "normal", textAlign: "left" }}>{item.label}<span aria-hidden="true" className="ml-2">×</span></Button>)}
    </div>
    {draft !== null && (desktop ? <section aria-label={title} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 font-bold">{title}</h3>{form}<div className="mt-4 flex justify-end gap-2">{actions}</div></section> : <TaskSurface title={title} mobile="sheet" onClose={close} actions={actions}>{form}</TaskSurface>)}
  </div>;
}
