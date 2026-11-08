import {
  initialPaymentSettings,
  monthOptions,
  type Charge,
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type EnrollmentType,
  type EntityStatus,
  type FinanceStatus,
  type MonthOption,
  type Payment,
  type PaymentAllocation,
  type PaymentCorrection,
  type PaymentEntry,
  type PenaltyCharge,
  type PenaltyStage,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
  type StudentFinancialProfile,
  type StudentFinanceRuleHistoryEntry,
  type StudentPaymentRecord,
} from "../lib/school-demo-data";
import type { FinanceBook, PaymentRuleVersion } from "../features/finance/domain/entities";
import type {
  LegacyMigrationPreview,
  LegacySafetyExport,
} from "../features/finance/domain/migration";

export type ProfileId = "director" | "secretaria";

export type WorkspaceView =
  | "overview"
  | "catalog"
  | "classes"
  | "rooms"
  | "groups"
  | "enrollments"
  | "payments"
  | "reports";

export type PaymentCategory = "registration" | "tuition" | "miscellaneous";

export type PaymentWorkspaceSection =
  | "settings"
  | "student-rules"
  | "entry"
  | "reports";

export type PaymentAlertFilter =
  | "all"
  | "registration"
  | "overdue"
  | "first-fine"
  | "second-fine"
  | "debt"
  | "rules-ending";

export type BillingRun = {
  id: string;
  classId: string;
  groupId: string;
  monthKey: string;
  studentIds: string[];
  exemptedStudentIds: string[];
  amount: number;
  expectedTotal: number;
  createdAt: string;
};

export type ClassDraft = {
  definitionId: string;
  status: EntityStatus;
};

export type RoomDraft = {
  definitionId: string;
  status: EntityStatus;
};

export type AcademicStageDraft = {
  name: string;
  status: EntityStatus;
};

export type ClassDefinitionDraft = {
  id: string;
  name: string;
  stageId: string;
  status: EntityStatus;
};

export type RoomDefinitionDraft = {
  name: string;
  block: string;
  capacity: string;
  status: EntityStatus;
};

export type GroupDraft = {
  name: string;
  classId: string;
  shift: string;
  roomId: string;
  capacity: string;
  status: EntityStatus;
};

export type EnrollmentDraft = {
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentType: EnrollmentType;
  enrollmentDate: string;
  tuitionStartMonth: string;
  financeStatus: FinanceStatus;
  discountPercent: string;
  exceptionStartMonth: string;
  exceptionEndMonth: string;
  exceptionReason: string;
  classId: string;
  groupId: string;
};

export type FinanceSettingsDraft = {
  academicYear: string;
  inscriptionRenewalFee: string;
  monthlyFee: string;
  startMonth: string;
  endMonth: string;
  firstPenaltyDay: string;
  firstPenaltyAmount: string;
  secondPenaltyDay: string;
  secondPenaltyAmount: string;
};

export type FinanceProfileDraft = {
  studentId: string;
  status: FinanceStatus;
  discountPercent: string;
  startMonth: string;
  endMonth: string;
  reason: string;
  authorizedBy: string;
  registeredBy: string;
};

export type PaymentRuleDraft = {
  ruleId: string;
  policyId: string;
  policyName: string;
  academicYearId: string;
  educationLevelId: string;
  educationLevelIds: string[];
  status: EntityStatus;
  validFrom: string;
  inscriptionFee: string;
  monthlyFee: string;
  monthlyDueDay: string;
  firstPenaltyDay: string;
  firstPenaltyPercent: string;
  secondPenaltyDay: string;
  secondPenaltyPercent: string;
  coveredMonthKeys: string[];
};

export type PaymentCorrectionDraft = {
  paymentId: string;
  amount: string;
  reason: string;
};

export type PaymentLaunchDraft = {
  studentId: string;
  category: PaymentCategory;
  monthKey: string;
  targetChargeId?: string;
  amount: string;
  paidOn: string;
  method: string;
  reference?: string;
  description: string;
  allowFutureAllocation: boolean;
};

export type FinanceCellSelection =
  | { kind: "registration"; studentId: string }
  | { kind: "tuition"; studentId: string; monthKey: string }
  | { kind: "miscellaneous"; studentId: string }
  | { kind: "debt"; studentId: string };

export type MiscellaneousChargeDraft = {
  type: string;
  description: string;
  amount: string;
  dueOn: string;
  target: "group" | "selected";
};

export type PaymentDetails = Omit<PaymentEntry, "amount">;

export type OfficialPaymentState =
  | "not-applicable"
  | "future"
  | "pending"
  | "partial"
  | "overdue"
  | "first-fine"
  | "second-fine"
  | "fine-due"
  | "paid"
  | "paid-with-fine"
  | "scholarship";

export type MonthLedger = {
  month: MonthOption;
  entry: PaymentEntry;
  applicable: boolean;
  due: number;
  discount: number;
  ruleLabel: string;
  carryIn: number;
  paid: number;
  balance: number;
  carryOut: number;
  fine: number;
  finePaid: number;
  fineTotal: number;
  fineBalance: number;
  penaltyStage?: "first" | "second";
  dueOn?: string;
  baseAmount: number;
  state: OfficialPaymentState;
};

export type StudentLedgerRow = {
  student: Student;
  record: StudentPaymentRecord;
  ledger: ReturnType<typeof buildLedger>;
};

export type DebtBreakdownItem = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  order: number;
};

export type PaymentHistoryItem = {
  id: string;
  paidOn: string;
  effectivePaymentDate: string;
  recordedAt: string;
  recordedBy: string;
  amount: number;
  method: string;
  reference?: string;
  legacyReference?: string;
  observation?: string;
};

export type PaymentAllocationPreviewItem = {
  chargeId: string;
  label: string;
  kind: "base" | "penalty";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  dueOn?: string;
  penaltyStage?: PenaltyStage;
};

export type PaymentPreview = {
  normalizedRecord: StudentPaymentRecord;
  payment: Payment;
  allocations: Array<Omit<PaymentAllocation, "id">>;
  items: PaymentAllocationPreviewItem[];
  totalAllocated: number;
  unallocatedAmount: number;
  baseTotal: number;
  penaltyTotal: number;
};

export type PaymentReceipt = {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  paymentId: string;
  amount: number;
  effectivePaymentDate: string;
  recordedAt: string;
  recordedBy: string;
  method: string;
  items: PaymentAllocationPreviewItem[];
  penaltyTotal: number;
  unallocatedAmount: number;
};

export type PaymentCorrectionResult = {
  record: StudentPaymentRecord;
  correction?: PaymentCorrection;
  charge?: Charge;
  payment?: Payment;
};

export type StoredDemoState = {
  schemaVersion?: 2 | 3;
  savedAt?: string;
  academicStages?: AcademicStageDefinition[];
  classDefinitions?: ClassDefinition[];
  roomDefinitions?: RoomDefinition[];
  classes?: SchoolClass[];
  rooms?: SchoolRoom[];
  groups?: ClassGroup[];
  students?: Student[];
  paymentSettings?: PaymentSettings;
  paymentRecords?: StudentPaymentRecord[];
  billingRuns?: BillingRun[];
  paymentRuleVersions?: PaymentRuleVersion[];
  financeBook?: FinanceBook;
  financeMigrationPreview?: LegacyMigrationPreview;
  legacySafetyExport?: LegacySafetyExport;
};

export const storageKey = "gestao-academica-demo-state-v2";
export const institutionName = "Liceu São Silvestre";
export const institutionLogoText = "LSS";

export type ProfileConfig = {
  id: ProfileId;
  title: string;
  defaultView: WorkspaceView;
  glyph: string;
  accent: string;
  surface: string;
};

export const profiles: ProfileConfig[] = [
  {
    id: "director",
    title: "Director",
    defaultView: "overview",
    glyph: "DR",
    accent: "border-t-[#0b6b5c]",
    surface: "bg-teal-50 text-[#0b6b5c]",
  },
  {
    id: "secretaria",
    title: "Secretaria",
    defaultView: "overview",
    glyph: "SE",
    accent: "border-t-[#2867d8]",
    surface: "bg-blue-50 text-[#2459bd]",
  },
];

export const workspaceNavigation: Array<{
  id: WorkspaceView;
  label: string;
  href: string;
  profiles: ProfileId[];
}> = [
  { id: "overview", label: "Início", href: "/dashboard", profiles: ["director", "secretaria"] },
  { id: "enrollments", label: "Alunos e turmas", href: "/students", profiles: ["director", "secretaria"] },
  { id: "payments", label: "Pagamentos", href: "/payments", profiles: ["director", "secretaria"] },
  { id: "reports", label: "Relatórios", href: "/reports", profiles: ["director", "secretaria"] },
  { id: "catalog", label: "Configurações", href: "/settings", profiles: ["director", "secretaria"] },
];

export const paymentSections: Array<{
  id: PaymentWorkspaceSection;
  label: string;
  profiles: ProfileId[];
}> = [
  {
    id: "settings",
    label: "Dados de pagamentos",
    profiles: ["secretaria"],
  },
  {
    id: "student-rules",
    label: "Bolsas e isencoes",
    profiles: ["secretaria"],
  },
  {
    id: "entry",
    label: "Planilha financeira",
    profiles: ["director", "secretaria"],
  },
  {
    id: "reports",
    label: "Relatório",
    profiles: ["director", "secretaria"],
  },
];

export const paymentCategories: Array<{ id: PaymentCategory; label: string }> = [
  { id: "registration", label: "Inscrição/Renovação" },
  { id: "tuition", label: "Mensalidade" },
  { id: "miscellaneous", label: "Pagamentos diversos" },
];

export const paymentMethods = [
  "Numerário",
  "Transferência",
  "Multicaixa",
  "Depósito bancário",
];

export const statusOptions: Array<{ value: EntityStatus; label: string }> = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

export const financeStatusOptions: Array<{ value: FinanceStatus; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "scholarship", label: "Bolseiro integral" },
  { value: "partial_scholarship", label: "Bolseiro parcial" },
  { value: "exception", label: "Isencao temporaria" },
  { value: "weighted", label: "Ponderacao" },
];

export const buttonBase =
  "inline-flex min-h-11 max-w-full items-center justify-center rounded-md px-4 py-2 text-center text-sm font-semibold leading-snug transition-colors whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-50";

export const moneyFormatter = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 0,
});

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function loadStoredState() {
  const rawState = window.localStorage.getItem(storageKey);
  return rawState === null ? null : (JSON.parse(rawState) as StoredDemoState);
}

export function storedArray<T>(items: T[] | undefined, fallback: T[]) {
  return Array.isArray(items) ? items : fallback;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function currentAcademicYear() {
  return String(new Date().getFullYear());
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCurrency(value: number) {
  return `${moneyFormatter.format(Math.max(0, value))} MT`;
}

export function parseMoney(value: string) {
  return Math.max(0, Number(value) || 0);
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

export function sortClasses(items: SchoolClass[]) {
  return [...items].sort((a, b) => {
    const aNumber = Number(a.id);
    const bNumber = Number(b.id);

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }

    return a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" });
  });
}

export function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" }),
  );
}

export function sortStudents(items: Student[]) {
  return [...items].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "pt-PT", { sensitivity: "base" }),
  );
}

export function nextId(items: Array<{ id: string }>, prefix: string) {
  const currentMax = items.reduce((max, item) => {
    const idNumber = Number(item.id.replace(`${prefix}-`, ""));
    return Number.isFinite(idNumber) ? Math.max(max, idNumber) : max;
  }, 0);

  return `${prefix}-${String(currentMax + 1).padStart(3, "0")}`;
}

export function nextRegistrationNumber(students: Student[]) {
  return `GA-${new Date().getFullYear()}-${String(students.length + 1).padStart(
    3,
    "0",
  )}`;
}

export function studentAcademicYearId(
  student: Student,
  settings: PaymentSettings,
) {
  return student.academicYearId ?? settings.academicYear;
}

export function studentEducationLevelId(student: Student) {
  return student.educationLevelId ?? student.classId;
}

export function stableEnrollmentId(student: Student, settings: PaymentSettings) {
  return (
    student.enrollmentId ??
    `ENR-${studentAcademicYearId(student, settings)}-${student.id}`
  );
}

