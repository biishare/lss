"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { TaskSurface } from "../../components/task-surface";
import { useCommand } from "./use-remote";

export function Heading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-bold">{title}</h2>{detail && <p className="mt-1 text-sm text-slate-600">{detail}</p>}</div>
    {action}
  </div>;
}

export function ResourceState({ loading, error, retry }: { loading?: boolean; error?: string; retry(): void }) {
  if (error) return <Alert severity="error" action={<Button color="inherit" onClick={retry}>Tentar novamente</Button>}>{error}</Alert>;
  if (!loading) return null;
  return <div role="status" aria-busy="true" className="grid gap-3 p-4">
    <span className="text-sm text-slate-600">A carregar…</span>
    {[0, 1, 2].map((id) => <Skeleton key={id} aria-hidden="true" animation={false} variant="rounded" height={42} />)}
  </div>;
}

export function Paging({ page, limit, total, change }: { page: number; limit: number; total: number; change(page: number): void }) {
  if (total <= limit && page === 1) return null;
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2">
    <Button onClick={() => change(page - 1)} disabled={page <= 1}>Anterior</Button>
    <p className="text-sm">Página {page} de {Math.max(1, Math.ceil(total / limit))}</p>
    <Button onClick={() => change(page + 1)} disabled={page * limit >= total}>Seguinte</Button>
  </div>;
}

export function RecordList<T extends { id: string }>({
  rows, render, empty,
}: { rows: T[]; render(row: T): ReactNode; empty: string }) {
  if (!rows.length) return <p className="px-4 py-5 text-sm text-slate-600">{empty}</p>;
  return <ul className="divide-y divide-slate-100">{rows.map(row =>
    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">{render(row)}</li>,
  )}</ul>;
}

export function Select({ children, ...props }: TextFieldProps & { children: ReactNode }) {
  return <TextField {...props} select slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>{children}</TextField>;
}

export function DateField({ type = "date", ...props }: TextFieldProps) {
  return <TextField type={type} {...props} slotProps={{ inputLabel: { shrink: true }, ...props.slotProps }} />;
}

export function CommandDialog<T>({
  title, subtitle, children, close, submit, completed, label = "Guardar", initialDirty = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close(): void;
  submit(data: FormData, key: string): Promise<T>;
  completed(result: T): void;
  label?: string;
  initialDirty?: boolean;
}) {
  const formId = useId();
  const command = useCommand();
  const [dirty, setDirty] = useState(initialDirty);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await command.run(JSON.stringify(Array.from(data)), (key) => submit(data, key));
    if (result !== undefined) completed(result);
  }

  return <TaskSurface title={title} subtitle={subtitle} mobile="full-screen"
    busy={command.busy} dirty={dirty || command.uncertain} onClose={close}
    actions={(cancel) => <>
      <Button onClick={cancel} disabled={command.busy}>Cancelar</Button>
      <Button type="submit" form={formId} variant="contained" disabled={command.busy}>
        {command.uncertain ? "Confirmar novamente" : label}
      </Button>
    </>}>
    {command.error && <Alert severity="error" sx={{ mb: 2 }}>{command.error}</Alert>}
    <form id={formId} onSubmit={onSubmit} onChange={() => setDirty(true)} className="grid gap-4">
      {children}
    </form>
  </TaskSurface>;
}
