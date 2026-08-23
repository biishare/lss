import {
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
  type PaymentEntry,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
  type StudentFinancialProfile,
  type StudentFinanceRuleHistoryEntry,
  type StudentPaymentRecord,
} from "../lib/school-demo-data";

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

export type PaymentLaunchDraft = {
  studentId: string;
  category: PaymentCategory;
  monthKey: string;
  targetChargeId?: string;
  amount: string;
  paidOn: string;
  method: string;
  reference: string;
  description: string;
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
  recordedAt: string;
  amount: number;
  method: string;
  reference?: string;
  observation?: string;
};

export type StoredDemoState = {
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
  profiles: ProfileId[];
}> = [
  { id: "overview", label: "Painel", profiles: ["director", "secretaria"] },
  { id: "catalog", label: "Académico", profiles: ["secretaria"] },
  { id: "classes", label: "Classes", profiles: ["secretaria"] },
  { id: "rooms", label: "Salas", profiles: ["secretaria"] },
  { id: "groups", label: "Turmas", profiles: ["secretaria"] },
  { id: "enrollments", label: "Matrículas", profiles: ["secretaria"] },
  { id: "payments", label: "Financeiro", profiles: ["secretaria"] },
  { id: "reports", label: "Relatórios", profiles: ["director", "secretaria"] },
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
    profiles: ["secretaria"],
  },
  {
    id: "reports",
    label: "Relatório",
    profiles: ["secretaria"],
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
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const moneyFormatter = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 0,
});

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function loadStoredState() {
  try {
    const rawState = window.localStorage.getItem(storageKey);

    return rawState ? (JSON.parse(rawState) as StoredDemoState) : null;
  } catch {
    return null;
  }
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
    payments: [],
    allocations: [],
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
  return dateForAcademicMonth(monthKey, settings.firstPenaltyDay, settings);
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
    payments: [...(record.payments ?? [])],
    allocations: [...(record.allocations ?? [])],
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

export function getChargeBalance(record: StudentPaymentRecord, charge: Charge) {
  return Math.max(0, charge.amount - allocatedAmountForCharge(record, charge.id));
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
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn));
  const lastPayment = relatedPayments.at(-1);

  return {
    amount,
    paidDay: lastPayment ? paidOnDay(lastPayment.paidOn) : 0,
    paidAt: lastPayment ? paidOnToIso(lastPayment.paidOn) : undefined,
    method: lastPayment?.method,
    reference: lastPayment?.reference,
    description: lastPayment?.observation,
  };
}