export function assignStableStudentNumbers(
  students: Student[],
  settings: PaymentSettings,
) {
  const groupedStudents = new Map<string, Student[]>();
  const numberByStudentId = new Map<string, string>();

  students.forEach((student) => {
    const key = `${studentAcademicYearId(student, settings)}:${student.groupId}`;
    const group = groupedStudents.get(key) ?? [];

    group.push(student);
    groupedStudents.set(key, group);
  });

  groupedStudents.forEach((group) => {
    const usedNumbers = new Set<string>();
    const orderedGroup = [...group].sort((a, b) => {
      const aStableNumber = Number(a.stableNumber);
      const bStableNumber = Number(b.stableNumber);
      const hasAStableNumber = Number.isFinite(aStableNumber);
      const hasBStableNumber = Number.isFinite(bStableNumber);

      if (hasAStableNumber && hasBStableNumber) {
        return aStableNumber - bStableNumber;
      }

      if (hasAStableNumber) {
        return -1;
      }

      if (hasBStableNumber) {
        return 1;
      }

      return (
        getStudentEnrollmentDate(a).localeCompare(getStudentEnrollmentDate(b)) ||
        a.id.localeCompare(b.id)
      );
    });

    orderedGroup.forEach((student) => {
      const existingNumber = student.stableNumber?.match(/^\d+$/)
        ? student.stableNumber.padStart(3, "0")
        : "";

      if (existingNumber && !usedNumbers.has(existingNumber)) {
        usedNumbers.add(existingNumber);
        numberByStudentId.set(student.id, existingNumber);
        return;
      }

      let nextNumber = 1;
      let formattedNumber = String(nextNumber).padStart(3, "0");

      while (usedNumbers.has(formattedNumber)) {
        nextNumber += 1;
        formattedNumber = String(nextNumber).padStart(3, "0");
      }

      usedNumbers.add(formattedNumber);
      numberByStudentId.set(student.id, formattedNumber);
    });
  });

  return numberByStudentId;
}

export function normalizeStudentsForEnrollmentPolicy(
  students: Student[],
  settings: PaymentSettings,
) {
  const normalizedStudents = students.map((student) =>
    normalizeStudentForPolicy(student, settings),
  );
  const stableNumbers = assignStableStudentNumbers(normalizedStudents, settings);

  return normalizedStudents.map((student) => ({
    ...student,
    enrollmentId: stableEnrollmentId(student, settings),
    academicYearId: studentAcademicYearId(student, settings),
    educationLevelId: studentEducationLevelId(student),
    stableNumber: stableNumbers.get(student.id) ?? "001",
  }));
}

export function nextStableNumberForGroup(
  students: Student[],
  groupId: string,
  settings: PaymentSettings,
  academicYearId = settings.academicYear,
) {
  const usedNumbers = students
    .filter(
      (student) =>
        student.groupId === groupId &&
        studentAcademicYearId(student, settings) === academicYearId,
    )
    .map((student) => Number(student.stableNumber))
    .filter((value) => Number.isFinite(value));
  const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

  return String(nextNumber).padStart(3, "0");
}

export function activeAcademicStages(stages: AcademicStageDefinition[]) {
  return sortByName(stages.filter((stage) => stage.status === "active"));
}

export function activeClassDefinitions(
  classDefinitions: ClassDefinition[],
  stages: AcademicStageDefinition[],
) {
  const activeStageIds = new Set(
    stages.filter((stage) => stage.status === "active").map((stage) => stage.id),
  );

  return sortByName(
    classDefinitions.filter(
      (definition) =>
        definition.status === "active" && activeStageIds.has(definition.stageId),
    ),
  );
}

export function activeRoomDefinitions(roomDefinitions: RoomDefinition[]) {
  return sortByName(
    roomDefinitions.filter((definition) => definition.status === "active"),
  );
}

export function stageLabel(stages: AcademicStageDefinition[], stageId: string) {
  return stages.find((stage) => stage.id === stageId)?.name ?? "Sem nivel";
}

export function availableClassDefinitions(
  classes: SchoolClass[],
  classDefinitions: ClassDefinition[],
  stages: AcademicStageDefinition[],
) {
  const usedLevelIds = new Set(classes.map((schoolClass) => schoolClass.id));

  return activeClassDefinitions(classDefinitions, stages).filter(
    (option) => !usedLevelIds.has(option.id),
  );
}

export function firstAvailableClassDefinitionId(
  classes: SchoolClass[],
  classDefinitions: ClassDefinition[],
  stages: AcademicStageDefinition[],
) {
  return availableClassDefinitions(classes, classDefinitions, stages)[0]?.id ?? "";
}

export function availableRoomDefinitions(
  rooms: SchoolRoom[],
  roomDefinitions: RoomDefinition[],
) {
  const usedRoomIds = new Set(rooms.map((room) => room.id));

  return activeRoomDefinitions(roomDefinitions).filter(
    (definition) => !usedRoomIds.has(definition.id),
  );
}

export function firstAvailableRoomDefinitionId(
  rooms: SchoolRoom[],
  roomDefinitions: RoomDefinition[],
) {
  return availableRoomDefinitions(rooms, roomDefinitions)[0]?.id ?? "";
}

export function getGroupCode(groupName: string) {
  const cleanedName = groupName.trim().replace(/^turma\s+/i, "").trim();
  const match = cleanedName.match(/[a-z0-9]/i);

  return (match?.[0] ?? "A").toUpperCase();
}

export function buildGroupId(classId: string, groupName: string) {
  if (!classId) {
    return "AGUARDAR";
  }

  return `${classId}${getGroupCode(groupName)}${new Date().getFullYear()}`;
}

export function nextStageDefinitionId(stages: AcademicStageDefinition[]) {
  return nextId(stages, "NIVEL");
}

export function nextRoomDefinitionId(roomDefinitions: RoomDefinition[]) {
  return nextId(roomDefinitions, "SALA");
}

export function roomById(rooms: SchoolRoom[], roomId: string) {
  return rooms.find((room) => room.id === roomId);
}

export function roomLabel(rooms: SchoolRoom[], roomId: string) {
  const room = roomById(rooms, roomId);

  return room ? `${room.name} - ${room.block}` : "Sala por seleccionar";
}

export function activeRooms(rooms: SchoolRoom[]) {
  return rooms.filter((room) => room.status === "active");
}

export function statusLabel(status: EntityStatus) {
  return status === "active" ? "Activo" : "Inactivo";
}

