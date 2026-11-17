"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { TaskSurface } from "../../components/task-surface";
import { apiRequest, type Schema } from "./client";
import { CommandDialog, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { cents, dateLabel, methods, money, statuses, text } from "./format";
import { useRemote } from "./use-remote";

type CashSession = Schema<"CashSession">;

function Movements({ session, close }: { session: CashSession; close(): void }) {
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState<"all" | "closure" | "after-close">("all");
  const details = useRemote(JSON.stringify([session.id, page, stage]), signal => apiRequest("GET", "/api/v1/cash-sessions/{id}/movements", {
    params: { id: session.id }, query: { page, limit: 20, stage }, signal,
  }));
  return <TaskSurface title="Movimentos do caixa" subtitle={dateLabel(session.businessDate)} onClose={close} mobile="full-screen" maxWidth="md"
    actions={(cancel) => <Button onClick={cancel}>Fechar</Button>}>
    <div className="grid gap-3">
      {session.close && <div className="flex flex-wrap gap-3 text-sm">
        <span>Contado <strong>{money(session.close.countedCents)}</strong></span>
        <span>Diferença <strong>{money(session.close.differenceCents)}</strong></span>
      </div>}
      <Select label="Movimentos" value={stage} onChange={event => { setStage(event.target.value as typeof stage); setPage(1); }}>
        <option value="all">Todos</option><option value="closure">Até ao fecho</option><option value="after-close">Após o fecho</option>
      </Select>
      <ResourceState {...details} retry={details.refresh} />
      {details.value && <>
        <RecordList rows={details.value.items} empty="Sem movimentos neste período."
          render={row => <>
            <div><strong>{statuses[row.kind] ?? row.kind}</strong>
              <p className="text-sm text-slate-600">{dateLabel(row.effectiveOn)} · {methods[row.method]} · {row.actor.name}</p>
              <p className="text-sm">{row.reason}</p></div><strong>{money(row.amountCents)}</strong>
          </>} />
        <Paging {...details.value} change={setPage} />
      </>}
    </div>
  </TaskSurface>;
}

export function CashDesk({ canWrite }: { canWrite: boolean }) {
  const [page, setPage] = useState(1);
  const [task, setTask] = useState<"open" | "close" | "movement">();
  const [selected, setSelected] = useState<CashSession>();
  const [notice, setNotice] = useState("");
  const current = useRemote("active", signal => apiRequest("GET", "/api/v1/cash-sessions/active", { signal }));
  const sessions = useRemote(String(page), signal => apiRequest("GET", "/api/v1/cash-sessions", { query: { page, limit: 12 }, signal }));
  const active = current.value?.session;
  const done = (message: string) => {
    setTask(undefined);
    setNotice(message);
    current.refresh();
    sessions.refresh();
  };

  return <section className="grid gap-3">
    <div className="lss-responsive-card grid gap-3">
      <Heading title="Caixa" detail="Consulte os movimentos e os fechos de numerário." />
      {notice && <Alert severity="success">{notice}</Alert>}
      <ResourceState {...current} retry={current.refresh} />
      {current.value && (active
        ? <p>Caixa de {dateLabel(active.businessDate)} · <strong>{money(active.totals.expectedCashCents)}</strong> esperado em numerário</p>
        : <div className="flex flex-wrap items-center gap-3"><p className="text-sm">Sem caixa aberto.</p>
          {canWrite && <Button variant="contained" onClick={() => setTask("open")}>Abrir caixa</Button>}</div>)}
    </div>
    {active && <div className="lss-action-row" data-edge-to-edge role="group" aria-label="Acções de caixa">
        <Button variant="outlined" onClick={() => setSelected(active)}>Ver movimentos</Button>
        {canWrite && <>
          <Button variant="outlined" onClick={() => setTask("movement")}>Registar movimento</Button>
          <Button variant="contained" onClick={() => setTask("close")}>Fechar caixa</Button>
        </>}
    </div>}
    <section className="lss-responsive-card grid gap-3">
      <Heading title="Sessões de caixa" />
      <ResourceState {...sessions} retry={sessions.refresh} />
      {sessions.value && <>
        <RecordList rows={sessions.value.items} empty="Ainda não há sessões registadas." render={row => <>
          <div><strong>{dateLabel(row.businessDate)}</strong><p className="text-sm text-slate-600">{statuses[row.status]} · {row.openedBy.name}</p></div>
          <Button onClick={() => setSelected(row)}>Consultar movimentos</Button>
        </>} />
        <Paging {...sessions.value} change={setPage} />
      </>}
    </section>
    {task === "open" && <CommandDialog title="Abrir caixa" close={() => setTask(undefined)} label="Abrir caixa"
      submit={(data, key) => apiRequest("POST", "/api/v1/cash-sessions", { body: { openingCents: cents(data.get("amount")) }, key })}
      completed={() => done("Caixa aberto.")}>
      <TextField label="Fundo de abertura em MT" name="amount" defaultValue="0" required />
    </CommandDialog>}
    {task === "close" && active && <CommandDialog title="Fechar caixa" close={() => setTask(undefined)} label="Confirmar fecho"
      submit={(data, key) => apiRequest("POST", "/api/v1/cash-sessions/{id}/close", { params: { id: active.id }, key, body: {
        revision: active.revision, countedCents: cents(data.get("counted")), reason: text(data, "reason") || null,
      } })} completed={() => done("Fecho registado.")}>
      <p>Numerário esperado <strong>{money(active.totals.expectedCashCents)}</strong></p>
      <TextField label="Numerário contado em MT" name="counted" required />
      <TextField label="Motivo da diferença" name="reason" />
    </CommandDialog>}
    {task === "movement" && active && <CommandDialog title="Registar movimento" close={() => setTask(undefined)}
      submit={(data, key) => apiRequest("POST", "/api/v1/cash-sessions/{id}/movements", { params: { id: active.id }, key, body: {
        kind: text(data, "kind") as "expense" | "float", amountCents: cents(data.get("amount")),
        method: text(data, "method") as keyof typeof methods, category: text(data, "category"),
        reason: text(data, "reason"), document: text(data, "document") || null,
      } })} completed={() => done("Movimento guardado.")}>
      <Select label="Tipo de movimento" name="kind" defaultValue="expense" required>
        <option value="expense">Saída</option><option value="float">Reforço</option>
      </Select>
      <TextField label="Valor em MT" name="amount" required />
      <Select label="Meio" name="method" defaultValue="cash" required>
        {Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Select>
      <TextField label="Categoria" name="category" required /><TextField label="Motivo" name="reason" required />
      <TextField label="Documento" name="document" />
    </CommandDialog>}
    {selected && <Movements session={selected} close={() => setSelected(undefined)} />}
  </section>;
}
