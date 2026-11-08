import type { EntityStatus } from "../../../lib/school-demo-data";

export type ActorRole = "director" | "secretaria";

export type DomainEntityStatus = EntityStatus;

export type AcademicYear = {
  id: string;
  label: string;
  status: DomainEntityStatus;
  startsOn?: string;
  endsOn?: string;
};

export type EducationLevel = {
  id: string;
  name: string;
  status: DomainEntityStatus;
  createdAt?: string;
};

export type FinanceSchoolClass = {
  id: string;
  name: string;
  academicYearId: string;
  educationLevelId: string;
  status: DomainEntityStatus;
  createdAt?: string;
};

export type Enrollment = {
  id: string;
  studentId: string;
  academicYearId: string;
  educationLevelId: string;
  classId: string;
  groupId: string;
  stableNumber: string;
  startedOn: string;
  status: DomainEntityStatus;
};

export type PaymentRuleVersion = {
  calculationVersion?: "v3";
  supersededBy?: string;
  registeredBy?: string;
  registeredAt?: string;
  reason?: string;
  penaltyPolicy?: { firstAfterDays: number; firstPercent: number; secondEnabled: boolean; secondAfterDays: number; secondPercent: number };
  id: string;
  policyId?: string;
  policyName?: string;
  academicYearId: string;
  educationLevelId: string;
  version: number;
  status: DomainEntityStatus;
  inscriptionFee: number;
  monthlyFee: number;
  coveredMonthKeys: string[];
  inscriptionDueOn?: string;
  monthlyDueDay: number;
  firstPenalty: PenaltyBandSnapshot;
  secondPenalty: PenaltyBandSnapshot;
  validFrom: string;
  validUntil?: string;
};

export type PenaltyBandSnapshot = {
  thresholdDay: number;
  percent?: number;
  fixedAmount?: number;
};

export type FinancialAidKind =
  | "scholarship"
  | "partial_scholarship"
  | "exception"
  | "weighted";

export type FinancialAid = {
  id: string;
  enrollmentId: string;
  kind: FinancialAidKind;
  percent: number;
  appliesToRegistration: boolean;
  appliesToTuition: boolean;
  startMonth?: string;
  endMonth?: string;
  reason?: string;
  authorizedBy: string;
  registeredBy: string;
  registeredAt: string;
  authorizationReference?: string;
  effectiveFrom?: string;
  revokedOn?: string;
};

export type BillingCalendarItem = {
  educationLevelId?: string;
  id: string;
  enrollmentId: string;
  kind: "registration" | "tuition";
  monthKey?: string;
  competence: string;
  issueOn: string;
};

export type FinancialAdjustment = {
  id: string;
  chargeId: string;
  kind: "benefit" | "late-proof";
  previousAmount: number;
  nextAmount: number;
  reason: string;
  evidenceReference?: string;
  recordedBy: string;
  recordedAt: string;
  releasedAllocations: Array<{ id: string; paymentId: string; chargeId: string; amount: number }>;
};

export type FinanceChargeKind =
  | "registration"
  | "tuition"
  | "miscellaneous"
  | "adjustment";

export type FinanceCharge = {
  id: string;
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  kind: FinanceChargeKind;
  description: string;
  monthKey?: string;
  dueOn?: string;
  baseAmount: number;
  discountAmount: number;
  dueAmount: number;
  ruleVersionId?: string;
  snapshot: ChargeSnapshot;
  createdAt: string;
};

export type ChargeSnapshot = {
  source: "legacy" | "rule-version";
  originalAmount: number;
  discountPercent: number;
  discountAmount: number;
  ruleVersionId?: string;
  ruleVersion?: number;
};

export type PenaltyCharge = {
  id: string;
  baseChargeId: string;
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  stage: "first" | "second";
  amount: number;
  createdAt: string;
  snapshot: PenaltyBandSnapshot;
};

export type FinancePayment = {
  id: string;
  studentId: string;
  enrollmentId: string;
  amount: number;
  effectivePaymentDate: string;
  recordedAt: string;
  recordedBy: string;
  method: string;
  observation?: string;
  legacyReference?: string;
};

export type FinanceAllocation = {
  id: string;
  paymentId: string;
  chargeId: string;
  amount: number;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  entityId: string;
  type:
    | "migration-preview"
    | "migration-applied"
    | "payment-recorded"
    | "correction"
    | "reversal";
  occurredAt: string;
  recordedBy: string;
  detail: string;
};

export type FinanceBook = {
  schemaVersion: "finance-book-v1";
  academicYears: AcademicYear[];
  educationLevels: EducationLevel[];
  classes: FinanceSchoolClass[];
  enrollments: Enrollment[];
  paymentRuleVersions: PaymentRuleVersion[];
  financialAid: FinancialAid[];
  charges: FinanceCharge[];
  penaltyCharges: PenaltyCharge[];
  payments: FinancePayment[];
  allocations: FinanceAllocation[];
  auditEvents: AuditEvent[];
};

export const financeInvariants = [
  "Payment allocations cannot exceed the confirmed payment amount.",
  "Charge balances cannot be negative.",
  "A paid charge requires base and penalty balances to be zero.",
  "Payments, allocations and corrections must be auditable.",
  "Every charge belongs to one academic year and keeps its snapshot.",
  "Full scholarship creates no payable balance for covered items.",
  "A penalty stage can be applied only once per base charge.",
  "Changing rule, level or class cannot rewrite historical charges.",
  "Overdue debt and future payable amounts are reported separately.",
  "Director cannot perform financial mutations.",
] as const;
