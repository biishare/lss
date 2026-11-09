import type { DemoState } from "../demo/demo-state";
import { cents } from "./domain/money";
import { samePerson } from "./service-model";
import { paymentMethods } from "../../components/school-admin-demo.model";

// Called after the base snapshot validator; extensions remain optional for old data.
export function validateServiceExtensions(value: Record<string, unknown>) {
  const state = value as unknown as DemoState;
  const fail = (detail: string): never => { throw new Error(`Os dados não são válidos: ${detail}`); };
  const ids = new Set<string>();
  const records = state.paymentRecords ?? [];
  const list = (value: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) return fail("lista financeira inválida.");
    return value;
  };
  const unique = (id: unknown) => { if (typeof id !== "string" || !id || ids.has(id)) fail("identificador financeiro repetido ou em falta."); ids.add(id as string); };
  const text = (value: unknown) => typeof value === "string" && value.trim();
  const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  for (const record of records) {
    list(record.creditDebits ?? []); list(record.reversals ?? []);
    for (const debit of record.creditDebits ?? []) {
      unique(debit.id);
      const payment = record.payments.find((item) => item.id === debit.paymentId);
      if (!payment || payment.reversedBy || !["refund", "application"].includes(debit.kind) || !(debit.amount > 0) || !text(debit.reason) || !text(debit.method) || !date(debit.effectiveOn) || !text(debit.recordedAt) || !text(debit.recordedBy)) fail("movimento de crédito incompleto ou sem origem válida.");
      if (debit.kind === "application") {
        const destination = debit.destination;
        const target = records.find((item) => item.studentId === destination?.studentId);
        const transfer = target?.payments.find((item) => item.id === destination?.paymentId);
        if (!destination || !transfer || transfer.kind !== "credit-application" || transfer.origin?.movementId !== debit.id || transfer.origin.studentId !== record.studentId || transfer.origin.paymentId !== debit.paymentId || transfer.amount !== debit.amount || !samePerson(state, record.studentId, target!.studentId) || !target!.charges.some((item) => item.id === destination.chargeId)) fail("a aplicação de crédito não corresponde à origem e destino.");
      }
    }
    for (const allocation of record.allocations) if (allocation.effectiveOn && !date(allocation.effectiveOn)) fail("data de aplicação inválida.");
    for (const payment of record.payments) {
      if (payment.kind !== undefined && !["replacement", "credit-application"].includes(payment.kind)) fail("tipo de movimento financeiro desconhecido.");
      const allocated = record.allocations.filter((item) => item.paymentId === payment.id).reduce((sum, item) => sum + cents(item.amount), 0);
      const debited = (record.creditDebits ?? []).filter((item) => item.paymentId === payment.id).reduce((sum, item) => sum + cents(item.amount), 0);
      if (allocated + debited > cents(payment.amount) || (payment.reversedBy && allocated + debited > 0)) fail("o crédito foi aplicado ou devolvido além do disponível.");
      if (payment.kind === "credit-application") {
        const origin = payment.origin;
        const source = records.find((item) => item.studentId === origin?.studentId);
        if (!source?.creditDebits?.some((item) => item.id === origin?.movementId && item.destination?.paymentId === payment.id && item.amount === payment.amount)) fail("a aplicação entre anos não tem movimento de origem.");
      }
      if (payment.reversedBy && !record.reversals?.some((item) => item.id === payment.reversedBy && item.paymentId === payment.id)) fail("pagamento anulado sem histórico da correcção.");
    }
    for (const reversal of record.reversals ?? []) {
      unique(reversal.id);
      const original = record.payments.find((item) => item.id === reversal.paymentId);
      const replacement = records.find((item) => item.studentId === reversal.replacementStudentId)?.payments.find((item) => item.id === reversal.replacementPaymentId);
      if (!original || original.reversedBy !== reversal.id || !replacement || replacement.kind !== "replacement" || replacement.replaces?.paymentId !== original.id || replacement.replaces.studentId !== record.studentId || !text(reversal.reason) || replacement.amount !== original.amount) fail("correcção sem original e substituto correspondentes.");
      list(reversal.releasedAllocations);
    }
  }
  list(state.paymentProofs ?? []);
  const references = new Set<string>();
  for (const proof of state.paymentProofs ?? []) {
    unique(proof.id);
    if (!["pending", "confirmed", "rejected"].includes(proof.status) || !text(proof.reference) || !text(proof.recordedBy) || !text(proof.recordedAt) || !proof.draft || proof.draft.studentId !== proof.studentId || !state.students.some((item) => item.id === proof.studentId) || !date(proof.draft.paidOn) || !text(proof.draft.method) || typeof proof.draft.amount !== "number") fail("comprovativo incompleto.");
    const draft = proof.draft;
    if (!["registration", "tuition", "miscellaneous"].includes(draft.category) || typeof draft.monthKey !== "string" || typeof draft.description !== "string" || typeof draft.allowFutureAllocation !== "boolean" || !paymentMethods.includes(draft.method) || (draft.creditOnly !== undefined && typeof draft.creditOnly !== "boolean")) fail("condições do comprovativo inválidas.");
    if (draft.primaryAllocationAmount !== undefined && (typeof draft.primaryAllocationAmount !== "string" || (draft.primaryAllocationAmount.trim() && cents(draft.primaryAllocationAmount) > cents(draft.amount)))) fail("distribuição do comprovativo inválida.");
    if (draft.selectedChargeIds !== undefined && (!Array.isArray(draft.selectedChargeIds) || draft.selectedChargeIds.some((id) => typeof id !== "string"))) fail("selecção do comprovativo inválida.");
    if (draft.additionalTargets !== undefined) {
      list(draft.additionalTargets);
      for (const target of draft.additionalTargets) {
        const record = records.find((item) => item.studentId === target.studentId);
        if (!record || !samePerson(state, proof.studentId, target.studentId) || !record.charges.some((item) => item.id === target.chargeId) || (target.amount !== undefined && typeof target.amount !== "number")) fail("destino do comprovativo inválido.");
      }
    }
    if (cents(proof.draft.amount) <= 0) fail("valor do comprovativo inválido.");
    if (proof.status !== "rejected") {
      const key = `${proof.draft.method}:${proof.reference.trim().toLowerCase()}`;
      if (references.has(key)) fail("comprovativo repetido."); references.add(key);
    }
    if (proof.status !== "pending" && (!text(proof.reviewedAt) || !text(proof.reviewedBy) || !text(proof.decision))) fail("conferência sem decisão e autor.");
    if (proof.status === "confirmed" && !state.receipts.some((item) => item.id === proof.receiptId && item.paymentId === proof.paymentId && item.studentId === proof.studentId)) fail("comprovativo confirmado sem recibo correspondente.");
  }
  const receiptIds = new Set<string>();
  for (const receipt of state.receipts ?? []) {
    if ((receipt.institution || receipt.id.startsWith("LSS-")) && receiptIds.has(receipt.id)) fail("número de recibo repetido."); receiptIds.add(receipt.id);
    if (receipt.institution) {
      if (!text(receipt.institution.name) || !text(receipt.academicYearId)) fail("snapshot do recibo incompleto.");
      if (receipt.items.reduce((sum, item) => sum + cents(item.amount), 0) + cents(receipt.unallocatedAmount) !== cents(receipt.amount)) fail("rubricas e crédito não correspondem ao recibo.");
    }
  }
}
