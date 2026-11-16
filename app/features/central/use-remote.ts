"use client";

import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { apiRequest, issueMessage, SchoolApiError } from "./client";

export function useRemote<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [version, refresh] = useReducer((value: number) => value + 1, 0);
  const [snapshot, setSnapshot] = useState<{ key: string; version: number; value?: T; error?: string }>();
  const read = useEffectEvent(load);
  useEffect(() => {
    if (key === null) return;
    const abort = new AbortController();
    void read(abort.signal).then(
      (value) => { if (!abort.signal.aborted) setSnapshot({ key, version, value }); },
      (cause) => { if (!abort.signal.aborted) setSnapshot({ key, version, error: issueMessage(cause) }); },
    );
    return () => abort.abort();
  }, [key, version]);
  const current = snapshot?.key === key ? snapshot : undefined;
  const settled = current?.version === version;
  return { value: current?.value, error: settled ? current?.error : undefined, loading: key !== null && !settled, refresh };
}

export function useCommand() {
  const outstanding = useRef<{ key: string; signature: string } | undefined>(undefined);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);

  async function run<T>(signature: string, submit: (key: string) => Promise<T>): Promise<T | undefined> {
    if (inFlight.current) return;
    if (outstanding.current && outstanding.current.signature !== signature) {
      setError("Confirme o resultado da tentativa anterior antes de alterar este pedido.");
      return;
    }
    const attempt = outstanding.current ?? { signature, key: crypto.randomUUID() };
    outstanding.current = attempt;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await submit(attempt.key);
      outstanding.current = undefined;
      setUncertain(false);
      return result;
    } catch (cause) {
      if (cause instanceof SchoolApiError && cause.status >= 500) {
        // A write may have committed before the response was interrupted.
        try {
          const saved = await apiRequest("GET", "/api/v1/commands/{id}", { params: { id: attempt.key } });
          outstanding.current = undefined;
          setUncertain(false);
          return saved.result as T;
        } catch (lookup) {
          if (lookup instanceof SchoolApiError && lookup.status === 401) issueMessage(lookup);
          setUncertain(true);
          setError("A resposta ficou pendente. Repita a confirmação com os mesmos dados para consultar o resultado.");
          return;
        }
      }
      outstanding.current = undefined;
      setUncertain(false);
      setError(issueMessage(cause));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return { run, busy, error, uncertain, setError };
}
