import type { EnrollmentDraft, PaymentLaunchDraft } from "../../components/school-admin-demo.model";
import type { DemoStorage } from "./local-repository";
import { isObject } from "./snapshot-validation";

export const demoDraftKey = "lss-demo-drafts-v1";
export type DemoDrafts = {
  datasetId: string;
  payment: PaymentLaunchDraft;
  enrollment: EnrollmentDraft;
  paymentCommandId: string | null;
};

const paymentStrings = ["studentId", "category", "monthKey", "targetChargeId", "amount", "paidOn", "method", "description"];
const enrollmentStrings = ["fullName", "guardianName", "guardianPhone", "enrollmentType", "enrollmentDate", "tuitionStartMonth", "financeStatus", "discountPercent", "exceptionStartMonth", "exceptionEndMonth", "exceptionReason", "classId", "groupId"];

export function readDemoDrafts(storage: DemoStorage, datasetId: string): DemoDrafts | null {
  try {
    const raw = storage.getItem(demoDraftKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || value.version !== 1 || value.datasetId !== datasetId ||
        !isObject(value.payment) || !isObject(value.enrollment)) return null;
    const payment = value.payment, enrollment = value.enrollment;
    if (paymentStrings.some((key) => typeof payment[key] !== "string") ||
        enrollmentStrings.some((key) => typeof enrollment[key] !== "string") ||
        typeof payment.allowFutureAllocation !== "boolean" ||
        !["registration", "tuition", "miscellaneous"].includes(String(payment.category)) ||
        !["new", "renewal"].includes(String(enrollment.enrollmentType)) ||
        !["regular", "scholarship", "partial_scholarship", "exception", "weighted"].includes(String(enrollment.financeStatus)) ||
        (value.paymentCommandId !== null && typeof value.paymentCommandId !== "string")) return null;
    return value as unknown as DemoDrafts;
  } catch { return null; }
}

export function writeDemoDrafts(storage: DemoStorage, drafts: DemoDrafts) {
  storage.setItem(demoDraftKey, JSON.stringify({ ...drafts, version: 1 }));
}
