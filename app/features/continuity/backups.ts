import { cloneJson, demoStorageKey, hydrateDemoState, type DemoState } from "../demo/demo-state";
import { commandFingerprint, createLocalDemoRepository, parseDemoSnapshot, serializeDemoSnapshot, type DemoRepository, type DemoStorage } from "../demo/local-repository";
import { effectiveAmount } from "../finance/domain/billing";
import { cashReceived, recordCredit } from "../finance/service-model";
import { cents, money } from "../finance/domain/money";
import { academicStateFor } from "../academics/model";

export const backupArchiveKey = "lss-local-backups-v1";
export type BackupItem = { id: string; createdAt: string; revision: number; datasetId: string; reason: string; raw: string };
export type BackupArchive = { version: 1; enabled: boolean; retention: number; items: BackupItem[]; beforeRestore?: BackupItem; lastVerification?: { verifiedAt: string; datasetId: string; revision: number; summary: Omit<ReturnType<typeof recoverySummary>, "identifiers"> } };
export function readBackups(storage: DemoStorage): BackupArchive {
  const raw = storage.getItem(backupArchiveKey);
  if (raw === null) return { version: 1, enabled: false, retention: 3, items: [] };
  const fail = (): never => { throw new Error("Não foi possível ler as cópias guardadas. O original foi preservado."); };
  let parsed: BackupArchive;
  try { parsed = JSON.parse(raw) as BackupArchive; } catch { return fail(); }
  const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
  const instant = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
  const item = (value: unknown) => object(value) && text(value.id) && text(value.raw) && text(value.datasetId) && text(value.reason) && instant(value.createdAt) && Number.isInteger(value.revision) && Number(value.revision) >= 0;
  if (!object(parsed) || parsed.version !== 1 || typeof parsed.enabled !== "boolean" || !Number.isInteger(parsed.retention) || parsed.retention < 1 || parsed.retention > 10 || !Array.isArray(parsed.items) || !parsed.items.every(item)) return fail();
  if (parsed.beforeRestore !== undefined && !item(parsed.beforeRestore)) return fail();
  if (parsed.lastVerification !== undefined) {
    const verification = parsed.lastVerification;
    if (!object(verification) || !instant(verification.verifiedAt) || !text(verification.datasetId) || !Number.isInteger(verification.revision) || verification.revision < 0 || !object(verification.summary)) return fail();
    for (const key of ["people", "enrollments", "charges", "payments", "allocations", "receipts", "proofs", "cashSessions", "closedSessions"] as const) if (!Number.isSafeInteger(verification.summary[key]) || verification.summary[key] < 0) return fail();
    for (const key of ["received", "applied", "credit", "open", "refunds"] as const) {
      try { cents(verification.summary[key]); } catch { return fail(); }
    }
  }
  return parsed;
}
export function configureBackups(storage: DemoStorage, enabled: boolean, retention: number) {
  if (!Number.isInteger(retention) || retention < 1 || retention > 10) throw new Error("Escolha entre 1 e 10 cópias locais.");
  const archive = readBackups(storage), next = { ...archive, enabled, retention, items: archive.items.slice(-retention) };
  storage.setItem(backupArchiveKey, JSON.stringify(next)); return next;
}
export function ensureBackupConfiguration(storage: DemoStorage) {
  if (storage.getItem(backupArchiveKey) === null) configureBackups(storage, true, 3);
}
export function storeBackup(storage: DemoStorage, state: DemoState, reason: string, now: string, force = false) {
  const archive = readBackups(storage);
  if (!archive.enabled && !force) return null;
  const last = archive.items.at(-1);
  if (!force && last?.revision === state.revision && last.datasetId === state.datasetId && last.raw === serializeDemoSnapshot(state, last.createdAt)) return last;
  const item: BackupItem = { id: `BACKUP-${state.datasetId}-${state.revision}-${now}`, datasetId: state.datasetId, revision: state.revision, createdAt: now, reason, raw: serializeDemoSnapshot(state, now) };
  const next = force ? { ...archive, beforeRestore: item } : { ...archive, items: [...archive.items, item].slice(-archive.retention) };
  try { storage.setItem(backupArchiveKey, JSON.stringify(next)); }
  catch { throw new Error("Não foi possível guardar a cópia de segurança. Descarregue uma cópia e reveja o espaço disponível."); }
  return item;
}
export function automaticBackup(storage: DemoStorage, state: DemoState, now: string, onIssue?: (message: string) => void) {
  try { storeBackup(storage, state, "Depois de guardar", now); onIssue?.(""); }
  catch (error) { onIssue?.(`A operação foi guardada. ${error instanceof Error ? error.message : "Não foi possível guardar a cópia de segurança."}`); }
}
export function recoverySummary(state: DemoState) {
  const academic = academicStateFor(state), records = state.paymentRecords;
  const allocations = records.flatMap((item) => item.allocations);
  const open = records.flatMap((record) => [...record.charges, ...(record.penaltyCharges ?? [])].map((charge) => Math.max(0, cents(effectiveAmount(charge)) - record.allocations.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + cents(item.amount), 0))));
  return { people: academic.people.length, enrollments: academic.enrollments.length, charges: records.reduce((sum, item) => sum + item.charges.length + (item.penaltyCharges?.length ?? 0), 0),
    payments: records.reduce((sum, item) => sum + item.payments.length, 0), allocations: allocations.length, receipts: state.receipts.length, proofs: state.paymentProofs?.length ?? 0,
    received: cashReceived(records.flatMap((item) => item.payments)), applied: money(allocations.reduce((sum, item) => sum + cents(item.amount), 0)),
    credit: money(records.reduce((sum, item) => sum + cents(recordCredit(item)), 0)), open: money(open.reduce((sum, item) => sum + item, 0)),
    refunds: money(records.flatMap((item) => item.creditDebits ?? []).filter((item) => item.kind === "refund").reduce((sum, item) => sum + cents(item.amount), 0)),
    cashSessions: state.cashBook?.sessions.length ?? 0, closedSessions: state.cashBook?.sessions.filter((item) => item.status === "closed").length ?? 0,
    identifiers: commandFingerprint({ students: state.students.map((item) => item.id).sort(), records: records.map((item) => ({ id: item.studentId, charges: item.charges, payments: item.payments, allocations: item.allocations, adjustments: item.financialAdjustments, refunds: item.creditDebits, reversals: item.reversals })), receipts: state.receipts, cash: state.cashBook, academic: state.academic }) };
}
export function verifyBackup(raw: string, now: string) {
  const parsed = parseDemoSnapshot(raw), candidate = hydrateDemoState(parsed, raw, now, "restoration-preview");
  const isolatedStorage = new Map<string, string>();
  const isolatedRepository = createLocalDemoRepository({ getItem: (key) => isolatedStorage.get(key) ?? null, setItem: (key, value) => { isolatedStorage.set(key, value); } }, { now: () => now });
  isolatedRepository.initialize(cloneJson(candidate));
  const loaded = isolatedRepository.load();
  if (loaded.status !== "ready") throw new Error("O ensaio isolado não conseguiu recuperar os dados.");
  const expected = recoverySummary(candidate), actual = recoverySummary(loaded.state);
  if (commandFingerprint(expected) !== commandFingerprint(actual)) throw new Error("O restauro não reproduziu as contagens, relações e saldos.");
  return { candidate, summary: actual, verifiedAt: now, isolated: true as const };
}
export function restoreBackup(repository: DemoRepository, storage: DemoStorage, expected: DemoState, raw: string, role: "director" | "secretaria", now: string) {
  if (role !== "secretaria") throw new Error("O Director pode consultar, mas não pode substituir os dados.");
  const checked = verifyBackup(raw, now);
  const current = repository.load();
  if (current.status !== "ready" || current.state.revision !== expected.revision || current.state.datasetId !== expected.datasetId) throw new Error("Os dados mudaram desde a prévia. Actualize e volte a rever a cópia.");
  // Preserve a valid original before allowing the already-reviewed replacement.
  storeBackup(storage, expected, "Antes do restauro", now, true);
  return repository.replace(expected, checked.candidate, role);
}
export function currentBackup(storage: DemoStorage, now: string) {
  const raw = storage.getItem(demoStorageKey);
  if (!raw) throw new Error("Não existem dados para copiar.");
  const state = hydrateDemoState(parseDemoSnapshot(raw), raw, now, "backup-source");
  return serializeDemoSnapshot(state, now);
}

export function recordVerification(storage: DemoStorage, checked: ReturnType<typeof verifyBackup>) {
  const archive = readBackups(storage);
  const summary = { ...checked.summary }; delete (summary as Partial<typeof summary>).identifiers;
  const next: BackupArchive = { ...archive, lastVerification: { verifiedAt: checked.verifiedAt, datasetId: checked.candidate.datasetId, revision: checked.candidate.revision, summary } };
  storage.setItem(backupArchiveKey, JSON.stringify(next)); return next;
}
