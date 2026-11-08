// Monetary arithmetic crosses the number boundary only at input/output.
export function cents(value: number | string): number {
  const input = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(input)) throw new Error("Indique um valor positivo ou zero, com até duas casas decimais.");
  const [whole, fraction = ""] = input.split(".");
  const result = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("O valor excede o limite permitido.");
  return Number(result);
}
export const money = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Montante inválido.");
  return value / 100;
};
export function percentage(amountCents: number, percent: number) {
  const basis = cents(percent);
  if (basis > 10000) throw new Error("A percentagem deve estar entre 0 e 100.");
  return Number((BigInt(amountCents) * BigInt(basis) + BigInt(5000)) / BigInt(10000));
}
export const sumMoney = (values: number[]) => money(values.reduce((total, value) => total + cents(value), 0));
