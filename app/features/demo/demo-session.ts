import type { ProfileId } from "../../components/school-admin-demo.model";

export const demoSessionKey = "lss-demo-session-v1";
export const demoAccounts = [
  { id: "demo-secretaria", name: "Marta", role: "secretaria", roleLabel: "Secretaria" },
  { id: "demo-director", name: "António", role: "director", roleLabel: "Director" },
] as const;

export type DemoAccount = {
  id: string;
  name: string;
  role: ProfileId;
  roleLabel: string;
};
export type DemoSession = { source: "demo"; account: DemoAccount };

// Apenas contas fictícias: o papel pertence à conta, não a um campo de login.
// O adaptador da API futura terá de validar a sessão e a autorização no servidor.
export function demoSessionFor(accountId: string): DemoSession | null {
  const account = demoAccounts.find((account) => account.id === accountId);
  return account ? { source: "demo", account } : null;
}

export function readDemoSession(storage: Pick<Storage, "getItem">): DemoSession | null {
  try {
    const value = JSON.parse(storage.getItem(demoSessionKey) ?? "null");
    if (!value || typeof value !== "object") return null;
    if (value.source === "demo") return demoSessionFor(value.accountId);
    // Compatibilidade com a sessão v1. Nunca interpretar sessões da API como demo.
    if (value.source === undefined && (value.profile === "secretaria" || value.profile === "director")) {
      return demoSessionFor(`demo-${value.profile}`);
    }
  } catch { /* Sessão opcional: dados da escola ficam intactos. */ }
  return null;
}

export function saveDemoSession(storage: Pick<Storage, "setItem">, session: DemoSession) {
  storage.setItem(demoSessionKey, JSON.stringify({ source: "demo", accountId: session.account.id }));
}
