import { demoSessionFor, type DemoSession } from "./demo-session";

// Fictitious presentation fixtures, NOT a password storage/security mechanism.
// Browser code and local sessions are inspectable. Replace this entire adapter
// with the dedicated API before using real accounts or personal/financial data.
const presentationAccounts = [
  { username: "marta", accountId: "demo-secretaria", fingerprint: "7adba13181535ec3c896f06e15a1d379250c846ffb00a96cf40d5524d3dcbb62" },
  { username: "antonio", accountId: "demo-director", fingerprint: "96ded4a2e86867e6a6c6197abf34051738ac65caaa8a530b55cc5a0228465bdf" },
];

export async function authenticateDemoSession(username: string, password: string): Promise<DemoSession | null> {
  const account = presentationAccounts.find((item) => item.username === username.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return account?.fingerprint === fingerprint ? demoSessionFor(account.accountId) : null;
}