export function ensureCoreCharges(
  record: StudentPaymentRecord,
  student: Student,
  months: MonthOption[],
  settings: PaymentSettings,
) {
  const nextRecord = clonePaymentRecord(record);
  const chargesById = new Map(nextRecord.charges.map((charge) => [charge.id, charge]));
  const registrationId = registrationChargeId(student.id);

  if (!chargesById.has(registrationId)) {
    nextRecord.charges.push({
      id: registrationId,
      studentId: student.id,
      category: "registration",
      amount: settings.inscriptionRenewalFee,
      description: "Inscrição/Renovação",
      dueOn: getStudentEnrollmentDate(student),
      createdAt: getStudentEnrollmentDate(student),
    });
  }

  months.forEach((month) => {
    const monthlyDue = calculateMonthlyDue(student, month, settings);

    if (!monthlyDue.applicable) {
      return;
    }

    const chargeId = tuitionChargeId(student.id, month.key);

    if (!chargesById.has(chargeId)) {
      nextRecord.charges.push({
        id: chargeId,
        studentId: student.id,
        category: "tuition",
        amount: monthlyDue.due,
        description: `Mensalidade de ${month.label}`,
        monthKey: month.key,
        createdAt: today(),
      });
    }
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
    recordedAt: entry.paidAt ?? paidOnToIso(paidOn),
    method: entry.method ?? "Registo antigo",
    reference: entry.reference,
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
) {
  let nextRecord = ensureCoreCharges(record, student, months, settings);

  if ((nextRecord.payments ?? []).length > 0) {
    return nextRecord;
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
        description: entry.description ?? "Pagamento diverso",
        createdAt: paidOn,
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

  return nextRecord;
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

export function isTuitionMonthApplicable(
  student: Student,
  monthKey: string,
  settings: PaymentSettings,
) {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const currentIndex = months.findIndex((month) => month.key === monthKey);
  const startIndex = months.findIndex(
    (month) => month.key === getStudentTuitionStartMonth(student, settings),
  );

  if (currentIndex < 0 || startIndex < 0) {
    return true;
  }

  return currentIndex >= startIndex;
}

export function calculateMonthlyDue(
  student: Student,
  month: MonthOption,
  settings: PaymentSettings,
) {
  if (!isTuitionMonthApplicable(student, month.key, settings)) {
    return {
      due: 0,
      discount: 0,
      ruleLabel: "Não aplicável",
      applicable: false,
    };
  }

  const profile = student.financialProfile;
  const baseAmount = settings.monthlyFee;
  const inRange = isMonthInRange(
    month.key,
    profile.startMonth ?? settings.startMonth,
    profile.endMonth ?? settings.endMonth,
  );
  let discountPercent = 0;
  let ruleLabel = "Regular";

  if (profile.status === "scholarship") {
    discountPercent = inRange ? 100 : 0;
    ruleLabel = inRange ? "Bolsa integral" : "Regular";
  }

  if (profile.status === "partial_scholarship") {
    discountPercent = inRange ? clampPercent(profile.discountPercent) : 0;
    ruleLabel = inRange ? `Bolsa ${discountPercent}%` : "Regular";
  }

  if (profile.status === "exception") {
    discountPercent = inRange ? clampPercent(profile.discountPercent || 100) : 0;
    ruleLabel = inRange ? "Isencao temporaria" : "Regular";
  }

  if (profile.status === "weighted") {
    discountPercent = inRange ? clampPercent(profile.discountPercent) : 0;
    ruleLabel = inRange ? `Ponderacao ${discountPercent}%` : "Regular";
  }

  const discount = Math.round((baseAmount * discountPercent) / 100);
  const due = Math.max(0, baseAmount - discount);

  return {
    due,
    discount,
    ruleLabel,
    applicable: true,
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

  if (effectiveDay <= 0) {
    return 0;
  }

  if (effectiveDay > settings.secondPenaltyDay) {
    return settings.firstPenaltyAmount + settings.secondPenaltyAmount;
  }

  if (effectiveDay > settings.firstPenaltyDay) {
    return settings.firstPenaltyAmount;
  }

  return 0;
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
  category: PaymentCategory;
  monthKey: string;
  targetChargeId?: string;
  amount: number;
  paidOn: string;
  recordedAt: string;
  method: string;
  reference: string;
  description: string;
};

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

export function recordStudentPayment({
  record,
  student,
  months,
  settings,
  category,
  monthKey,
  targetChargeId,
  amount,
  paidOn,
  recordedAt,
  method,
  reference,
  description,
}: RecordStudentPaymentInput) {
  let nextRecord = normalizePaymentRecord(record, student, months, settings);
  const payment: Payment = {
    id: nextId(nextRecord.payments, "PAY"),
    studentId: student.id,
    amount,
    paidOn,
    recordedAt,
    method,
    reference,
    observation: description || undefined,
  };
  const targetCharges: Charge[] = [];

  if (category === "registration") {
    const registrationCharge = nextRecord.charges.find(
      (charge) => charge.id === registrationChargeId(student.id),
    );

    if (registrationCharge) {
      targetCharges.push(registrationCharge);
    }

    targetCharges.push(
      ...chargesFromMonth(
        nextRecord,
        student,
        months,
        getStudentTuitionStartMonth(student, settings),
      ),
    );
  }

  if (category === "tuition") {
    targetCharges.push(
      ...chargesFromMonth(nextRecord, student, months, monthKey),
    );
  }

  if (category === "miscellaneous") {
    const existingCharge = targetChargeId
      ? nextRecord.charges.find(
          (charge) =>
            charge.id === targetChargeId &&
            charge.studentId === student.id &&
            charge.category === "miscellaneous",
        )
      : undefined;

    if (existingCharge) {
      targetCharges.push(existingCharge);
    } else {
      const charge: Charge = {
        id: nextId(nextRecord.charges, `CHG-${student.id}-MISC`),
        studentId: student.id,
        category: "miscellaneous",
        amount,
        description: description || "Pagamento diverso",
        createdAt: recordedAt,
      };

      nextRecord = {
        ...nextRecord,
        charges: [charge, ...nextRecord.charges],
      };
      targetCharges.push(charge);
    }
  }

  let remaining = amount;
  const allocations: Array<Omit<PaymentAllocation, "id">> = [];

  targetCharges.forEach((charge) => {
    if (remaining <= 0) {
      return;
    }

    const balance = getChargeBalance(nextRecord, charge);
    const amountForCharge = Math.min(remaining, balance);

    if (amountForCharge <= 0) {
      return;
    }

    allocations.push({
      paymentId: payment.id,
      chargeId: charge.id,
      amount: amountForCharge,
    });
    remaining -= amountForCharge;
  });

  return appendPaymentWithAllocations(nextRecord, payment, allocations);
}

export function buildLedger(
  student: Student,
  record: StudentPaymentRecord,
  months: MonthOption[],
  settings: PaymentSettings,
  assessmentDate = today(),
) {
  const normalizedRecord = normalizePaymentRecord(record, student, months, settings);
  const registrationCharge =
    normalizedRecord.charges.find(
      (charge) => charge.id === registrationChargeId(student.id),
    ) ?? {
      id: registrationChargeId(student.id),
      studentId: student.id,
      category: "registration" as const,
      amount: settings.inscriptionRenewalFee,
      description: "Inscrição/Renovação",
      createdAt: getStudentEnrollmentDate(student),
    };
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
  const registrationBalance = Math.max(
    0,
    registrationCharge.amount - registrationEntry.amount,
  );
  let totalBalance = registrationBalance;
  const registrationFine = calculateFine(
    registrationEntry,
    settings,
    registrationCharge.amount,
    paidOnDay(assessmentDate),
  );
  let totalFine = registrationFine;

  const monthly = months.map((month) => {
    const charge = normalizedRecord.charges.find(
      (item) =>
        item.category === "tuition" &&
        item.studentId === student.id &&
        item.monthKey === month.key,
    );
    const monthlyDue = calculateMonthlyDue(student, month, settings);
    const due = charge?.amount ?? monthlyDue.due;
    const entry = charge
      ? getChargePaymentEntry(normalizedRecord, charge.id)
      : emptyEntry();
    const paid = Math.min(due, entry.amount);
    const balance = Math.max(0, due - entry.amount);
    const carryOut = Math.max(0, entry.amount - due);
    const fine = calculateFine(
      entry,
      settings,
      due,
      assessmentDayForMonth(month.key, settings, assessmentDate),
    );
    const item: MonthLedger = {
      month,
      entry,
      applicable: monthlyDue.applicable,
      due,
      discount: monthlyDue.discount,
      ruleLabel: monthlyDue.ruleLabel,
      carryIn: 0,
      paid,
      balance,
      carryOut,
      fine,
    };

    totalBalance += balance;
    totalFine += fine;

    return item;
  });

  return {
    registrationBalance,
    registrationFine,
    registrationCarry: Math.max(
      0,
      registrationEntry.amount - registrationCharge.amount,
    ),
    monthly,
    totals: {
      expected:
        registrationCharge.amount +
        monthly.reduce((total, item) => total + item.due, 0),
      discount: monthly.reduce((total, item) => total + item.discount, 0),
      paid: totalReceived,
      balance: totalBalance,
      fine: totalFine,
      carry: Math.max(0, totalReceived - totalAllocated),
      miscellaneous: miscellaneousPaid,
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
  label: string;
  detail: string;
  tone: FinanceCellTone;
};

function fineStageLabel(fine: number, settings: PaymentSettings) {
  if (fine >= settings.firstPenaltyAmount + settings.secondPenaltyAmount) {
    return "2ª multa";
  }

  if (fine > 0) {
    return "1ª multa";
  }

  return "";
}

export function getRegistrationCellState(
  ledger: ReturnType<typeof buildLedger>,
  settings: PaymentSettings,
): FinanceCellState {
  if (ledger.registrationBalance <= 0) {
    return { label: "Pago", detail: "Liquidada", tone: "paid" };
  }

  const fineLabel = fineStageLabel(ledger.registrationFine, settings);

  if (fineLabel) {
    return { label: fineLabel, detail: "Inscrição em atraso", tone: "danger" };
  }

  if (ledger.registrationBalance < settings.inscriptionRenewalFee) {
    return { label: "Parcial", detail: "Falta pagar", tone: "warning" };
  }

  return { label: "Pendente", detail: "Por pagar", tone: "warning" };
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
  settings: PaymentSettings,
): FinanceCellState {
  if (!month.applicable) {
    return { label: "—", detail: "Não aplicável", tone: "muted" };
  }

  if (month.due <= 0) {
    const isScholarship = month.ruleLabel.toLocaleLowerCase("pt-PT").includes("bolsa");

    return {
      label: isScholarship ? "Bolseiro" : "Isento",
      detail: month.ruleLabel,
      tone: "info",
    };
  }

  const fineLabel = fineStageLabel(month.fine, settings);
  const hasReduction = month.discount > 0;

  if (month.balance <= 0) {
    return {
      label: fineLabel || (hasReduction ? "Ponderado · Pago" : "Pago"),
      detail: "Liquidado",
      tone: fineLabel ? "warning" : "paid",
    };
  }

  if (fineLabel) {
    return {
      label: fineLabel,
      detail: "Em atraso",
      tone: "danger",
    };
  }

  if (month.paid > 0) {
    return {
      label: hasReduction ? "Ponderado · Parcial" : "Parcial",
      detail: "Falta pagar",
      tone: "warning",
    };
  }

  if (hasReduction) {
    return { label: "Ponderado", detail: "Por pagar", tone: "info" };
  }

  return { label: "Pendente", detail: "Por pagar", tone: "warning" };
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

  if (summary.count === 0) {
    return { label: "—", detail: "Sem itens", tone: "muted" };
  }

  if (summary.balance <= 0) {
    return {
      label: `Diversos (${summary.count})`,
      detail: "Pago",
      tone: "paid",
    };
  }

  if (summary.paid > 0) {
    return {
      label: `Diversos (${summary.count})`,
      detail: "Parcial",
      tone: "warning",
    };
  }

  return {
    label: `Diversos (${summary.count})`,
    detail: "Pendente",
    tone: "warning",
  };
}

export function getStudentDebt(
  ledger: ReturnType<typeof buildLedger>,
  record: StudentPaymentRecord,
) {
  return ledger.totals.balance + ledger.totals.fine + getMiscellaneousSummary(record).balance;
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
      recordedAt: payment.recordedAt,
      amount: amountByPayment.get(payment.id) ?? 0,
      method: payment.method,
      reference: payment.reference,
      observation: payment.observation,
    }))
    .sort(
      (a, b) =>
        b.paidOn.localeCompare(a.paidOn) || b.recordedAt.localeCompare(a.recordedAt),
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
    return row.ledger.monthly.some((month) => month.balance > 0 && month.fine > 0);
  }

  if (filter === "first-fine") {
    return row.ledger.monthly.some(
      (month) => month.balance > 0 && month.fine === settings.firstPenaltyAmount,
    );
  }

  if (filter === "second-fine") {
    return row.ledger.monthly.some(
      (month) =>
        month.balance > 0 &&
        month.fine >= settings.firstPenaltyAmount + settings.secondPenaltyAmount,
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
  return "min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#207a70]";
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
    }),
    {
      expected: 0,
      discount: 0,
      paid: 0,
      balance: 0,
      fine: 0,
      carry: 0,
      miscellaneous: 0,
    },
  );
}