export function financeStatusLabel(status: FinanceStatus) {
  return (
    financeStatusOptions.find((option) => option.value === status)?.label ??
    "Regular"
  );
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function financeRuleDiscountPercent(
  status: FinanceStatus,
  rawDiscountPercent: number,
) {
  if (status === "regular") {
    return 0;
  }

  if (status === "scholarship" || status === "exception") {
    return 100;
  }

  return clampPercent(rawDiscountPercent);
}

export function normalizeFinanceProfile(
  profile: StudentFinancialProfile | undefined,
): StudentFinancialProfile {
  return {
    status: profile?.status ?? "regular",
    discountPercent: profile?.discountPercent ?? 0,
    startMonth: profile?.startMonth,
    endMonth: profile?.endMonth,
    reason: profile?.reason,
    authorizedBy: profile?.authorizedBy,
    registeredBy: profile?.registeredBy,
    registeredAt: profile?.registeredAt,
    history: [...(profile?.history ?? [])],
  };
}

export function buildStudentFinanceProfile(
  currentProfile: StudentFinancialProfile | undefined,
  draft: FinanceProfileDraft,
  registeredAt = nowIso(),
): StudentFinancialProfile {
  const normalizedCurrent = normalizeFinanceProfile(currentProfile);
  const status = draft.status;
  const discountPercent = financeRuleDiscountPercent(
    status,
    parseMoney(draft.discountPercent),
  );
  const activeRule = status !== "regular";
  const authorizedBy = draft.authorizedBy.trim() || "Secretaria";
  const registeredBy = draft.registeredBy.trim() || "Secretaria";
  const reason = activeRule
    ? draft.reason.trim() || financeStatusLabel(status)
    : draft.reason.trim() || "Regra normal";
  const historyEntry: StudentFinanceRuleHistoryEntry = {
    id: nextId(normalizedCurrent.history ?? [], "REGRA"),
    status,
    discountPercent,
    startMonth: activeRule ? draft.startMonth : undefined,
    endMonth: activeRule ? draft.endMonth : undefined,
    reason,
    authorizedBy,
    registeredBy,
    registeredAt,
  };

  return {
    status,
    discountPercent,
    startMonth: activeRule ? draft.startMonth : undefined,
    endMonth: activeRule ? draft.endMonth : undefined,
    reason: activeRule ? reason : undefined,
    authorizedBy,
    registeredBy,
    registeredAt,
    history: [historyEntry, ...(normalizedCurrent.history ?? [])],
  };
}

export function monthIndex(monthKey: string) {
  return monthOptions.findIndex((month) => month.key === monthKey);
}

export function isMonthInRange(monthKey: string, startMonth?: string, endMonth?: string) {
  if (!startMonth || !endMonth) {
    return true;
  }

  const current = monthIndex(monthKey);
  const start = monthIndex(startMonth);
  const end = monthIndex(endMonth);

  if (current < 0 || start < 0 || end < 0) {
    return true;
  }

  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
}

export function getMonthsInRange(startMonth: string, endMonth: string) {
  const startIndex = monthOptions.findIndex((month) => month.key === startMonth);
  const endIndex = monthOptions.findIndex((month) => month.key === endMonth);

  if (startIndex < 0 || endIndex < 0) {
    return [];
  }

  if (startIndex <= endIndex) {
    return monthOptions.slice(startIndex, endIndex + 1);
  }

  return [...monthOptions.slice(startIndex), ...monthOptions.slice(0, endIndex + 1)];
}

export function emptyEntry(): PaymentEntry {
  return { amount: 0, paidDay: 0 };
}

export function buildPaymentRecord(studentId: string): StudentPaymentRecord {
  return {
    studentId,
    charges: [],
    penaltyCharges: [],
    payments: [],
    allocations: [],
    corrections: [],
    inscriptionRenewal: emptyEntry(),
    monthlyPayments: {},
    miscellaneousPayments: [],
  };
}

export function registrationChargeId(studentId: string) {
  return `CHG-${studentId}-REG`;
}

export function tuitionChargeId(studentId: string, monthKey: string) {
  return `CHG-${studentId}-TUI-${monthKey.toUpperCase()}`;
}

export function paidOnToIso(paidOn: string) {
  return `${paidOn || today()}T00:00:00.000Z`;
}

export function paidOnDay(paidOn: string) {
  const day = Number((paidOn || today()).split("-")[2]);

  return Number.isFinite(day) && day > 0 ? day : new Date().getDate();
}

export function dateForAcademicMonth(
  monthKey: string,
  day: number,
  settings: PaymentSettings,
) {
  const monthNumber = monthIndex(monthKey) + 1;
  const year = Number(settings.academicYear) || new Date().getFullYear();

  if (monthNumber <= 0) {
    return "";
  }

  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.max(1, Math.min(lastDay, day));

  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(safeDay).padStart(
    2,
    "0",
  )}`;
}

export function dueDateForMonth(monthKey: string, settings: PaymentSettings) {
  return dateForAcademicMonth(
    monthKey,
    settings.monthlyDueDay ?? settings.firstPenaltyDay,
    settings,
  );
}

export function firstPenaltyDateForMonth(
  monthKey: string,
  settings: PaymentSettings,
) {
  return dateForAcademicMonth(monthKey, settings.firstPenaltyDay + 1, settings);
}

export function secondPenaltyDateForMonth(
  monthKey: string,
  settings: PaymentSettings,
) {
  return dateForAcademicMonth(monthKey, settings.secondPenaltyDay + 1, settings);
}

export function assessmentDayForMonth(
  monthKey: string,
  settings: PaymentSettings,
  assessmentDate = today(),
) {
  const [assessmentYear, assessmentMonth] = assessmentDate.split("-");
  const academicYear = Number(settings.academicYear);
  const currentYear = Number(assessmentYear);
  const currentMonthIndex = Number(assessmentMonth) - 1;
  const targetMonthIndex = monthIndex(monthKey);

  if (!Number.isFinite(currentYear) || targetMonthIndex < 0) {
    return 0;
  }

  if (Number.isFinite(academicYear)) {
    if (currentYear > academicYear) {
      return 31;
    }

    if (currentYear < academicYear) {
      return 0;
    }
  }

  if (targetMonthIndex < currentMonthIndex) {
    return 31;
  }

  if (targetMonthIndex > currentMonthIndex) {
    return 0;
  }

  return paidOnDay(assessmentDate);
}

export function clonePaymentRecord(record: StudentPaymentRecord) {
  return {
    ...buildPaymentRecord(record.studentId),
    ...record,
    charges: [...(record.charges ?? [])],
    penaltyCharges: [...(record.penaltyCharges ?? [])],
    payments: [...(record.payments ?? [])],
    allocations: [...(record.allocations ?? [])],
    corrections: [...(record.corrections ?? [])],
    inscriptionRenewal: {
      ...emptyEntry(),
      ...(record.inscriptionRenewal ?? {}),
    },
    monthlyPayments: { ...(record.monthlyPayments ?? {}) },
    miscellaneousPayments: [...(record.miscellaneousPayments ?? [])],
  };
}

export function allocatedAmountForCharge(
  record: StudentPaymentRecord,
  chargeId: string,
) {
  return (record.allocations ?? [])
    .filter((allocation) => allocation.chargeId === chargeId)
    .reduce((total, allocation) => total + allocation.amount, 0);
}

export function getChargeAmount(charge: Charge | PenaltyCharge) {
  return Math.max(
    0,
    "baseChargeId" in charge ? charge.amount : charge.dueAmount ?? charge.amount,
  );
}

export function getChargeBalance(
  record: StudentPaymentRecord,
  charge: Charge | PenaltyCharge,
) {
  return Math.max(0, getChargeAmount(charge) - allocatedAmountForCharge(record, charge.id));
}

export function addMiscellaneousCharge(
  record: StudentPaymentRecord,
  student: Student,
  draft: MiscellaneousChargeDraft,
  createdAt = nowIso(),
) {
  const nextRecord = clonePaymentRecord(record);
  const amount = parseMoney(draft.amount);
  const type = draft.type.trim() || "Diversos";
  const description = draft.description.trim();

  if (amount <= 0) {
    return nextRecord;
  }

  const charge: Charge = {
    id: nextId(nextRecord.charges, `CHG-${student.id}-MISC`),
    studentId: student.id,
    category: "miscellaneous",
    amount,
    description: description ? `${type} - ${description}` : type,
    dueOn: draft.dueOn || today(),
    createdAt,
  };

  return {
    ...nextRecord,
    charges: [charge, ...nextRecord.charges],
  };
}

export function getChargePaymentEntry(
  record: StudentPaymentRecord,
  chargeId: string,
): PaymentEntry {
  const chargeAllocations = (record.allocations ?? []).filter(
    (allocation) => allocation.chargeId === chargeId,
  );
  const amount = chargeAllocations.reduce(
    (total, allocation) => total + allocation.amount,
    0,
  );
  const relatedPayments = chargeAllocations
    .map((allocation) =>
      (record.payments ?? []).find((payment) => payment.id === allocation.paymentId),
    )
    .filter((payment): payment is Payment => Boolean(payment))
    .sort((a, b) =>
      (a.effectivePaymentDate ?? a.paidOn).localeCompare(
        b.effectivePaymentDate ?? b.paidOn,
      ),
    );
  const lastPayment = relatedPayments.at(-1);
  const lastPaymentDate = lastPayment
    ? lastPayment.effectivePaymentDate ?? lastPayment.paidOn
    : "";

  return {
    amount,
    paidDay: lastPayment ? paidOnDay(lastPaymentDate) : 0,
    paidAt: lastPayment ? paidOnToIso(lastPaymentDate) : undefined,
    method: lastPayment?.method,
    reference: lastPayment?.legacyReference ?? lastPayment?.reference,
    description: lastPayment?.observation,
  };
}

function normalizeChargeForSnapshot(
  charge: Charge,
  student: Student,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
): Charge {
  if (charge.snapshot && charge.dueAmount !== undefined && charge.baseAmount !== undefined) {
    return charge;
  }

  const rule = getPaymentRuleForStudent(student, settings, paymentRuleVersions);
  const dueAmount = charge.dueAmount ?? charge.amount;
  const baseAmount = charge.baseAmount ?? charge.snapshot?.originalAmount ?? dueAmount;
  const discountAmount = charge.discountAmount ?? Math.max(0, baseAmount - dueAmount);
  const discountPercent =
    baseAmount > 0 ? roundMoney((discountAmount / baseAmount) * 100) : 0;

  return {
    ...charge,
    amount: dueAmount,
    baseAmount,
    discountAmount,
    dueAmount,
    snapshot: {
      source: "legacy",
      ruleVersionId: charge.ruleVersionId,
      ruleVersion: charge.snapshot?.ruleVersion,
      academicYearId: charge.snapshot?.academicYearId ?? studentAcademicYearId(student, settings),
      educationLevelId: charge.snapshot?.educationLevelId ?? studentEducationLevelId(student),
      originalAmount: baseAmount,
      discountPercent,
      discountAmount,
      dueAmount,
      ruleLabel: charge.snapshot?.ruleLabel ?? snapshotFinanceRuleLabel(discountPercent),
      monthlyDueDay: charge.snapshot?.monthlyDueDay ?? rule.monthlyDueDay,
      firstPenaltyDay: charge.snapshot?.firstPenaltyDay ?? rule.firstPenalty.thresholdDay,
      firstPenaltyPercent:
        charge.snapshot?.firstPenaltyPercent ?? rulePenaltyPercent(rule, settings, "first"),
      secondPenaltyDay: charge.snapshot?.secondPenaltyDay ?? rule.secondPenalty.thresholdDay,
      secondPenaltyPercent:
        charge.snapshot?.secondPenaltyPercent ?? rulePenaltyPercent(rule, settings, "second"),
      publishedAt: charge.snapshot?.publishedAt ?? charge.createdAt,
    },
  };
}

function chargeFromRegistrationComputation(
  student: Student,
  registrationDue: ReturnType<typeof calculateRegistrationDue>,
): Charge {
  return {
    id: registrationChargeId(student.id),
    studentId: student.id,
    category: "registration",
    amount: registrationDue.due,
    baseAmount: registrationDue.baseAmount,
    discountAmount: registrationDue.discount,
    dueAmount: registrationDue.due,
    ruleVersionId: registrationDue.ruleVersionId,
    snapshot: {
      ...registrationDue.snapshot,
      publishedAt: getStudentEnrollmentDate(student),
    },
    description: "Inscrição/Renovação",
    dueOn: registrationDue.dueOn,
    createdAt: getStudentEnrollmentDate(student),
  };
}

function chargeFromMonthlyComputation(
  student: Student,
  month: MonthOption,
  monthlyDue: ReturnType<typeof calculateMonthlyDue>,
): Charge {
  return {
    id: tuitionChargeId(student.id, month.key),
    studentId: student.id,
    category: "tuition",
    amount: monthlyDue.due,
    baseAmount: monthlyDue.baseAmount,
    discountAmount: monthlyDue.discount,
    dueAmount: monthlyDue.due,
    ruleVersionId: monthlyDue.ruleVersionId,
    snapshot: monthlyDue.snapshot,
    description: `Mensalidade de ${month.label}`,
    monthKey: month.key,
    dueOn: monthlyDue.dueOn,
    createdAt: today(),
  };
}

export function ensureCoreCharges(
  record: StudentPaymentRecord,
  student: Student,
  months: MonthOption[],
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  const nextRecord = clonePaymentRecord(record);

  nextRecord.charges = nextRecord.charges.map((charge) =>
    normalizeChargeForSnapshot(charge, student, settings, paymentRuleVersions),
  );

  const chargesById = new Map(nextRecord.charges.map((charge) => [charge.id, charge]));
  const registrationId = registrationChargeId(student.id);

  if (!chargesById.has(registrationId)) {
    nextRecord.charges.push(
      chargeFromRegistrationComputation(
        student,
        calculateRegistrationDue(student, settings, paymentRuleVersions),
      ),
    );
  }

  months.forEach((month) => {
    const monthlyDue = calculateMonthlyDue(student, month, settings, paymentRuleVersions);

    if (!monthlyDue.applicable) {
      return;
    }

    const chargeId = tuitionChargeId(student.id, month.key);

    if (!chargesById.has(chargeId)) {
      nextRecord.charges.push(chargeFromMonthlyComputation(student, month, monthlyDue));
    }
  });

  return nextRecord;
}

export function penaltyChargeId(baseChargeId: string, stage: "first" | "second") {
  return `PEN-${baseChargeId}-${stage.toUpperCase()}`;
}

export function getPenaltyChargesForBase(
  record: StudentPaymentRecord,
  baseChargeId: string,
) {
  const stageOrder: Record<"first" | "second", number> = { first: 1, second: 2 };

  return [...(record.penaltyCharges ?? [])]
    .filter((charge) => charge.baseChargeId === baseChargeId)
    .sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]);
}

export function getPenaltySummaryForCharge(
  record: StudentPaymentRecord,
  baseChargeId: string,
) {
  const penalties = getPenaltyChargesForBase(record, baseChargeId);
  const total = penalties.reduce((sum, charge) => sum + charge.amount, 0);
  const paid = penalties.reduce(
    (sum, charge) => sum + Math.min(charge.amount, allocatedAmountForCharge(record, charge.id)),
    0,
  );
  const balance = Math.max(0, total - paid);
  const stage: PenaltyStage | undefined = penalties.some((charge) => charge.stage === "second")
    ? "second"
    : penalties.some((charge) => charge.stage === "first")
      ? "first"
      : undefined;

  return {
    charges: penalties,
    total: roundMoney(total),
    paid: roundMoney(paid),
    balance: roundMoney(balance),
    stage,
  };
}

function isPenaltyEligibleCharge(charge: Charge) {
  return charge.category === "registration" || charge.category === "tuition";
}

function chargePenaltyConfig(
  charge: Charge,
  student: Student,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[],
  stage: "first" | "second",
) {
  const rule = charge.ruleVersionId
    ? paymentRuleVersions.find((item) => item.id === charge.ruleVersionId) ??
      getPaymentRuleForStudent(student, settings, paymentRuleVersions)
    : getPaymentRuleForStudent(student, settings, paymentRuleVersions);
  const snapshot = charge.snapshot;
  const thresholdDay =
    stage === "first"
      ? snapshot?.firstPenaltyDay ?? rule.firstPenalty.thresholdDay
      : snapshot?.secondPenaltyDay ?? rule.secondPenalty.thresholdDay;
  const percent =
    stage === "first"
      ? snapshot?.firstPenaltyPercent ?? rulePenaltyPercent(rule, settings, "first")
      : snapshot?.secondPenaltyPercent ?? rulePenaltyPercent(rule, settings, "second");

  return {
    thresholdDay,
    percent,
    ruleVersionId: snapshot?.ruleVersionId ?? rule.id,
  };
}

function appendPenaltyChargesForCharge(
  record: StudentPaymentRecord,
  charge: Charge,
  student: Student,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[],
  assessmentDate: string,
) {
  if (!isPenaltyEligibleCharge(charge) || getChargeAmount(charge) <= 0) {
    return;
  }

  if (charge.dueOn && charge.dueOn >= assessmentDate) {
    return;
  }

  const baseBalance = getChargeBalance(record, charge);

  if (baseBalance <= 0) {
    return;
  }

  const assessmentDay =
    charge.category === "tuition" && charge.monthKey
      ? assessmentDayForMonth(charge.monthKey, settings, assessmentDate)
      : paidOnDay(assessmentDate);
  const stages: Array<"first" | "second"> = [];
  const first = chargePenaltyConfig(
    charge,
    student,
    settings,
    paymentRuleVersions,
    "first",
  );
  const second = chargePenaltyConfig(
    charge,
    student,
    settings,
    paymentRuleVersions,
    "second",
  );

  if (assessmentDay > first.thresholdDay) {
    stages.push("first");
  }

  if (assessmentDay > second.thresholdDay) {
    stages.push("second");
  }

  let previousPenaltyTotal = getPenaltyChargesForBase(record, charge.id).reduce(
    (sum, penalty) => sum + penalty.amount,
    0,
  );

  stages.forEach((stage) => {
    const existing = getPenaltyChargesForBase(record, charge.id).some(
      (penalty) => penalty.stage === stage,
    );

    if (existing) {
      return;
    }

    const config = stage === "first" ? first : second;
    const targetTotal = roundMoney(baseBalance * (config.percent / 100));
    const amount = roundMoney(Math.max(0, targetTotal - previousPenaltyTotal));

    if (amount <= 0) {
      return;
    }

    const penalty: PenaltyCharge = {
      id: penaltyChargeId(charge.id, stage),
      studentId: student.id,
      baseChargeId: charge.id,
      stage,
      amount,
      effectiveOn: assessmentDate,
      createdAt: paidOnToIso(assessmentDate),
      snapshot: {
        thresholdDay: config.thresholdDay,
        percent: config.percent,
        baseBalance,
        targetTotal,
        previousPenaltyTotal,
        ruleVersionId: config.ruleVersionId,
      },
    };

    record.penaltyCharges = [...(record.penaltyCharges ?? []), penalty];
    previousPenaltyTotal += amount;
  });
}

export function ensurePenaltyChargesForRecord(
  record: StudentPaymentRecord,
  student: Student,
  months: MonthOption[],
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
  assessmentDate = today(),
) {
  const nextRecord = ensureCoreCharges(
    record,
    student,
    months,
    settings,
    paymentRuleVersions,
  );

  nextRecord.charges.forEach((charge) => {
    appendPenaltyChargesForCharge(
      nextRecord,
      charge,
      student,
      settings,
      paymentRuleVersions,
      assessmentDate,
    );
  });

  return nextRecord;
}
function appendPaymentWithAllocations(
  record: StudentPaymentRecord,
  payment: Payment,
  allocations: Array<Omit<PaymentAllocation, "id">>,
) {
  const nextRecord = clonePaymentRecord(record);
  const existingPayment = nextRecord.payments.some((item) => item.id === payment.id);

  if (!existingPayment) {
    nextRecord.payments.push(payment);
  }

  allocations.forEach((allocation) => {
    const allocationId = nextId(nextRecord.allocations, "ALLOC");

    nextRecord.allocations.push({
      ...allocation,
      id: allocationId,
    });
  });

  return nextRecord;
}

function migrateLegacyPaymentEntry(
  record: StudentPaymentRecord,
  chargeId: string,
  entry: PaymentEntry | undefined,
  paymentId: string,
  fallbackPaidOn: string,
) {
  if (!entry || entry.amount <= 0) {
    return record;
  }

  const paidOn = entry.paidAt?.slice(0, 10) ?? fallbackPaidOn;
  const payment: Payment = {
    id: paymentId,
    studentId: record.studentId,
    amount: entry.amount,
    paidOn,
    effectivePaymentDate: paidOn,
    recordedAt: entry.paidAt ?? paidOnToIso(paidOn),
    recordedBy: "Migração",
    method: entry.method ?? "Registo antigo",
    reference: entry.reference,
    legacyReference: entry.reference,
    observation: entry.description,
  };

  if (record.payments.some((item) => item.id === payment.id)) {
    return record;
  }

  return appendPaymentWithAllocations(record, payment, [
    {
      paymentId: payment.id,
      chargeId,
      amount: entry.amount,
    },
  ]);
}

export function normalizePaymentRecord(
  record: StudentPaymentRecord,
  student: Student,
  months: MonthOption[],
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
  assessmentDate = today(),
) {
  let nextRecord: StudentPaymentRecord = ensureCoreCharges(
    record,
    student,
    months,
    settings,
    paymentRuleVersions,
  );

  if ((nextRecord.payments ?? []).length > 0) {
    return ensurePenaltyChargesForRecord(
      nextRecord,
      student,
      months,
      settings,
      paymentRuleVersions,
      assessmentDate,
    );
  }

  const fallbackPaidOn = getStudentEnrollmentDate(student);

  nextRecord = migrateLegacyPaymentEntry(
    nextRecord,
    registrationChargeId(student.id),
    record.inscriptionRenewal,
    `PAY-MIG-${student.id}-REG`,
    fallbackPaidOn,
  );

  Object.entries(record.monthlyPayments ?? {}).forEach(([monthKey, entry]) => {
    nextRecord = migrateLegacyPaymentEntry(
      nextRecord,
      tuitionChargeId(student.id, monthKey),
      entry,
      `PAY-MIG-${student.id}-TUI-${monthKey.toUpperCase()}`,
      fallbackPaidOn,
    );
  });

  (record.miscellaneousPayments ?? []).forEach((entry, index) => {
    if (entry.amount <= 0) {
      return;
    }

    const chargeId = `CHG-${student.id}-MISC-MIG-${String(index + 1).padStart(3, "0")}`;
    const paidOn = entry.paidAt?.slice(0, 10) ?? fallbackPaidOn;

    if (!nextRecord.charges.some((charge) => charge.id === chargeId)) {
      nextRecord.charges.push({
        id: chargeId,
        studentId: student.id,
        category: "miscellaneous",
        amount: entry.amount,
        baseAmount: entry.amount,
        discountAmount: 0,
        dueAmount: entry.amount,
        description: entry.description ?? "Pagamento diverso",
        createdAt: paidOn,
        snapshot: {
          source: "legacy",
          originalAmount: entry.amount,
          discountPercent: 0,
          discountAmount: 0,
          dueAmount: entry.amount,
          publishedAt: paidOn,
        },
      });
    }

    nextRecord = migrateLegacyPaymentEntry(
      nextRecord,
      chargeId,
      entry,
      `PAY-MIG-${student.id}-MISC-${String(index + 1).padStart(3, "0")}`,
      paidOn,
    );
  });

  return ensurePenaltyChargesForRecord(
    nextRecord,
    student,
    months,
    settings,
    paymentRuleVersions,
    assessmentDate,
  );
}
export function getStudentEnrollmentDate(student: Student) {
  return student.enrollmentDate ?? student.createdAt ?? today();
}

export function getStudentTuitionStartMonth(
  student: Student,
  settings: PaymentSettings,
) {
  return student.tuitionStartMonth ?? settings.startMonth;
}

export function normalizeStudentForPolicy(
  student: Student,
  settings: PaymentSettings,
) {
  return {
    ...student,
    enrollmentDate: getStudentEnrollmentDate(student),
    tuitionStartMonth: getStudentTuitionStartMonth(student, settings),
    registrationStatus: student.registrationStatus ?? "pending",
    financialProfile: normalizeFinanceProfile(student.financialProfile),
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function stableRuleCode(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toUpperCase();
}

function percentFromAmount(amount: number, baseAmount: number) {
  return baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
}

function firstPenaltyPercentForSettings(settings: PaymentSettings) {
  return settings.firstPenaltyPercent ?? percentFromAmount(settings.firstPenaltyAmount, settings.monthlyFee);
}

function secondPenaltyPercentForSettings(settings: PaymentSettings) {
  return (
    settings.secondPenaltyPercent ??
    percentFromAmount(settings.firstPenaltyAmount + settings.secondPenaltyAmount, settings.monthlyFee)
  );
}

export function paymentRuleVersionId(
  academicYearId: string,
  educationLevelId: string,
  version = 1,
) {
  return `RULE-${stableRuleCode(academicYearId)}-${stableRuleCode(educationLevelId)}-V${String(
    version,
  ).padStart(3, "0")}`;
}

export function buildDefaultPaymentRuleVersion(
  settings: PaymentSettings,
  academicYearId: string,
  educationLevelId: string,
  version = 1,
): PaymentRuleVersion {
  return {
    id: paymentRuleVersionId(academicYearId, educationLevelId, version),
    policyId: `POLICY-${stableRuleCode(academicYearId)}-BASE`,
    policyName: `Política geral ${academicYearId}`,
    academicYearId,
    educationLevelId,
    version,
    status: "active",
    inscriptionFee: settings.inscriptionRenewalFee,
    monthlyFee: settings.monthlyFee,
    coveredMonthKeys: getMonthsInRange(settings.startMonth, settings.endMonth).map(
      (month) => month.key,
    ),
    monthlyDueDay: settings.monthlyDueDay ?? settings.firstPenaltyDay,
    firstPenalty: {
      thresholdDay: settings.firstPenaltyDay,
      percent: firstPenaltyPercentForSettings(settings),
      fixedAmount: settings.firstPenaltyAmount,
    },
    secondPenalty: {
      thresholdDay: settings.secondPenaltyDay,
      percent: secondPenaltyPercentForSettings(settings),
      fixedAmount: settings.firstPenaltyAmount + settings.secondPenaltyAmount,
    },
    validFrom: `${academicYearId}-01-01`,
  };
}

function normalizePaymentRuleVersion(
  rule: PaymentRuleVersion & {
    academicYear?: string;
    levelId?: string;
    validFrom?: string;
    effectiveFrom?: string;
  },
): PaymentRuleVersion {
  const academicYearId = rule.academicYearId ?? rule.academicYear ?? initialPaymentSettings.academicYear;
  const educationLevelId = rule.educationLevelId ?? rule.levelId ?? "default";
  const version = Number(rule.version) || 1;

  return {
    ...rule,
    id: rule.id ?? paymentRuleVersionId(academicYearId, educationLevelId, version),
    academicYearId,
    educationLevelId,
    version,
    status: rule.status ?? "active",
    validFrom: rule.validFrom ?? rule.effectiveFrom ?? `${academicYearId}-01-01`,
  };
}

export function buildDefaultPaymentRuleVersions(
  students: Student[],
  classes: SchoolClass[],
  settings: PaymentSettings,
  existingRules: PaymentRuleVersion[] = [],
) {
  const keys = new Set<string>();

  classes.forEach((schoolClass) => {
    keys.add(
      `${schoolClass.academicYearId ?? schoolClass.academicYear ?? settings.academicYear}:${
        schoolClass.educationLevelId ?? schoolClass.id
      }`,
    );
  });
  students.forEach((student) => {
    keys.add(`${studentAcademicYearId(student, settings)}:${studentEducationLevelId(student)}`);
  });

  if (keys.size === 0) {
    keys.add(`${settings.academicYear}:default`);
  }

  const normalizedExistingRules = existingRules.map(normalizePaymentRuleVersion);
  const rules = [...normalizedExistingRules];
  const hasActiveRule = new Set(
    normalizedExistingRules
      .filter((rule) => rule.status === "active")
      .map((rule) => `${rule.academicYearId}:${rule.educationLevelId}`),
  );

  [...keys].sort().forEach((key) => {
    if (hasActiveRule.has(key)) {
      return;
    }

    const [academicYearId, educationLevelId] = key.split(":");
    const nextVersion =
      Math.max(
        0,
        ...normalizedExistingRules
          .filter(
            (rule) =>
              rule.academicYearId === academicYearId &&
              rule.educationLevelId === educationLevelId,
          )
          .map((rule) => rule.version),
      ) + 1;

    rules.push(
      buildDefaultPaymentRuleVersion(
        settings,
        academicYearId,
        educationLevelId,
        nextVersion,
      ),
    );
  });

  return rules.sort(
    (a, b) =>
      a.academicYearId.localeCompare(b.academicYearId) ||
      a.educationLevelId.localeCompare(b.educationLevelId) ||
      a.version - b.version,
  );
}

function safeDay(value: string, fallback: number) {
  return Math.max(1, Math.min(31, Number(value) || fallback));
}

function normalizedCoveredMonthKeys(monthKeys: string[]) {
  const selected = new Set(monthKeys);
  const ordered = monthOptions
    .filter((month) => selected.has(month.key))
    .map((month) => month.key);

  return ordered.length > 0 ? ordered : monthOptions.map((month) => month.key);
}

function previousDay(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

export function buildPaymentRuleDraft(
  rule: PaymentRuleVersion,
  rules: PaymentRuleVersion[] = [rule],
): PaymentRuleDraft {
  const policyId = rule.policyId ?? rule.id;
  const relatedRules = rule.policyId
    ? rules.filter((item) => item.policyId === rule.policyId)
    : [rule];

  return {
    ruleId: rule.id,
    policyId,
    policyName: rule.policyName ?? `Política ${rule.educationLevelId}`,
    academicYearId: rule.academicYearId,
    educationLevelId: rule.educationLevelId,
    educationLevelIds: Array.from(
      new Set(relatedRules.map((item) => item.educationLevelId)),
    ),
    status: rule.status,
    validFrom: today(),
    inscriptionFee: String(rule.inscriptionFee),
    monthlyFee: String(rule.monthlyFee),
    monthlyDueDay: String(rule.monthlyDueDay),
    firstPenaltyDay: String(rule.firstPenalty.thresholdDay),
    firstPenaltyPercent: String(
      rule.firstPenalty.percent ??
        percentFromAmount(rule.firstPenalty.fixedAmount ?? 0, rule.monthlyFee),
    ),
    secondPenaltyDay: String(rule.secondPenalty.thresholdDay),
    secondPenaltyPercent: String(
      rule.secondPenalty.percent ??
        percentFromAmount(rule.secondPenalty.fixedAmount ?? 0, rule.monthlyFee),
    ),
    coveredMonthKeys: [...rule.coveredMonthKeys],
  };
}

export function createNextPaymentRuleVersion(
  rules: PaymentRuleVersion[],
  draft: PaymentRuleDraft,
  changedAt = today(),
) {
  const academicYearId = draft.academicYearId.trim() || currentAcademicYear();
  const educationLevelId = draft.educationLevelId.trim() || "default";
  const validFrom = draft.validFrom || changedAt;
  const previousRules = rules.filter(
    (rule) =>
      rule.academicYearId === academicYearId &&
      rule.educationLevelId === educationLevelId,
  );
  const previousActive = previousRules
    .filter((rule) => rule.status === "active")
    .sort((a, b) => b.version - a.version || b.validFrom.localeCompare(a.validFrom))[0];
  const nextVersion = Math.max(0, ...previousRules.map((rule) => rule.version)) + 1;
  const monthlyFee = parseMoney(draft.monthlyFee);
  const firstPenaltyPercent = Math.max(0, Number(draft.firstPenaltyPercent) || 0);
  const secondPenaltyPercent = Math.max(
    firstPenaltyPercent,
    Number(draft.secondPenaltyPercent) || firstPenaltyPercent,
  );
  const nextRule: PaymentRuleVersion = {
    id: paymentRuleVersionId(academicYearId, educationLevelId, nextVersion),
    policyId: draft.policyId || undefined,
    policyName: draft.policyName.trim() || undefined,
    academicYearId,
    educationLevelId,
    version: nextVersion,
    status: draft.status,
    inscriptionFee: parseMoney(draft.inscriptionFee),
    monthlyFee,
    coveredMonthKeys: normalizedCoveredMonthKeys(draft.coveredMonthKeys),
    monthlyDueDay: safeDay(draft.monthlyDueDay, previousActive?.monthlyDueDay ?? 10),
    firstPenalty: {
      thresholdDay: safeDay(
        draft.firstPenaltyDay,
        previousActive?.firstPenalty.thresholdDay ?? 10,
      ),
      percent: firstPenaltyPercent,
      fixedAmount: roundMoney(monthlyFee * (firstPenaltyPercent / 100)),
    },
    secondPenalty: {
      thresholdDay: safeDay(
        draft.secondPenaltyDay,
        previousActive?.secondPenalty.thresholdDay ?? 20,
      ),
      percent: secondPenaltyPercent,
      fixedAmount: roundMoney(monthlyFee * (secondPenaltyPercent / 100)),
    },
    validFrom,
  };

  return [
    ...rules.map((rule) =>
      rule.academicYearId === academicYearId &&
      rule.educationLevelId === educationLevelId &&
      draft.status === "active" && rule.status === "active"
        ? {
            ...rule,
            status: "inactive" as const,
            validUntil: previousDay(validFrom),
          }
        : rule,
    ),
    nextRule,
  ].sort(
    (a, b) =>
      a.academicYearId.localeCompare(b.academicYearId) ||
      a.educationLevelId.localeCompare(b.educationLevelId) ||
      a.version - b.version,
  );
}

export function createPaymentPolicyVersions(
  rules: PaymentRuleVersion[],
  draft: PaymentRuleDraft,
  changedAt = today(),
) {
  const academicYearId = draft.academicYearId.trim() || currentAcademicYear();
  const educationLevelIds = Array.from(
    new Set(
      (draft.educationLevelIds.length > 0
        ? draft.educationLevelIds
        : [draft.educationLevelId]
      ).filter(Boolean),
    ),
  );
  const policyName = draft.policyName.trim();
  const policyBaseId = `POLICY-${stableRuleCode(academicYearId)}-${stableRuleCode(
    policyName,
  )}`;
  const existingPolicyIds = new Set(
    rules.map((rule) => rule.policyId).filter((id): id is string => Boolean(id)),
  );
  let nextPolicyId = policyBaseId;
  let suffix = 2;

  while (existingPolicyIds.has(nextPolicyId)) {
    nextPolicyId = `${policyBaseId}-${suffix}`;
    suffix += 1;
  }

  const policyId = draft.policyId || nextPolicyId;
  const selectedLevels = new Set(educationLevelIds);
  const preparedRules = rules.map((rule) =>
    draft.policyId &&
    rule.policyId === draft.policyId &&
    rule.academicYearId === academicYearId &&
    rule.status === "active" &&
    (draft.status === "inactive" || !selectedLevels.has(rule.educationLevelId))
      ? {
          ...rule,
          status: "inactive" as const,
          validUntil: previousDay(draft.validFrom || changedAt),
        }
      : rule,
  );

  return educationLevelIds.reduce(
    (nextRules, educationLevelId) =>
      createNextPaymentRuleVersion(
        nextRules,
        {
          ...draft,
          academicYearId,
          educationLevelId,
          policyId,
          policyName,
        },
        changedAt,
      ),
    preparedRules,
  );
}
export function getPaymentRuleForStudent(
  student: Student,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  const academicYearId = studentAcademicYearId(student, settings);
  const educationLevelId = studentEducationLevelId(student);
  const activeRule = paymentRuleVersions
    .filter(
      (rule) =>
        rule.status === "active" &&
        rule.academicYearId === academicYearId &&
        rule.educationLevelId === educationLevelId,
    )
    .sort(
      (a, b) =>
        b.version - a.version || b.validFrom.localeCompare(a.validFrom),
    )[0];

  return activeRule ?? buildDefaultPaymentRuleVersion(settings, academicYearId, educationLevelId);
}

function ruleMonthKeys(rule: PaymentRuleVersion, settings: PaymentSettings) {
  return rule.coveredMonthKeys.length > 0
    ? rule.coveredMonthKeys
    : getMonthsInRange(settings.startMonth, settings.endMonth).map((month) => month.key);
}

function rulePenaltyPercent(
  rule: PaymentRuleVersion,
  settings: PaymentSettings,
  stage: "first" | "second",
) {
  const band = stage === "first" ? rule.firstPenalty : rule.secondPenalty;
  const legacyAmount =
    stage === "first"
      ? settings.firstPenaltyAmount
      : settings.firstPenaltyAmount + settings.secondPenaltyAmount;

  return band.percent ?? percentFromAmount(band.fixedAmount ?? legacyAmount, rule.monthlyFee);
}

function snapshotFinanceRuleLabel(discountPercent: number) {
  if (discountPercent >= 100) {
    return "Bolsa integral";
  }

  if (discountPercent > 0) {
    return `Ponderacao ${discountPercent}%`;
  }

  return "Regular";
}
function financeRuleLabel(profile: StudentFinancialProfile, discountPercent: number) {
  if (discountPercent <= 0 || profile.status === "regular") {
    return "Regular";
  }

  if (profile.status === "scholarship" && discountPercent >= 100) {
    return "Bolsa integral";
  }

  if (profile.status === "exception" && discountPercent >= 100) {
    return "Isencao temporaria";
  }

  return `Ponderacao ${discountPercent}%`;
}

function tuitionDiscountPercent(
  student: Student,
  monthKey: string,
  settings: PaymentSettings,
) {
  const profile = normalizeFinanceProfile(student.financialProfile);
  const inRange = isMonthInRange(
    monthKey,
    profile.startMonth ?? settings.startMonth,
    profile.endMonth ?? settings.endMonth,
  );

  return inRange ? financeRuleDiscountPercent(profile.status, profile.discountPercent) : 0;
}

function registrationDiscountPercent(student: Student) {
  const profile = normalizeFinanceProfile(student.financialProfile);

  return financeRuleDiscountPercent(profile.status, profile.discountPercent);
}

function paymentRuleSnapshot(
  rule: PaymentRuleVersion,
  settings: PaymentSettings,
  baseAmount: number,
  discountPercent: number,
  discountAmount: number,
  dueAmount: number,
  ruleLabel: string,
) {
  return {
    source: "rule-version" as const,
    ruleVersionId: rule.id,
    ruleVersion: rule.version,
    academicYearId: rule.academicYearId,
    educationLevelId: rule.educationLevelId,
    originalAmount: baseAmount,
    discountPercent,
    discountAmount,
    dueAmount,
    ruleLabel,
    monthlyDueDay: rule.monthlyDueDay,
    firstPenaltyDay: rule.firstPenalty.thresholdDay,
    firstPenaltyPercent: rulePenaltyPercent(rule, settings, "first"),
    secondPenaltyDay: rule.secondPenalty.thresholdDay,
    secondPenaltyPercent: rulePenaltyPercent(rule, settings, "second"),
    publishedAt: today(),
  };
}

export function calculateRegistrationDue(
  student: Student,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  const rule = getPaymentRuleForStudent(student, settings, paymentRuleVersions);
  const profile = normalizeFinanceProfile(student.financialProfile);
  const baseAmount = rule.inscriptionFee;
  const discountPercent = registrationDiscountPercent(student);
  const discount = Math.round((baseAmount * discountPercent) / 100);
  const due = Math.max(0, baseAmount - discount);

  return {
    due,
    discount,
    baseAmount,
    discountPercent,
    ruleLabel: financeRuleLabel(profile, discountPercent),
    applicable: true,
    dueOn: rule.inscriptionDueOn ?? getStudentEnrollmentDate(student),
    ruleVersionId: rule.id,
    snapshot: paymentRuleSnapshot(
      rule,
      settings,
      baseAmount,
      discountPercent,
      discount,
      due,
      financeRuleLabel(profile, discountPercent),
    ),
  };
}

export function isTuitionMonthApplicable(
  student: Student,
  monthKey: string,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  if (student.enrollmentStatus === "cancelled") return false;
  if (student.billingMonths && !student.billingMonths.includes(monthKey)) return false;
  if (student.tuitionEndMonth && monthIndex(monthKey) > monthIndex(student.tuitionEndMonth)) return false;
  const rule = getPaymentRuleForStudent(student, settings, paymentRuleVersions);
  const months = ruleMonthKeys(rule, settings);
  const currentIndex = months.findIndex((item) => item === monthKey);
  const startIndex = months.findIndex(
    (item) => item === getStudentTuitionStartMonth(student, settings),
  );

  if (currentIndex < 0) {
    return false;
  }

  if (startIndex < 0) {
    return true;
  }

  return currentIndex >= startIndex;
}

export function calculateMonthlyDue(
  student: Student,
  month: MonthOption,
  settings: PaymentSettings,
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  const rule = getPaymentRuleForStudent(student, settings, paymentRuleVersions);

  if (!isTuitionMonthApplicable(student, month.key, settings, paymentRuleVersions)) {
    return {
      due: 0,
      discount: 0,
      baseAmount: 0,
      discountPercent: 0,
      ruleLabel: "Não aplicável",
      applicable: false,
      dueOn: undefined,
      ruleVersionId: rule.id,
      snapshot: paymentRuleSnapshot(rule, settings, 0, 0, 0, 0, "Não aplicável"),
    };
  }

  const profile = normalizeFinanceProfile(student.financialProfile);
  const baseAmount = rule.monthlyFee;
  const discountPercent = tuitionDiscountPercent(student, month.key, settings);
  const discount = Math.round((baseAmount * discountPercent) / 100);
  const due = Math.max(0, baseAmount - discount);
  const dueOn = dateForAcademicMonth(
    month.key,
    rule.monthlyDueDay,
    { ...settings, academicYear: rule.academicYearId },
  );

  return {
    due,
    discount,
    baseAmount,
    discountPercent,
    ruleLabel: financeRuleLabel(profile, discountPercent),
    applicable: true,
    dueOn,
    ruleVersionId: rule.id,
    snapshot: paymentRuleSnapshot(
      rule,
      settings,
      baseAmount,
      discountPercent,
      discount,
      due,
      financeRuleLabel(profile, discountPercent),
    ),
  };
}
export function calculateFine(
  entry: PaymentEntry,
  settings: PaymentSettings,
  dueAmount: number,
  assessmentDay = paidOnDay(today()),
) {
  if (dueAmount <= 0) {
    return 0;
  }

  const balance = Math.max(0, dueAmount - entry.amount);
  const effectiveDay =
    balance > 0
      ? assessmentDay
      : entry.paidDay > 0
        ? entry.paidDay
        : assessmentDay;

  if (effectiveDay <= settings.firstPenaltyDay) {
    return 0;
  }

  const percent =
    effectiveDay > settings.secondPenaltyDay
      ? secondPenaltyPercentForSettings(settings)
      : firstPenaltyPercentForSettings(settings);

  return roundMoney((balance > 0 ? balance : dueAmount) * (percent / 100));
}

export function addMonthlyPayment(
  record: StudentPaymentRecord,
  monthKey: string,
  amount: number,
  paymentDetails: PaymentDetails,
) {
  if (amount <= 0) {
    return;
  }

  const currentEntry = record.monthlyPayments[monthKey] ?? emptyEntry();

  record.monthlyPayments[monthKey] = {
    ...currentEntry,
    amount: currentEntry.amount + amount,
    ...paymentDetails,
  };
}

export function advancePaymentDetails(
  paymentDetails: PaymentDetails,
  settings: PaymentSettings,
) {
  return {
    ...paymentDetails,
    paidDay: Math.max(1, Math.min(paymentDetails.paidDay, settings.firstPenaltyDay)),
  };
}

export function distributeMonthlyPayment(
  record: StudentPaymentRecord,
  student: Student,
  startMonthKey: string,
  amount: number,
  months: MonthOption[],
  settings: PaymentSettings,
  paymentDetails: PaymentDetails,
) {
  const startIndex = months.findIndex((month) => month.key === startMonthKey);

  if (startIndex < 0 || months.length === 0) {
    addMonthlyPayment(record, startMonthKey, amount, paymentDetails);
    return;
  }

  let remaining = amount;
  let lastMonthKey = months[startIndex].key;
  const futurePaymentDetails = advancePaymentDetails(paymentDetails, settings);

  for (let index = startIndex; index < months.length && remaining > 0; index += 1) {
    const month = months[index];
    const ledger = buildLedger(student, record, months, settings);
    const monthLedger = ledger.monthly.find((item) => item.month.key === month.key);
    const balance = monthLedger?.balance ?? 0;

    lastMonthKey = month.key;

    if (balance <= 0) {
      continue;
    }

    const amountForMonth = Math.min(remaining, balance);

    addMonthlyPayment(
      record,
      month.key,
      amountForMonth,
      index === startIndex ? paymentDetails : futurePaymentDetails,
    );
    remaining -= amountForMonth;
  }

  if (remaining > 0) {
    addMonthlyPayment(
      record,
      lastMonthKey,
      remaining,
      lastMonthKey === startMonthKey ? paymentDetails : futurePaymentDetails,
    );
  }
}

export type RecordStudentPaymentInput = {
  record: StudentPaymentRecord;
  student: Student;
  months: MonthOption[];
  settings: PaymentSettings;
  paymentRuleVersions?: PaymentRuleVersion[];
  category: PaymentCategory;
  monthKey: string;
  targetChargeId?: string;
  amount: number;
  paidOn: string;
  effectivePaymentDate?: string;
  recordedAt: string;
  recordedBy?: string;
  method: string;
  reference?: string;
  description: string;
  allowFutureAllocation?: boolean;
};

type AllocationTarget = Charge | PenaltyCharge;

function chargeDueOn(charge: Charge | PenaltyCharge) {
  return "baseChargeId" in charge ? charge.effectiveOn : charge.dueOn ?? charge.createdAt;
}

function isChargeFuture(charge: Charge, assessmentDate: string) {
  const dueOn = chargeDueOn(charge);

  return Boolean(dueOn && dueOn > assessmentDate);
}

function isChargeOverdue(charge: Charge, assessmentDate: string) {
  const dueOn = chargeDueOn(charge);

  return Boolean(dueOn && dueOn < assessmentDate);
}

function chargesFromMonth(
  record: StudentPaymentRecord,
  student: Student,
  months: MonthOption[],
  startMonthKey: string,
) {
  const startIndex = months.findIndex((month) => month.key === startMonthKey);
  const effectiveStartIndex = startIndex >= 0 ? startIndex : 0;

  return months
    .slice(effectiveStartIndex)
    .map((month) =>
      record.charges.find(
        (charge) =>
          charge.category === "tuition" &&
          charge.studentId === student.id &&
          charge.monthKey === month.key,
      ),
    )
    .filter((charge): charge is Charge => Boolean(charge));
}

function paymentAllocationTargets({
  record,
  student,
  months,
  settings,
  category,
  monthKey,
  targetChargeId,
  allowFutureAllocation,
  assessmentDate,
}: {
  record: StudentPaymentRecord;
  student: Student;
  months: MonthOption[];
  settings: PaymentSettings;
  category: PaymentCategory;
  monthKey: string;
  targetChargeId?: string;
  allowFutureAllocation: boolean;
  assessmentDate: string;
}) {
  const targets: AllocationTarget[] = [];
  const targetIds = new Set<string>();
  const addTarget = (target: AllocationTarget | undefined) => {
    if (!target || targetIds.has(target.id) || getChargeBalance(record, target) <= 0) {
      return;
    }

    targets.push(target);
    targetIds.add(target.id);
  };
  const addBaseChargeWithPenalty = (charge: Charge | undefined) => {
    if (!charge) {
      return;
    }

    addTarget(charge);
    getPenaltyChargesForBase(record, charge.id).forEach(addTarget);
  };
  const selectedCharge =
    category === "registration"
      ? record.charges.find((charge) => charge.id === registrationChargeId(student.id))
      : category === "tuition"
        ? record.charges.find(
            (charge) =>
              charge.category === "tuition" &&
              charge.studentId === student.id &&
              charge.monthKey === monthKey,
          )
        : targetChargeId
          ? record.charges.find(
              (charge) =>
                charge.id === targetChargeId &&
                charge.studentId === student.id &&
                charge.category === "miscellaneous",
            )
          : undefined;

  if (
    selectedCharge &&
    (selectedCharge.category === "miscellaneous" ||
      !isChargeFuture(selectedCharge, assessmentDate) ||
      allowFutureAllocation)
  ) {
    addBaseChargeWithPenalty(selectedCharge);
  }

  const overdueCharges = record.charges
    .filter(
      (charge) =>
        charge.studentId === student.id &&
        !targetIds.has(charge.id) &&
        isChargeOverdue(charge, assessmentDate) &&
        (getChargeBalance(record, charge) > 0 ||
          getPenaltySummaryForCharge(record, charge.id).balance > 0),
    )
    .sort((a, b) => chargeDueOn(a).localeCompare(chargeDueOn(b)));

  overdueCharges.forEach(addBaseChargeWithPenalty);

  if (allowFutureAllocation) {
    chargesFromMonth(
      record,
      student,
      months,
      category === "tuition" ? monthKey : getStudentTuitionStartMonth(student, settings),
    )
      .filter(
        (charge) =>
          !targetIds.has(charge.id) &&
          getChargeBalance(record, charge) > 0 &&
          isChargeFuture(charge, assessmentDate),
      )
      .sort((a, b) => chargeDueOn(a).localeCompare(chargeDueOn(b)))
      .forEach(addBaseChargeWithPenalty);
  }

  return targets;
}

function createMiscellaneousCharge(
  record: StudentPaymentRecord,
  student: Student,
  amount: number,
  description: string,
  recordedAt: string,
): Charge {
  return {
    id: nextId(record.charges, `CHG-${student.id}-MISC`),
    studentId: student.id,
    category: "miscellaneous",
    amount,
    baseAmount: amount,
    discountAmount: 0,
    dueAmount: amount,
    description: description || "Pagamento diverso",
    createdAt: recordedAt,
    snapshot: {
      source: "legacy",
      originalAmount: amount,
      discountPercent: 0,
      discountAmount: 0,
      dueAmount: amount,
      publishedAt: recordedAt,
    },
  };
}

function paymentTargetLabel(
  record: StudentPaymentRecord,
  charge: Charge | PenaltyCharge,
): string {
  if ("baseChargeId" in charge) {
    const baseCharge = record.charges.find((item) => item.id === charge.baseChargeId);
    const baseLabel: string = baseCharge ? paymentTargetLabel(record, baseCharge) : "Rubrica";

    return `${baseLabel} - multa ${charge.stage === "first" ? "1a" : "2a"}`;
  }

  if (charge.category === "registration") {
    return "Inscricao/Renovacao";
  }

  if (charge.category === "tuition") {
    return `Mensalidade de ${monthLabel(charge.monthKey ?? "")}`;
  }

  return charge.description || "Pagamento diverso";
}

export function previewStudentPayment({
  record,
  student,
  months,
  settings,
  paymentRuleVersions = [],
  category,
  monthKey,
  targetChargeId,
  amount,
  paidOn,
  effectivePaymentDate,
  recordedAt,
  recordedBy,
  method,
  reference,
  description,
  allowFutureAllocation = false,
}: RecordStudentPaymentInput): PaymentPreview {
  const officialEffectivePaymentDate = effectivePaymentDate ?? paidOn;
  let nextRecord = normalizePaymentRecord(
    record,
    student,
    months,
    settings,
    paymentRuleVersions,
    officialEffectivePaymentDate,
  );
  const normalizedAmount = roundMoney(Math.max(0, amount));
  const legacyReference = reference?.trim() || undefined;
  const payment: Payment = {
    id: nextId(nextRecord.payments, "PAY"),
    studentId: student.id,
    amount: normalizedAmount,
    paidOn: officialEffectivePaymentDate,
    effectivePaymentDate: officialEffectivePaymentDate,
    recordedAt,
    recordedBy: recordedBy ?? "Secretaria",
    method,
    legacyReference,
    observation: description || undefined,
  };

  if (legacyReference) {
    payment.reference = legacyReference;
  }

  if (category === "miscellaneous" && !targetChargeId) {
    const charge = createMiscellaneousCharge(
      nextRecord,
      student,
      normalizedAmount,
      description,
      recordedAt,
    );

    nextRecord = {
      ...nextRecord,
      charges: [charge, ...nextRecord.charges],
    };
    targetChargeId = charge.id;
  }

  const targetCharges = paymentAllocationTargets({
    record: nextRecord,
    student,
    months,
    settings,
    category,
    monthKey,
    targetChargeId,
    allowFutureAllocation,
    assessmentDate: officialEffectivePaymentDate,
  });
  let remaining = normalizedAmount;
  const allocations: Array<Omit<PaymentAllocation, "id">> = [];
  const items: PaymentAllocationPreviewItem[] = [];

  targetCharges.forEach((charge) => {
    if (remaining <= 0) {
      return;
    }

    const balanceBefore = getChargeBalance(nextRecord, charge);
    const amountForCharge = Math.min(remaining, balanceBefore);

    if (amountForCharge <= 0) {
      return;
    }

    allocations.push({
      paymentId: payment.id,
      chargeId: charge.id,
      amount: amountForCharge,
    });
    items.push({
      chargeId: charge.id,
      label: paymentTargetLabel(nextRecord, charge),
      kind: "baseChargeId" in charge ? "penalty" : "base",
      amount: amountForCharge,
      balanceBefore,
      balanceAfter: Math.max(0, balanceBefore - amountForCharge),
      dueOn: chargeDueOn(charge),
      penaltyStage: "baseChargeId" in charge ? charge.stage : undefined,
    });
    remaining = roundMoney(remaining - amountForCharge);
  });

  const totalAllocated = roundMoney(
    allocations.reduce((total, allocation) => total + allocation.amount, 0),
  );

  return {
    normalizedRecord: nextRecord,
    payment,
    allocations,
    items,
    totalAllocated,
    unallocatedAmount: roundMoney(normalizedAmount - totalAllocated),
    baseTotal: roundMoney(
      items
        .filter((item) => item.kind === "base")
        .reduce((total, item) => total + item.amount, 0),
    ),
    penaltyTotal: roundMoney(
      items
        .filter((item) => item.kind === "penalty")
        .reduce((total, item) => total + item.amount, 0),
    ),
  };
}

export function applyStudentPaymentPreview(preview: PaymentPreview) {
  return appendPaymentWithAllocations(
    preview.normalizedRecord,
    preview.payment,
    preview.allocations,
  );
}

export function buildPaymentReceipt(
  student: Student,
  preview: PaymentPreview,
): PaymentReceipt {
  return {
    id: `REC-${preview.payment.id}`,
    studentId: student.id,
    studentName: student.fullName,
    registrationNumber: student.registrationNumber,
    paymentId: preview.payment.id,
    amount: preview.payment.amount,
    effectivePaymentDate: preview.payment.effectivePaymentDate ?? preview.payment.paidOn,
    recordedAt: preview.payment.recordedAt,
    recordedBy: preview.payment.recordedBy ?? "Secretaria",
    method: preview.payment.method,
    items: preview.items,
    penaltyTotal: preview.penaltyTotal,
    unallocatedAmount: preview.unallocatedAmount,
  };
}
export function buildPaymentReceiptFromRecord(
  student: Student,
  record: StudentPaymentRecord,
  paymentId: string,
): PaymentReceipt | undefined {
  const payment = record.payments.find((item) => item.id === paymentId);

  if (!payment) {
    return undefined;
  }

  const items = record.allocations
    .filter((allocation) => allocation.paymentId === payment.id)
    .map((allocation): PaymentAllocationPreviewItem | undefined => {
      const charge =
        record.charges.find((item) => item.id === allocation.chargeId) ??
        record.penaltyCharges?.find((item) => item.id === allocation.chargeId);

      if (!charge) {
        return undefined;
      }

      const balanceAfter = getChargeBalance(record, charge);

      return {
        chargeId: charge.id,
        label: paymentTargetLabel(record, charge),
        kind: "baseChargeId" in charge ? "penalty" : "base",
        amount: allocation.amount,
        balanceBefore: roundMoney(balanceAfter + allocation.amount),
        balanceAfter,
        dueOn: chargeDueOn(charge),
        penaltyStage: "baseChargeId" in charge ? charge.stage : undefined,
      };
    })
    .filter((item): item is PaymentAllocationPreviewItem => Boolean(item));
  const totalAllocated = roundMoney(
    items.reduce((total, item) => total + item.amount, 0),
  );

  return {
    id: `REC-${payment.id}`,
    studentId: student.id,
    studentName: student.fullName,
    registrationNumber: student.registrationNumber,
    paymentId: payment.id,
    amount: payment.amount,
    effectivePaymentDate: payment.effectivePaymentDate ?? payment.paidOn,
    recordedAt: payment.recordedAt,
    recordedBy: payment.recordedBy ?? "Secretaria",
    method: payment.method,
    items,
    penaltyTotal: roundMoney(
      items
        .filter((item) => item.kind === "penalty")
        .reduce((total, item) => total + item.amount, 0),
    ),
    unallocatedAmount: roundMoney(payment.amount - totalAllocated),
  };
}

export function correctStudentPayment({
  record,
  student,
  paymentId,
  amount,
  reason,
  recordedAt,
  recordedBy,
}: {
  record: StudentPaymentRecord;
  student: Student;
  paymentId: string;
  amount?: number;
  reason: string;
  recordedAt: string;
  recordedBy?: string;
}): PaymentCorrectionResult {
  const nextRecord = clonePaymentRecord(record);
  const payment = nextRecord.payments.find((item) => item.id === paymentId);
  const correctionReason = reason.trim();

  if (!payment || !correctionReason) {
    return { record: nextRecord, payment };
  }

  const allocatedAmount = nextRecord.allocations
    .filter((allocation) => allocation.paymentId === payment.id)
    .reduce((total, allocation) => total + allocation.amount, 0);
  const correctableAmount = allocatedAmount > 0 ? allocatedAmount : payment.amount;
  const correctionAmount = roundMoney(
    Math.min(Math.max(0, amount ?? correctableAmount), correctableAmount),
  );

  if (correctionAmount <= 0) {
    return { record: nextRecord, payment };
  }

  const correctionId = nextId(nextRecord.corrections ?? [], "CORR");
  const charge: Charge = {
    id: nextId(nextRecord.charges, `CHG-${student.id}-CORR`),
    studentId: student.id,
    category: "miscellaneous",
    amount: correctionAmount,
    baseAmount: correctionAmount,
    discountAmount: 0,
    dueAmount: correctionAmount,
    description: `Correcao de ${payment.id}: ${correctionReason}`,
    dueOn: recordedAt.slice(0, 10),
    createdAt: recordedAt,
    snapshot: {
      source: "legacy",
      originalAmount: correctionAmount,
      discountPercent: 0,
      discountAmount: 0,
      dueAmount: correctionAmount,
      ruleLabel: "Correcao auditavel",
      publishedAt: recordedAt,
    },
  };
  const correction: PaymentCorrection = {
    id: correctionId,
    paymentId: payment.id,
    studentId: student.id,
    reason: correctionReason,
    amount: correctionAmount,
    recordedAt,
    recordedBy: recordedBy ?? "Secretaria",
    linkedChargeId: charge.id,
  };

  return {
    record: {
      ...nextRecord,
      charges: [charge, ...nextRecord.charges],
      corrections: [correction, ...(nextRecord.corrections ?? [])],
    },
    correction,
    charge,
    payment,
  };
}
export function recordStudentPayment(input: RecordStudentPaymentInput) {
  return applyStudentPaymentPreview(previewStudentPayment(input));
}
function highestPenaltyStage(stage?: "first" | "second") {
  return stage;
}

function resolveOfficialPaymentState({
  applicable,
  due,
  paid,
  balance,
  dueOn,
  penaltyBalance,
  penaltyStage,
  penaltyTotal,
  ruleLabel,
  assessmentDate,
}: {
  applicable: boolean;
  due: number;
  paid: number;
  balance: number;
  dueOn?: string;
  penaltyBalance: number;
  penaltyStage?: "first" | "second";
  penaltyTotal: number;
  ruleLabel: string;
  assessmentDate: string;
}): OfficialPaymentState {
  const isScholarship = ruleLabel.toLocaleLowerCase("pt-PT").includes("bolsa");

  if (isScholarship && due <= 0) {
    return "scholarship";
  }

  if (!applicable) {
    return "not-applicable";
  }

  if (balance <= 0 && penaltyBalance <= 0) {
    return penaltyTotal > 0 ? "paid-with-fine" : "paid";
  }

  if (balance <= 0 && penaltyBalance > 0) {
    return "fine-due";
  }

  if (penaltyBalance > 0) {
    return highestPenaltyStage(penaltyStage) === "second" ? "second-fine" : "first-fine";
  }

  if (paid > 0) {
    return "partial";
  }

  if (dueOn && dueOn > assessmentDate) {
    return "future";
  }

  if (dueOn && dueOn < assessmentDate) {
    return "overdue";
  }

  return "pending";
}

function addDebtTiming(
  timing: { overdueDebt: number; futureDue: number },
  balance: number,
  dueOn: string | undefined,
  assessmentDate: string,
) {
  if (balance <= 0) {
    return;
  }

  if (dueOn && dueOn > assessmentDate) {
    timing.futureDue += balance;
    return;
  }

  if (!dueOn || dueOn < assessmentDate) {
    timing.overdueDebt += balance;
  }
}

export function buildLedger(
  student: Student,
  record: StudentPaymentRecord,
  months: MonthOption[],
  settings: PaymentSettings,
  assessmentDate = today(),
  paymentRuleVersions: PaymentRuleVersion[] = [],
) {
  const normalizedRecord = normalizePaymentRecord(
    record,
    student,
    months,
    settings,
    paymentRuleVersions,
    assessmentDate,
  );
  const registrationDue = calculateRegistrationDue(
    student,
    settings,
    paymentRuleVersions,
  );
  const registrationCharge =
    normalizedRecord.charges.find(
      (charge) => charge.id === registrationChargeId(student.id),
    ) ?? chargeFromRegistrationComputation(student, registrationDue);
  const registrationEntry = getChargePaymentEntry(
    normalizedRecord,
    registrationCharge.id,
  );
  const totalReceived = normalizedRecord.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const totalAllocated = normalizedRecord.allocations.reduce(
    (total, allocation) => total + allocation.amount,
    0,
  );
  const miscellaneousPaid = normalizedRecord.allocations.reduce((total, allocation) => {
    const charge = normalizedRecord.charges.find(
      (item) => item.id === allocation.chargeId,
    );

    return charge?.category === "miscellaneous" ? total + allocation.amount : total;
  }, 0);
  const registrationAmount = getChargeAmount(registrationCharge);
  const registrationPaid = Math.min(registrationAmount, registrationEntry.amount);
  const registrationBalance = getChargeBalance(normalizedRecord, registrationCharge);
  const registrationPenalty = getPenaltySummaryForCharge(
    normalizedRecord,
    registrationCharge.id,
  );
  const registrationFine = registrationPenalty.balance;
  const registrationRuleLabel = registrationCharge.snapshot
    ? registrationCharge.snapshot.ruleLabel ??
      snapshotFinanceRuleLabel(registrationCharge.snapshot.discountPercent)
    : registrationDue.ruleLabel;
  const registrationState = resolveOfficialPaymentState({
    applicable: registrationDue.applicable,
    due: registrationAmount,
    paid: registrationPaid,
    balance: registrationBalance,
    dueOn: registrationCharge.dueOn,
    penaltyBalance: registrationPenalty.balance,
    penaltyStage: registrationPenalty.stage,
    penaltyTotal: registrationPenalty.total,
    ruleLabel: registrationRuleLabel,
    assessmentDate,
  });
  const timing = { overdueDebt: 0, futureDue: 0 };
  let totalBalance = registrationBalance;
  let totalFine = registrationFine;

  addDebtTiming(timing, registrationBalance, registrationCharge.dueOn, assessmentDate);
  timing.overdueDebt += registrationPenalty.balance;

  const monthly = months.map((month) => {
    const charge = normalizedRecord.charges.find(
      (item) =>
        item.category === "tuition" &&
        item.studentId === student.id &&
        item.monthKey === month.key,
    );
    const monthlyDue = calculateMonthlyDue(
      student,
      month,
      settings,
      paymentRuleVersions,
    );
    const due = charge ? getChargeAmount(charge) : monthlyDue.due;
    const entry = charge
      ? getChargePaymentEntry(normalizedRecord, charge.id)
      : emptyEntry();
    const paid = Math.min(due, entry.amount);
    const balance = charge ? getChargeBalance(normalizedRecord, charge) : Math.max(0, due - entry.amount);
    const carryOut = Math.max(0, entry.amount - due);
    const penalty = charge
      ? getPenaltySummaryForCharge(normalizedRecord, charge.id)
      : { total: 0, paid: 0, balance: 0, stage: undefined };
    const fine = penalty.balance;
    const ruleLabel = charge?.snapshot
      ? charge.snapshot.ruleLabel ?? snapshotFinanceRuleLabel(charge.snapshot.discountPercent)
      : monthlyDue.ruleLabel;
    const item: MonthLedger = {
      month,
      entry,
      applicable: monthlyDue.applicable,
      due,
      discount: charge?.discountAmount ?? monthlyDue.discount,
      ruleLabel,
      carryIn: 0,
      paid,
      balance,
      carryOut,
      fine,
      finePaid: penalty.paid,
      fineTotal: penalty.total,
      fineBalance: penalty.balance,
      penaltyStage: penalty.stage,
      dueOn: charge?.dueOn ?? monthlyDue.dueOn,
      baseAmount: charge?.baseAmount ?? monthlyDue.baseAmount,
      state: resolveOfficialPaymentState({
        applicable: monthlyDue.applicable,
        due,
        paid,
        balance,
        dueOn: charge?.dueOn ?? monthlyDue.dueOn,
        penaltyBalance: penalty.balance,
        penaltyStage: penalty.stage,
        penaltyTotal: penalty.total,
        ruleLabel,
        assessmentDate,
      }),
    };

    totalBalance += balance;
    totalFine += fine;
    addDebtTiming(timing, balance, item.dueOn, assessmentDate);
    timing.overdueDebt += penalty.balance;

    return item;
  });

  getMiscellaneousCharges(normalizedRecord).forEach((charge) => {
    addDebtTiming(
      timing,
      getChargeBalance(normalizedRecord, charge),
      charge.dueOn ?? charge.createdAt,
      assessmentDate,
    );
  });

  return {
    normalizedRecord,
    registrationDue: registrationAmount,
    registrationBaseAmount: registrationCharge.baseAmount ?? registrationAmount,
    registrationDiscount: registrationCharge.discountAmount ?? registrationDue.discount,
    registrationPaid,
    registrationBalance,
    registrationFine,
    registrationPenaltyPaid: registrationPenalty.paid,
    registrationPenaltyTotal: registrationPenalty.total,
    registrationPenaltyBalance: registrationPenalty.balance,
    registrationPenaltyStage: registrationPenalty.stage,
    registrationState,
    registrationCarry: Math.max(0, registrationEntry.amount - registrationAmount),
    monthly,
    totals: {
      expected: registrationAmount + monthly.reduce((total, item) => total + item.due, 0),
      discount:
        (registrationCharge.discountAmount ?? registrationDue.discount) +
        monthly.reduce((total, item) => total + item.discount, 0),
      paid: totalReceived,
      balance: totalBalance,
      fine: totalFine,
      carry: Math.max(0, totalReceived - totalAllocated),
      miscellaneous: miscellaneousPaid,
      overdueDebt: roundMoney(timing.overdueDebt),
      futureDue: roundMoney(timing.futureDue),
    },
  };
}
export type FinanceCellTone =
  | "paid"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "neutral";

export type FinanceCellState = {
  state: OfficialPaymentState;
  label: string;
  detail: string;
  tone: FinanceCellTone;
  symbol: string;
};

function officialStateLabel(state: OfficialPaymentState) {
  const labels: Record<OfficialPaymentState, string> = {
    "not-applicable": "—",
    future: "A vencer",
    pending: "Pendente",
    partial: "Parcial",
    overdue: "Em atraso",
    "first-fine": "1ª multa",
    "second-fine": "2ª multa",
    "fine-due": "Multa por pagar",
    paid: "Pago",
    "paid-with-fine": "Pago com multa",
    scholarship: "Bolseiro",
  };

  return labels[state];
}

function officialStateTone(state: OfficialPaymentState): FinanceCellTone {
  const tones: Record<OfficialPaymentState, FinanceCellTone> = {
    "not-applicable": "muted",
    future: "info",
    pending: "warning",
    partial: "warning",
    overdue: "danger",
    "first-fine": "danger",
    "second-fine": "danger",
    "fine-due": "danger",
    paid: "paid",
    "paid-with-fine": "paid",
    scholarship: "info",
  };

  return tones[state];
}

function officialStateSymbol(state: OfficialPaymentState) {
  const symbols: Record<OfficialPaymentState, string> = {
    "not-applicable": "-",
    future: "AV",
    pending: "P",
    partial: "PAR",
    overdue: "!",
    "first-fine": "1M",
    "second-fine": "2M",
    "fine-due": "M",
    paid: "OK",
    "paid-with-fine": "OK+",
    scholarship: "B",
  };

  return symbols[state];
}

function officialStateDetail(state: OfficialPaymentState, defaultDetail: string) {
  const details: Record<OfficialPaymentState, string> = {
    "not-applicable": "Não aplicável",
    future: "Valor a vencer",
    pending: "Por pagar",
    partial: "Falta pagar",
    overdue: "Dívida vencida",
    "first-fine": "1ª multa pendente",
    "second-fine": "2ª multa pendente",
    "fine-due": "Rubrica liquidada, multa em aberto",
    paid: "Liquidado",
    "paid-with-fine": "Liquidado com multa",
    scholarship: defaultDetail,
  };

  return details[state];
}

function financeCellStateFromOfficialState(
  state: OfficialPaymentState,
  defaultDetail: string,
): FinanceCellState {
  return {
    state,
    label: officialStateLabel(state),
    detail: officialStateDetail(state, defaultDetail),
    tone: officialStateTone(state),
    symbol: officialStateSymbol(state),
  };
}

export function getRegistrationCellState(
  ledger: ReturnType<typeof buildLedger>,
  _settings: PaymentSettings,
): FinanceCellState {
  void _settings;

  return financeCellStateFromOfficialState(
    ledger.registrationState,
    ledger.registrationDue <= 0 ? "Bolsa integral" : "Inscrição/Renovação",
  );
}
export function getTuitionInstallmentNumber(
  student: Student,
  monthKey: string,
  months: MonthOption[],
  settings: PaymentSettings,
) {
  const startIndex = months.findIndex(
    (month) => month.key === getStudentTuitionStartMonth(student, settings),
  );
  const currentIndex = months.findIndex((month) => month.key === monthKey);

  if (startIndex < 0 || currentIndex < startIndex) {
    return null;
  }

  return currentIndex + 1 - startIndex;
}

export function getMonthCellState(
  month: MonthLedger,
  _settings: PaymentSettings,
): FinanceCellState {
  void _settings;

  return financeCellStateFromOfficialState(month.state, month.ruleLabel);
}
export function getMiscellaneousSummary(record: StudentPaymentRecord) {
  const charges = (record.charges ?? []).filter(
    (charge) => charge.category === "miscellaneous",
  );
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const balance = charges.reduce(
    (sum, charge) => sum + getChargeBalance(record, charge),
    0,
  );

  return {
    count: charges.length,
    total,
    paid: Math.max(0, total - balance),
    balance,
  };
}

export function getMiscellaneousCellState(
  record: StudentPaymentRecord,
): FinanceCellState {
  const summary = getMiscellaneousSummary(record);
  const countDetail = `Diversos (${summary.count})`;

  if (summary.count === 0) {
    return {
      ...financeCellStateFromOfficialState("not-applicable", "Sem itens"),
      detail: "Sem itens",
    };
  }

  if (summary.balance <= 0) {
    return {
      ...financeCellStateFromOfficialState("paid", countDetail),
      detail: countDetail,
    };
  }

  if (summary.paid > 0) {
    return {
      ...financeCellStateFromOfficialState("partial", countDetail),
      detail: countDetail,
    };
  }

  return {
    ...financeCellStateFromOfficialState("pending", countDetail),
    detail: countDetail,
  };
}

export function getStudentDebt(
  ledger: ReturnType<typeof buildLedger>,
  record: StudentPaymentRecord,
) {
  return ledger.totals.balance + ledger.totals.fine + getMiscellaneousSummary(record).balance;
}

export function getStudentDebtTiming(
  ledger: ReturnType<typeof buildLedger>,
  record: StudentPaymentRecord,
) {
  const miscellaneousBalance = getMiscellaneousSummary(record).balance;
  const total = getStudentDebt(ledger, record);
  const timedTotal = ledger.totals.overdueDebt + ledger.totals.futureDue;

  return {
    overdueDebt: ledger.totals.overdueDebt,
    futureDue: ledger.totals.futureDue,
    currentDue: Math.max(0, total - timedTotal),
    miscellaneous: miscellaneousBalance,
    total,
  };
}
export function getPaymentsForCharges(
  record: StudentPaymentRecord,
  chargeIds: string[],
): PaymentHistoryItem[] {
  const chargeIdSet = new Set(chargeIds);
  const amountByPayment = new Map<string, number>();

  (record.allocations ?? []).forEach((allocation) => {
    if (!chargeIdSet.has(allocation.chargeId)) {
      return;
    }

    amountByPayment.set(
      allocation.paymentId,
      (amountByPayment.get(allocation.paymentId) ?? 0) + allocation.amount,
    );
  });

  return (record.payments ?? [])
    .filter((payment) => amountByPayment.has(payment.id))
    .map((payment) => ({
      id: payment.id,
      paidOn: payment.paidOn,
      effectivePaymentDate: payment.effectivePaymentDate ?? payment.paidOn,
      recordedAt: payment.recordedAt,
      recordedBy: payment.recordedBy ?? "Registo antigo",
      amount: amountByPayment.get(payment.id) ?? 0,
      method: payment.method,
      reference: payment.reference,
      legacyReference: payment.legacyReference ?? payment.reference,
      observation: payment.observation,
    }))
    .sort(
      (a, b) =>
        b.effectivePaymentDate.localeCompare(a.effectivePaymentDate) ||
        b.recordedAt.localeCompare(a.recordedAt),
    );
}

export function getMiscellaneousCharges(record: StudentPaymentRecord) {
  return [...(record.charges ?? [])]
    .filter((charge) => charge.category === "miscellaneous")
    .sort((a, b) => {
      const aDate = a.dueOn ?? a.createdAt;
      const bDate = b.dueOn ?? b.createdAt;

      return aDate.localeCompare(bDate);
    });
}

export function getDebtBreakdown(row: StudentLedgerRow): DebtBreakdownItem[] {
  const items: DebtBreakdownItem[] = [];

  if (row.ledger.registrationBalance > 0) {
    items.push({
      id: `${row.student.id}-registration`,
      label: "Inscrição",
      detail: "Saldo por pagar",
      amount: row.ledger.registrationBalance,
      order: 0,
    });
  }

  if (row.ledger.registrationFine > 0) {
    items.push({
      id: `${row.student.id}-registration-fine`,
      label: "Multa da inscrição",
      detail: "Calculada pela data actual",
      amount: row.ledger.registrationFine,
      order: 1,
    });
  }

  row.ledger.monthly.forEach((month, index) => {
    if (month.balance > 0) {
      items.push({
        id: `${row.student.id}-${month.month.key}`,
        label: `Mensalidade de ${month.month.label}`,
        detail: month.ruleLabel,
        amount: month.balance,
        order: 10 + index * 2,
      });
    }

    if (month.fine > 0) {
      items.push({
        id: `${row.student.id}-${month.month.key}-fine`,
        label: `Multa de ${month.month.label}`,
        detail: "Calculada pela data actual",
        amount: month.fine,
        order: 11 + index * 2,
      });
    }
  });

  getMiscellaneousCharges(row.record).forEach((charge, index) => {
    const balance = getChargeBalance(row.record, charge);

    if (balance <= 0) {
      return;
    }

    items.push({
      id: charge.id,
      label: charge.description,
      detail: charge.dueOn ? `Vence em ${formatDate(charge.dueOn)}` : "Diversos",
      amount: balance,
      order: 100 + index,
    });
  });

  return items.sort((a, b) => a.order - b.order);
}

export function isFinanceRuleEndingSoon(
  student: Student,
  months: MonthOption[],
  settings: PaymentSettings,
  assessmentDate = today(),
) {
  const profile = normalizeFinanceProfile(student.financialProfile);

  if (profile.status === "regular" || !profile.endMonth) {
    return false;
  }

  const currentMonthKey = monthOptions[Number(assessmentDate.slice(5, 7)) - 1]?.key;
  const currentIndex = months.findIndex((month) => month.key === currentMonthKey);
  const endIndex = months.findIndex((month) => month.key === profile.endMonth);

  if (currentIndex < 0 || endIndex < 0) {
    return false;
  }

  const monthsLeft = endIndex - currentIndex;

  return monthsLeft >= 0 && monthsLeft <= 1;
}

export function rowMatchesPaymentAlertFilter(
  row: StudentLedgerRow,
  filter: PaymentAlertFilter,
  months: MonthOption[],
  settings: PaymentSettings,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "registration") {
    return row.ledger.registrationBalance > 0;
  }

  if (filter === "overdue") {
    return (
      row.ledger.registrationState === "overdue" ||
      row.ledger.registrationState === "first-fine" ||
      row.ledger.registrationState === "second-fine" ||
      row.ledger.monthly.some((month) =>
        ["overdue", "first-fine", "second-fine"].includes(month.state),
      )
    );
  }

  if (filter === "first-fine") {
    return (
      row.ledger.registrationState === "first-fine" ||
      row.ledger.monthly.some((month) => month.state === "first-fine")
    );
  }

  if (filter === "second-fine") {
    return (
      row.ledger.registrationState === "second-fine" ||
      row.ledger.monthly.some((month) => month.state === "second-fine")
    );
  }

  if (filter === "debt") {
    return getStudentDebt(row.ledger, row.record) > 0;
  }

  if (filter === "rules-ending") {
    return isFinanceRuleEndingSoon(row.student, months, settings);
  }

  return true;
}
export function inputClasses() {
  return "min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#207a70]";
}

export function monthByKey(monthKey: string) {
  return monthOptions.find((month) => month.key === monthKey);
}

export function monthLabel(monthKey?: string) {
  if (!monthKey) {
    return "Todo periodo";
  }

  return monthByKey(monthKey)?.shortLabel ?? monthKey;
}

export function buildFinanceSettingsDraft(settings: PaymentSettings): FinanceSettingsDraft {
  return {
    academicYear: settings.academicYear,
    inscriptionRenewalFee: String(settings.inscriptionRenewalFee),
    monthlyFee: String(settings.monthlyFee),
    startMonth: settings.startMonth,
    endMonth: settings.endMonth,
    firstPenaltyDay: String(settings.firstPenaltyDay),
    firstPenaltyAmount: String(settings.firstPenaltyAmount),
    secondPenaltyDay: String(settings.secondPenaltyDay),
    secondPenaltyAmount: String(settings.secondPenaltyAmount),
  };
}

export function buildFinanceProfileDraft(
  student: Student | undefined,
  settings: PaymentSettings,
): FinanceProfileDraft {
  const profile = student?.financialProfile;

  return {
    studentId: student?.id ?? "",
    status: profile?.status ?? "regular",
    discountPercent: String(profile?.discountPercent ?? 0),
    startMonth: profile?.startMonth ?? settings.startMonth,
    endMonth: profile?.endMonth ?? settings.endMonth,
    reason: profile?.reason ?? "",
    authorizedBy: profile?.authorizedBy ?? "",
    registeredBy: profile?.registeredBy ?? "Secretaria",
  };
}

export function summarizePaymentRows(rows: StudentLedgerRow[]) {
  return rows.reduce(
    (summary, row) => ({
      expected: summary.expected + row.ledger.totals.expected,
      discount: summary.discount + row.ledger.totals.discount,
      paid: summary.paid + row.ledger.totals.paid,
      balance: summary.balance + row.ledger.totals.balance,
      fine: summary.fine + row.ledger.totals.fine,
      carry: summary.carry + row.ledger.totals.carry,
      miscellaneous: summary.miscellaneous + row.ledger.totals.miscellaneous,
      overdueDebt: summary.overdueDebt + row.ledger.totals.overdueDebt,
      futureDue: summary.futureDue + row.ledger.totals.futureDue,
    }),
    {
      expected: 0,
      discount: 0,
      paid: 0,
      balance: 0,
      fine: 0,
      carry: 0,
      miscellaneous: 0,
      overdueDebt: 0,
      futureDue: 0,
    },
  );
}
