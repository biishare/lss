import type { ActorRole } from "./entities";

export type FinanceAction =
  | "read-academic-structure"
  | "read-finance"
  | "read-reports"
  | "manage-academic-structure"
  | "manage-enrollment"
  | "manage-payment-rules"
  | "manage-financial-aid"
  | "publish-charges"
  | "record-payment"
  | "manage-cash"
  | "manage-backups"
  | "correct-payment";

export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export class AuthorizationError extends Error {
  readonly role: ActorRole;
  readonly action: FinanceAction;

  constructor(
    role: ActorRole,
    action: FinanceAction,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.role = role;
    this.action = action;
  }
}

const secretaryActions = new Set<FinanceAction>([
  "read-academic-structure",
  "read-finance",
  "read-reports",
  "manage-academic-structure",
  "manage-enrollment",
  "manage-payment-rules",
  "manage-financial-aid",
  "publish-charges",
  "record-payment",
  "manage-cash",
  "manage-backups",
  "correct-payment",
]);

const directorActions = new Set<FinanceAction>([
  "read-academic-structure",
  "read-finance",
  "read-reports",
]);

export function canPerformFinanceAction(
  role: ActorRole,
  action: FinanceAction,
): AuthorizationResult {
  const allowedActions =
    role === "secretaria" ? secretaryActions : directorActions;

  if (allowedActions.has(action)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      role === "director"
        ? "O Director pode consultar, mas não pode executar mutações financeiras ou administrativas."
        : "Este perfil não tem permissão para executar a acção solicitada.",
  };
}

export function assertCanPerformFinanceAction(
  role: ActorRole,
  action: FinanceAction,
) {
  const result = canPerformFinanceAction(role, action);

  if (!result.allowed) {
    throw new AuthorizationError(role, action, result.reason);
  }
}
