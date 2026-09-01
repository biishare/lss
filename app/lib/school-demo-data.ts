export type EntityStatus = "active" | "inactive";

export type EnrollmentType = "new" | "renewal";

export type RegistrationStatus = "pending" | "paid";

export type FinanceStatus =
  | "regular"
  | "scholarship"
  | "partial_scholarship"
  | "exception"
  | "weighted";

export type StudentFinanceRuleHistoryEntry = {
  id: string;
  status: FinanceStatus;
  discountPercent: number;
  startMonth?: string;
  endMonth?: string;
  reason?: string;
  authorizedBy: string;
  registeredBy: string;
  registeredAt: string;
};

export type StudentFinancialProfile = {
  status: FinanceStatus;
  discountPercent: number;
  startMonth?: string;
  endMonth?: string;
  reason?: string;
  authorizedBy?: string;
  registeredBy?: string;
  registeredAt?: string;
  history?: StudentFinanceRuleHistoryEntry[];
};

export type SchoolClass = {
  id: string;
  name: string;
  stage: string;
  academicYear: string;
  academicYearId?: string;
  educationLevelId?: string;
  status: EntityStatus;
  createdAt: string;
};

export type AcademicStageDefinition = {
  id: string;
  name: string;
  status: EntityStatus;
  createdAt: string;
};

export type ClassDefinition = {
  id: string;
  name: string;
  stageId: string;
  status: EntityStatus;
  createdAt: string;
};

export type RoomDefinition = {
  id: string;
  name: string;
  block: string;
  capacity: number;
  status: EntityStatus;
  createdAt: string;
};

export type ClassGroup = {
  id: string;
  name: string;
  classId: string;
  shift: string;
  roomId: string;
  capacity: number;
  status: EntityStatus;
  createdAt: string;
};

export type SchoolRoom = {
  id: string;
  name: string;
  block: string;
  capacity: number;
  status: EntityStatus;
};

export type Student = {
  id: string;
  enrollmentId?: string;
  academicYearId?: string;
  educationLevelId?: string;
  stableNumber?: string;
  registrationNumber: string;
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentType: EnrollmentType;
  enrollmentDate: string;
  tuitionStartMonth: string;
  registrationStatus: RegistrationStatus;
  financialProfile: StudentFinancialProfile;
  classId: string;
  groupId: string;
  createdAt: string;
};

export type MonthOption = {
  key: string;
  label: string;
  shortLabel: string;
};

export type PaymentSettings = {
  academicYear: string;
  inscriptionRenewalFee: number;
  monthlyFee: number;
  startMonth: string;
  endMonth: string;
  monthlyDueDay?: number;
  firstPenaltyDay: number;
  firstPenaltyAmount: number;
  firstPenaltyPercent?: number;
  secondPenaltyDay: number;
  secondPenaltyAmount: number;
  secondPenaltyPercent?: number;
};

export type ChargeSnapshot = {
  source: "legacy" | "rule-version";
  ruleVersionId?: string;
  ruleVersion?: number;
  academicYearId?: string;
  educationLevelId?: string;
  originalAmount: number;
  discountPercent: number;
  discountAmount: number;
  dueAmount: number;
  ruleLabel?: string;
  monthlyDueDay?: number;
  firstPenaltyDay?: number;
  firstPenaltyPercent?: number;
  secondPenaltyDay?: number;
  secondPenaltyPercent?: number;
  publishedAt: string;
};

export type PaymentEntry = {
  amount: number;
  paidDay: number;
  paidAt?: string;
  method?: string;
  reference?: string;
  description?: string;
};

export type ChargeCategory = "registration" | "tuition" | "miscellaneous";

export type Charge = {
  id: string;
  studentId: string;
  category: ChargeCategory;
  amount: number;
  description: string;
  monthKey?: string;
  dueOn?: string;
  baseAmount?: number;
  discountAmount?: number;
  dueAmount?: number;
  ruleVersionId?: string;
  snapshot?: ChargeSnapshot;
  createdAt: string;
};

export type PenaltyStage = "first" | "second";

export type PenaltyCharge = {
  id: string;
  studentId: string;
  baseChargeId: string;
  stage: PenaltyStage;
  amount: number;
  effectiveOn: string;
  createdAt: string;
  snapshot: {
    thresholdDay: number;
    percent: number;
    baseBalance: number;
    targetTotal: number;
    previousPenaltyTotal: number;
    ruleVersionId?: string;
  };
};

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  paidOn: string;
  effectivePaymentDate?: string;
  recordedAt: string;
  recordedBy?: string;
  method: string;
  reference?: string;
  legacyReference?: string;
  observation?: string;
};

export type PaymentAllocation = {
  id: string;
  paymentId: string;
  chargeId: string;
  amount: number;
};

export type PaymentCorrection = {
  id: string;
  paymentId: string;
  studentId: string;
  reason: string;
  amount: number;
  recordedAt: string;
  recordedBy: string;
  linkedChargeId: string;
};

export type StudentPaymentRecord = {
  studentId: string;
  charges: Charge[];
  penaltyCharges?: PenaltyCharge[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  corrections?: PaymentCorrection[];
  inscriptionRenewal: PaymentEntry;
  monthlyPayments: Record<string, PaymentEntry>;
  miscellaneousPayments: PaymentEntry[];
};

export const monthOptions: MonthOption[] = [
  { key: "jan", label: "Janeiro", shortLabel: "Jan" },
  { key: "feb", label: "Fevereiro", shortLabel: "Fev" },
  { key: "mar", label: "Marco", shortLabel: "Mar" },
  { key: "apr", label: "Abril", shortLabel: "Abr" },
  { key: "may", label: "Maio", shortLabel: "Mai" },
  { key: "jun", label: "Junho", shortLabel: "Jun" },
  { key: "jul", label: "Julho", shortLabel: "Jul" },
  { key: "aug", label: "Agosto", shortLabel: "Ago" },
  { key: "sep", label: "Setembro", shortLabel: "Set" },
  { key: "oct", label: "Outubro", shortLabel: "Out" },
  { key: "nov", label: "Novembro", shortLabel: "Nov" },
  { key: "dec", label: "Dezembro", shortLabel: "Dez" },
];

export const initialPaymentSettings: PaymentSettings = {
  academicYear: "2026",
  inscriptionRenewalFee: 3500,
  monthlyFee: 1500,
  startMonth: "mar",
  endMonth: "nov",
  firstPenaltyDay: 10,
  firstPenaltyAmount: 100,
  secondPenaltyDay: 20,
  secondPenaltyAmount: 250,
};

export const initialAcademicStages: AcademicStageDefinition[] = [];

export const initialClassDefinitions: ClassDefinition[] = [];

export const initialRoomDefinitions: RoomDefinition[] = [];

export const initialRooms: SchoolRoom[] = [];

export const initialClasses: SchoolClass[] = [];

export const initialGroups: ClassGroup[] = [];

export const initialStudents: Student[] = [];

export const initialPaymentRecords: StudentPaymentRecord[] = [];
