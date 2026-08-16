"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  initialAcademicStages,
  initialClassDefinitions,
  initialClasses,
  initialGroups,
  initialPaymentRecords,
  initialPaymentSettings,
  initialRoomDefinitions,
  initialRooms,
  initialStudents,
  monthOptions,
  type AcademicStageDefinition,
  type ClassGroup,
  type ClassDefinition,
  type EnrollmentType,
  type EntityStatus,
  type FinanceStatus,
  type MonthOption,
  type PaymentEntry,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
  type StudentPaymentRecord,
} from "../lib/school-demo-data";

type ProfileId =
  | "administrador"
  | "secretaria"
  | "direcao"
  | "professor"
  | "caixa"
  | "aluno"
  | "encarregado";

type WorkspaceView =
  | "overview"
  | "catalog"
  | "classes"
  | "rooms"
  | "groups"
  | "enrollments"
  | "payments"
  | "reports"
  | "profiles";

type PaymentCategory = "registration" | "tuition" | "miscellaneous";

type PaymentWorkspaceSection =
  | "settings"
  | "student-rules"
  | "entry"
  | "reports";

type BillingRun = {
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

type ClassDraft = {
  definitionId: string;
  status: EntityStatus;
};

type RoomDraft = {
  definitionId: string;
  status: EntityStatus;
};

type AcademicStageDraft = {
  name: string;
  status: EntityStatus;
};

type ClassDefinitionDraft = {
  id: string;
  name: string;
  stageId: string;
  status: EntityStatus;
};

type RoomDefinitionDraft = {
  name: string;
  block: string;
  capacity: string;
  status: EntityStatus;
};

type GroupDraft = {
  name: string;
  classId: string;
  shift: string;
  roomId: string;
  capacity: string;
  status: EntityStatus;
};

type EnrollmentDraft = {
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentType: EnrollmentType;
  financeStatus: FinanceStatus;
  discountPercent: string;
  exceptionStartMonth: string;
  exceptionEndMonth: string;
  exceptionReason: string;
  classId: string;
  groupId: string;
};

type FinanceSettingsDraft = {
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

type FinanceProfileDraft = {
  studentId: string;
  status: FinanceStatus;
  discountPercent: string;
  startMonth: string;
  endMonth: string;
  reason: string;
};

type PaymentLaunchDraft = {
  studentId: string;
  category: PaymentCategory;
  monthKey: string;
  amount: string;
  method: string;
  reference: string;
  description: string;
};

type PaymentDetails = Omit<PaymentEntry, "amount">;

type MonthLedger = {
  month: MonthOption;
  entry: PaymentEntry;
  due: number;
  discount: number;
  ruleLabel: string;
  carryIn: number;
  paid: number;
  balance: number;
  carryOut: number;
  fine: number;
};

type StudentLedgerRow = {
  student: Student;
  record: StudentPaymentRecord;
  ledger: ReturnType<typeof buildLedger>;
};

type StoredDemoState = {
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

const storageKey = "gestao-academica-demo-state-v2";

type ProfileConfig = {
  id: ProfileId;
  title: string;
  subtitle: string;
  description: string;
  permissions: string[];
  defaultView: WorkspaceView;
  operational: boolean;
  glyph: string;
  accent: string;
  surface: string;
  featured?: boolean;
};

const profiles: ProfileConfig[] = [
  {
    id: "administrador",
    title: "Administrador",
    subtitle: "Configura toda a escola",
    description: "Perfil completo para escola, perfis e regras.",
    permissions: [
      "Parametros academicos",
      "Perfis e permissoes",
      "Regras financeiras",
      "Relatorios globais",
    ],
    defaultView: "overview",
    operational: true,
    glyph: "AD",
    accent: "border-t-[#178f7f]",
    surface: "bg-teal-50 text-[#0b6b5c]",
  },
  {
    id: "secretaria",
    title: "Secretaria academica",
    subtitle: "Matriculas e registos",
    description: "Regista turmas, matriculas, alunos e pagamentos.",
    permissions: [
      "Classes e salas",
      "Turmas",
      "Matricular alunos",
      "Registar pagamentos",
    ],
    defaultView: "overview",
    operational: true,
    glyph: "SE",
    accent: "border-t-[#2867d8]",
    surface: "bg-blue-50 text-[#2459bd]",
    featured: true,
  },
  {
    id: "direcao",
    title: "Direcao pedagogica",
    subtitle: "Parametros academicos",
    description: "Gere niveis, classes e salas.",
    permissions: [
      "Niveis de ensino",
      "Classes",
      "Salas",
      "Autorizar bolsas",
    ],
    defaultView: "catalog",
    operational: true,
    glyph: "DP",
    accent: "border-t-[#8b5cf6]",
    surface: "bg-violet-50 text-[#6d3bd1]",
  },
  {
    id: "professor",
    title: "Professor",
    subtitle: "Turmas e presencas",
    description: "Acesso focado nas turmas atribuidas e acompanhamento pedagogico.",
    permissions: [
      "Ver turmas atribuidas",
      "Consultar listas de alunos",
      "Registar presencas",
      "Lancar notas futuramente",
    ],
    defaultView: "groups",
    operational: false,
    glyph: "PR",
    accent: "border-t-[#f08c16]",
    surface: "bg-orange-50 text-[#c96700]",
  },
  {
    id: "caixa",
    title: "Tesouraria",
    subtitle: "Regras financeiras",
    description: "Define valores, multas, bolsas e consulta relatorios.",
    permissions: [
      "Configurar mensalidades",
      "Definir multas",
      "Gerir bolsas e isencoes",
      "Auditar recebimentos",
    ],
    defaultView: "payments",
    operational: true,
    glyph: "CX",
    accent: "border-t-[#25965a]",
    surface: "bg-emerald-50 text-[#177245]",
    featured: true,
  },
  {
    id: "aluno",
    title: "Aluno",
    subtitle: "Area academica",
    description: "Portal de consulta para situacao academica e financeira.",
    permissions: [
      "Ver turma",
      "Ver pagamentos",
      "Baixar recibos futuramente",
      "Consultar comunicados",
    ],
    defaultView: "overview",
    operational: false,
    glyph: "AL",
    accent: "border-t-[#0ea5c7]",
    surface: "bg-cyan-50 text-[#087d95]",
  },
  {
    id: "encarregado",
    title: "Encarregado",
    subtitle: "Acompanhar educandos",
    description: "Consulta dos educandos, pagamentos, saldos e avisos.",
    permissions: [
      "Ver dados dos educandos",
      "Consultar dividas",
      "Receber alertas",
      "Baixar recibos futuramente",
    ],
    defaultView: "overview",
    operational: false,
    glyph: "EE",
    accent: "border-t-[#e2551f]",
    surface: "bg-red-50 text-[#bd4216]",
  },
];

const workspaceNavigation: Array<{
  id: WorkspaceView;
  label: string;
  profiles: ProfileId[];
}> = [
  { id: "overview", label: "Painel", profiles: ["administrador", "secretaria", "caixa"] },
  { id: "catalog", label: "Parametros", profiles: ["administrador", "direcao"] },
  { id: "classes", label: "Classes", profiles: ["administrador", "secretaria"] },
  { id: "rooms", label: "Salas", profiles: ["administrador", "secretaria"] },
  { id: "groups", label: "Turmas", profiles: ["administrador", "secretaria"] },
  { id: "enrollments", label: "Matriculas", profiles: ["administrador", "secretaria"] },
  { id: "payments", label: "Pagamentos", profiles: ["administrador", "secretaria", "caixa"] },
  { id: "reports", label: "Relatorios", profiles: ["administrador", "caixa"] },
  { id: "profiles", label: "Perfis", profiles: ["administrador"] },
];

const paymentSections: Array<{
  id: PaymentWorkspaceSection;
  label: string;
  profiles: ProfileId[];
}> = [
  {
    id: "settings",
    label: "Dados de pagamentos",
    profiles: ["administrador", "secretaria", "caixa"],
  },
  {
    id: "student-rules",
    label: "Bolsas e isencoes",
    profiles: ["administrador", "caixa"],
  },
  {
    id: "entry",
    label: "Inscricao/Renovacao e propinas",
    profiles: ["administrador", "secretaria"],
  },
  {
    id: "reports",
    label: "Relatorio",
    profiles: ["administrador", "caixa"],
  },
];

const paymentCategories: Array<{ id: PaymentCategory; label: string }> = [
  { id: "registration", label: "Inscricao/Renovacao" },
  { id: "tuition", label: "Mensalidade" },
  { id: "miscellaneous", label: "Pagamentos diversos" },
];

const paymentMethods = [
  "Numerario",
  "Transferencia",
  "Multicaixa",
  "Deposito bancario",
];

const statusOptions: Array<{ value: EntityStatus; label: string }> = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const financeStatusOptions: Array<{ value: FinanceStatus; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "scholarship", label: "Bolseiro integral" },
  { value: "partial_scholarship", label: "Bolseiro parcial" },
  { value: "exception", label: "Excecao temporaria" },
];

const buttonBase =
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const moneyFormatter = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 0,
});

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function loadStoredState() {
  try {
    const rawState = window.localStorage.getItem(storageKey);

    return rawState ? (JSON.parse(rawState) as StoredDemoState) : null;
  } catch {
    return null;
  }
}

function storedArray<T>(items: T[] | undefined, fallback: T[]) {
  return Array.isArray(items) ? items : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentAcademicYear() {
  return String(new Date().getFullYear());
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return `${moneyFormatter.format(Math.max(0, value))} MT`;
}

function parseMoney(value: string) {
  return Math.max(0, Number(value) || 0);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

function sortClasses(items: SchoolClass[]) {
  return [...items].sort((a, b) => {
    const aNumber = Number(a.id);
    const bNumber = Number(b.id);

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }

    return a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" });
  });
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" }),
  );
}

function sortStudents(items: Student[]) {
  return [...items].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "pt-PT", { sensitivity: "base" }),
  );
}

function nextId(items: Array<{ id: string }>, prefix: string) {
  const currentMax = items.reduce((max, item) => {
    const idNumber = Number(item.id.replace(`${prefix}-`, ""));
    return Number.isFinite(idNumber) ? Math.max(max, idNumber) : max;
  }, 0);

  return `${prefix}-${String(currentMax + 1).padStart(3, "0")}`;
}

function nextRegistrationNumber(students: Student[]) {
  return `GA-${new Date().getFullYear()}-${String(students.length + 1).padStart(
    3,
    "0",
  )}`;
}

function activeAcademicStages(stages: AcademicStageDefinition[]) {
  return sortByName(stages.filter((stage) => stage.status === "active"));
}

