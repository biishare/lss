import {
  initialPaymentSettings,
  monthOptions,
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type Payment,
  type PaymentEntry,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
  type StudentFinanceRuleHistoryEntry,
  type StudentPaymentRecord,
} from "../../../lib/school-demo-data";
import {
  summarizeFinanceBook,
  validateFinanceBook,
  type FinanceBookTotals,
  type FinanceInvariantViolation,
} from "./invariants";
import type {
  AcademicYear,
  EducationLevel,
  FinanceAllocation,
  FinanceBook,
  FinanceCharge,
  FinancePayment,
  FinanceSchoolClass,
  PenaltyCharge as FinancePenaltyCharge,
  FinancialAid,
  PaymentRuleVersion,
} from "./entities";

export type LegacyBillingRun = {
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

export type LegacyStoredDemoState = {
  academicStages?: AcademicStageDefinition[];
  classDefinitions?: ClassDefinition[];
  roomDefinitions?: RoomDefinition[];
  classes?: SchoolClass[];
  rooms?: SchoolRoom[];
  groups?: ClassGroup[];
  students?: Student[];
  paymentSettings?: PaymentSettings;
  paymentRuleVersions?: PaymentRuleVersion[];
  paymentRecords?: StudentPaymentRecord[];
  billingRuns?: LegacyBillingRun[];
};

export type LegacySafetyExport = {
  schemaVersion: "lss-legacy-safety-export-v1";
  storageKey: string;
  exportedAt: string;
  state: LegacyStoredDemoState;
};

export type LegacyMigrationWarning = {
  code:
    | "legacy-reference"
    | "legacy-payment-entry"
    | "scholarship-registration-review"
    | "missing-payment-record"
    | "unallocated-payment-remainder";
  studentId?: string;
  message: string;
};

export type LegacyMigrationPreview = {
  schemaVersion: "lss-finance-migration-preview-v1";
  createdAt: string;
  storageKey: string;
  reversible: boolean;
  affectedStudents: number;
  before: FinanceBookTotals;
  after: FinanceBookTotals;
  reconciled: boolean;
  warnings: LegacyMigrationWarning[];
  violations: FinanceInvariantViolation[];
};

export type LegacyMigrationResult = {
  safetyExport: LegacySafetyExport;
  preview: LegacyMigrationPreview;
  financeBook: FinanceBook;
};

type MigrationOptions = {
  storageKey?: string;
  migratedAt?: string;
  recordedBy?: string;
};

type StudentContext = {
  student: Student;
  record: StudentPaymentRecord;
  academicYearId: string;
  educationLevelId: string;
  enrollmentId: string;
  stableNumber: string;
};

const defaultStorageKey = "gestao-academica-demo-state-v2";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function legacyStateOnly(state: LegacyStoredDemoState): LegacyStoredDemoState {
  return {
    academicStages: state.academicStages,
    classDefinitions: state.classDefinitions,
    roomDefinitions: state.roomDefinitions,
    classes: state.classes,
    rooms: state.rooms,
    groups: state.groups,
    students: state.students,
    paymentSettings: state.paymentSettings,
    paymentRuleVersions: state.paymentRuleVersions,
    paymentRecords: state.paymentRecords,
    billingRuns: state.billingRuns,
  };
}

function safeArray<T>(items: T[] | undefined): T[] {
  return Array.isArray(items) ? items : [];
}

function stableId(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function percentFromAmount(amount: number, baseAmount: number) {
  return baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
}

function registrationDiscountPercentForStudent(student: Student) {
  const profile = student.financialProfile;

  if (!profile || profile.status === "regular") {
    return 0;
  }

  if (profile.status === "scholarship" || profile.status === "exception") {
    return 100;
  }

  return Math.min(100, Math.max(0, profile.discountPercent ?? 0));
}

function legacyEntryAmount(entry: PaymentEntry | undefined) {
  return entry && entry.amount > 0 ? entry.amount : 0;
}

function sumLegacyRecordPayments(record: StudentPaymentRecord) {
  if (safeArray(record.payments).length > 0) {
    return safeArray(record.payments).filter((payment) => !payment.reversedBy && payment.kind !== "credit-application").reduce(
      (total, payment) => total + payment.amount,
      0,
    );
  }

  return (
    legacyEntryAmount(record.inscriptionRenewal) +
    Object.values(record.monthlyPayments ?? {}).reduce(
      (total, entry) => total + legacyEntryAmount(entry),
      0,
    ) +
    safeArray(record.miscellaneousPayments).reduce(
      (total, entry) => total + legacyEntryAmount(entry),
      0,
    )
  );
}

function summarizeLegacySource(
  state: LegacyStoredDemoState,
  book: FinanceBook,
): FinanceBookTotals {
  const convertedTotals = summarizeFinanceBook(book);
  const paymentTotal = safeArray(state.paymentRecords).reduce(
    (total, record) => total + sumLegacyRecordPayments(record),
    0,
  );

  return {
    ...convertedTotals,
    paymentTotal: roundMoney(paymentTotal),
  };
}

function monthIndex(monthKey: string) {
  return monthOptions.findIndex((month) => month.key === monthKey);
}

function getMonthsInRange(startMonth: string, endMonth: string) {
  const startIndex = monthIndex(startMonth);
  const endIndex = monthIndex(endMonth);

  if (startIndex < 0 || endIndex < 0) {
    return [];
  }

  if (startIndex <= endIndex) {
    return monthOptions.slice(startIndex, endIndex + 1);
  }

  return [...monthOptions.slice(startIndex), ...monthOptions.slice(0, endIndex + 1)];
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

function dateForMonth(monthKey: string, day: number, academicYearId: string) {
  const monthNumber = monthIndex(monthKey) + 1;
  const year = Number(academicYearId) || new Date().getFullYear();

  if (monthNumber <= 0) {
    return "";
  }

  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.max(1, Math.min(lastDay, day));

  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(
    safeDay,
  ).padStart(2, "0")}`;
}

function registrationChargeId(studentId: string) {
  return `CHG-${studentId}-REG`;
}

function tuitionChargeId(studentId: string, monthKey: string) {
  return `CHG-${studentId}-TUI-${monthKey.toUpperCase()}`;
}

function emptyRecord(studentId: string): StudentPaymentRecord {
  return {
    studentId,
    charges: [],
    payments: [],
    allocations: [],
    inscriptionRenewal: { amount: 0, paidDay: 0 },
    monthlyPayments: {},
    miscellaneousPayments: [],
  };
}

function getStudentClass(
  state: LegacyStoredDemoState,
  student: Student,
): SchoolClass | undefined {
  return safeArray(state.classes).find((item) => item.id === student.classId);
}

function getAcademicYearId(
  state: LegacyStoredDemoState,
  student: Student,
  settings: PaymentSettings,
) {
  const schoolClass = getStudentClass(state, student);

  return (
    student.academicYearId ??
    schoolClass?.academicYearId ??
    schoolClass?.academicYear ??
    settings.academicYear
  );
}

function getEducationLevelId(state: LegacyStoredDemoState, student: Student) {
  const schoolClass = getStudentClass(state, student);
  const definition = safeArray(state.classDefinitions).find(
    (item) => item.id === student.classId,
  );
  const stageByName = safeArray(state.academicStages).find(
    (stage) => stage.name === schoolClass?.stage,
  );

  return (
    student.educationLevelId ??
    schoolClass?.educationLevelId ??
    definition?.stageId ??
    stageByName?.id ??
    schoolClass?.stage ??
    student.classId
  );
}

function getEnrollmentId(student: Student, academicYearId: string) {
  return student.enrollmentId ?? `ENR-${stableId(academicYearId)}-${student.id}`;
}

function getStudentDate(student: Student) {
  return student.enrollmentDate || student.createdAt || new Date().toISOString().slice(0, 10);
}

export function assignStableEnrollmentNumbers(
  students: Student[],
  state: LegacyStoredDemoState,
  settings: PaymentSettings,
) {
  const grouped = new Map<string, Student[]>();
  const numbers = new Map<string, string>();

  students.forEach((student) => {
    const key = `${getAcademicYearId(state, student, settings)}:${student.groupId}`;
    const group = grouped.get(key) ?? [];

    group.push(student);
    grouped.set(key, group);
  });

  grouped.forEach((group) => {
    const used = new Set<string>();
    const sorted = [...group].sort((a, b) => {
      const aNumber = Number(a.stableNumber);
      const bNumber = Number(b.stableNumber);

      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return aNumber - bNumber;
      }

      if (Number.isFinite(aNumber)) {
        return -1;
      }

      if (Number.isFinite(bNumber)) {
        return 1;
      }

      return (
        getStudentDate(a).localeCompare(getStudentDate(b)) ||
        a.id.localeCompare(b.id)
      );
    });

    sorted.forEach((student) => {
      const existing = student.stableNumber?.match(/^\d+$/)
        ? student.stableNumber.padStart(3, "0")
        : "";

      if (existing && !used.has(existing)) {
        used.add(existing);
        numbers.set(student.id, existing);
        return;
      }

      let nextNumber = 1;
      let formatted = String(nextNumber).padStart(3, "0");

      while (used.has(formatted)) {
        nextNumber += 1;
        formatted = String(nextNumber).padStart(3, "0");
      }

      used.add(formatted);
      numbers.set(student.id, formatted);
    });
  });

  return numbers;
}

function buildAcademicYears(
  state: LegacyStoredDemoState,
  settings: PaymentSettings,
): AcademicYear[] {
  const ids = new Set<string>([settings.academicYear]);

  safeArray(state.classes).forEach((schoolClass) => {
    ids.add(schoolClass.academicYearId ?? schoolClass.academicYear);
  });

  return [...ids]
    .filter(Boolean)
    .sort()
    .map((id) => ({
      id,
      label: id,
      status: "active",
    }));
}

function buildEducationLevels(state: LegacyStoredDemoState): EducationLevel[] {
  const levels = new Map<string, EducationLevel>();

  safeArray(state.academicStages).forEach((stage) => {
    levels.set(stage.id, {
      id: stage.id,
      name: stage.name,
      status: stage.status,
      createdAt: stage.createdAt,
    });
  });

  safeArray(state.classDefinitions).forEach((definition) => {
    if (levels.has(definition.stageId)) {
      return;
    }

    levels.set(definition.stageId, {
      id: definition.stageId,
      name: definition.stageId,
      status: definition.status,
      createdAt: definition.createdAt,
    });
  });

  safeArray(state.classes).forEach((schoolClass) => {
    const levelId =
      schoolClass.educationLevelId ??
      safeArray(state.academicStages).find((stage) => stage.name === schoolClass.stage)
        ?.id ??
      schoolClass.stage ??
      schoolClass.id;

    if (levels.has(levelId)) {
      return;
    }

    levels.set(levelId, {
      id: levelId,
      name: schoolClass.stage || schoolClass.name,
      status: schoolClass.status,
      createdAt: schoolClass.createdAt,
    });
  });

  return [...levels.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" }),
  );
}

function buildClasses(
  state: LegacyStoredDemoState,
  settings: PaymentSettings,
): FinanceSchoolClass[] {
  return safeArray(state.classes).map((schoolClass) => {
    const representativeStudent = safeArray(state.students).find(
      (student) => student.classId === schoolClass.id,
    );

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      academicYearId:
        schoolClass.academicYearId ??
        schoolClass.academicYear ??
        settings.academicYear,
      educationLevelId: representativeStudent
        ? getEducationLevelId(state, representativeStudent)
        : schoolClass.educationLevelId ?? schoolClass.stage ?? schoolClass.id,
      status: schoolClass.status,
      createdAt: schoolClass.createdAt,
    };
  });
}

function buildRuleVersions(
  contexts: StudentContext[],
  classes: FinanceSchoolClass[],
  settings: PaymentSettings,
  existingRules: PaymentRuleVersion[] = [],
): PaymentRuleVersion[] {
  const keys = new Set<string>();

  classes.forEach((schoolClass) => {
    keys.add(`${schoolClass.academicYearId}:${schoolClass.educationLevelId}`);
  });
  contexts.forEach((context) => {
    keys.add(`${context.academicYearId}:${context.educationLevelId}`);
  });

  const months = getMonthsInRange(settings.startMonth, settings.endMonth).map(
    (month) => month.key,
  );
  const firstPenaltyPercent =
    settings.firstPenaltyPercent ??
    percentFromAmount(settings.firstPenaltyAmount, settings.monthlyFee);
  const secondPenaltyPercent =
    settings.secondPenaltyPercent ??
    percentFromAmount(
      settings.firstPenaltyAmount + settings.secondPenaltyAmount,
      settings.monthlyFee,
    );
  const existingByKey = new Map(
    safeArray(existingRules).map((rule) => [
      `${rule.academicYearId}:${rule.educationLevelId}`,
      rule,
    ]),
  );

  const defaults: PaymentRuleVersion[] = [...keys]
    .filter((key) => !key.includes("undefined"))
    .sort()
    .map((key) => {
      const [academicYearId, educationLevelId] = key.split(":");
      const existingRule = existingByKey.get(key);

      if (existingRule) {
        return existingRule;
      }

      return {
        id: `RULE-${stableId(academicYearId)}-${stableId(educationLevelId)}-V001`,
        academicYearId,
        educationLevelId,
        version: 1,
        status: "active",
        inscriptionFee: settings.inscriptionRenewalFee,
        monthlyFee: settings.monthlyFee,
        coveredMonthKeys: months,
        monthlyDueDay: settings.monthlyDueDay ?? settings.firstPenaltyDay,
        firstPenalty: {
          thresholdDay: settings.firstPenaltyDay,
          percent: firstPenaltyPercent,
          fixedAmount: settings.firstPenaltyAmount,
        },
        secondPenalty: {
          thresholdDay: settings.secondPenaltyDay,
          percent: secondPenaltyPercent,
          fixedAmount: settings.firstPenaltyAmount + settings.secondPenaltyAmount,
        },
        validFrom: `${academicYearId}-01-01`,
      };
    });
  return [...existingRules, ...defaults.filter((rule) => !existingRules.some((item) => item.id === rule.id))];
}

function discountPercentForStudentMonth(student: Student, monthKey: string) {
  const profile = student.financialProfile;

  if (!profile || profile.status === "regular") {
    return 0;
  }

  const inRange = isMonthInRange(monthKey, profile.startMonth, profile.endMonth);

  if (!inRange) {
    return 0;
  }

  if (profile.status === "scholarship" || profile.status === "exception") {
    return 100;
  }

  return Math.min(100, Math.max(0, profile.discountPercent ?? 0));
}

function isTuitionApplicable(
  student: Student,
  monthKey: string,
  settings: PaymentSettings,
) {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const startIndex = months.findIndex(
    (month) => month.key === (student.tuitionStartMonth || settings.startMonth),
  );
  const currentIndex = months.findIndex((month) => month.key === monthKey);

  if (startIndex < 0 || currentIndex < 0) {
    return true;
  }

  return currentIndex >= startIndex;
}

function createCharge(
  context: StudentContext,
  settings: PaymentSettings,
  input: {
    id: string;
    kind: FinanceCharge["kind"];
    description: string;
    baseAmount: number;
    discountPercent?: number;
    discountAmount?: number;
    dueAmount?: number;
    monthKey?: string;
    dueOn?: string;
    createdAt?: string;
    ruleVersionId?: string;
  },
): FinanceCharge {
  const discountAmount =
    input.discountAmount ??
    Math.round((input.baseAmount * (input.discountPercent ?? 0)) / 100);
  const dueAmount = input.dueAmount ?? Math.max(0, input.baseAmount - discountAmount);
  const discountPercent =
    input.discountPercent ??
    (input.baseAmount > 0 ? roundMoney((discountAmount / input.baseAmount) * 100) : 0);

  return {
    id: input.id,
    studentId: context.student.id,
    enrollmentId: context.enrollmentId,
    academicYearId: context.academicYearId,
    kind: input.kind,
    description: input.description,
    monthKey: input.monthKey,
    dueOn: input.dueOn,
    baseAmount: input.baseAmount,
    discountAmount,
    dueAmount,
    ruleVersionId: input.ruleVersionId,
    snapshot: {
      source: "legacy",
      originalAmount: input.baseAmount,
      discountPercent,
      discountAmount,
      ruleVersionId: input.ruleVersionId,
      ruleVersion: input.ruleVersionId ? 1 : undefined,
    },
    createdAt: input.createdAt ?? context.student.createdAt,
  };
}

function hasPaymentEntry(entry: PaymentEntry | undefined): entry is PaymentEntry {
  return Boolean(entry && entry.amount > 0);
}

function paymentDateFromEntry(entry: PaymentEntry, fallback: string) {
  return entry.paidAt?.slice(0, 10) ?? fallback;
}

function buildFinancePayment(
  payment: Payment,
  context: StudentContext,
  recordedBy: string,
): FinancePayment {
  const effectivePaymentDate = payment.effectivePaymentDate ?? payment.paidOn;

  return {
    id: payment.id,
    studentId: context.student.id,
    enrollmentId: context.enrollmentId,
    amount: payment.amount,
    effectivePaymentDate,
    recordedAt: payment.recordedAt,
    recordedBy: payment.recordedBy ?? recordedBy,
    method: payment.method,
    observation: payment.observation,
    legacyReference: payment.legacyReference ?? payment.reference,
  };
}

function buildFinancialAid(context: StudentContext): FinancialAid[] {
  const profile = context.student.financialProfile;

  if (!profile || profile.status === "regular") {
    return [];
  }

  const history = profile.history?.length ? profile.history : undefined;
  const newest: StudentFinanceRuleHistoryEntry | undefined = history?.[0];
  const percent =
    profile.status === "scholarship" || profile.status === "exception"
      ? 100
      : Math.min(100, Math.max(0, profile.discountPercent ?? 0));

  return [
    {
      id: `AID-${context.enrollmentId}`,
      enrollmentId: context.enrollmentId,
      kind: profile.status,
      percent,
      appliesToRegistration: true,
      appliesToTuition: true,
      startMonth: profile.startMonth,
      endMonth: profile.endMonth,
      reason: profile.reason,
      authorizedBy: profile.authorizedBy ?? newest?.authorizedBy ?? "Secretaria",
      registeredBy: profile.registeredBy ?? newest?.registeredBy ?? "Secretaria",
      registeredAt: profile.registeredAt ?? newest?.registeredAt ?? context.student.createdAt,
    },
  ];
}

function applyAllocation(
  allocations: FinanceAllocation[],
  allocatedByCharge: Map<string, number>,
  paymentId: string,
  charge: FinanceCharge | undefined,
  amount: number,
  createdAt: string,
) {
  if (!charge || amount <= 0) {
    return 0;
  }

  const alreadyAllocated = allocatedByCharge.get(charge.id) ?? 0;
  const remainingChargeBalance = Math.max(0, charge.dueAmount - alreadyAllocated);
  const amountForCharge = Math.min(amount, remainingChargeBalance);

  if (amountForCharge <= 0) {
    return 0;
  }

  allocations.push({
    id: `ALLOC-${String(allocations.length + 1).padStart(3, "0")}`,
    paymentId,
    chargeId: charge.id,
    amount: amountForCharge,
    createdAt,
  });
  allocatedByCharge.set(charge.id, alreadyAllocated + amountForCharge);

  return amountForCharge;
}

function buildContextList(
  state: LegacyStoredDemoState,
  settings: PaymentSettings,
): StudentContext[] {
  const students = safeArray(state.students);
  const stableNumbers = assignStableEnrollmentNumbers(students, state, settings);

  return students.map((student) => {
    const academicYearId = getAcademicYearId(state, student, settings);
    const educationLevelId = getEducationLevelId(state, student);

    return {
      student,
      record:
        safeArray(state.paymentRecords).find(
          (record) => record.studentId === student.id,
        ) ?? emptyRecord(student.id),
      academicYearId,
      educationLevelId,
      enrollmentId: getEnrollmentId(student, academicYearId),
      stableNumber: stableNumbers.get(student.id) ?? "001",
    };
  });
}

function buildFinanceBook(
  state: LegacyStoredDemoState,
  options: Required<MigrationOptions>,
) {
  const settings = state.paymentSettings ?? initialPaymentSettings;
  const contexts = buildContextList(state, settings);
  const academicYears = buildAcademicYears(state, settings);
  const educationLevels = buildEducationLevels(state);
  const classes = buildClasses(state, settings);
  const paymentRuleVersions = buildRuleVersions(
    contexts,
    classes,
    settings,
    state.paymentRuleVersions,
  );
  const ruleByContext = new Map(
    paymentRuleVersions.map((rule) => [
      `${rule.academicYearId}:${rule.educationLevelId}`,
      rule,
    ]),
  );
  const charges: FinanceCharge[] = [];
  const penaltyCharges: FinancePenaltyCharge[] = [];
  const payments: FinancePayment[] = [];
  const allocations: FinanceAllocation[] = [];
  const financialAid: FinancialAid[] = [];
  const auditEvents: FinanceBook["auditEvents"] = [];
  const warnings: LegacyMigrationWarning[] = [];

  contexts.forEach((context) => {
    const chargeById = new Map<string, FinanceCharge>();
    const record = context.record;
    const rule = ruleByContext.get(
      `${context.academicYearId}:${context.educationLevelId}`,
    );
    const registerCharge = (charge: FinanceCharge) => {
      if (!chargeById.has(charge.id)) {
        chargeById.set(charge.id, charge);
        charges.push(charge);
      }
    };

    financialAid.push(...(record.billingVersion === 3 ? record.financialAid ?? [] : buildFinancialAid(context)));

    safeArray(record.charges).forEach((charge) => {
      registerCharge(
        createCharge(context, settings, {
          id: charge.id,
          kind: charge.category === "miscellaneous" ? "miscellaneous" : charge.category,
          description: charge.description,
          baseAmount: charge.baseAmount ?? charge.snapshot?.originalAmount ?? charge.amount,
          discountPercent: charge.adjustedBenefit?.percent ?? charge.snapshot?.discountPercent,
          discountAmount: charge.adjustedDueAmount !== undefined && !charge.academicCancellation ? roundMoney((charge.baseAmount ?? charge.amount) - charge.adjustedDueAmount) : charge.discountAmount ?? charge.snapshot?.discountAmount,
          dueAmount: charge.adjustedDueAmount ?? charge.dueAmount ?? charge.amount,
          monthKey: charge.monthKey,
          dueOn: charge.dueOn,
          createdAt: charge.createdAt,
          ruleVersionId:
            charge.category === "miscellaneous"
              ? undefined
              : charge.ruleVersionId ?? charge.snapshot?.ruleVersionId ?? rule?.id,
        }),
      );
    });

    if (record.billingVersion !== 3 && !chargeById.has(registrationChargeId(context.student.id))) {
      registerCharge(
        createCharge(context, settings, {
          id: registrationChargeId(context.student.id),
          kind: "registration",
          description: "Inscrição/Renovação",
          baseAmount: settings.inscriptionRenewalFee,
          discountPercent: registrationDiscountPercentForStudent(context.student),
          dueOn: getStudentDate(context.student),
          createdAt: getStudentDate(context.student),
          ruleVersionId: rule?.id,
        }),
      );
    }

    getMonthsInRange(settings.startMonth, settings.endMonth).forEach((month) => {
      if (record.billingVersion === 3) return;
      if (!isTuitionApplicable(context.student, month.key, settings)) {
        return;
      }

      const chargeId = tuitionChargeId(context.student.id, month.key);

      if (chargeById.has(chargeId)) {
        return;
      }

      registerCharge(
        createCharge(context, settings, {
          id: chargeId,
          kind: "tuition",
          description: `Mensalidade de ${month.label}`,
          baseAmount: settings.monthlyFee,
          discountPercent: discountPercentForStudentMonth(
            context.student,
            month.key,
          ),
          monthKey: month.key,
          dueOn: dateForMonth(
            month.key,
            settings.monthlyDueDay ?? settings.firstPenaltyDay,
            context.academicYearId,
          ),
          createdAt: options.migratedAt,
          ruleVersionId: rule?.id,
        }),
      );
    });


    safeArray(record.penaltyCharges).forEach((penalty) => {
      penaltyCharges.push({
        id: penalty.id,
        baseChargeId: penalty.baseChargeId,
        studentId: context.student.id,
        enrollmentId: context.enrollmentId,
        academicYearId: context.academicYearId,
        stage: penalty.stage,
        amount: penalty.adjustedAmount ?? penalty.amount,
        createdAt: penalty.createdAt,
        snapshot: {
          thresholdDay: penalty.snapshot.thresholdDay,
          percent: penalty.snapshot.percent,
          fixedAmount: penalty.adjustedAmount ?? penalty.amount,
        },
      });
    });

    for (const adjustment of record.financialAdjustments ?? []) auditEvents.push({ id: `AUD-${adjustment.id}`, entityId: adjustment.chargeId, type: "correction", occurredAt: adjustment.recordedAt, recordedBy: adjustment.recordedBy, detail: `${adjustment.reason}: ${adjustment.previousAmount} → ${adjustment.nextAmount}; ${adjustment.evidenceReference ?? ""}` });
    safeArray(record.corrections).forEach((correction) => {
      auditEvents.push({
        id: `AUD-${correction.id}`,
        entityId: correction.paymentId,
        type: "correction",
        occurredAt: correction.recordedAt,
        recordedBy: correction.recordedBy,
        detail: `${correction.reason} / ajuste ${correction.linkedChargeId}`,
      });
    });
    const allocatedByCharge = new Map<string, number>();

    if (safeArray(record.payments).length > 0) {
      safeArray(record.payments).forEach((payment) => {
        if (payment.reference) {
          warnings.push({
            code: "legacy-reference",
            studentId: context.student.id,
            message:
              "Referencia legada preservada em legacyReference; o fluxo novo usa data efectiva.",
          });
        }

        payments.push({ ...buildFinancePayment(payment, context, options.recordedBy), kind: payment.kind, reversedBy: payment.reversedBy });
      });

      safeArray(record.allocations).forEach((allocation) => {
        const charge = chargeById.get(allocation.chargeId);
        const payment = record.payments.find(
          (item) => item.id === allocation.paymentId,
        );

        allocations.push({
          id: allocation.id,
          paymentId: allocation.paymentId,
          chargeId: allocation.chargeId,
          amount: allocation.amount,
          createdAt: payment?.recordedAt ?? options.migratedAt,
        });

        if (charge) {
          allocatedByCharge.set(
            charge.id,
            (allocatedByCharge.get(charge.id) ?? 0) + allocation.amount,
          );
        }
      });

      return;
    }

    warnings.push({
      code: "missing-payment-record",
      studentId: context.student.id,
      message:
        "Registo sem pagamentos normalizados; entradas legadas foram lidas em copia.",
    });

    const createPaymentFromEntry = (
      paymentId: string,
      entry: PaymentEntry | undefined,
      chargeId: string,
      methodFallback: string,
    ) => {
      if (!hasPaymentEntry(entry)) {
        return;
      }

      const effectivePaymentDate = paymentDateFromEntry(
        entry,
        getStudentDate(context.student),
      );
      const charge = chargeById.get(chargeId);
      const payment: FinancePayment = {
        id: paymentId,
        studentId: context.student.id,
        enrollmentId: context.enrollmentId,
        amount: entry.amount,
        effectivePaymentDate,
        recordedAt: entry.paidAt ?? `${effectivePaymentDate}T00:00:00.000Z`,
        recordedBy: options.recordedBy,
        method: entry.method ?? methodFallback,
        observation: entry.description,
        legacyReference: entry.reference,
      };
      const allocated = applyAllocation(
        allocations,
        allocatedByCharge,
        payment.id,
        charge,
        payment.amount,
        payment.recordedAt,
      );

      if (entry.reference) {
        warnings.push({
          code: "legacy-reference",
          studentId: context.student.id,
          message:
            "Referencia legada preservada em legacyReference; o fluxo novo usa data efectiva.",
        });
      }

      if (allocated < payment.amount) {
        warnings.push({
          code: "unallocated-payment-remainder",
          studentId: context.student.id,
          message:
            "Parte do pagamento legado ficou sem alocacao para preservar saldo de cobranca nao negativo.",
        });
      }

      payments.push(payment);
      warnings.push({
        code: "legacy-payment-entry",
        studentId: context.student.id,
        message:
          "Entrada antiga de pagamento foi convertida em Payment com effectivePaymentDate.",
      });
    };

    createPaymentFromEntry(
      `PAY-MIG-${context.student.id}-REG`,
      record.inscriptionRenewal,
      registrationChargeId(context.student.id),
      "Registo antigo",
    );

    Object.entries(record.monthlyPayments ?? {}).forEach(([monthKey, entry]) => {
      createPaymentFromEntry(
        `PAY-MIG-${context.student.id}-TUI-${monthKey.toUpperCase()}`,
        entry,
        tuitionChargeId(context.student.id, monthKey),
        "Registo antigo",
      );
    });

    safeArray(record.miscellaneousPayments).forEach((entry, index) => {
      if (!hasPaymentEntry(entry)) {
        return;
      }

      const chargeId = `CHG-${context.student.id}-MISC-MIG-${String(
        index + 1,
      ).padStart(3, "0")}`;

      registerCharge(
        createCharge(context, settings, {
          id: chargeId,
          kind: "miscellaneous",
          description: entry.description ?? "Pagamento diverso",
          baseAmount: entry.amount,
          createdAt: paymentDateFromEntry(entry, getStudentDate(context.student)),
        }),
      );
      createPaymentFromEntry(
        `PAY-MIG-${context.student.id}-MISC-${String(index + 1).padStart(
          3,
          "0",
        )}`,
        entry,
        chargeId,
        "Registo antigo",
      );
    });
  });

  const book: FinanceBook = {
    schemaVersion: "finance-book-v1",
    academicYears,
    educationLevels,
    classes,
    enrollments: contexts.map((context) => ({
      id: context.enrollmentId,
      studentId: context.student.id,
      academicYearId: context.academicYearId,
      educationLevelId: context.educationLevelId,
      classId: context.student.classId,
      groupId: context.student.groupId,
      stableNumber: context.stableNumber,
      startedOn: getStudentDate(context.student),
      status: "active",
    })),
    paymentRuleVersions,
    financialAid,
    charges,
    penaltyCharges,
    payments,
    allocations,
    auditEvents: [
      {
        id: "AUD-MIGRATION-PREVIEW-001",
        entityId: "finance-book-v1",
        type: "migration-preview",
        occurredAt: options.migratedAt,
        recordedBy: options.recordedBy,
        detail: "Preview de migracao criado sem apagar estado legado.",
      },
      ...auditEvents,
    ],
  };

  return { book, warnings };
}

export function createLegacySafetyExport(
  state: LegacyStoredDemoState,
  options: MigrationOptions = {},
): LegacySafetyExport {
  return {
    schemaVersion: "lss-legacy-safety-export-v1",
    storageKey: options.storageKey ?? defaultStorageKey,
    exportedAt: options.migratedAt ?? new Date().toISOString(),
    state: cloneJson(legacyStateOnly(state)),
  };
}

export function restoreLegacySafetyExport(exported: LegacySafetyExport) {
  return cloneJson(exported.state);
}

export function migrateLegacyStoredState(
  state: LegacyStoredDemoState,
  options: MigrationOptions = {},
): LegacyMigrationResult {
  const normalizedOptions: Required<MigrationOptions> = {
    storageKey: options.storageKey ?? defaultStorageKey,
    migratedAt: options.migratedAt ?? new Date().toISOString(),
    recordedBy: options.recordedBy ?? "Migração Fase 1",
  };
  const safetyExport = createLegacySafetyExport(state, normalizedOptions);
  const { book, warnings } = buildFinanceBook(state, normalizedOptions);
  const after = summarizeFinanceBook(book);
  const before = summarizeLegacySource(state, book);
  const violations = validateFinanceBook(book);

  return {
    safetyExport,
    financeBook: book,
    preview: {
      schemaVersion: "lss-finance-migration-preview-v1",
      createdAt: normalizedOptions.migratedAt,
      storageKey: normalizedOptions.storageKey,
      reversible: true,
      affectedStudents: safeArray(state.students).length,
      before,
      after,
      reconciled:
        before.chargeTotal === after.chargeTotal &&
        before.penaltyTotal === after.penaltyTotal &&
        before.paymentTotal === after.paymentTotal &&
        before.allocationTotal === after.allocationTotal &&
        before.balanceTotal === after.balanceTotal &&
        violations.length === 0,
      warnings,
      violations,
    },
  };
}

export function previewLegacyMigration(
  state: LegacyStoredDemoState,
  options: MigrationOptions = {},
): LegacyMigrationPreview {
  return migrateLegacyStoredState(state, options).preview;
}
