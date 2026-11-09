import type { ServiceCommand } from "./service-commands";
import type { PaymentLaunchDraft } from "../../components/school-admin-demo.model";
import type { DemoStorage } from "../demo/local-repository";

export type ServiceTaskCommand = Extract<ServiceCommand, { kind: "review-proof" | "apply-credit" | "refund" }>;
export type ServiceTaskDraft = { id: string; recordedAt: string; command: ServiceTaskCommand };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => typeof value[key] === "string");

export function isPaymentForm(value: unknown): value is PaymentLaunchDraft {
  if (!object(value) || !strings(value, ["studentId", "category", "monthKey", "amount", "paidOn", "method", "description"]) ||
      !["registration", "tuition", "miscellaneous"].includes(String(value.category)) || typeof value.allowFutureAllocation !== "boolean") return false;
  if (["targetChargeId", "primaryAllocationAmount", "reference", "evidenceReference", "lateReason"].some((key) => value[key] !== undefined && typeof value[key] !== "string")) return false;
  if (value.creditOnly !== undefined && typeof value.creditOnly !== "boolean") return false;
  if (value.selectedChargeIds !== undefined && (!Array.isArray(value.selectedChargeIds) || value.selectedChargeIds.some((item) => typeof item !== "string"))) return false;
  return value.additionalTargets === undefined || (Array.isArray(value.additionalTargets) && value.additionalTargets.every((item) => object(item) && strings(item, ["studentId", "chargeId"]) && (item.amount === undefined || typeof item.amount === "string")));
}

function isCommand(value: unknown): value is ServiceTaskCommand {
  if (!object(value)) return false;
  if (value.kind === "review-proof") return strings(value, ["proofId", "decision"]) && typeof value.confirm === "boolean";
  if (!strings(value, ["studentId", "paymentId", "amount", "effectiveOn", "reason"])) return false;
  if (value.kind === "refund") return typeof value.method === "string";
  return value.kind === "apply-credit" && typeof value.sourceStudentId === "string" && Array.isArray(value.chargeIds) && value.chargeIds.every((id) => typeof id === "string");
}

export const serviceTaskKey = (command: ServiceTaskCommand) => command.kind === "review-proof" ? `proof:${command.proofId}` : `${command.kind}:${command.kind === "apply-credit" ? command.sourceStudentId : command.studentId}:${command.paymentId}`;
export const serviceDraftsKey = (datasetId: string) => `lss-service-tasks-v2-${datasetId}`;

export function readServiceTaskDrafts(storage: Pick<DemoStorage, "getItem">, datasetId: string, appliedIds: string[] = []): Record<string, ServiceTaskDraft> {
  try {
    const raw = storage.getItem(serviceDraftsKey(datasetId));
    const parsed: unknown = JSON.parse(raw ?? "null");
    let candidates: unknown[] = [];
    if (object(parsed) && parsed.version === 2 && parsed.datasetId === datasetId && Array.isArray(parsed.tasks)) candidates = parsed.tasks;
    if (!raw) candidates = [JSON.parse(storage.getItem(`lss-service-draft-${datasetId}`) ?? "null")];
    const result: Record<string, ServiceTaskDraft> = {};
    for (const candidate of candidates) {
      if (!object(candidate) || typeof candidate.id !== "string" || !candidate.id.trim() || !isCommand(candidate.command) || appliedIds.includes(candidate.id)) continue;
      result[serviceTaskKey(candidate.command)] = { id: candidate.id, command: candidate.command, recordedAt: typeof candidate.recordedAt === "string" && !Number.isNaN(Date.parse(candidate.recordedAt)) ? candidate.recordedAt : new Date().toISOString() };
    }
    return result;
  } catch { return {}; }
}

export function saveServiceTaskDrafts(storage: Pick<DemoStorage, "setItem">, datasetId: string, tasks: Record<string, ServiceTaskDraft>) {
  storage.setItem(serviceDraftsKey(datasetId), JSON.stringify({ version: 2, datasetId, tasks: Object.values(tasks) }));
}
