"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useTaskHistory } from "./task-history";

export type MobileSurface = "sheet" | "full-screen" | "dialog";
type TaskSurfaceProps = {
  open?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode | ((close: () => void) => ReactNode);
  onClose(): void;
  mobile?: MobileSurface;
  maxWidth?: "sm" | "md" | "lg";
  tall?: boolean;
  busy?: boolean;
  dirty?: boolean;
  closeNotice?: string;
};

// One mounted Dialog tree at every width. Only CSS changes its geometry, so
// fields, validation, focus and command IDs survive orientation/breakpoints.
export function TaskSurface({ open = true, title, subtitle, children, actions, onClose,
  mobile = "sheet", maxWidth = "sm", tall = false, busy = false, dirty = false, closeNotice }: TaskSurfaceProps) {
  const id = useId();
  const [discard, setDiscard] = useState(false);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const keepEditing = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (discard) keepEditing.current?.focus();
    else origin?.focus();
  }, [discard, origin]);
  function close() {
    if (busy) return false;
    if (dirty) {
      setOrigin(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setDiscard(true);
      return false;
    }
    onClose();
    return true;
  }
  function continueEditing() {
    setDiscard(false);
  }
  useTaskHistory(open, id, close);
  return <Dialog open={open} onClose={close} fullWidth maxWidth={maxWidth}
    className="lss-task-root" data-mobile={mobile} data-tall={tall || undefined}
    aria-labelledby={`${id}-title`} aria-describedby={subtitle ? `${id}-context` : undefined}
    scroll="paper" slotProps={{ paper: { className: "lss-task-paper" } }}>
    <DialogTitle component="div" className="lss-task-header">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0"><h2 id={`${id}-title`} className="break-words text-lg font-bold">{title}</h2>
          {subtitle && <div id={`${id}-context`} className="mt-1 break-words text-sm font-normal text-slate-500">{subtitle}</div>}
        </div>
        <IconButton aria-label="Fechar tarefa" disabled={busy} onClick={discard ? continueEditing : close} size="large"><span aria-hidden="true">×</span></IconButton>
      </div>
    </DialogTitle>
    <DialogContent dividers className="lss-task-body" aria-busy={busy || undefined}
      onFocusCapture={(event) => {
        const element = event.target;
        if (element.matches("input, textarea, select")) element.scrollIntoView?.({ block: "nearest" });
      }}>
      {discard && <section aria-label="Alterações por guardar" className="grid gap-4">
        <Alert severity="warning">Existem alterações por guardar. Descartar fecha esta tarefa e perde apenas este preenchimento; os registos confirmados mantêm-se.</Alert>
        <div className="flex flex-wrap gap-2"><Button ref={keepEditing} variant="contained" onClick={continueEditing}>Continuar a editar</Button><Button color="error" onClick={() => { setDiscard(false); onClose(); }}>Descartar alterações</Button></div>
      </section>}
      <div hidden={discard} inert={discard || undefined} className="lss-task-content">{children}</div>
    </DialogContent>
    <DialogActions className="lss-task-footer" sx={{ display: discard ? "none" : undefined }}>
      {busy && <span role="status" className="mr-auto flex items-center gap-2 text-sm"><CircularProgress size={16} aria-hidden="true" />A guardar…</span>}
      {closeNotice && <p className="lss-task-close-notice">{closeNotice}</p>}
      {typeof actions === "function" ? actions(close) : actions}
    </DialogActions>
  </Dialog>;
}

export function Confirmation({ title, children, confirmLabel, onConfirm, onClose, busy = false }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm(): void; onClose(): void; busy?: boolean;
}) {
  return <TaskSurface title={title} mobile="dialog" busy={busy} onClose={onClose}
    actions={(close) => <><Button onClick={close} disabled={busy}>Cancelar</Button><Button color="warning" variant="contained" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
    {children}
  </TaskSurface>;
}
