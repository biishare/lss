import { assertCanPerformFinanceAction, type FinanceAction } from "../finance/domain/access-control";
import {
  cloneJson, demoStorageKey, hydrateDemoState, withFinanceMirror,
  type DemoData, type DemoState,
} from "./demo-state";
import { isObject, validateDemoState } from "./snapshot-validation";

export const demoSnapshotSchema = "lss-demo-snapshot";
export const demoSnapshotVersion = 3;

export type DemoSnapshotEnvelope<T = Record<string, unknown>> = {
  schema: typeof demoSnapshotSchema;
  version: typeof demoSnapshotVersion;
  exportedAt: string;
  data: T;
};

export function createDemoSnapshot<T>(data: T, exportedAt = new Date().toISOString()): DemoSnapshotEnvelope<T> {
  validateDemoState(data);
  return { schema: demoSnapshotSchema, version: demoSnapshotVersion, exportedAt, data };
}

export function parseDemoSnapshot(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("O ficheiro não contém JSON válido."); }
  if (isObject(parsed) && ("schema" in parsed || "version" in parsed || "data" in parsed)) {
    if (parsed.schema !== demoSnapshotSchema || (parsed.version !== 2 && parsed.version !== 3) || !isObject(parsed.data)) {
      throw new Error("A versão desta exportação não é suportada.");
    }
    parsed = parsed.data;
  }
  validateDemoState(parsed);
  return parsed;
}

export function serializeDemoSnapshot<T>(data: T, exportedAt?: string) {
  return JSON.stringify(createDemoSnapshot(data, exportedAt), null, 2);
}

export function commandFingerprint(value: unknown): string {
  function ordered(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(ordered);
    if (isObject(input)) return Object.fromEntries(Object.keys(input).sort().map((key) => [key, ordered(input[key])]));
    return input;
  }
  return JSON.stringify(ordered(value));
}

export class DemoConflictError extends Error {
  constructor() {
    super("Os dados foram actualizados noutra aba. Recarregue e reveja a operação antes de confirmar.");
    this.name = "DemoConflictError";
  }
}

export type DemoStorage = Pick<Storage, "getItem" | "setItem">;
export type DemoLoadResult =
  | { status: "empty" }
  | { status: "ready"; state: DemoState; originalRaw: string }
  | { status: "error"; message: string; originalRaw?: string };
export type DemoCommand = { id: string; payload: unknown };
export type DemoCommit = { state: DemoState; result: Record<string, unknown>; replayed: boolean };

// Contrato local; a API futura implementará autorização e comandos próprios,
// sem aceitar snapshots arbitrários enviados pelo cliente.
export interface DemoRepository {
  load(): DemoLoadResult;
  initialize(state: DemoState): DemoState;
  commit(input: {
    role: "director" | "secretaria";
    action: FinanceAction;
    expected: DemoState;
    command: DemoCommand;
    change: (current: DemoState) => { patch: Partial<DemoData>; result?: Record<string, unknown> };
  }): DemoCommit;
  replace(expected: DemoState, incoming: DemoState, role: "director" | "secretaria"): DemoState;
  recover(observedRaw: string, incoming: DemoState, role: "director" | "secretaria"): DemoState;
}

export function createLocalDemoRepository(storage: DemoStorage, options: {
  now?: () => string; newId?: () => string;
} = {}): DemoRepository {
  const now = options.now ?? (() => new Date().toISOString());
  const newId = options.newId ?? (() => crypto.randomUUID());
  let legacyIdentity: { raw: string; datasetId: string } | undefined;
  function load(): DemoLoadResult {
    let raw: string | null = null;
    try {
      raw = storage.getItem(demoStorageKey);
      if (raw === null) return { status: "empty" };
      if (!legacyIdentity || legacyIdentity.raw !== raw) legacyIdentity = { raw, datasetId: newId() };
      const state = hydrateDemoState(parseDemoSnapshot(raw), raw, now(), legacyIdentity.datasetId);
      return { status: "ready", state, originalRaw: raw };
    } catch (error) {
      return { status: "error", originalRaw: raw ?? undefined,
        message: error instanceof Error ? error.message : "Não foi possível ler os dados deste navegador." };
    }
  }
  function write(state: DemoState) {
    validateDemoState(state);
    const raw = JSON.stringify(state);
    try { storage.setItem(demoStorageKey, raw); }
    catch { throw new Error("Não foi possível guardar no navegador. Os dados anteriores e o formulário foram conservados. Tente novamente ou exporte uma cópia."); }
    return JSON.parse(raw) as DemoState;
  }
  function current(expected: DemoState) {
    const loaded = load();
    if (loaded.status !== "ready") {
      throw new Error(loaded.status === "error" ? loaded.message : "Os dados locais já não estão disponíveis. Recarregue para os rever.");
    }
    if (loaded.state.revision !== expected.revision || loaded.state.datasetId !== expected.datasetId) throw new DemoConflictError();
    return loaded.state;
  }
  return {
    load,
    initialize(state) {
      const loaded = load();
      if (loaded.status !== "empty") throw new Error("Já existem dados neste navegador. Não foram substituídos.");
      const initial = { ...cloneJson(state), revision: 1, savedAt: now() };
      return write(initial);
    },
    commit({ role, action, expected, command, change }) {
      if (role !== "secretaria") assertCanPerformFinanceAction(role, "manage-academic-structure");
      if (action.startsWith("read-")) throw new Error("Uma acção de consulta não pode alterar os dados.");
      assertCanPerformFinanceAction(role, action);
      if (!command.id.trim()) throw new Error("A operação precisa de um identificador.");
      const fingerprint = commandFingerprint({ action, payload: command.payload });
      const loaded = load();
      if (loaded.status === "ready" && loaded.state.datasetId === expected.datasetId) {
        const previous = loaded.state.operations.find((operation) => operation.id === command.id);
        if (previous) {
          if (previous.fingerprint !== fingerprint) throw new Error("Este identificador já foi usado numa operação diferente.");
          return { state: loaded.state, result: cloneJson(previous.result), replayed: true };
        }
      }
      const state = current(expected);
      const changed = change(cloneJson(state));
      const recordedAt = now();
      const result = cloneJson(changed.result ?? {});
      const next = withFinanceMirror({
        ...state, ...changed.patch, revision: state.revision + 1, savedAt: recordedAt,
        operations: [...state.operations, { id: command.id, fingerprint, action,
          actorId: "demo-secretaria", recordedAt, result }],
      }, recordedAt);
      const saved = write(next);
      return { state: saved, result, replayed: false };
    },
    replace(expected, incoming, role) {
      assertCanPerformFinanceAction(role, "manage-academic-structure");
      const previous = current(expected);
      const next = withFinanceMirror({ ...cloneJson(incoming), revision: previous.revision + 1, datasetId: newId(), savedAt: now() }, now());
      return write(next);
    },
    recover(observedRaw, incoming, role) {
      assertCanPerformFinanceAction(role, "manage-academic-structure");
      if (storage.getItem(demoStorageKey) !== observedRaw) throw new DemoConflictError();
      const next = withFinanceMirror({ ...cloneJson(incoming), datasetId: newId(), revision: 1, savedAt: now(),
        recoverySource: { raw: observedRaw, replacedAt: now() } }, now());
      return write(next);
    },
  };
}
