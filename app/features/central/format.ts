const schoolClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit",
});
const integers = new Intl.NumberFormat("pt-MZ");

export function schoolDay() { return schoolClock.format(new Date()); }

export function dateLabel(value: string | null | undefined) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
}

export function money(cents: number) {
  const magnitude = BigInt(Math.abs(cents));
  return (cents < 0 ? "−" : "") + integers.format(magnitude / BigInt(100)) + "," +
    String(magnitude % BigInt(100)).padStart(2, "0") + " MT";
}

export function cents(value: FormDataEntryValue | null) {
  const input = typeof value === "string" ? value.trim().replace(",", ".") : "";
  const match = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(input);
  if (!match) throw new Error("Indique um valor em MT com até duas casas decimais.");
  const amount = BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("O valor excede o limite permitido.");
  return Number(amount);
}

export const methods = {
  cash: "Numerário", mpesa: "M-Pesa", emola: "e-Mola", transfer: "Transferência bancária",
  deposit: "Depósito", multicaixa: "Multicaixa",
} as const;

export const statuses: Record<string, string> = {
  active: "Activa", preparing: "Em preparação", open: "Aberto", closed: "Fechado", draft: "Rascunho",
  withdrawn: "Desistência", completed: "Concluída", cancelled: "Anulada", confirmed: "Confirmado", reversed: "Estornado",
  pending: "Pendente", rejected: "Rejeitado", issued: "Emitida", forecast: "Prevista", paid: "Liquidada",
  registration: "Inscrição", tuition: "Propina", penalty: "Multa", extra: "Extra",
  receipt: "Recebimento", refund: "Devolução", expense: "Saída", float: "Reforço",
};

export function text(data: FormData, key: string) {
  const value = data.get(key);
  if (typeof value !== "string") throw new Error("Preencha os campos obrigatórios.");
  return value.trim();
}

export function integer(data: FormData, key: string) {
  const value = text(data, key);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("Indique um número inteiro válido.");
  return Number(value);
}
