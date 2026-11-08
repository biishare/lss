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
  appliesToRegistration?: boolean;
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
  definitionId?: string;
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
  schedule?: { days: number[]; startsAt: string; endsAt: string };
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
  pricingLevelId?: string;
  personId?: string;
  enrollmentStatus?: "active" | "withdrawn" | "completed" | "cancelled";
  tuitionEndMonth?: string;
  billingMonths?: string[];
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
  calculationVersion?: "v3";
  benefitIds?: string[];
  penaltyPolicy?: import("../features/finance/domain/entities").PaymentRuleVersion["penaltyPolicy"];
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
  adjustedBenefit?: { percent: number; label: string; benefitIds: string[] };
  adjustedDueAmount?: number;
  academicCancellation?: { eventId: string; previousDue: number; recordedAt: string; reason: string };
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
  adjustedAmount?: number;
  academicCancellation?: { eventId: string; previousDue: number; recordedAt: string; reason: string };
  id: string;
  studentId: string;
  baseChargeId: string;
  stage: PenaltyStage;
  amount: number;
  effectiveOn: string;
  createdAt: string;
  snapshot: {
    calculationVersion?: "v3";
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
  billingVersion?: 3;
  billingCalendar?: import("../features/finance/domain/entities").BillingCalendarItem[];
  financialAid?: import("../features/finance/domain/entities").FinancialAid[];
  financialAdjustments?: import("../features/finance/domain/entities").FinancialAdjustment[];
  academicAdjustments?: Array<{ id: string; chargeId: string; amount: number; reason: string; recordedAt: string; releasedAllocations: PaymentAllocation[] }>;
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

export const initialAcademicStages: AcademicStageDefinition[] = [
  { id: "secondary-1", name: "1.º ciclo secundário", status: "active", createdAt: "2026-01-08" },
  { id: "secondary-2", name: "2.º ciclo secundário", status: "active", createdAt: "2026-01-08" },
];

export const initialClassDefinitions: ClassDefinition[] = [
  { id: "7", name: "7.ª classe", stageId: "secondary-1", status: "active", createdAt: "2026-01-09" },
  { id: "8", name: "8.ª classe", stageId: "secondary-1", status: "active", createdAt: "2026-01-09" },
  { id: "10", name: "10.ª classe", stageId: "secondary-2", status: "active", createdAt: "2026-01-09" },
];

export const initialRoomDefinitions: RoomDefinition[] = [
  { id: "room-a1", name: "Sala A1", block: "Bloco A", capacity: 32, status: "active", createdAt: "2026-01-10" },
  { id: "room-a2", name: "Sala A2", block: "Bloco A", capacity: 30, status: "active", createdAt: "2026-01-10" },
  { id: "room-b1", name: "Sala B1", block: "Bloco B", capacity: 28, status: "active", createdAt: "2026-01-10" },
  { id: "room-lab", name: "Laboratório", block: "Bloco B", capacity: 24, status: "active", createdAt: "2026-01-10" },
];

export const initialRooms: SchoolRoom[] = initialRoomDefinitions.map(
  ({ id, name, block, capacity, status }) => ({ id, name, block, capacity, status }),
);

export const initialClasses: SchoolClass[] = [
  { id: "7", name: "7.ª classe", stage: "1.º ciclo secundário", academicYear: "2026", academicYearId: "2026", educationLevelId: "7", status: "active", createdAt: "2026-01-15" },
  { id: "8", name: "8.ª classe", stage: "1.º ciclo secundário", academicYear: "2026", academicYearId: "2026", educationLevelId: "8", status: "active", createdAt: "2026-01-15" },
  { id: "10", name: "10.ª classe", stage: "2.º ciclo secundário", academicYear: "2026", academicYearId: "2026", educationLevelId: "10", status: "active", createdAt: "2026-01-15" },
];

export const initialGroups: ClassGroup[] = [
  { id: "7A2026", name: "Turma A", classId: "7", shift: "Manhã", roomId: "room-a1", capacity: 32, status: "active", createdAt: "2026-01-18" },
  { id: "7B2026", name: "Turma B", classId: "7", shift: "Tarde", roomId: "room-a2", capacity: 30, status: "active", createdAt: "2026-01-18" },
  { id: "8A2026", name: "Turma A", classId: "8", shift: "Manhã", roomId: "room-b1", capacity: 28, status: "active", createdAt: "2026-01-18" },
  { id: "10A2026", name: "Turma A", classId: "10", shift: "Tarde", roomId: "room-lab", capacity: 24, status: "active", createdAt: "2026-01-18" },
];

function demoStudent({
  classId,
  discountPercent = 0,
  financeStatus = "regular",
  fullName,
  groupId,
  guardianName,
  id,
  number,
  ruleEnd,
  ruleReason,
  ruleStart,
  tuitionStartMonth = "mar",
}: {
  classId: string;
  discountPercent?: number;
  financeStatus?: FinanceStatus;
  fullName: string;
  groupId: string;
  guardianName: string;
  id: string;
  number: string;
  ruleEnd?: string;
  ruleReason?: string;
  ruleStart?: string;
  tuitionStartMonth?: string;
}): Student {
  const registeredAt = "2026-02-10T09:00:00.000Z";
  const hasRule = financeStatus !== "regular";

  return {
    id,
    enrollmentId: `ENR-${id}`,
    academicYearId: "2026",
    educationLevelId: classId,
    stableNumber: number,
    registrationNumber: `LSS-2026-${number.padStart(3, "0")}`,
    fullName,
    guardianName,
    guardianPhone: `+258 84 000 00${number.padStart(2, "0")}`,
    enrollmentType: Number(number) % 3 === 0 ? "renewal" : "new",
    enrollmentDate: "2026-02-10",
    tuitionStartMonth,
    registrationStatus: "pending",
    financialProfile: {
      status: financeStatus,
      discountPercent,
      startMonth: hasRule ? ruleStart ?? "mar" : undefined,
      endMonth: hasRule ? ruleEnd ?? "nov" : undefined,
      reason: hasRule ? ruleReason ?? "Condição autorizada" : undefined,
      authorizedBy: hasRule ? "Direcção pedagógica" : undefined,
      registeredBy: hasRule ? "Marta — Secretaria" : undefined,
      registeredAt: hasRule ? registeredAt : undefined,
      history: hasRule
        ? [
            {
              id: `RULE-${id}-001`,
              status: financeStatus,
              discountPercent,
              startMonth: ruleStart ?? "mar",
              endMonth: ruleEnd ?? "nov",
              reason: ruleReason ?? "Condição autorizada",
              authorizedBy: "Direcção pedagógica",
              registeredBy: "Marta — Secretaria",
              registeredAt,
            },
          ]
        : [],
    },
    classId,
    groupId,
    createdAt: registeredAt,
  };
}

export const initialStudents: Student[] = [
  demoStudent({ id: "student-001", number: "1", fullName: "Ana Júlia Mucavele", guardianName: "Celina Mucavele", classId: "7", groupId: "7A2026" }),
  demoStudent({ id: "student-002", number: "2", fullName: "Bruno Ernesto Macamo", guardianName: "Ernesto Macamo", classId: "7", groupId: "7A2026" }),
  demoStudent({ id: "student-003", number: "3", fullName: "Carla Sofia Matola", guardianName: "Rosa Matola", classId: "7", groupId: "7A2026", financeStatus: "scholarship", discountPercent: 100, ruleReason: "Bolsa integral de mérito" }),
  demoStudent({ id: "student-004", number: "1", fullName: "Dário Luís Cossa", guardianName: "Luís Cossa", classId: "7", groupId: "7B2026", financeStatus: "partial_scholarship", discountPercent: 50, ruleReason: "Bolsa parcial" }),
  demoStudent({ id: "student-005", number: "2", fullName: "Elisa Amélia Nhantumbo", guardianName: "Amélia Nhantumbo", classId: "7", groupId: "7B2026" }),
  demoStudent({ id: "student-006", number: "3", fullName: "Fábio Samuel Mondlane", guardianName: "Samuel Mondlane", classId: "7", groupId: "7B2026", financeStatus: "exception", discountPercent: 100, ruleStart: "mar", ruleEnd: "jun", ruleReason: "Isenção temporária" }),
  demoStudent({ id: "student-007", number: "1", fullName: "Graça Inês Baloi", guardianName: "Inês Baloi", classId: "8", groupId: "8A2026", financeStatus: "weighted", discountPercent: 25, ruleReason: "Ponderação autorizada" }),
  demoStudent({ id: "student-008", number: "2", fullName: "Hélio Manuel Mabunda", guardianName: "Manuel Mabunda", classId: "8", groupId: "8A2026" }),
  demoStudent({ id: "student-009", number: "3", fullName: "Ilda Teresa Bila", guardianName: "Teresa Bila", classId: "8", groupId: "8A2026", tuitionStartMonth: "may" }),
  demoStudent({ id: "student-010", number: "1", fullName: "João Pedro Chissano", guardianName: "Pedro Chissano", classId: "10", groupId: "10A2026", financeStatus: "partial_scholarship", discountPercent: 30, ruleReason: "Apoio social parcial" }),
  demoStudent({ id: "student-011", number: "2", fullName: "Lídia Marta Sitoe", guardianName: "Marta Sitoe", classId: "10", groupId: "10A2026" }),
  demoStudent({ id: "student-012", number: "3", fullName: "Mateus André Nhampossa", guardianName: "André Nhampossa", classId: "10", groupId: "10A2026", financeStatus: "scholarship", discountPercent: 100, ruleReason: "Bolsa integral desportiva" }),
];

function paidEntry(amount: number, paidAt: string, reference: string): PaymentEntry {
  return {
    amount,
    paidDay: Number(paidAt.slice(8, 10)),
    paidAt: `${paidAt}T10:00:00.000Z`,
    method: "Transferência",
    reference,
    description: "Pagamento registado pela Secretaria",
  };
}

function demoPaymentRecord(
  studentId: string,
  registrationAmount: number,
  monthlyAmounts: Partial<Record<string, number>> = {},
): StudentPaymentRecord {
  return {
    studentId,
    charges: [],
    penaltyCharges: [],
    payments: [],
    allocations: [],
    corrections: [],
    inscriptionRenewal:
      registrationAmount > 0
        ? paidEntry(registrationAmount, "2026-02-12", `LSS-${studentId}-REG`)
        : { amount: 0, paidDay: 0 },
    monthlyPayments: Object.fromEntries(
      Object.entries(monthlyAmounts).map(([month, amount], index) => [
        month,
        paidEntry(amount ?? 0, `2026-${String(index + 3).padStart(2, "0")}-08`, `LSS-${studentId}-${month.toUpperCase()}`),
      ]),
    ),
    miscellaneousPayments: [],
  };
}

export const initialPaymentRecords: StudentPaymentRecord[] = [
  demoPaymentRecord("student-001", 3500, { mar: 1500, apr: 1500, may: 1500 }),
  demoPaymentRecord("student-002", 3500, { mar: 1500, apr: 1500, may: 1500, jun: 1500, jul: 1500, aug: 1500 }),
  demoPaymentRecord("student-003", 0),
  demoPaymentRecord("student-004", 1750, { mar: 750, apr: 750 }),
  demoPaymentRecord("student-005", 0),
  demoPaymentRecord("student-006", 0),
  demoPaymentRecord("student-007", 2625, { mar: 1125, apr: 1125, may: 1125 }),
  demoPaymentRecord("student-008", 3500, { mar: 1500 }),
  demoPaymentRecord("student-009", 3500, { may: 1500, jun: 1500 }),
  demoPaymentRecord("student-010", 2450, { mar: 1050, apr: 1050, may: 1050 }),
  demoPaymentRecord("student-011", 3500, { mar: 1500, apr: 1500, may: 1500, jun: 1500, jul: 1500, aug: 1500 }),
  demoPaymentRecord("student-012", 0),
];