function activeClassDefinitions(
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

function activeRoomDefinitions(roomDefinitions: RoomDefinition[]) {
  return sortByName(
    roomDefinitions.filter((definition) => definition.status === "active"),
  );
}

function stageLabel(stages: AcademicStageDefinition[], stageId: string) {
  return stages.find((stage) => stage.id === stageId)?.name ?? "Sem nivel";
}

function availableClassDefinitions(
  classes: SchoolClass[],
  classDefinitions: ClassDefinition[],
  stages: AcademicStageDefinition[],
) {
  const usedLevelIds = new Set(classes.map((schoolClass) => schoolClass.id));

  return activeClassDefinitions(classDefinitions, stages).filter(
    (option) => !usedLevelIds.has(option.id),
  );
}

function firstAvailableClassDefinitionId(
  classes: SchoolClass[],
  classDefinitions: ClassDefinition[],
  stages: AcademicStageDefinition[],
) {
  return availableClassDefinitions(classes, classDefinitions, stages)[0]?.id ?? "";
}

function availableRoomDefinitions(
  rooms: SchoolRoom[],
  roomDefinitions: RoomDefinition[],
) {
  const usedRoomIds = new Set(rooms.map((room) => room.id));

  return activeRoomDefinitions(roomDefinitions).filter(
    (definition) => !usedRoomIds.has(definition.id),
  );
}

function firstAvailableRoomDefinitionId(
  rooms: SchoolRoom[],
  roomDefinitions: RoomDefinition[],
) {
  return availableRoomDefinitions(rooms, roomDefinitions)[0]?.id ?? "";
}

function getGroupCode(groupName: string) {
  const cleanedName = groupName.trim().replace(/^turma\s+/i, "").trim();
  const match = cleanedName.match(/[a-z0-9]/i);

  return (match?.[0] ?? "A").toUpperCase();
}

function buildGroupId(classId: string, groupName: string) {
  if (!classId) {
    return "AGUARDAR";
  }

  return `${classId}${getGroupCode(groupName)}${new Date().getFullYear()}`;
}

function nextStageDefinitionId(stages: AcademicStageDefinition[]) {
  return nextId(stages, "NIVEL");
}

function nextRoomDefinitionId(roomDefinitions: RoomDefinition[]) {
  return nextId(roomDefinitions, "SALA");
}

function roomById(rooms: SchoolRoom[], roomId: string) {
  return rooms.find((room) => room.id === roomId);
}

function roomLabel(rooms: SchoolRoom[], roomId: string) {
  const room = roomById(rooms, roomId);

  return room ? `${room.name} - ${room.block}` : "Sala por seleccionar";
}

function activeRooms(rooms: SchoolRoom[]) {
  return rooms.filter((room) => room.status === "active");
}

function statusLabel(status: EntityStatus) {
  return status === "active" ? "Activo" : "Inactivo";
}

function financeStatusLabel(status: FinanceStatus) {
  return (
    financeStatusOptions.find((option) => option.value === status)?.label ??
    "Regular"
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function monthIndex(monthKey: string) {
  return monthOptions.findIndex((month) => month.key === monthKey);
}

function isMonthInRange(monthKey: string, startMonth?: string, endMonth?: string) {
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

function getMonthsInRange(startMonth: string, endMonth: string) {
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

function emptyEntry(): PaymentEntry {
  return { amount: 0, paidDay: 0 };
}

function buildPaymentRecord(studentId: string): StudentPaymentRecord {
  return {
    studentId,
    inscriptionRenewal: emptyEntry(),
    monthlyPayments: {},
    miscellaneousPayments: [],
  };
}

function calculateMonthlyDue(
  student: Student,
  month: MonthOption,
  settings: PaymentSettings,
) {
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
    ruleLabel = inRange ? "Excecao" : "Regular";
  }

  const discount = Math.round((baseAmount * discountPercent) / 100);
  const due = Math.max(0, baseAmount - discount);

  return {
    due,
    discount,
    ruleLabel,
  };
}

function calculateFine(
  entry: PaymentEntry,
  settings: PaymentSettings,
  dueAmount: number,
) {
  if (dueAmount <= 0 || entry.amount <= 0 || entry.paidDay <= 0) {
    return 0;
  }

  if (entry.paidDay > settings.secondPenaltyDay) {
    return settings.firstPenaltyAmount + settings.secondPenaltyAmount;
  }

  if (entry.paidDay > settings.firstPenaltyDay) {
    return settings.firstPenaltyAmount;
  }

  return 0;
}

function addMonthlyPayment(
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

function advancePaymentDetails(
  paymentDetails: PaymentDetails,
  settings: PaymentSettings,
) {
  return {
    ...paymentDetails,
    paidDay: Math.max(1, Math.min(paymentDetails.paidDay, settings.firstPenaltyDay)),
  };
}

function distributeMonthlyPayment(
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

function buildLedger(
  student: Student,
  record: StudentPaymentRecord,
  months: MonthOption[],
  settings: PaymentSettings,
) {
  const miscellaneousPaid = (record.miscellaneousPayments ?? []).reduce(
    (total, entry) => total + entry.amount,
    0,
  );
  const registrationBalance = Math.max(
    0,
    settings.inscriptionRenewalFee - record.inscriptionRenewal.amount,
  );
  let carry = Math.max(
    0,
    record.inscriptionRenewal.amount - settings.inscriptionRenewalFee,
  );
  let totalPaid = record.inscriptionRenewal.amount + miscellaneousPaid;
  let totalBalance = registrationBalance;
  let totalFine = calculateFine(
    record.inscriptionRenewal,
    settings,
    settings.inscriptionRenewalFee,
  );

  const monthly = months.map((month) => {
    const entry = record.monthlyPayments[month.key] ?? emptyEntry();
    const monthlyDue = calculateMonthlyDue(student, month, settings);
    const available = entry.amount + carry;
    const paid = Math.min(monthlyDue.due, available);
    const balance = Math.max(0, monthlyDue.due - available);
    const carryOut = Math.max(0, available - monthlyDue.due);
    const fine = calculateFine(entry, settings, monthlyDue.due);
    const item: MonthLedger = {
      month,
      entry,
      due: monthlyDue.due,
      discount: monthlyDue.discount,
      ruleLabel: monthlyDue.ruleLabel,
      carryIn: carry,
      paid,
      balance,
      carryOut,
      fine,
    };

    totalPaid += entry.amount;
    totalBalance += balance;
    totalFine += fine;
    carry = carryOut;

    return item;
  });

  return {
    registrationBalance,
    registrationCarry: Math.max(
      0,
      record.inscriptionRenewal.amount - settings.inscriptionRenewalFee,
    ),
    monthly,
    totals: {
      expected:
        settings.inscriptionRenewalFee +
        monthly.reduce((total, item) => total + item.due, 0),
      discount: monthly.reduce((total, item) => total + item.discount, 0),
      paid: totalPaid,
      balance: totalBalance,
      fine: totalFine,
      carry,
      miscellaneous: miscellaneousPaid,
    },
  };
}

function inputClasses() {
  return "min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#207a70]";
}

function monthByKey(monthKey: string) {
  return monthOptions.find((month) => month.key === monthKey);
}

function monthLabel(monthKey?: string) {
  if (!monthKey) {
    return "Todo periodo";
  }

  return monthByKey(monthKey)?.shortLabel ?? monthKey;
}

function buildFinanceSettingsDraft(settings: PaymentSettings): FinanceSettingsDraft {
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

function buildFinanceProfileDraft(
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
  };
}

function isOperationalProfile(profileId: ProfileId | null) {
  return profiles.some((profile) => profile.id === profileId && profile.operational);
}

export function SchoolAdminDemo() {
  const firstClassId = initialClasses[0]?.id ?? "";
  const firstGroupId = initialGroups[0]?.id ?? "";
  const firstStudentId = initialStudents[0]?.id ?? "";
  const firstRoom = activeRooms(initialRooms)[0];
  const firstRoomId = firstRoom?.id ?? "";
  const firstStageId = initialAcademicStages[0]?.id ?? "";
  const [storageReady, setStorageReady] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileId | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [activePaymentSection, setActivePaymentSection] =
    useState<PaymentWorkspaceSection>("settings");
  const [academicStages, setAcademicStages] =
    useState<AcademicStageDefinition[]>(initialAcademicStages);
  const [classDefinitions, setClassDefinitions] =
    useState<ClassDefinition[]>(initialClassDefinitions);
  const [roomDefinitions, setRoomDefinitions] =
    useState<RoomDefinition[]>(initialRoomDefinitions);
  const [classes, setClasses] = useState<SchoolClass[]>(initialClasses);
  const [rooms, setRooms] = useState<SchoolRoom[]>(initialRooms);
  const [groups, setGroups] = useState<ClassGroup[]>(initialGroups);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings>(initialPaymentSettings);
  const [paymentRecords, setPaymentRecords] =
    useState<StudentPaymentRecord[]>(initialPaymentRecords);
  const [billingRuns, setBillingRuns] = useState<BillingRun[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(firstClassId);
  const [selectedGroupId, setSelectedGroupId] = useState(firstGroupId);
  const [studentSearch, setStudentSearch] = useState("");
  const [stageDefinitionError, setStageDefinitionError] = useState("");
  const [classDefinitionError, setClassDefinitionError] = useState("");
  const [roomDefinitionError, setRoomDefinitionError] = useState("");
  const [classError, setClassError] = useState("");
  const [roomError, setRoomError] = useState("");
  const [groupError, setGroupError] = useState("");
  const [enrollmentNotice, setEnrollmentNotice] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [financeSettingsNotice, setFinanceSettingsNotice] = useState("");
  const [financeNotice, setFinanceNotice] = useState("");
  const [billingMonthKey, setBillingMonthKey] = useState(
    initialPaymentSettings.startMonth,
  );
  const [financeSettingsDraft, setFinanceSettingsDraft] =
    useState<FinanceSettingsDraft>(() => buildFinanceSettingsDraft(initialPaymentSettings));
  const [academicStageDraft, setAcademicStageDraft] = useState<AcademicStageDraft>({
    name: "",
    status: "active",
  });
  const [classDefinitionDraft, setClassDefinitionDraft] =
    useState<ClassDefinitionDraft>({
      id: "",
      name: "",
      stageId: firstStageId,
      status: "active",
    });
  const [roomDefinitionDraft, setRoomDefinitionDraft] =
    useState<RoomDefinitionDraft>({
      name: "",
      block: "",
      capacity: "35",
      status: "active",
    });
  const [classDraft, setClassDraft] = useState<ClassDraft>({
    definitionId: firstAvailableClassDefinitionId(
      initialClasses,
      initialClassDefinitions,
      initialAcademicStages,
    ),
    status: "active",
  });
  const [roomDraft, setRoomDraft] = useState<RoomDraft>({
    definitionId: firstAvailableRoomDefinitionId(
      initialRooms,
      initialRoomDefinitions,
    ),
    status: "active",
  });
  const [groupDraft, setGroupDraft] = useState<GroupDraft>({
    name: "",
    classId: firstClassId,
    shift: "Manha",
    roomId: firstRoomId,
    capacity: String(firstRoom?.capacity ?? 35),
    status: "active",
  });
  const [enrollmentDraft, setEnrollmentDraft] = useState<EnrollmentDraft>({
    fullName: "",
    guardianName: "",
    guardianPhone: "",
    enrollmentType: "new",
    financeStatus: "regular",
    discountPercent: "0",
    exceptionStartMonth: initialPaymentSettings.startMonth,
    exceptionEndMonth: initialPaymentSettings.endMonth,
    exceptionReason: "",
    classId: firstClassId,
    groupId: firstGroupId,
  });
  const [financeProfileDraft, setFinanceProfileDraft] =
    useState<FinanceProfileDraft>(() =>
      buildFinanceProfileDraft(initialStudents[0], initialPaymentSettings),
    );
  const [paymentDraft, setPaymentDraft] = useState<PaymentLaunchDraft>({
    studentId: firstStudentId,
    category: "tuition",
    monthKey: initialPaymentSettings.startMonth,
    amount: String(initialPaymentSettings.monthlyFee),
    method: paymentMethods[0],
    reference: "",
    description: "",
  });

  useEffect(() => {
    const storedState = loadStoredState();

    if (!storedState) {
      setStorageReady(true);
      return;
    }

    const loadedAcademicStages = storedArray(
      storedState.academicStages,
      initialAcademicStages,
    );
    const loadedClassDefinitions = storedArray(
      storedState.classDefinitions,
      initialClassDefinitions,
    );
    const loadedRoomDefinitions = storedArray(
      storedState.roomDefinitions,
      initialRoomDefinitions,
    );
    const loadedClasses = storedArray(storedState.classes, initialClasses);
    const loadedRooms = storedArray(storedState.rooms, initialRooms);
    const loadedGroups = storedArray(storedState.groups, initialGroups);
    const loadedStudents = storedArray(storedState.students, initialStudents);
    const loadedPaymentSettings =
      storedState.paymentSettings ?? initialPaymentSettings;
    const loadedPaymentRecords = storedArray(
      storedState.paymentRecords,
      initialPaymentRecords,
    );
    const loadedBillingRuns = storedArray(storedState.billingRuns, []);
    const loadedFirstClassId = loadedClasses[0]?.id ?? "";
    const loadedFirstGroupId =
      loadedGroups.find((group) => group.classId === loadedFirstClassId)?.id ??
      loadedGroups[0]?.id ??
      "";
    const loadedFirstStudent = loadedStudents[0];
    const loadedFirstRoom = activeRooms(loadedRooms)[0];
    const loadedFirstStageId = loadedAcademicStages[0]?.id ?? "";

    setAcademicStages(loadedAcademicStages);
    setClassDefinitions(loadedClassDefinitions);
    setRoomDefinitions(loadedRoomDefinitions);
    setClasses(loadedClasses);
    setRooms(loadedRooms);
    setGroups(loadedGroups);
    setStudents(loadedStudents);
    setPaymentSettings(loadedPaymentSettings);
    setPaymentRecords(loadedPaymentRecords);
    setBillingRuns(loadedBillingRuns);
    setSelectedClassId(loadedFirstClassId);
    setSelectedGroupId(loadedFirstGroupId);
    setBillingMonthKey(loadedPaymentSettings.startMonth);
    setFinanceSettingsDraft(buildFinanceSettingsDraft(loadedPaymentSettings));
    setClassDefinitionDraft((draft) => ({
      ...draft,
      stageId: loadedFirstStageId,
    }));
    setClassDraft({
      definitionId: firstAvailableClassDefinitionId(
        loadedClasses,
        loadedClassDefinitions,
        loadedAcademicStages,
      ),
      status: "active",
    });
    setRoomDraft({
      definitionId: firstAvailableRoomDefinitionId(
        loadedRooms,
        loadedRoomDefinitions,
      ),
      status: "active",
    });
    setGroupDraft((draft) => ({
      ...draft,
      classId: loadedFirstClassId,
      roomId: loadedFirstRoom?.id ?? "",
      capacity: String(loadedFirstRoom?.capacity ?? 35),
    }));
    setEnrollmentDraft((draft) => ({
      ...draft,
      classId: loadedFirstClassId,
      groupId: loadedFirstGroupId,
      exceptionStartMonth: loadedPaymentSettings.startMonth,
      exceptionEndMonth: loadedPaymentSettings.endMonth,
    }));
    setFinanceProfileDraft(
      buildFinanceProfileDraft(loadedFirstStudent, loadedPaymentSettings),
    );
    setPaymentDraft((draft) => ({
      ...draft,
      studentId: loadedFirstStudent?.id ?? "",
      monthKey: loadedPaymentSettings.startMonth,
      amount: String(loadedPaymentSettings.monthlyFee),
    }));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        academicStages,
        classDefinitions,
        roomDefinitions,
        classes,
        rooms,
        groups,
        students,
        paymentSettings,
        paymentRecords,
        billingRuns,
      } satisfies StoredDemoState),
    );
  }, [
    academicStages,
    billingRuns,
    classDefinitions,
    classes,
    groups,
    paymentRecords,
    paymentSettings,
    roomDefinitions,
    rooms,
    storageReady,
    students,
  ]);

  const currentClass =
    classes.find((schoolClass) => schoolClass.id === selectedClassId) ??
    classes[0];
  const currentClassId = currentClass?.id ?? "";
  const groupsForCurrentClass = useMemo(
    () => sortByName(groups.filter((group) => group.classId === currentClassId)),
    [groups, currentClassId],
  );
  const currentGroup =
    groupsForCurrentClass.find((group) => group.id === selectedGroupId) ??
    groupsForCurrentClass[0];
  const currentGroupId = currentGroup?.id ?? "";
  const paymentMonths = useMemo(
    () => getMonthsInRange(paymentSettings.startMonth, paymentSettings.endMonth),
    [paymentSettings.startMonth, paymentSettings.endMonth],
  );

  const classesWithStats = useMemo(
    () =>
      sortClasses(classes).map((schoolClass) => {
        const classGroups = groups.filter(
          (group) => group.classId === schoolClass.id,
        );
        const classStudents = students.filter(
          (student) => student.classId === schoolClass.id,
        );

        return {
          ...schoolClass,
          groupsTotal: classGroups.length,
          studentsTotal: classStudents.length,
        };
      }),
    [classes, groups, students],
  );

  const groupsWithStats = useMemo(
    () =>
      sortByName(groupsForCurrentClass).map((group) => ({
        ...group,
        studentsTotal: students.filter((student) => student.groupId === group.id)
          .length,
      })),
    [groupsForCurrentClass, students],
  );

  const allStudentsAlphabetically = useMemo(
    () => sortStudents(students),
    [students],
  );

  const visibleStudents = useMemo(() => {
    const normalizedSearch = normalizeText(studentSearch);

    return allStudentsAlphabetically.filter((student) => {
      const belongsToGroup = student.groupId === currentGroupId;
      const matchesSearch = normalizeText(student.fullName).includes(
        normalizedSearch,
      );

      return belongsToGroup && matchesSearch;
    });
  }, [allStudentsAlphabetically, currentGroupId, studentSearch]);

  const allPaymentRows = useMemo(
    () =>
      allStudentsAlphabetically.map((student) => {
        const record =
          paymentRecords.find((item) => item.studentId === student.id) ??
          buildPaymentRecord(student.id);

        return {
          student,
          record,
          ledger: buildLedger(student, record, paymentMonths, paymentSettings),
        };
      }),
    [allStudentsAlphabetically, paymentMonths, paymentRecords, paymentSettings],
  );

  const paymentRows = useMemo(
    () => allPaymentRows.filter((row) => row.student.groupId === currentGroupId),
    [allPaymentRows, currentGroupId],
  );

  const visiblePaymentRows = useMemo(() => {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));
    return paymentRows.filter((row) => visibleIds.has(row.student.id));
  }, [paymentRows, visibleStudents]);

  const schoolPaymentSummary = useMemo(
    () => summarizePaymentRows(allPaymentRows),
    [allPaymentRows],
  );
  const miscellaneousPaymentRows = useMemo(
    () =>
      allPaymentRows
        .flatMap((row) =>
          (row.record.miscellaneousPayments ?? []).map((payment) => ({
            student: row.student,
            payment,
          })),
        )
        .sort(
          (a, b) =>
            new Date(b.payment.paidAt ?? "").getTime() -
            new Date(a.payment.paidAt ?? "").getTime(),
        ),
    [allPaymentRows],
  );

  const selectedMonth = monthByKey(billingMonthKey) ?? paymentMonths[0];
  const activeClassesTotal = classes.filter(
    (schoolClass) => schoolClass.status === "active",
  ).length;
  const activeGroupsTotal = groups.filter((group) => group.status === "active")
    .length;
  const billingRunsForGroup = billingRuns.filter(
    (run) => run.groupId === currentGroupId,
  );
  const selectedMonthBillingRun = billingRunsForGroup.find(
    (run) => run.monthKey === billingMonthKey,
  );
  const selectedMonthExpected = visiblePaymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.due ?? 0);
  }, 0);
  const selectedMonthDiscount = visiblePaymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.discount ?? 0);
  }, 0);
  const selectedMonthPaid = visiblePaymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.paid ?? 0);
  }, 0);
  const selectedMonthBalance = visiblePaymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.balance ?? 0);
  }, 0);
  const selectedMonthCarryOut = visiblePaymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.carryOut ?? 0);
  }, 0);
  const selectedProfile =
    profiles.find((profile) => profile.id === activeProfile) ?? profiles[1];

  function enterProfile(profileId: ProfileId, view?: WorkspaceView) {
    const profile = profiles.find((item) => item.id === profileId);

    setActiveProfile(profileId);
    setActiveView(view ?? profile?.defaultView ?? "overview");
  }

  function selectClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setSelectedClassId(classId);
    setSelectedGroupId(nextGroup?.id ?? "");
    setGroupDraft((draft) => ({ ...draft, classId }));
    setEnrollmentDraft((draft) => ({
      ...draft,
      classId,
      groupId: nextGroup?.id ?? "",
    }));
  }

  function selectGroup(groupId: string) {
    const group = groups.find((item) => item.id === groupId);

    if (!group) {
      return;
    }

    setSelectedClassId(group.classId);
    setSelectedGroupId(group.id);
    setEnrollmentDraft((draft) => ({
      ...draft,
      classId: group.classId,
      groupId: group.id,
    }));
  }

  function resetAcademicStageDraft() {
    setStageDefinitionError("");
    setAcademicStageDraft({
      name: "",
      status: "active",
    });
  }

  function resetClassDefinitionDraft(
    stageItems = academicStages,
  ) {
    setClassDefinitionError("");
    setClassDefinitionDraft({
      id: "",
      name: "",
      stageId: activeAcademicStages(stageItems)[0]?.id ?? stageItems[0]?.id ?? "",
      status: "active",
    });
  }

  function resetRoomDefinitionDraft() {
    setRoomDefinitionError("");
    setRoomDefinitionDraft({
      name: "",
      block: "",
      capacity: "35",
      status: "active",
    });
  }

  function resetClassDraft(
    classItems = classes,
    definitionItems = classDefinitions,
    stageItems = academicStages,
  ) {
    setClassError("");
    setClassDraft({
      definitionId: firstAvailableClassDefinitionId(
        classItems,
        definitionItems,
        stageItems,
      ),
      status: "active",
    });
  }

  function resetRoomDraft(
    roomItems = rooms,
    definitionItems = roomDefinitions,
  ) {
    setRoomError("");
    setRoomDraft({
      definitionId: firstAvailableRoomDefinitionId(roomItems, definitionItems),
      status: "active",
    });
  }

  function resetGroupDraft(classId = currentClassId) {
    const room = activeRooms(rooms)[0];

    setGroupError("");
    setGroupDraft({
      name: "",
      classId,
      shift: "Manha",
      roomId: room?.id ?? "",
      capacity: String(room?.capacity ?? 35),
      status: "active",
    });
  }

  function resetEnrollmentDraft(classId = currentClassId, groupId = currentGroupId) {
    setEnrollmentDraft({
      fullName: "",
      guardianName: "",
      guardianPhone: "",
      enrollmentType: "new",
      financeStatus: "regular",
      discountPercent: "0",
      exceptionStartMonth: paymentSettings.startMonth,
      exceptionEndMonth: paymentSettings.endMonth,
      exceptionReason: "",
      classId,
      groupId,
    });
  }

  function startNewGroup() {
    setActiveView("groups");
    resetGroupDraft(currentClassId);
  }

  function startNewEnrollment() {
    setActiveView("enrollments");
    resetEnrollmentDraft(currentClassId, currentGroupId);
  }

  function submitAcademicStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = academicStageDraft.name.trim();

    if (!trimmedName) {
      setStageDefinitionError("Informe o nome do nivel de ensino.");
      return;
    }

    const duplicateStage = academicStages.some(
      (stage) => normalizeText(stage.name) === normalizeText(trimmedName),
    );

    if (duplicateStage) {
      setStageDefinitionError("Ja existe um nivel com este nome.");
      return;
    }

    const newStage: AcademicStageDefinition = {
      id: nextStageDefinitionId(academicStages),
      name: trimmedName,
      status: academicStageDraft.status,
      createdAt: today(),
    };
    const nextStages = [...academicStages, newStage];

    setAcademicStages(nextStages);
    setClassDefinitionDraft((draft) => ({
      ...draft,
      stageId: draft.stageId || newStage.id,
    }));
    resetAcademicStageDraft();
  }

  function submitClassDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedId = classDefinitionDraft.id.trim().replace(/\s+/g, "").toUpperCase();
    const trimmedName = classDefinitionDraft.name.trim();
    const selectedStage = academicStages.find(
      (stage) => stage.id === classDefinitionDraft.stageId,
    );

    if (!trimmedId || !trimmedName || !selectedStage) {
      setClassDefinitionError("Informe a classe, o nome apresentado e o nivel.");
      return;
    }

    const duplicateClass = classDefinitions.some(
      (definition) =>
        definition.id === trimmedId ||
        normalizeText(definition.name) === normalizeText(trimmedName),
    );

    if (duplicateClass) {
      setClassDefinitionError("Ja existe uma classe com estes dados.");
      return;
    }

    const newDefinition: ClassDefinition = {
      id: trimmedId,
      name: trimmedName,
      stageId: selectedStage.id,
      status: classDefinitionDraft.status,
      createdAt: today(),
    };
    const nextDefinitions = [...classDefinitions, newDefinition];

    setClassDefinitions(nextDefinitions);
    setClassDraft((draft) => ({
      ...draft,
      definitionId: draft.definitionId || newDefinition.id,
    }));
    resetClassDefinitionDraft(academicStages);
  }

  function submitRoomDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = roomDefinitionDraft.name.trim();
    const trimmedBlock = roomDefinitionDraft.block.trim() || "Bloco principal";
    const capacity = Math.max(1, Number(roomDefinitionDraft.capacity) || 35);

    if (!trimmedName) {
      setRoomDefinitionError("Informe o nome da sala.");
      return;
    }

    const duplicateRoom = roomDefinitions.some(
      (room) => normalizeText(room.name) === normalizeText(trimmedName),
    );

    if (duplicateRoom) {
      setRoomDefinitionError("Ja existe uma sala com este nome.");
      return;
    }

    const newDefinition: RoomDefinition = {
      id: nextRoomDefinitionId(roomDefinitions),
      name: trimmedName,
      block: trimmedBlock,
      capacity,
      status: roomDefinitionDraft.status,
      createdAt: today(),
    };
    const nextDefinitions = [...roomDefinitions, newDefinition];

    setRoomDefinitions(nextDefinitions);
    setRoomDraft((draft) => ({
      ...draft,
      definitionId: draft.definitionId || newDefinition.id,
    }));
    resetRoomDefinitionDraft();
  }

  function toggleAcademicStageStatus(stageId: string) {
    setAcademicStages((items) =>
      items.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              status: stage.status === "active" ? "inactive" : "active",
            }
          : stage,
      ),
    );
  }

  function toggleClassDefinitionStatus(definitionId: string) {
    setClassDefinitions((items) =>
      items.map((definition) =>
        definition.id === definitionId
          ? {
              ...definition,
              status: definition.status === "active" ? "inactive" : "active",
            }
          : definition,
      ),
    );
  }

  function toggleRoomDefinitionStatus(definitionId: string) {
    setRoomDefinitions((items) =>
      items.map((definition) =>
        definition.id === definitionId
          ? {
              ...definition,
              status: definition.status === "active" ? "inactive" : "active",
            }
          : definition,
      ),
    );
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedDefinition = activeRoomDefinitions(roomDefinitions).find(
      (definition) => definition.id === roomDraft.definitionId,
    );

    if (!selectedDefinition) {
      setRoomError("Seleccione uma sala.");
      return;
    }

    const duplicateRoom = rooms.some(
      (room) => room.id === selectedDefinition.id,
    );

    if (duplicateRoom) {
      setRoomError("Esta sala ja esta disponivel para turmas.");
      return;
    }

    const newRoom: SchoolRoom = {
      id: selectedDefinition.id,
      name: selectedDefinition.name,
      block: selectedDefinition.block,
      capacity: selectedDefinition.capacity,
      status: roomDraft.status,
    };
    const nextRooms = [...rooms, newRoom];

    setRooms(nextRooms);
    setGroupDraft((draft) => ({
      ...draft,
      roomId: draft.roomId || newRoom.id,
      capacity: draft.roomId ? draft.capacity : String(newRoom.capacity),
    }));
    resetRoomDraft(nextRooms, roomDefinitions);
  }

  function openPaymentEntry(studentId?: string) {
    setActiveView("payments");
    setActivePaymentSection("entry");

    if (studentId) {
      setPaymentDraft((draft) => ({ ...draft, studentId }));
    }
  }

  function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedDefinition = activeClassDefinitions(
      classDefinitions,
      academicStages,
    ).find(
      (definition) => definition.id === classDraft.definitionId,
    );

    if (!selectedDefinition) {
      setClassError("Seleccione uma classe.");
      return;
    }

    const duplicateClass = classes.some(
      (schoolClass) => schoolClass.id === selectedDefinition.id,
    );

    if (duplicateClass) {
      setClassError("Esta classe ja existe na base do ano lectivo actual.");
      return;
    }

    const newClass: SchoolClass = {
      id: selectedDefinition.id,
      name: selectedDefinition.name,
      stage: stageLabel(academicStages, selectedDefinition.stageId),
      academicYear: currentAcademicYear(),
      status: classDraft.status,
      createdAt: today(),
    };
    const nextClasses = [...classes, newClass];

    setClasses(nextClasses);
    setSelectedClassId(newClass.id);
    setSelectedGroupId("");
    resetGroupDraft(newClass.id);
    resetEnrollmentDraft(newClass.id, "");
    resetClassDraft(nextClasses, classDefinitions, academicStages);
  }

  function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = groupDraft.name.trim();
    const selectedRoom = roomById(rooms, groupDraft.roomId);

    if (!trimmedName || !groupDraft.classId || !selectedRoom) {
      setGroupError("Informe a classe, a designacao da turma e seleccione a sala.");
      return;
    }

    const automaticGroupId = buildGroupId(groupDraft.classId, trimmedName);
    const duplicateGroup = groups.some((group) => group.id === automaticGroupId);

    if (duplicateGroup) {
      setGroupError("Ja existe uma turma com esta designacao para a classe.");
      return;
    }

    const newGroup: ClassGroup = {
      id: automaticGroupId,
      name: trimmedName,
      classId: groupDraft.classId,
      shift: groupDraft.shift,
      roomId: selectedRoom.id,
      capacity: selectedRoom.capacity,
      status: groupDraft.status,
      createdAt: today(),
    };

    setGroups((items) => [...items, newGroup]);
    setSelectedClassId(newGroup.classId);
    setSelectedGroupId(newGroup.id);
    setEnrollmentDraft((draft) => ({
      ...draft,
      classId: newGroup.classId,
      groupId: newGroup.id,
    }));
    resetGroupDraft(newGroup.classId);
  }

  function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = enrollmentDraft.fullName.trim();
    const selectedGroup = groups.find(
      (group) => group.id === enrollmentDraft.groupId,
    );

    if (!trimmedName || !selectedGroup) {
      setEnrollmentNotice("Escolha uma turma e informe o nome do aluno.");
      return;
    }

    const newStudent: Student = {
      id: nextId(students, "ALU"),
      registrationNumber: nextRegistrationNumber(students),
      fullName: trimmedName,
      guardianName: enrollmentDraft.guardianName.trim() || "Por registar",
      guardianPhone: enrollmentDraft.guardianPhone.trim() || "Por registar",
      enrollmentType: enrollmentDraft.enrollmentType,
      financialProfile: {
        status: enrollmentDraft.financeStatus,
        discountPercent:
          enrollmentDraft.financeStatus === "regular"
            ? 0
            : enrollmentDraft.financeStatus === "scholarship"
              ? 100
              : clampPercent(parseMoney(enrollmentDraft.discountPercent)),
        startMonth:
          enrollmentDraft.financeStatus === "regular"
            ? undefined
            : enrollmentDraft.exceptionStartMonth,
        endMonth:
          enrollmentDraft.financeStatus === "regular"
            ? undefined
            : enrollmentDraft.exceptionEndMonth,
        reason: enrollmentDraft.exceptionReason.trim() || undefined,
      },
      classId: selectedGroup.classId,
      groupId: selectedGroup.id,
      createdAt: today(),
    };

    setStudents((items) => [...items, newStudent]);
    setPaymentRecords((items) => [...items, buildPaymentRecord(newStudent.id)]);
    setPaymentDraft((draft) => ({
      ...draft,
      studentId: newStudent.id,
      category: "registration",
      amount: String(paymentSettings.inscriptionRenewalFee),
    }));
    setSelectedClassId(newStudent.classId);
    setSelectedGroupId(newStudent.groupId);
    setEnrollmentNotice(
      `${newStudent.registrationNumber} criada. O pagamento de inscricao/renovacao ficou pronto para lancamento.`,
    );
    resetEnrollmentDraft(newStudent.classId, newStudent.groupId);
  }

  function toggleClassStatus(classId: string) {
    setClasses((items) =>
      items.map((schoolClass) =>
        schoolClass.id === classId
          ? {
              ...schoolClass,
              status: schoolClass.status === "active" ? "inactive" : "active",
            }
          : schoolClass,
      ),
    );
  }

  function toggleGroupStatus(groupId: string) {
    setGroups((items) =>
      items.map((group) =>
        group.id === groupId
          ? {
              ...group,
              status: group.status === "active" ? "inactive" : "active",
            }
          : group,
      ),
    );
  }

  function toggleRoomStatus(roomId: string) {
    setRooms((items) =>
      items.map((room) =>
        room.id === roomId
          ? {
              ...room,
              status: room.status === "active" ? "inactive" : "active",
            }
          : room,
      ),
    );
  }

  function changeEnrollmentClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setEnrollmentDraft((draft) => ({
      ...draft,
      classId,
      groupId: nextGroup?.id ?? "",
    }));
  }

  function submitFinanceSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSettings: PaymentSettings = {
      academicYear: financeSettingsDraft.academicYear.trim() || "2026",
      inscriptionRenewalFee: parseMoney(
        financeSettingsDraft.inscriptionRenewalFee,
      ),
      monthlyFee: parseMoney(financeSettingsDraft.monthlyFee),
      startMonth: financeSettingsDraft.startMonth,
      endMonth: financeSettingsDraft.endMonth,
      firstPenaltyDay: Math.max(
        1,
        Math.min(31, Number(financeSettingsDraft.firstPenaltyDay) || 1),
      ),
      firstPenaltyAmount: parseMoney(financeSettingsDraft.firstPenaltyAmount),
      secondPenaltyDay: Math.max(
        1,
        Math.min(31, Number(financeSettingsDraft.secondPenaltyDay) || 1),
      ),
      secondPenaltyAmount: parseMoney(financeSettingsDraft.secondPenaltyAmount),
    };

    setPaymentSettings(nextSettings);
    setBillingMonthKey(nextSettings.startMonth);
    setPaymentDraft((draft) => ({
      ...draft,
      monthKey: nextSettings.startMonth,
      amount:
        draft.category === "tuition"
          ? String(nextSettings.monthlyFee)
          : draft.category === "registration"
            ? String(nextSettings.inscriptionRenewalFee)
            : draft.amount,
    }));
    setFinanceSettingsNotice("Regras financeiras actualizadas.");
  }

  function selectFinanceStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);

    setFinanceProfileDraft(buildFinanceProfileDraft(student, paymentSettings));
    setFinanceNotice("");
  }

  function submitFinanceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!financeProfileDraft.studentId) {
      setFinanceNotice("Seleccione um aluno para aplicar a regra.");
      return;
    }

    const status = financeProfileDraft.status;
    const discountPercent =
      status === "regular"
        ? 0
        : status === "scholarship"
          ? 100
          : clampPercent(parseMoney(financeProfileDraft.discountPercent));

    setStudents((items) =>
      items.map((student) =>
        student.id === financeProfileDraft.studentId
          ? {
              ...student,
              financialProfile: {
                status,
                discountPercent,
                startMonth:
                  status === "regular" ? undefined : financeProfileDraft.startMonth,
                endMonth:
                  status === "regular" ? undefined : financeProfileDraft.endMonth,
                reason: financeProfileDraft.reason.trim() || undefined,
              },
            }
          : student,
      ),
    );
    setFinanceProfileDraft((draft) => ({
      ...draft,
      discountPercent: String(discountPercent),
    }));
    setFinanceNotice("Situacao financeira do aluno actualizada.");
  }

  function generateMonthlyBilling() {
    if (!currentClassId || !currentGroupId || visiblePaymentRows.length === 0) {
      setBillingNotice("Escolha uma turma com alunos antes de gerar mensalidades.");
      return;
    }

    if (selectedMonthBillingRun) {
      setBillingNotice(
        `${selectedMonth?.label ?? "Mes"} ja foi gerado para esta turma.`,
      );
      return;
    }

    const chargedRows = visiblePaymentRows.filter((row) => {
      const month = row.ledger.monthly.find(
        (item) => item.month.key === billingMonthKey,
      );

      return (month?.due ?? 0) > 0;
    });
    const exemptedRows = visiblePaymentRows.filter((row) => {
      const month = row.ledger.monthly.find(
        (item) => item.month.key === billingMonthKey,
      );

      return (month?.due ?? 0) === 0;
    });
    const newRun: BillingRun = {
      id: nextId(billingRuns, "BILL"),
      classId: currentClassId,
      groupId: currentGroupId,
      monthKey: billingMonthKey,
      studentIds: chargedRows.map((row) => row.student.id),
      exemptedStudentIds: exemptedRows.map((row) => row.student.id),
      amount: paymentSettings.monthlyFee,
      expectedTotal: selectedMonthExpected,
      createdAt: nowIso(),
    };

    setBillingRuns((items) => [newRun, ...items]);
    setBillingNotice(
      `${selectedMonth?.label ?? "Mes"} gerado: ${newRun.studentIds.length} alunos cobrados e ${newRun.exemptedStudentIds.length} isentos.`,
    );
  }

  function launchPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseMoney(paymentDraft.amount);
    const paymentDate = new Date();
    const paidDay = paymentDate.getDate();
    const paidAt = paymentDate.toISOString();
    const paymentDetails: PaymentDetails = {
      paidDay,
      paidAt,
      method: paymentDraft.method,
      reference: paymentDraft.reference.trim(),
    };

    if (!paymentDraft.studentId || amount <= 0) {
      return;
    }

    setPaymentRecords((items) => {
      const existingRecord =
        items.find((record) => record.studentId === paymentDraft.studentId) ??
        buildPaymentRecord(paymentDraft.studentId);
      const nextRecord: StudentPaymentRecord = {
        ...existingRecord,
        inscriptionRenewal: { ...existingRecord.inscriptionRenewal },
        monthlyPayments: { ...existingRecord.monthlyPayments },
        miscellaneousPayments: [
          ...(existingRecord.miscellaneousPayments ?? []),
        ],
      };
      const student = students.find((item) => item.id === paymentDraft.studentId);

      if (paymentDraft.category === "registration") {
        const registrationBalance = Math.max(
          0,
          paymentSettings.inscriptionRenewalFee -
            nextRecord.inscriptionRenewal.amount,
        );
        const registrationAmount = Math.min(amount, registrationBalance);
        const surplusAmount = amount - registrationAmount;

        if (registrationAmount > 0) {
          nextRecord.inscriptionRenewal = {
            ...nextRecord.inscriptionRenewal,
            amount: nextRecord.inscriptionRenewal.amount + registrationAmount,
            ...paymentDetails,
          };
        }

        if (surplusAmount > 0) {
          if (student) {
            distributeMonthlyPayment(
              nextRecord,
              student,
              paymentSettings.startMonth,
              surplusAmount,
              paymentMonths,
              paymentSettings,
              advancePaymentDetails(paymentDetails, paymentSettings),
            );
          } else {
            nextRecord.inscriptionRenewal = {
              ...nextRecord.inscriptionRenewal,
              amount: nextRecord.inscriptionRenewal.amount + surplusAmount,
              ...paymentDetails,
            };
          }
        }
      } else if (paymentDraft.category === "tuition") {
        if (student) {
          distributeMonthlyPayment(
            nextRecord,
            student,
            paymentDraft.monthKey,
            amount,
            paymentMonths,
            paymentSettings,
            paymentDetails,
          );
        } else {
          addMonthlyPayment(
            nextRecord,
            paymentDraft.monthKey,
            amount,
            paymentDetails,
          );
        }
      } else {
        nextRecord.miscellaneousPayments = [
          {
            amount,
            ...paymentDetails,
            description: paymentDraft.description.trim() || "Pagamento diverso",
          },
          ...nextRecord.miscellaneousPayments,
        ];
      }

      if (items.some((record) => record.studentId === paymentDraft.studentId)) {
        return items.map((record) =>
          record.studentId === paymentDraft.studentId ? nextRecord : record,
        );
      }

      return [...items, nextRecord];
    });

    setPaymentDraft((draft) => ({
      ...draft,
      amount:
        draft.category === "tuition"
          ? String(paymentSettings.monthlyFee)
          : draft.category === "registration"
            ? String(paymentSettings.inscriptionRenewalFee)
            : "0",
      reference: "",
      description: draft.category === "miscellaneous" ? "" : draft.description,
    }));
  }

  if (!activeProfile) {
    return renderProfilePortal();
  }

  if (!isOperationalProfile(activeProfile)) {
    return renderLimitedProfile();
  }

  return renderWorkspace();

  function renderProfilePortal() {
    return (
      <main className="min-h-screen bg-white text-slate-950">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <header className="border-b-2 border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid size-20 place-items-center rounded-md border-2 border-[#0b6b2a] bg-white text-center text-sm font-black leading-tight text-[#0b6b2a]">
                GA
              </div>
              <div className="border-l-4 border-[#238343] pl-4">
                <p className="text-3xl font-black tracking-[0.28em] text-[#0b8a32]">
                  Gestao Academica
                </p>
                <h1 className="mt-1 text-xl font-semibold uppercase text-slate-950">
                  Sistema de Gestao Academica
                </h1>
                <p className="text-base uppercase text-slate-700">
                  Liceu Sao Silvestre - Maputo, Mocambique
                </p>
              </div>
            </div>

            <nav className="mt-5 grid overflow-hidden border-y border-slate-700 text-sm font-semibold uppercase text-slate-700 sm:grid-cols-4">
              {["Inicio", "Perfis", "Acessos", "Contactos"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="min-h-12 border-slate-300 px-4 transition-colors hover:bg-slate-100 sm:border-r last:sm:border-r-0"
                >
                  {item}
                </button>
              ))}
            </nav>
          </header>

          <section className="mt-4 border border-slate-200 px-4 py-7 sm:px-6 lg:px-10">
            <h2 className="text-4xl font-semibold text-slate-950">
              Bem-vindo a Gestao Academica
            </h2>
            <div className="mt-8 flex items-center gap-6">
              <h3 className="text-2xl font-semibold text-slate-950">Acessos</h3>
              <div className="h-px flex-1 bg-slate-700" />
            </div>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              Cada perfil apresenta apenas os menus e funcoes adequadas a
              responsabilidade do utilizador.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onOpen={() => enterProfile(profile.id)}
                />
              ))}
            </div>
          </section>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-slate-800 py-3 text-sm">
            <p>Copyright (c) 2026 Gestao Academica</p>
            <p>Email: secretaria@gestaoacademica.co.mz</p>
          </footer>
        </div>
      </main>
    );
  }

  function renderLimitedProfile() {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setActiveProfile(null)}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar aos perfis
          </button>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <div
                className={cx(
                  "grid size-14 place-items-center rounded-md text-sm font-black",
                  selectedProfile.surface,
                )}
              >
                {selectedProfile.glyph}
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#185c54]">
                  Perfil
                </p>
                <h1 className="mt-1 text-3xl font-bold">
                  {selectedProfile.title}
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  {selectedProfile.description}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {selectedProfile.permissions.map((permission) => (
                <div
                  key={permission}
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {permission}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton onClick={() => setActiveProfile(null)}>
                Voltar aos perfis
              </PrimaryButton>
            </div>
          </section>
        </div>
      </main>
    );
  }

  function renderWorkspace() {
    const visibleNavigation = workspaceNavigation.filter((item) =>
      item.profiles.includes(selectedProfile.id),
    );
    const activeNavigation =
      visibleNavigation.find((item) => item.id === activeView) ??
      visibleNavigation[0] ??
      workspaceNavigation[0];
    const canManageAcademics =
      selectedProfile.id === "administrador" || selectedProfile.id === "secretaria";
    const canManagePayments =
      selectedProfile.id === "administrador" ||
      selectedProfile.id === "secretaria" ||
      selectedProfile.id === "caixa";
    const showAcademicContext =
      selectedProfile.id === "administrador" || selectedProfile.id === "secretaria";

    return (
      <main className="min-h-screen bg-[#f4f7f8] text-slate-950">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-md bg-[#185c54] text-sm font-black text-white">
                GA
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#185c54]">
                  Gestao Academica
                </p>
                <h1 className="text-xl font-bold">{selectedProfile.title}</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveProfile(null)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="mx-auto grid min-h-[calc(100vh-81px)] max-w-[1500px] lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-slate-200 bg-white px-4 py-5 lg:sticky lg:top-0 lg:h-[calc(100vh-81px)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <div
                className={cx(
                  "grid size-12 place-items-center rounded-md text-sm font-black",
                  selectedProfile.surface,
                )}
              >
                {selectedProfile.glyph}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Perfil activo
                </p>
                <p className="font-bold text-slate-950">
                  {selectedProfile.title}
                </p>
              </div>
            </div>

            <nav className="mt-5 grid gap-2">
              {visibleNavigation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={activeView === item.id ? "page" : undefined}
                  onClick={() => setActiveView(item.id)}
                  className={cx(
                    "flex min-h-11 items-center rounded-md px-3 text-left text-sm font-semibold transition-colors",
                    activeView === item.id
                      ? "bg-[#e8f5f2] text-[#185c54] ring-1 ring-[#c9e6df]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {showAcademicContext && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Seleccao actual
                </p>
                <div className="mt-3 grid gap-3 text-sm">
                  <SummaryMini
                    label="Classe"
                    value={currentClass?.name ?? "Sem classe"}
                  />
                  <SummaryMini
                    label="Turma"
                    value={currentGroup?.name ?? "Sem turma"}
                  />
                  <SummaryMini
                    label="Mensalidade"
                    value={formatCurrency(paymentSettings.monthlyFee)}
                  />
                </div>
              </div>
            )}
          </aside>

          <div className="min-w-0">
            <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#185c54]">
                    {selectedProfile.title}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    {activeNavigation.label}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManageAcademics && (
                    <>
                      <SecondaryButton onClick={startNewGroup}>
                        Nova turma
                      </SecondaryButton>
                      <SecondaryButton onClick={startNewEnrollment}>
                        Matricula
                      </SecondaryButton>
                    </>
                  )}
                  {canManagePayments && (
                    <PrimaryButton
                      onClick={() => {
                        setActiveView("payments");
                        setActivePaymentSection("entry");
                      }}
                    >
                      Mensalidades
                    </PrimaryButton>
                  )}
                </div>
              </div>

              {showAcademicContext && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <CrumbButton onClick={() => setActiveView("classes")}>
                    {currentClass?.name ?? "Classe"}
                  </CrumbButton>
                  <span className="text-slate-400">/</span>
                  <CrumbButton onClick={() => setActiveView("groups")}>
                    {currentGroup?.name ?? "Turma"}
                  </CrumbButton>
                  <span className="text-slate-400">/</span>
                  <CrumbButton onClick={() => setActiveView("enrollments")}>
                    Matriculas
                  </CrumbButton>
                  <span className="text-slate-400">/</span>
                  <CrumbButton onClick={() => setActiveView("payments")}>
                    Mensalidades
                  </CrumbButton>
                </div>
              )}
            </header>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
              {activeView === "overview" && renderOverview()}
              {activeView === "catalog" && renderCatalog()}
              {activeView === "classes" && renderClasses()}
              {activeView === "rooms" && renderRooms()}
              {activeView === "groups" && renderGroups()}
              {activeView === "enrollments" && renderEnrollments()}
              {activeView === "payments" && renderPayments()}
              {activeView === "reports" && renderReports()}
              {activeView === "profiles" && renderProfiles()}
            </div>
          </div>
        </div>
      </main>
    );
  }

  function renderOverview() {
    const canManageAcademics =
      selectedProfile.id === "administrador" || selectedProfile.id === "secretaria";
    const canManagePayments =
      selectedProfile.id === "administrador" ||
      selectedProfile.id === "secretaria" ||
      selectedProfile.id === "caixa";

    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Classes"
            value={classes.length}
            supporting={`${activeClassesTotal} activas`}
            accent="border-l-[#178f7f]"
          />
          <MetricCard
            label="Turmas"
            value={groups.length}
            supporting={`${activeGroupsTotal} activas`}
            accent="border-l-[#25965a]"
          />
          <MetricCard
            label="Matriculas"
            value={students.length}
            supporting={`${visibleStudents.length} na turma actual`}
            accent="border-l-[#2867d8]"
          />
          <MetricCard
            label="Salas"
            value={rooms.length}
            supporting={`${activeRooms(rooms).length} activas`}
            accent="border-l-[#d08a19]"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">
                  {canManageAcademics ? "Academico" : "Caixa"}
                </h3>
              </div>
              {canManagePayments && (
                <PrimaryButton
                  onClick={() => {
                    setActiveView("payments");
                    setActivePaymentSection("entry");
                  }}
                >
                  Gerar mensalidades
                </PrimaryButton>
              )}
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-5">
              {canManageAcademics && (
                <>
                  <FlowStep
                    number="01"
                    title="Classes"
                    onClick={() => setActiveView("classes")}
                  />
                  <FlowStep
                    number="02"
                    title="Salas"
                    onClick={() => setActiveView("rooms")}
                  />
                  <FlowStep
                    number="03"
                    title="Turmas"
                    onClick={() => setActiveView("groups")}
                  />
                  <FlowStep
                    number="04"
                    title="Matriculas"
                    onClick={() => setActiveView("enrollments")}
                  />
                </>
              )}
              {canManagePayments && (
                <FlowStep
                  number={canManageAcademics ? "05" : "01"}
                  title="Mensalidades"
                  onClick={() => {
                    setActiveView("payments");
                    setActivePaymentSection("entry");
                  }}
                />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Salas</h3>
            </div>
            <div className="grid gap-3 p-5">
              {rooms.length > 0 ? (
                rooms.slice(0, 4).map((room) => (
                  <SummaryLine
                    key={room.id}
                    label={room.name}
                    value={`${room.block} / ${room.capacity} lugares`}
                  />
                ))
              ) : (
                <p className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  Sem salas.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Mapa escolar</h3>
            </div>
            {canManageAcademics && (
              <SecondaryButton onClick={() => setActiveView("classes")}>
                Ver classes
              </SecondaryButton>
            )}
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ano lectivo</th>
                  <th className="px-5 py-3 font-semibold">Classe</th>
                  <th className="px-5 py-3 font-semibold">Ensino</th>
                  <th className="px-5 py-3 font-semibold">Turmas</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Accao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classesWithStats.length > 0 ? (
                  classesWithStats.map((schoolClass) => (
                    <tr key={schoolClass.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold">
                        {schoolClass.academicYear}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {schoolClass.name}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.stage}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.groupsTotal}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.studentsTotal}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={schoolClass.status} />
                      </td>
                      <td className="px-5 py-4">
                        <TextButton
                          onClick={() => {
                            selectClass(schoolClass.id);
                            setActiveView("groups");
                          }}
                        >
                          Ver turmas
                        </TextButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Sem classes activadas no ano lectivo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderCatalog() {
    const sortedStages = sortByName(academicStages);
    const sortedClassDefinitions = sortByName(classDefinitions);
    const sortedRoomDefinitions = sortByName(roomDefinitions);
    const selectableStages = activeAcademicStages(academicStages);

    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Niveis"
            value={academicStages.length}
            supporting={`${selectableStages.length} activos`}
            accent="border-l-[#8b5cf6]"
          />
          <MetricCard
            label="Classes"
            value={classDefinitions.length}
            supporting={`${activeClassDefinitions(classDefinitions, academicStages).length} activas`}
            accent="border-l-[#178f7f]"
          />
          <MetricCard
            label="Salas"
            value={roomDefinitions.length}
            supporting={`${activeRoomDefinitions(roomDefinitions).length} activas`}
            accent="border-l-[#d08a19]"
          />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Parametros academicos</h3>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Niveis de ensino</h3>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nivel</th>
                    <th className="px-5 py-3 font-semibold">Criacao</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Accoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStages.length > 0 ? (
                    sortedStages.map((stage) => (
                      <tr key={stage.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-semibold">{stage.name}</td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDate(stage.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={stage.status} />
                        </td>
                        <td className="px-5 py-4">
                          <TextButton
                            onClick={() => toggleAcademicStageStatus(stage.id)}
                          >
                            {stage.status === "active" ? "Desactivar" : "Activar"}
                          </TextButton>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        Sem niveis.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <form
            onSubmit={submitAcademicStage}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h3 className="text-base font-semibold">Definir nivel</h3>
            </div>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Nome do nivel">
                <input
                  value={academicStageDraft.name}
                  onChange={(event) => {
                    setStageDefinitionError("");
                    setAcademicStageDraft({
                      ...academicStageDraft,
                      name: event.target.value,
                    });
                  }}
                  className={inputClasses()}
                  placeholder="Ex.: Ensino Secundario"
                />
              </FieldLabel>
              <FieldLabel label="Estado">
                <select
                  value={academicStageDraft.status}
                  onChange={(event) =>
                    setAcademicStageDraft({
                      ...academicStageDraft,
                      status: event.target.value as EntityStatus,
                    })
                  }
                  className={inputClasses()}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>
            {stageDefinitionError && (
              <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {stageDefinitionError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <PrimaryButton type="submit">Guardar nivel</PrimaryButton>
              <SecondaryButton onClick={resetAcademicStageDraft}>
                Limpar
              </SecondaryButton>
            </div>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Classes por nivel</h3>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Classe</th>
                    <th className="px-5 py-3 font-semibold">Nivel</th>
                    <th className="px-5 py-3 font-semibold">Codigo</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Accoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClassDefinitions.length > 0 ? (
                    sortedClassDefinitions.map((definition) => (
                      <tr key={definition.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-semibold">
                          {definition.name}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {stageLabel(academicStages, definition.stageId)}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">
                          {definition.id}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={definition.status} />
                        </td>
                        <td className="px-5 py-4">
                          <TextButton
                            onClick={() => toggleClassDefinitionStatus(definition.id)}
                          >
                            {definition.status === "active" ? "Desactivar" : "Activar"}
                          </TextButton>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        Sem classes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <form
            onSubmit={submitClassDefinition}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h3 className="text-base font-semibold">Definir classe</h3>
            </div>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Classe">
                <input
                  value={classDefinitionDraft.id}
                  onChange={(event) => {
                    setClassDefinitionError("");
                    setClassDefinitionDraft({
                      ...classDefinitionDraft,
                      id: event.target.value,
                    });
                  }}
                  className={inputClasses()}
                  placeholder="Ex.: 10"
                />
              </FieldLabel>
              <FieldLabel label="Nome apresentado">
                <input
                  value={classDefinitionDraft.name}
                  onChange={(event) => {
                    setClassDefinitionError("");
                    setClassDefinitionDraft({
                      ...classDefinitionDraft,
                      name: event.target.value,
                    });
                  }}
                  className={inputClasses()}
                  placeholder="Ex.: 10a Classe"
                />
              </FieldLabel>
              <FieldLabel label="Nivel de ensino">
                <select
                  value={classDefinitionDraft.stageId}
                  onChange={(event) =>
                    setClassDefinitionDraft({
                      ...classDefinitionDraft,
                      stageId: event.target.value,
                    })
                  }
                  className={inputClasses()}
                  disabled={selectableStages.length === 0}
                >
                  {selectableStages.length > 0 ? (
                    selectableStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Defina um nivel primeiro</option>
                  )}
                </select>
              </FieldLabel>
              <FieldLabel label="Estado">
                <select
                  value={classDefinitionDraft.status}
                  onChange={(event) =>
                    setClassDefinitionDraft({
                      ...classDefinitionDraft,
                      status: event.target.value as EntityStatus,
                    })
                  }
                  className={inputClasses()}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>
            {classDefinitionError && (
              <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {classDefinitionError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={selectableStages.length === 0}>
                Guardar classe
              </PrimaryButton>
              <SecondaryButton onClick={() => resetClassDefinitionDraft()}>
                Limpar
              </SecondaryButton>
            </div>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Salas da instituicao</h3>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sala</th>
                    <th className="px-5 py-3 font-semibold">Bloco</th>
                    <th className="px-5 py-3 font-semibold">Lotacao</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Accoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRoomDefinitions.length > 0 ? (
                    sortedRoomDefinitions.map((definition) => (
                      <tr key={definition.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-semibold">
                          {definition.name}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {definition.block}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {definition.capacity}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={definition.status} />
                        </td>
                        <td className="px-5 py-4">
                          <TextButton
                            onClick={() => toggleRoomDefinitionStatus(definition.id)}
                          >
                            {definition.status === "active" ? "Desactivar" : "Activar"}
                          </TextButton>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        Sem salas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <form
            onSubmit={submitRoomDefinition}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h3 className="text-base font-semibold">Definir sala</h3>
            </div>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Nome da sala">
                <input
                  value={roomDefinitionDraft.name}
                  onChange={(event) => {
                    setRoomDefinitionError("");
                    setRoomDefinitionDraft({
                      ...roomDefinitionDraft,
                      name: event.target.value,
                    });
                  }}
                  className={inputClasses()}
                  placeholder="Ex.: Sala 01"
                />
              </FieldLabel>
              <FieldLabel label="Bloco">
                <input
                  value={roomDefinitionDraft.block}
                  onChange={(event) =>
                    setRoomDefinitionDraft({
                      ...roomDefinitionDraft,
                      block: event.target.value,
                    })
                  }
                  className={inputClasses()}
                  placeholder="Ex.: Bloco A"
                />
              </FieldLabel>
              <FieldLabel label="Lotacao">
                <input
                  value={roomDefinitionDraft.capacity}
                  onChange={(event) =>
                    setRoomDefinitionDraft({
                      ...roomDefinitionDraft,
                      capacity: event.target.value,
                    })
                  }
                  className={inputClasses()}
                  min="1"
                  type="number"
                />
              </FieldLabel>
              <FieldLabel label="Estado">
                <select
                  value={roomDefinitionDraft.status}
                  onChange={(event) =>
                    setRoomDefinitionDraft({
                      ...roomDefinitionDraft,
                      status: event.target.value as EntityStatus,
                    })
                  }
                  className={inputClasses()}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>
            {roomDefinitionError && (
              <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {roomDefinitionError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <PrimaryButton type="submit">Guardar sala</PrimaryButton>
              <SecondaryButton onClick={resetRoomDefinitionDraft}>
                Limpar
              </SecondaryButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderClasses() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Classes</h3>
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ano lectivo</th>
                  <th className="px-5 py-3 font-semibold">Classe</th>
                  <th className="px-5 py-3 font-semibold">Ensino</th>
                  <th className="px-5 py-3 font-semibold">Criacao</th>
                  <th className="px-5 py-3 font-semibold">Turmas</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Accoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classesWithStats.length > 0 ? (
                  classesWithStats.map((schoolClass) => (
                    <tr
                      key={schoolClass.id}
                      className={cx(
                        "hover:bg-slate-50/80",
                        selectedClassId === schoolClass.id && "bg-teal-50/50",
                      )}
                    >
                      <td className="px-5 py-4 font-mono text-sm font-semibold">
                        {schoolClass.academicYear}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {schoolClass.name}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.stage}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(schoolClass.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.groupsTotal}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {schoolClass.studentsTotal}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={schoolClass.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <TextButton
                            onClick={() => {
                              selectClass(schoolClass.id);
                              setActiveView("groups");
                            }}
                          >
                            Turmas
                          </TextButton>
                          <TextButton
                            onClick={() => toggleClassStatus(schoolClass.id)}
                          >
                            {schoolClass.status === "active" ? "Desactivar" : "Activar"}
                          </TextButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      Sem classes activadas no ano lectivo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ClassForm
          academicYear={currentAcademicYear()}
          availableDefinitions={availableClassDefinitions(
            classes,
            classDefinitions,
            academicStages,
          )}
          draft={classDraft}
          error={classError}
          stages={academicStages}
          onChange={(draft) => {
            setClassError("");
            setClassDraft(draft);
          }}
          onReset={() => resetClassDraft()}
          onSubmit={submitClass}
        />
      </div>
    );
  }

  function renderRooms() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Salas</h3>
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Bloco</th>
                  <th className="px-5 py-3 font-semibold">Lotacao</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Accoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.length > 0 ? (
                  rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold">{room.name}</td>
                      <td className="px-5 py-4 text-slate-700">{room.block}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {room.capacity}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={room.status} />
                      </td>
                      <td className="px-5 py-4">
                        <TextButton onClick={() => toggleRoomStatus(room.id)}>
                          {room.status === "active" ? "Desactivar" : "Activar"}
                        </TextButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Sem salas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <RoomForm
          availableRooms={availableRoomDefinitions(rooms, roomDefinitions)}
          draft={roomDraft}
          error={roomError}
          onChange={(draft) => {
            setRoomError("");
            setRoomDraft(draft);
          }}
          onReset={() => resetRoomDraft()}
          onSubmit={submitRoom}
        />
      </div>
    );
  }

  function renderGroups() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Turmas</h3>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Seleccione uma classe"}.
              </p>
            </div>
            <select
              value={currentClassId}
              onChange={(event) => selectClass(event.target.value)}
              className={cx(inputClasses(), "max-w-60")}
              aria-label="Seleccionar classe"
              disabled={classes.length === 0}
            >
              {classes.length > 0 ? (
                sortClasses(classes).map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))
              ) : (
                <option value="">Sem classes</option>
              )}
            </select>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">N.</th>
                  <th className="px-5 py-3 font-semibold">Turma</th>
                  <th className="px-5 py-3 font-semibold">Turno</th>
                  <th className="px-5 py-3 font-semibold">Sala</th>
                  <th className="px-5 py-3 font-semibold">Lotacao</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Accoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupsWithStats.length > 0 ? (
                  groupsWithStats.map((group, index) => (
                    <tr
                      key={group.id}
                      className={cx(
                        "hover:bg-slate-50/80",
                        currentGroupId === group.id && "bg-teal-50/50",
                      )}
                    >
                      <td className="px-5 py-4 font-mono text-sm font-semibold">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4 font-semibold">{group.name}</td>
                      <td className="px-5 py-4 text-slate-700">{group.shift}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {roomLabel(rooms, group.roomId)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {group.capacity}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {group.studentsTotal}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={group.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <TextButton
                            onClick={() => {
                              selectGroup(group.id);
                              setActiveView("enrollments");
                            }}
                          >
                            Matriculas
                          </TextButton>
                          <TextButton onClick={() => toggleGroupStatus(group.id)}>
                            {group.status === "active" ? "Desactivar" : "Activar"}
                          </TextButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      Sem turmas padronizadas nesta classe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <GroupForm
          classes={classes}
          draft={groupDraft}
          error={groupError}
          rooms={activeRooms(rooms)}
          onChange={(draft) => {
            setGroupError("");
            setGroupDraft(draft);
          }}
          onReset={() => resetGroupDraft(currentClassId)}
          onSubmit={submitGroup}
        />
      </div>
    );
  }

  function renderEnrollments() {
    const draftGroups = sortByName(
      groups.filter((group) => group.classId === enrollmentDraft.classId),
    );

    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Matriculas</h3>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Sem classe"} /{" "}
                {currentGroup?.name ?? "Sem turma"}.
              </p>
            </div>
            <PrimaryButton onClick={startNewEnrollment}>
              Matricula
            </PrimaryButton>
          </div>

          <StudentFilters
            classes={classes}
            currentClassId={currentClassId}
            currentGroupId={currentGroupId}
            groupsForCurrentClass={groupsForCurrentClass}
            onClassChange={selectClass}
            onGroupChange={selectGroup}
            onSearchChange={setStudentSearch}
            search={studentSearch}
          />

          <div className="table-scroll">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">N.</th>
                  <th className="px-5 py-3 font-semibold">Aluno</th>
                  <th className="px-5 py-3 font-semibold">Matricula</th>
                  <th className="px-5 py-3 font-semibold">Encarregado</th>
                  <th className="px-5 py-3 font-semibold">Financas</th>
                  <th className="px-5 py-3 font-semibold">Criacao</th>
                  <th className="px-5 py-3 font-semibold">Accoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.length > 0 ? (
                  visibleStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-semibold">
                          {student.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {student.guardianPhone}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {student.registrationNumber}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {student.guardianName}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <span className="block font-semibold">
                          {financeStatusLabel(student.financialProfile.status)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {student.financialProfile.status === "regular"
                            ? "Sem desconto"
                            : `${student.financialProfile.discountPercent}% / ${monthLabel(student.financialProfile.startMonth)}-${monthLabel(student.financialProfile.endMonth)}`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        {selectedProfile.id === "administrador" ? (
                          <TextButton onClick={() => openPaymentEntry(student.id)}>
                            Pagamentos
                          </TextButton>
                        ) : (
                          <span className="text-sm font-semibold text-slate-500">
                            Matriculado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Sem alunos para os filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <EnrollmentForm
          classes={classes}
          draft={enrollmentDraft}
          groups={draftGroups}
          notice={enrollmentNotice}
          onChange={(draft) => {
            setEnrollmentNotice("");
            setEnrollmentDraft(draft);
          }}
          onClassChange={changeEnrollmentClass}
          onReset={() => resetEnrollmentDraft(currentClassId, currentGroupId)}
          onSubmit={submitEnrollment}
        />
      </div>
    );
  }

  function renderPayments() {
    const selectedPaymentStudent =
      allStudentsAlphabetically.find(
        (student) => student.id === paymentDraft.studentId,
      ) ?? allStudentsAlphabetically[0];
    const selectedPaymentRow = selectedPaymentStudent
      ? allPaymentRows.find((row) => row.student.id === selectedPaymentStudent.id)
      : undefined;
    const visiblePaymentSections = paymentSections.filter((section) =>
      section.profiles.includes(selectedProfile.id),
    );
    const currentPaymentSection =
      visiblePaymentSections.find((section) => section.id === activePaymentSection) ??
      visiblePaymentSections[0];
    const canEditPaymentRules =
      selectedProfile.id === "administrador" || selectedProfile.id === "caixa";

    return (
      <div className="grid gap-6">
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {visiblePaymentSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActivePaymentSection(section.id)}
              className={cx(
                "min-h-11 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors",
                currentPaymentSection?.id === section.id
                  ? "bg-[#185c54] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {currentPaymentSection?.id === "settings" && (
          canEditPaymentRules ? (
            <FinanceSettingsForm
              draft={financeSettingsDraft}
              notice={financeSettingsNotice}
              onChange={(draft) => {
                setFinanceSettingsNotice("");
                setFinanceSettingsDraft(draft);
              }}
              onSubmit={submitFinanceSettings}
            />
          ) : (
            <PaymentSettingsSummary settings={paymentSettings} />
          )
        )}

        {currentPaymentSection?.id === "student-rules" && canEditPaymentRules && (
          <StudentFinanceForm
            draft={financeProfileDraft}
            notice={financeNotice}
            students={allStudentsAlphabetically}
            onChange={(draft) => {
              setFinanceNotice("");
              setFinanceProfileDraft(draft);
            }}
            onStudentChange={selectFinanceStudent}
            onSubmit={submitFinanceProfile}
          />
        )}

        {currentPaymentSection?.id === "entry" && (
          <div className="grid gap-6">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold">Gerar propinas</h3>
                  <p className="text-sm text-slate-500">
                    Preparacao mensal da cobranca por turma.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={billingMonthKey}
                    onChange={(event) => {
                      setBillingMonthKey(event.target.value);
                      setPaymentDraft((draft) => ({
                        ...draft,
                        monthKey: event.target.value,
                      }));
                      setBillingNotice("");
                    }}
                    className={cx(inputClasses(), "w-44")}
                    aria-label="Mes de mensalidade"
                  >
                    {paymentMonths.map((month) => (
                      <option key={month.key} value={month.key}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <PrimaryButton onClick={generateMonthlyBilling}>
                    Gerar propinas
                  </PrimaryButton>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Previsto"
                  value={formatCurrency(selectedMonthExpected)}
                  supporting={`${visiblePaymentRows.length} alunos`}
                  accent="border-l-[#2867d8]"
                />
                <MetricCard
                  label="Pago aplicado"
                  value={formatCurrency(selectedMonthPaid)}
                  supporting={`Aplicado em ${selectedMonth?.shortLabel ?? "mes"}`}
                  accent="border-l-[#25965a]"
                />
                <MetricCard
                  label="Saldo do mes"
                  value={formatCurrency(selectedMonthBalance)}
                  supporting="Por cobrar"
                  accent="border-l-[#d08a19]"
                />
                <MetricCard
                  label="Sobra p/ seguinte"
                  value={formatCurrency(selectedMonthCarryOut)}
                  supporting="Credito automatico"
                  accent="border-l-[#0ea5c7]"
                />
                <MetricCard
                  label="Descontos"
                  value={formatCurrency(selectedMonthDiscount)}
                  supporting={selectedMonthBillingRun ? "Mes gerado" : "Mes por gerar"}
                  accent="border-l-[#8b5cf6]"
                />
              </div>

              {billingNotice && (
                <div className="mx-5 mb-5 rounded-md bg-teal-50 px-4 py-3 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
                  {billingNotice}
                </div>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold">
                      Inscricao/Renovacao e propinas
                    </h3>
                    <p className="text-sm text-slate-500">
                      {currentClass?.name ?? "Sem classe"} /{" "}
                      {currentGroup?.name ?? "Sem turma"}.
                    </p>
                  </div>
                  <SecondaryButton
                    onClick={() => setActivePaymentSection("reports")}
                  >
                    Ver relatorio
                  </SecondaryButton>
                </div>

                <StudentFilters
                  classes={classes}
                  currentClassId={currentClassId}
                  currentGroupId={currentGroupId}
                  groupsForCurrentClass={groupsForCurrentClass}
                  onClassChange={selectClass}
                  onGroupChange={selectGroup}
                  onSearchChange={setStudentSearch}
                  search={studentSearch}
                />

                <div className="table-scroll">
                  <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Aluno</th>
                        <th className="px-5 py-3 font-semibold">Inscricao/Renovacao</th>
                        <th className="px-5 py-3 font-semibold">Mensalidade</th>
                        <th className="px-5 py-3 font-semibold">Pago aplicado</th>
                        <th className="px-5 py-3 font-semibold">Em falta</th>
                        <th className="px-5 py-3 font-semibold">Sobra p/ mes seg.</th>
                        <th className="px-5 py-3 font-semibold">Multas</th>
                        <th className="px-5 py-3 font-semibold">Ultimo pagamento</th>
                        <th className="px-5 py-3 font-semibold">Accao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visiblePaymentRows.length > 0 ? (
                        visiblePaymentRows.map((row) => {
                          const month = row.ledger.monthly.find(
                            (item) => item.month.key === billingMonthKey,
                          );

                          return (
                            <tr
                              key={row.student.id}
                              className="hover:bg-slate-50/80"
                            >
                              <td className="px-5 py-4">
                                <span className="block font-semibold">
                                  {row.student.fullName}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {row.student.registrationNumber}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <StatusDot
                                  paid={row.ledger.registrationBalance === 0}
                                  label={
                                    row.ledger.registrationBalance === 0
                                      ? "Liquidada"
                                      : "Pendente"
                                  }
                                />
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-700">
                                {formatCurrency(month?.due ?? 0)}
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-700">
                                {formatCurrency(month?.paid ?? 0)}
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-700">
                                {formatCurrency(month?.balance ?? 0)}
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-700">
                                {formatCurrency(month?.carryOut ?? 0)}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {formatCurrency(month?.fine ?? 0)}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {formatDateTime(month?.entry.paidAt)}
                              </td>
                              <td className="px-5 py-4">
                                <TextButton
                                  onClick={() => openPaymentEntry(row.student.id)}
                                >
                                  Lancar
                                </TextButton>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-5 py-10 text-center text-slate-500"
                          >
                            Sem alunos para gerar propinas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <PaymentForm
                allStudents={allStudentsAlphabetically}
                draft={paymentDraft}
                months={paymentMonths}
                selectedRow={selectedPaymentRow}
                selectedStudent={selectedPaymentStudent}
                settings={paymentSettings}
                onChange={setPaymentDraft}
                onSubmit={launchPayment}
              />
            </div>
          </div>
        )}

        {currentPaymentSection?.id === "reports" && renderReports()}
      </div>
    );
  }

  function renderProfiles() {
    return (
      <div className="grid gap-6">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Perfis e permissoes</h3>
              <p className="text-sm text-slate-500">
                Regras recomendadas para separar acessos e responsabilidades.
              </p>
            </div>
            <SecondaryButton onClick={() => setActiveProfile(null)}>
              Ver portal
            </SecondaryButton>
          </div>

          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Perfil</th>
                  <th className="px-5 py-3 font-semibold">Funcao</th>
                  <th className="px-5 py-3 font-semibold">Permissoes</th>
                  <th className="px-5 py-3 font-semibold">Acesso MVP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cx(
                            "grid size-10 place-items-center rounded-md text-xs font-black",
                            profile.surface,
                          )}
                        >
                          {profile.glyph}
                        </span>
                        <span className="font-semibold text-slate-950">
                          {profile.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {profile.description}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {profile.permissions.join(" / ")}
                    </td>
                    <td className="px-5 py-4">
                      <StatusDot
                        paid={profile.operational}
                        label={profile.operational ? "Operacional" : "Preparado"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Previsto"
            value={formatCurrency(schoolPaymentSummary.expected)}
            supporting="Depois das regras aplicadas"
            accent="border-l-[#2867d8]"
          />
          <MetricCard
            label="Recebido"
            value={formatCurrency(schoolPaymentSummary.paid)}
            supporting="Total registado"
            accent="border-l-[#185c54]"
          />
          <MetricCard
            label="Descontos"
            value={formatCurrency(schoolPaymentSummary.discount)}
            supporting="Bolsas e isencoes"
            accent="border-l-[#8b5cf6]"
          />
          <MetricCard
            label="Em falta"
            value={formatCurrency(schoolPaymentSummary.balance)}
            supporting="Saldo global"
            accent="border-l-[#d08a19]"
          />
          <MetricCard
            label="Diversos"
            value={formatCurrency(schoolPaymentSummary.miscellaneous)}
            supporting="Pagamentos extras"
            accent="border-l-[#0ea5c7]"
          />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Mensalidades geradas</h3>
              <p className="text-sm text-slate-500">
                Historico de geracoes por turma e mes.
              </p>
            </div>
            <SecondaryButton onClick={() => setActiveView("payments")}>
              Nova geracao
            </SecondaryButton>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Codigo</th>
                  <th className="px-5 py-3 font-semibold">Classe</th>
                  <th className="px-5 py-3 font-semibold">Turma</th>
                  <th className="px-5 py-3 font-semibold">Mes</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Isentos</th>
                  <th className="px-5 py-3 font-semibold">Valor unitario</th>
                  <th className="px-5 py-3 font-semibold">Previsto</th>
                  <th className="px-5 py-3 font-semibold">Gerado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingRuns.length > 0 ? (
                  billingRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {run.id}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {classes.find(
                          (schoolClass) => schoolClass.id === run.classId,
                        )?.name ?? "Sem classe"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {groups.find((group) => group.id === run.groupId)?.name ??
                          "Sem turma"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {monthByKey(run.monthKey)?.label ?? run.monthKey}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {run.studentIds.length}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {run.exemptedStudentIds.length}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {formatCurrency(run.amount)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {formatCurrency(run.expectedTotal)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDateTime(run.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                      Sem propinas geradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Pagamentos diversos</h3>
              <p className="text-sm text-slate-500">
                Recebimentos que nao abatem inscricao nem mensalidades.
              </p>
            </div>
            <SecondaryButton
              onClick={() => {
                setActivePaymentSection("entry");
                setPaymentDraft((draft) => ({
                  ...draft,
                  category: "miscellaneous",
                  amount: "0",
                  description: "",
                }));
              }}
            >
              Lancar diverso
            </SecondaryButton>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Aluno</th>
                  <th className="px-5 py-3 font-semibold">Descricao</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold">Forma</th>
                  <th className="px-5 py-3 font-semibold">Referencia</th>
                  <th className="px-5 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {miscellaneousPaymentRows.length > 0 ? (
                  miscellaneousPaymentRows.map(({ student, payment }, index) => (
                    <tr
                      key={`${student.id}-${payment.paidAt ?? index}`}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <span className="block font-semibold">
                          {student.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {student.registrationNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.description ?? "Pagamento diverso"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.method ?? "Sem forma"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.reference || "Sem referencia"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDateTime(payment.paidAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      Sem pagamentos diversos registados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }
}

function summarizePaymentRows(rows: StudentLedgerRow[]) {
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

function ProfileCard({
  profile,
  onOpen,
}: {
  profile: (typeof profiles)[number];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen()}
      className={cx(
        "group flex min-h-44 flex-col items-start rounded-lg border border-slate-200 border-t-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        profile.accent,
        profile.featured && "md:col-span-2 xl:col-span-1",
      )}
    >
      <span
        className={cx(
          "grid size-11 place-items-center rounded-md text-xs font-black",
          profile.surface,
        )}
      >
        {profile.glyph}
      </span>
      <span className="mt-5 text-lg font-black text-slate-950">
        {profile.title}
      </span>
      <span className="mt-2 text-sm text-slate-500">{profile.subtitle}</span>
      <span className="mt-4 text-sm leading-6 text-slate-600">
        {profile.description}
      </span>
      <span className="mt-auto pt-5 text-sm font-bold text-[#185c54]">
        Entrar
      </span>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      className={cx(buttonBase, "bg-[#185c54] text-white hover:bg-[#124a44]")}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      className={cx(
        buttonBase,
        "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function TextButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-[#185c54] transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function CrumbButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: EntityStatus }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold",
        status === "active"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function StatusDot({ paid, label }: { paid: boolean; label: string }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold",
        paid
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      )}
    >
      {label}
    </span>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className="text-sm text-slate-950">{value}</strong>
    </div>
  );
}

function MetricCard({
  label,
  value,
  supporting,
  accent,
}: {
  label: string;
  value: number | string;
  supporting: string;
  accent: string;
}) {
  return (
    <article
      className={cx(
        "rounded-lg border border-slate-200 border-l-4 bg-white p-5 shadow-sm",
        accent,
      )}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-3 grid gap-3">
        <strong className="text-3xl font-bold text-slate-950">{value}</strong>
        <span className="w-fit rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
          {supporting}
        </span>
      </div>
    </article>
  );
}

function FlowStep({
  number,
  title,
  text,
  onClick,
}: {
  number: string;
  title: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#88c9bb] hover:bg-[#f0fbf8]"
    >
      <span className="font-mono text-sm font-bold text-[#185c54]">
        {number}
      </span>
      <span className="mt-3 block text-base font-bold">{title}</span>
      {text && (
        <span className="mt-2 block text-sm leading-6 text-slate-600">{text}</span>
      )}
    </button>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ClassForm({
  academicYear,
  availableDefinitions,
  draft,
  error,
  stages,
  onChange,
  onReset,
  onSubmit,
}: {
  academicYear: string;
  availableDefinitions: ClassDefinition[];
  draft: ClassDraft;
  error: string;
  stages: AcademicStageDefinition[];
  onChange: (draft: ClassDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedDefinition =
    availableDefinitions.find((option) => option.id === draft.definitionId) ??
    availableDefinitions[0];
  const groupedDefinitions = activeAcademicStages(stages)
    .map((stage) => ({
      stage,
      definitions: availableDefinitions.filter(
        (definition) => definition.stageId === stage.id,
      ),
    }))
    .filter((group) => group.definitions.length > 0);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Activar classe</h3>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-semibold text-slate-500">Ano lectivo</span>
          <strong className="mt-1 block font-mono text-slate-950">
            {academicYear}
          </strong>
        </div>

        <FieldLabel label="Classe">
          <select
            value={selectedDefinition?.id ?? ""}
            onChange={(event) =>
              onChange({ ...draft, definitionId: event.target.value })
            }
            className={inputClasses()}
            disabled={availableDefinitions.length === 0}
          >
            {availableDefinitions.length > 0 ? (
              groupedDefinitions.map(({ stage, definitions }) => (
                  <optgroup key={stage.id} label={stage.name}>
                    {definitions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </optgroup>
              ))
            ) : (
              <option value="">Sem classes</option>
            )}
          </select>
        </FieldLabel>

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-semibold text-slate-500">Nivel de ensino</span>
          <strong className="mt-1 block text-slate-950">
            {selectedDefinition
              ? stageLabel(stages, selectedDefinition.stageId)
              : "Sem classe disponivel"}
          </strong>
        </div>

        <FieldLabel label="Estado">
          <select
            value={draft.status}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as EntityStatus })
            }
            className={inputClasses()}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={availableDefinitions.length === 0}>
          Activar classe
        </PrimaryButton>
        <SecondaryButton onClick={onReset}>Limpar</SecondaryButton>
      </div>
    </form>
  );
}

function RoomForm({
  availableRooms,
  draft,
  error,
  onChange,
  onReset,
  onSubmit,
}: {
  availableRooms: RoomDefinition[];
  draft: RoomDraft;
  error: string;
  onChange: (draft: RoomDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedRoom =
    availableRooms.find((room) => room.id === draft.definitionId) ??
    availableRooms[0];

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Activar sala</h3>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Sala">
          <select
            value={selectedRoom?.id ?? ""}
            onChange={(event) =>
              onChange({ ...draft, definitionId: event.target.value })
            }
            className={inputClasses()}
            disabled={availableRooms.length === 0}
          >
            {availableRooms.length > 0 ? (
              availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} - {room.block}
                </option>
              ))
            ) : (
              <option value="">Sem salas</option>
            )}
          </select>
        </FieldLabel>

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-semibold text-slate-500">Dados da sala</span>
          <strong className="mt-1 block text-slate-950">
            {selectedRoom
              ? `${selectedRoom.block} / ${selectedRoom.capacity} lugares`
              : "Sem sala disponivel"}
          </strong>
        </div>

        <FieldLabel label="Estado">
          <select
            value={draft.status}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as EntityStatus })
            }
            className={inputClasses()}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={availableRooms.length === 0}>
          Activar sala
        </PrimaryButton>
        <SecondaryButton onClick={onReset}>Limpar</SecondaryButton>
      </div>
    </form>
  );
}

function GroupForm({
  classes,
  draft,
  error,
  rooms,
  onChange,
  onReset,
  onSubmit,
}: {
  classes: SchoolClass[];
  draft: GroupDraft;
  error: string;
  rooms: SchoolRoom[];
  onChange: (draft: GroupDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedRoom = rooms.find((room) => room.id === draft.roomId);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Adicionar turma</h3>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Classe associada">
          <select
            value={draft.classId}
            onChange={(event) =>
              onChange({ ...draft, classId: event.target.value })
            }
            className={inputClasses()}
            disabled={classes.length === 0}
          >
            {classes.length > 0 ? (
              sortClasses(classes).map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))
            ) : (
              <option value="">Cadastre a classe primeiro</option>
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Designacao da turma">
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            className={inputClasses()}
            placeholder="Ex.: Turma C"
          />
        </FieldLabel>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Turno">
            <select
              value={draft.shift}
              onChange={(event) =>
                onChange({ ...draft, shift: event.target.value })
              }
              className={inputClasses()}
            >
              <option>Manha</option>
              <option>Tarde</option>
              <option>Noite</option>
            </select>
          </FieldLabel>

          <FieldLabel label="Sala">
            <select
              value={draft.roomId}
              onChange={(event) => {
                const room = rooms.find((item) => item.id === event.target.value);

                onChange({
                  ...draft,
                  roomId: event.target.value,
                  capacity: String(room?.capacity ?? draft.capacity),
                });
              }}
              className={inputClasses()}
              disabled={rooms.length === 0}
            >
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - {room.block}
                  </option>
                ))
              ) : (
                <option value="">Sem salas disponiveis</option>
              )}
            </select>
          </FieldLabel>
        </div>

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-semibold text-slate-500">Lotacao da sala</span>
          <strong className="mt-1 block text-slate-950">
            {selectedRoom ? `${selectedRoom.capacity} lugares` : "Por seleccionar"}
          </strong>
        </div>

        <FieldLabel label="Estado">
          <select
            value={draft.status}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as EntityStatus })
            }
            className={inputClasses()}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={classes.length === 0 || rooms.length === 0}>
          Adicionar a base
        </PrimaryButton>
        <SecondaryButton onClick={onReset}>Limpar</SecondaryButton>
      </div>
    </form>
  );
}

function EnrollmentForm({
  classes,
  draft,
  groups,
  notice,
  onChange,
  onClassChange,
  onReset,
  onSubmit,
}: {
  classes: SchoolClass[];
  draft: EnrollmentDraft;
  groups: ClassGroup[];
  notice: string;
  onChange: (draft: EnrollmentDraft) => void;
  onClassChange: (classId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasGroups = groups.length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Matricula</h3>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Situacao financeira">
          <select
            value={draft.financeStatus}
            onChange={(event) => {
              const status = event.target.value as FinanceStatus;
              onChange({
                ...draft,
                financeStatus: status,
                discountPercent:
                  status === "scholarship"
                    ? "100"
                    : status === "exception"
                      ? "100"
                    : status === "regular"
                      ? "0"
                      : draft.discountPercent,
              });
            }}
            className={inputClasses()}
          >
            {financeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        {draft.financeStatus !== "regular" && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldLabel label="Desconto (%)">
                <input
                  value={draft.discountPercent}
                  onChange={(event) =>
                    onChange({ ...draft, discountPercent: event.target.value })
                  }
                  className={inputClasses()}
                  disabled={draft.financeStatus === "scholarship"}
                  max="100"
                  min="0"
                  type="number"
                />
              </FieldLabel>
              <FieldLabel label="Inicio">
                <select
                  value={draft.exceptionStartMonth}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      exceptionStartMonth: event.target.value,
                    })
                  }
                  className={inputClasses()}
                >
                  {monthOptions.map((month) => (
                    <option key={month.key} value={month.key}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Fim">
                <select
                  value={draft.exceptionEndMonth}
                  onChange={(event) =>
                    onChange({ ...draft, exceptionEndMonth: event.target.value })
                  }
                  className={inputClasses()}
                >
                  {monthOptions.map((month) => (
                    <option key={month.key} value={month.key}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>
            <FieldLabel label="Motivo/autorizacao">
              <input
                value={draft.exceptionReason}
                onChange={(event) =>
                  onChange({ ...draft, exceptionReason: event.target.value })
                }
                className={inputClasses()}
                placeholder="Ex.: Bolsa social"
              />
            </FieldLabel>
          </div>
        )}

        <FieldLabel label="Nome completo do aluno">
          <input
            value={draft.fullName}
            onChange={(event) =>
              onChange({ ...draft, fullName: event.target.value })
            }
            className={inputClasses()}
            placeholder="Ex.: Joao Manuel"
          />
        </FieldLabel>

        <FieldLabel label="Encarregado">
          <input
            value={draft.guardianName}
            onChange={(event) =>
              onChange({ ...draft, guardianName: event.target.value })
            }
            className={inputClasses()}
            placeholder="Nome do encarregado"
          />
        </FieldLabel>

        <FieldLabel label="Contacto">
          <input
            value={draft.guardianPhone}
            onChange={(event) =>
              onChange({ ...draft, guardianPhone: event.target.value })
            }
            className={inputClasses()}
            placeholder="84 000 0000"
          />
        </FieldLabel>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Classe">
            <select
              value={draft.classId}
              onChange={(event) => onClassChange(event.target.value)}
              className={inputClasses()}
              disabled={classes.length === 0}
            >
              {classes.length > 0 ? (
                sortClasses(classes).map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))
              ) : (
                <option value="">Cadastre a classe primeiro</option>
              )}
            </select>
          </FieldLabel>

          <FieldLabel label="Turma">
            <select
              value={draft.groupId}
              onChange={(event) =>
                onChange({ ...draft, groupId: event.target.value })
              }
              className={inputClasses()}
              disabled={!hasGroups}
            >
              {hasGroups ? (
                groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))
              ) : (
                <option value="">Sem turmas</option>
              )}
            </select>
          </FieldLabel>
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
          {notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!hasGroups || classes.length === 0}>
          Guardar matricula
        </PrimaryButton>
        <SecondaryButton onClick={onReset}>Limpar</SecondaryButton>
      </div>
    </form>
  );
}

function FinanceSettingsForm({
  draft,
  notice,
  onChange,
  onSubmit,
}: {
  draft: FinanceSettingsDraft;
  notice: string;
  onChange: (draft: FinanceSettingsDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Dados de pagamentos</h3>
        <p className="text-sm text-slate-500">
          Periodo de cobranca, valores e multas por atraso.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <FieldLabel label="Ano lectivo">
          <input
            value={draft.academicYear}
            onChange={(event) =>
              onChange({ ...draft, academicYear: event.target.value })
            }
            className={inputClasses()}
            placeholder="2026"
          />
        </FieldLabel>

        <FieldLabel label="Inscricao/Renovacao">
          <input
            value={draft.inscriptionRenewalFee}
            onChange={(event) =>
              onChange({
                ...draft,
                inscriptionRenewalFee: event.target.value,
              })
            }
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Mensalidade base">
          <input
            value={draft.monthlyFee}
            onChange={(event) =>
              onChange({ ...draft, monthlyFee: event.target.value })
            }
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <FieldLabel label="Inicio">
          <select
            value={draft.startMonth}
            onChange={(event) =>
              onChange({ ...draft, startMonth: event.target.value })
            }
            className={inputClasses()}
          >
            {monthOptions.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Fim">
          <select
            value={draft.endMonth}
            onChange={(event) =>
              onChange({ ...draft, endMonth: event.target.value })
            }
            className={inputClasses()}
          >
            {monthOptions.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="1a multa apos dia">
          <input
            value={draft.firstPenaltyDay}
            onChange={(event) =>
              onChange({ ...draft, firstPenaltyDay: event.target.value })
            }
            className={inputClasses()}
            max="31"
            min="1"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Valor da 1a multa">
          <input
            value={draft.firstPenaltyAmount}
            onChange={(event) =>
              onChange({ ...draft, firstPenaltyAmount: event.target.value })
            }
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FieldLabel label="2a multa apos dia">
          <input
            value={draft.secondPenaltyDay}
            onChange={(event) =>
              onChange({ ...draft, secondPenaltyDay: event.target.value })
            }
            className={inputClasses()}
            max="31"
            min="1"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Valor da 2a multa">
          <input
            value={draft.secondPenaltyAmount}
            onChange={(event) =>
              onChange({ ...draft, secondPenaltyAmount: event.target.value })
            }
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit">Guardar regras</PrimaryButton>
      </div>

      {notice && (
        <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
          {notice}
        </p>
      )}
    </form>
  );
}

function PaymentSettingsSummary({ settings }: { settings: PaymentSettings }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold">Dados de pagamentos</h3>
        <p className="text-sm text-slate-500">
          Valores e prazos.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryLine label="Ano lectivo" value={settings.academicYear} />
        <SummaryLine
          label="Inscricao/Renovacao"
          value={formatCurrency(settings.inscriptionRenewalFee)}
        />
        <SummaryLine
          label="Mensalidade base"
          value={formatCurrency(settings.monthlyFee)}
        />
        <SummaryLine
          label="Periodo"
          value={`${monthLabel(settings.startMonth)} ate ${monthLabel(settings.endMonth)}`}
        />
        <SummaryLine
          label="1a multa"
          value={`Dia ${settings.firstPenaltyDay} / ${formatCurrency(settings.firstPenaltyAmount)}`}
        />
        <SummaryLine
          label="2a multa"
          value={`Dia ${settings.secondPenaltyDay} / ${formatCurrency(settings.secondPenaltyAmount)}`}
        />
      </div>
    </section>
  );
}

function StudentFinanceForm({
  draft,
  notice,
  students,
  onChange,
  onStudentChange,
  onSubmit,
}: {
  draft: FinanceProfileDraft;
  notice: string;
  students: Student[];
  onChange: (draft: FinanceProfileDraft) => void;
  onStudentChange: (studentId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedStudent = students.find((student) => student.id === draft.studentId);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Excecoes e bolsas</h3>
        <p className="text-sm text-slate-500">
          Aplique isencoes ou descontos por intervalo de meses.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Aluno">
          <select
            value={draft.studentId}
            onChange={(event) => onStudentChange(event.target.value)}
            className={inputClasses()}
            disabled={students.length === 0}
          >
            {students.length > 0 ? (
              students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))
            ) : (
              <option value="">Sem alunos</option>
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Situacao">
          <select
            value={draft.status}
            onChange={(event) => {
              const status = event.target.value as FinanceStatus;
              onChange({
                ...draft,
                status,
                discountPercent:
                  status === "scholarship"
                    ? "100"
                    : status === "exception"
                      ? "100"
                    : status === "regular"
                      ? "0"
                      : draft.discountPercent,
              });
            }}
            className={inputClasses()}
          >
            {financeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldLabel label="Desconto (%)">
            <input
              value={draft.discountPercent}
              onChange={(event) =>
                onChange({ ...draft, discountPercent: event.target.value })
              }
              className={inputClasses()}
              disabled={draft.status === "regular" || draft.status === "scholarship"}
              max="100"
              min="0"
              type="number"
            />
          </FieldLabel>

          <FieldLabel label="Inicio">
            <select
              value={draft.startMonth}
              onChange={(event) =>
                onChange({ ...draft, startMonth: event.target.value })
              }
              className={inputClasses()}
              disabled={draft.status === "regular"}
            >
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
            </select>
          </FieldLabel>

          <FieldLabel label="Fim">
            <select
              value={draft.endMonth}
              onChange={(event) =>
                onChange({ ...draft, endMonth: event.target.value })
              }
              className={inputClasses()}
              disabled={draft.status === "regular"}
            >
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>

        <FieldLabel label="Motivo/autorizacao">
          <input
            value={draft.reason}
            onChange={(event) => onChange({ ...draft, reason: event.target.value })}
            className={inputClasses()}
            disabled={draft.status === "regular"}
            placeholder="Ex.: Bolsa integral"
          />
        </FieldLabel>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SummaryLine
          label="Aluno"
          value={selectedStudent?.registrationNumber ?? "Sem aluno"}
        />
        <SummaryLine
          label="Regra"
          value={`${financeStatusLabel(draft.status)} / ${draft.discountPercent || 0}%`}
        />
        <SummaryLine
          label="Intervalo"
          value={
            draft.status === "regular"
              ? "Sem intervalo"
              : `${monthLabel(draft.startMonth)} ate ${monthLabel(draft.endMonth)}`
          }
        />
      </div>

      {notice && (
        <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
          {notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!draft.studentId}>
          Aplicar regra
        </PrimaryButton>
      </div>
    </form>
  );
}

function PaymentForm({
  allStudents,
  draft,
  months,
  selectedRow,
  selectedStudent,
  settings,
  onChange,
  onSubmit,
}: {
  allStudents: Student[];
  draft: PaymentLaunchDraft;
  months: MonthOption[];
  selectedRow?: StudentLedgerRow;
  selectedStudent?: Student;
  settings: PaymentSettings;
  onChange: (draft: PaymentLaunchDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedMonth = monthByKey(draft.monthKey) ?? months[0];
  const suggestedMonthlyFee =
    selectedStudent && selectedMonth
      ? calculateMonthlyDue(selectedStudent, selectedMonth, settings)
      : { due: settings.monthlyFee, discount: 0, ruleLabel: "Regular" };
  const selectedMonthLedger = selectedRow?.ledger.monthly.find(
    (item) => item.month.key === draft.monthKey,
  );
  const receivedAmount = parseMoney(draft.amount);
  const monthBalance = selectedMonthLedger?.balance ?? suggestedMonthlyFee.due;
  const appliedToMonth =
    draft.category === "tuition" ? Math.min(receivedAmount, monthBalance) : 0;
  const surplusForNextMonths =
    draft.category === "tuition" ? Math.max(0, receivedAmount - appliedToMonth) : 0;
  const registrationBalance =
    selectedRow?.ledger.registrationBalance ?? settings.inscriptionRenewalFee;
  const appliedToRegistration =
    draft.category === "registration"
      ? Math.min(receivedAmount, registrationBalance)
      : 0;
  const registrationSurplus =
    draft.category === "registration"
      ? Math.max(0, receivedAmount - appliedToRegistration)
      : 0;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Lancar pagamento</h3>
        <p className="text-sm text-slate-500">
          Recebimentos de inscricao/renovacao, mensalidade e pagamentos diversos.
        </p>
      </div>

      {draft.category !== "miscellaneous" && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
          Qualquer valor recebido acima do saldo devido fica como credito para
          as mensalidades seguintes.
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Aluno">
          <select
            value={draft.studentId}
            onChange={(event) => {
              const nextStudent = allStudents.find(
                (student) => student.id === event.target.value,
              );
              const nextFee =
                nextStudent && selectedMonth
                  ? calculateMonthlyDue(nextStudent, selectedMonth, settings).due
                  : settings.monthlyFee;

              onChange({
                ...draft,
                studentId: event.target.value,
                amount: draft.category === "tuition" ? String(nextFee) : draft.amount,
              });
            }}
            className={inputClasses()}
            disabled={allStudents.length === 0}
          >
            {allStudents.length > 0 ? (
              allStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))
            ) : (
              <option value="">Sem alunos</option>
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Tipo de pagamento">
          <select
            value={draft.category}
            onChange={(event) => {
              const category = event.target.value as PaymentCategory;
              onChange({
                ...draft,
                category,
                amount:
                  category === "tuition"
                    ? String(suggestedMonthlyFee.due)
                    : category === "registration"
                      ? String(settings.inscriptionRenewalFee)
                      : "0",
              });
            }}
            className={inputClasses()}
          >
            {paymentCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Mes da mensalidade">
          <select
            value={draft.monthKey}
            onChange={(event) => {
              const month = monthByKey(event.target.value) ?? months[0];
              const nextFee =
                selectedStudent && month
                  ? calculateMonthlyDue(selectedStudent, month, settings).due
                  : settings.monthlyFee;

              onChange({
                ...draft,
                monthKey: event.target.value,
                amount: draft.category === "tuition" ? String(nextFee) : draft.amount,
              });
            }}
            className={inputClasses()}
            disabled={draft.category !== "tuition"}
          >
            {months.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        {draft.category === "miscellaneous" && (
          <FieldLabel label="Descricao do pagamento diverso">
            <input
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              className={inputClasses()}
              placeholder="Ex.: Uniforme, certificado, transporte"
            />
          </FieldLabel>
        )}

        <FieldLabel label="Valor recebido">
          <input
            value={draft.amount}
            onChange={(event) => onChange({ ...draft, amount: event.target.value })}
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Forma de pagamento">
          <select
            value={draft.method}
            onChange={(event) => onChange({ ...draft, method: event.target.value })}
            className={inputClasses()}
          >
            {paymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Referencia">
          <input
            value={draft.reference}
            onChange={(event) =>
              onChange({ ...draft, reference: event.target.value })
            }
            className={inputClasses()}
            placeholder="Opcional"
          />
        </FieldLabel>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SummaryLine label="Aluno" value={selectedStudent?.fullName ?? "Sem aluno"} />
        {draft.category === "tuition" && (
          <>
            <SummaryLine
              label="Regra"
              value={`${suggestedMonthlyFee.ruleLabel} / devido ${formatCurrency(suggestedMonthlyFee.due)}`}
            />
            <SummaryLine
              label="Aplicado neste mes"
              value={formatCurrency(appliedToMonth)}
            />
            <SummaryLine
              label="Sobra para meses seguintes"
              value={formatCurrency(surplusForNextMonths)}
            />
          </>
        )}
        {draft.category === "registration" && (
          <>
            <SummaryLine
              label="Aplicado na inscricao"
              value={formatCurrency(appliedToRegistration)}
            />
            <SummaryLine
              label="Sobra para mensalidades"
              value={formatCurrency(registrationSurplus)}
            />
          </>
        )}
        {draft.category === "miscellaneous" && (
          <SummaryLine
            label="Pagamento diverso"
            value={draft.description.trim() || "Descricao por preencher"}
          />
        )}
        <SummaryLine
          label="Data/hora"
          value={formatDateTime(new Date().toISOString())}
        />
        <SummaryLine label="Valor" value={formatCurrency(parseMoney(draft.amount))} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!draft.studentId || receivedAmount <= 0}>
          Confirmar pagamento
        </PrimaryButton>
      </div>
    </form>
  );
}

function StudentFilters({
  classes,
  currentClassId,
  currentGroupId,
  groupsForCurrentClass,
  onClassChange,
  onGroupChange,
  onSearchChange,
  search,
}: {
  classes: SchoolClass[];
  currentClassId: string;
  currentGroupId: string;
  groupsForCurrentClass: ClassGroup[];
  onClassChange: (classId: string) => void;
  onGroupChange: (groupId: string) => void;
  onSearchChange: (search: string) => void;
  search: string;
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 md:grid-cols-[220px_220px_1fr]">
      <select
        value={currentClassId}
        onChange={(event) => onClassChange(event.target.value)}
        className={inputClasses()}
        aria-label="Filtrar por classe"
        disabled={classes.length === 0}
      >
        {classes.length > 0 ? (
          sortClasses(classes).map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))
        ) : (
          <option value="">Sem classes</option>
        )}
      </select>
      <select
        value={currentGroupId}
        onChange={(event) => onGroupChange(event.target.value)}
        className={inputClasses()}
        aria-label="Filtrar por turma"
        disabled={groupsForCurrentClass.length === 0}
      >
        {groupsForCurrentClass.length > 0 ? (
          groupsForCurrentClass.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))
        ) : (
          <option value="">Sem turmas</option>
        )}
      </select>
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className={inputClasses()}
        placeholder="Pesquisar aluno pelo nome"
        type="search"
      />
    </div>
  );
}
