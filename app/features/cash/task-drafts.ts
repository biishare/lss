import type { CashCommand } from "./commands";

export type CashTask = { id: string; recordedAt: string; sessionId: string; command: CashCommand };
export const cashDraftsKey = (datasetId: string) => `lss-cash-tasks-v1-${datasetId}`;
export const cashTaskKey = (task: Pick<CashTask, "sessionId" | "command">) => `${task.command.kind}:${task.sessionId}`;
export function readCashTasks(raw: string | null, datasetId: string, applied: string[]): Record<string, CashTask> {
  try {
    const data = JSON.parse(raw ?? "null");
    if (data?.version !== 1 || data.datasetId !== datasetId || !Array.isArray(data.tasks)) return {};
    const result: Record<string, CashTask> = {};
    for (const task of data.tasks) {
      if (!task || typeof task.id !== "string" || !task.id.trim() || applied.includes(task.id) || typeof task.sessionId !== "string" || typeof task.recordedAt !== "string" || !Number.isFinite(Date.parse(task.recordedAt))) continue;
      const command = task.command;
      if (!command || typeof command !== "object") continue;
      const fields = command.kind === "open" ? ["openingAmount"] : command.kind === "close" ? ["sessionId", "countedAmount", "reason"] : command.kind === "expense" || command.kind === "float" ? ["amount", "method", "category", "reason", "document"] : null;
      if (!fields || !fields.every((key) => typeof command[key] === "string")) continue;
      if (command.kind === "close" && command.sessionId !== task.sessionId) continue;
      result[cashTaskKey(task)] = task;
    }
    return result;
  } catch { return {}; }
}
