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
  stageId?: string;
  academicYear: string;
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
  registrationNumber: string;
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentType: EnrollmentType;
  enrollmentDate: string;
  tuitionStartMonth: string;
  registrationStatus: RegistrationStatus;
  financialProfile: StudentFinancialProfile;
  educationLevelId?: string;
  classId: string;
  groupId: string;
  createdAt: string;
};

export type MonthOption = {
  key: string;
  label: string;
  shortLabel: string;
};

export type PaymentRuleSnapshot = {
  academicYear: string;
  levelId: string;
  levelName: string;
  inscriptionRenewalFee: number;
  monthlyFee: number;
  startMonth: string;
  endMonth: string;
  firstPenaltyDay: number;
  firstPenaltyAmount: number;
  secondPenaltyDay: number;
  secondPenaltyAmount: number;
  version: number;
  updatedAt: string;
};

export type PaymentLevelRule = PaymentRuleSnapshot;

export type PaymentSettings = {
  academicYear: string;
  inscriptionRenewalFee: number;
  monthlyFee: number;
  startMonth: string;
  endMonth: string;
  firstPenaltyDay: number;
  firstPenaltyAmount: number;
  secondPenaltyDay: number;
  secondPenaltyAmount: number;
  levelRules?: PaymentLevelRule[];
  version?: number;
  updatedAt?: string;
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
  createdAt: string;
  ruleSnapshot?: PaymentRuleSnapshot;
};

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  effectivePaymentDate?: string;
  paidOn: string;
  recordedAt: string;
  recordedBy?: string;
  method: string;
  reference?: string;
  observation?: string;
};

export type PaymentAllocation = {
  id: string;
  paymentId: string;
  chargeId: string;
  amount: number;
};

export type StudentPaymentRecord = {
  studentId: string;
  charges: Charge[];
  payments: Payment[];
  allocations: PaymentAllocation[];
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
  levelRules: [],
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const initialAcademicStages: AcademicStageDefinition[] = [];

export const initialClassDefinitions: ClassDefinition[] = [];

export const initialRoomDefinitions: RoomDefinition[] = [];

export const initialRooms: SchoolRoom[] = [];

export const initialClasses: SchoolClass[] = [];

export const initialGroups: ClassGroup[] = [];

export const initialStudents: Student[] = [];

export const initialPaymentRecords: StudentPaymentRecord[] = [];
