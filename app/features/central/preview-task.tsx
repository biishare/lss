"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { TaskSurface } from "../../components/task-surface";
import { issueMessage } from "./client";
import { useCommand } from "./use-remote";

export function PreviewTask<Payload, Preview, Result>({
  title, subtitle, close, children, prepare, preview, submit, review, complete, label = "Confirmar",
}: {
  title: string; subtitle?: string; close(): void; children: ReactNode;
  prepare(data: FormData): Payload; preview(payload: Payload): Promise<Preview>;
  submit(payload: Payload, result: Preview, key: string): Promise<Result>;
  review(result: Preview, payload: Payload): ReactNode; complete(result: Result): void; label?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<{ payload: Payload; result: Preview }>();
  const [working, setWorking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const command = useCommand();

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setError("");
    command.setError("");
    setWorking(true);
    try {
      const payload = prepare(new FormData(event.currentTarget));
      const result = await preview(payload);
      setDraft({ payload, result });
    } catch (cause) {
      setError(issueMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!draft) return;
    const result = await command.run(JSON.stringify(draft.payload), (key) => submit(draft.payload, draft.result, key));
    if (result !== undefined) complete(result);
  }

  return <TaskSurface title={title} subtitle={subtitle} mobile="full-screen" onClose={close}
    busy={working || command.busy} dirty={dirty || Boolean(draft) || command.uncertain}
    actions={(cancel) => <>
      <Button onClick={cancel}>Fechar</Button>
      {draft ? <>
        <Button onClick={() => { setDraft(undefined); command.setError(""); }}
          disabled={command.uncertain || command.busy}>Editar</Button>
        <Button variant="contained" disabled={command.busy} onClick={confirm}>
          {command.uncertain ? "Confirmar novamente" : label}
        </Button>
      </> : <Button variant="contained" type="submit" form={id} disabled={working}>Consultar prévia</Button>}
    </>}>
    {(error || command.error) && <Alert severity="error" sx={{ mb: 2 }}>{error || command.error}</Alert>}
    {draft && review(draft.result, draft.payload)}
    <div hidden={Boolean(draft)}>
      <form id={id} onSubmit={check} onChange={() => setDirty(true)} className="grid gap-4">{children}</form>
    </div>
  </TaskSurface>;
}
