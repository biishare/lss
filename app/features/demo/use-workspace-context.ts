"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import {
  contextFromLocation, defaultWorkspaceContext, readWorkspaceContext,
  validateWorkspaceContext, workspaceContextKey, workspacePaths, workspaceUrl, type WorkspaceContext,
} from "./workspace-context";
import type { WorkspaceView } from "../../components/school-admin-demo.model";

type ContextData = Parameters<typeof validateWorkspaceContext>[1];

export function useWorkspaceContext(datasetId: string | undefined, year: string, data: ContextData, initialView: WorkspaceView, onYearChange?: (yearId: string) => void) {
  const [context, setContext] = useState(() => defaultWorkspaceContext(initialView));
  const [readyDataset, setReadyDataset] = useState<string | null>(null);
  const contextRef = useRef(context);
  const dataRef = useRef({ data, datasetId, year, onYearChange });
  const readyRef = useRef<string | null>(null);
  useEffect(() => { dataRef.current = { data, datasetId, year, onYearChange }; }, [data, datasetId, year, onYearChange]);

  useEffect(() => {
    if (!datasetId) return;
    const restore = () => {
      let saved: Partial<WorkspaceContext> = {};
      try { saved = readWorkspaceContext(window.sessionStorage.getItem(workspaceContextKey), datasetId); } catch { /* Preferência opcional. */ }
      const fallback = { ...defaultWorkspaceContext(initialView), ...saved };
      // Uma montagem com vista explícita pode usar a raiz; as ligações directas prevalecem.
      const path = window.location.pathname === "/" && initialView !== "overview"
        ? workspacePaths[initialView] : window.location.pathname;
      const incoming = validateWorkspaceContext(contextFromLocation(path, window.location.search, fallback), dataRef.current.data);
      if (incoming.yearId !== contextRef.current.yearId) dataRef.current.onYearChange?.(incoming.yearId);
      contextRef.current = incoming;
      readyRef.current = datasetId;
      setContext(incoming);
      setReadyDataset(datasetId);
    };
    const timer = window.setTimeout(restore, 0);
    const onPopState = () => restore();
    window.addEventListener("popstate", onPopState);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", onPopState); readyRef.current = null; };
  }, [datasetId, initialView]);

  const update = useCallback((patch: Partial<WorkspaceContext>, push = false) => {
    const next = { ...contextRef.current, ...patch };
    if (next.yearId !== contextRef.current.yearId) dataRef.current.onYearChange?.(next.yearId);
    contextRef.current = next;
    setContext(next);
    const current = dataRef.current;
    if (!current.datasetId || readyRef.current !== current.datasetId) return;
    try { window.sessionStorage.setItem(workspaceContextKey, JSON.stringify({ datasetId: current.datasetId, context: next })); } catch { /* Os filtros ficam em memória. */ }
    const href = workspaceUrl(next, current.year);
    if (`${window.location.pathname}${window.location.search}` !== href) {
      // A completed task replaces its temporary history entry, so Back goes
      // to the original context rather than an empty duplicate of the task.
      window.history[push && !window.history.state?.lssTask ? "pushState" : "replaceState"](null, "", href);
    }
  }, []);

  function field<K extends keyof WorkspaceContext>(key: K, push = false) {
    return (value: SetStateAction<WorkspaceContext[K]>) => {
      const resolved = typeof value === "function" ? (value as (current: WorkspaceContext[K]) => WorkspaceContext[K])(contextRef.current[key]) : value;
      update({ [key]: resolved }, push);
    };
  }
  return { context, update, field, ready: readyDataset === datasetId };
}
