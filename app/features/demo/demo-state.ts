import {
  initialAcademicStages, initialClassDefinitions, initialClasses, initialGroups,
  initialPaymentRecords, initialPaymentSettings, initialRoomDefinitions,
  initialRooms, initialStudents,
} from "../../lib/school-demo-data";
import {
  buildDefaultPaymentRuleVersions, getMonthsInRange, normalizePaymentRecord,
  normalizeStudentsForEnrollmentPolicy,
  type StoredDemoState, type PaymentReceipt,
} from "../../components/school-admin-demo.model";
import { migrateLegacyStoredState } from "../finance/domain/migration";
import { validateDemoState } from "./snapshot-validation";
import { academicStateFor, type AcademicState } from "../academics/model";

export const demoStateVersion = 3;
export const demoStorageKey = "gestao-academica-demo-state-v2";
export const exampleBaseDate = "2026-09-02";

export type DemoData = Required<Pick<StoredDemoState,
  "academicStages" | "classDefinitions" | "roomDefinitions" | "classes" |
  "rooms" | "groups" | "students" | "paymentSettings" | "paymentRuleVersions" |
  "paymentRecords" | "billingRuns"
>> & { receipts: PaymentReceipt[]; academic?: AcademicState; paymentProofs?: import("../finance/service-model").PaymentProof[]; cashBook?: import("../cash/model").CashBook };

export type DemoOperation = {
  id: string;
  fingerprint: string;
  action: string;
  actorId: string;
  recordedAt: string;
  result: Record<string, unknown>;
};

export type DemoState = DemoData & {
  schemaVersion: 3;
  revision: number;
  datasetId: string;
  savedAt: string;
  scenario: {
    kind: "example" | "empty" | "legacy";
    version: 1;
    baseDate: string;
    years?: Array<{ id: string; status: "active" | "preparing" }>;
  };
  operations: DemoOperation[];
  legacySource?: { raw: string; convertedAt: string };
  recoverySource?: { raw: string; replacedAt: string };
  migrationWarnings?: string[];
  financeBook?: StoredDemoState["financeBook"];
  financeMigrationPreview?: StoredDemoState["financeMigrationPreview"];
  legacySafetyExport?: StoredDemoState["legacySafetyExport"];
};

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function emptyDemoData(): DemoData {
  return {
    academicStages: [], classDefinitions: [], roomDefinitions: [], classes: [],
    rooms: [], groups: [], students: [], paymentRecords: [], billingRuns: [],
    paymentRuleVersions: [], receipts: [],
    paymentSettings: { ...initialPaymentSettings, inscriptionRenewalFee: 0, monthlyFee: 0 },
  };
}

export function withFinanceMirror(state: DemoState, recordedAt: string): DemoState {
  const result = migrateLegacyStoredState(state, {
    storageKey: demoStorageKey, migratedAt: recordedAt, recordedBy: "Sistema demonstrativo",
  });
  return {
    ...state, financeBook: result.financeBook, financeMigrationPreview: result.preview,
    legacySafetyExport: state.legacySafetyExport ?? result.safetyExport,
  };
}

export function createDemoState(kind: "example" | "empty", { now, datasetId }: { now: string; datasetId: string }): DemoState {
  let data = emptyDemoData();
  if (kind === "example") {
    const students = normalizeStudentsForEnrollmentPolicy(cloneJson(initialStudents), initialPaymentSettings)
      .map((student, index) => ({ ...student, registrationNumber: `LSS-2026-${String(index + 1).padStart(3, "0")}` }));
    const classes = cloneJson(initialClasses);
    const rules = buildDefaultPaymentRuleVersions(students, classes, initialPaymentSettings).map((rule) => ({
      ...rule, monthlyFee: rule.educationLevelId === "10" ? 2000 : rule.monthlyFee,
      inscriptionFee: rule.educationLevelId === "10" ? 4000 : rule.inscriptionFee,
    }));
    const months = getMonthsInRange(initialPaymentSettings.startMonth, initialPaymentSettings.endMonth);
    const records = students.map((student) => {
      const record = normalizePaymentRecord(
        cloneJson(initialPaymentRecords.find((record) => record.studentId === student.id)!),
        student, months, initialPaymentSettings, rules, exampleBaseDate,
      );
      record.charges = record.charges.map((charge) => ({
        ...charge, createdAt: exampleBaseDate,
        snapshot: charge.snapshot ? { ...charge.snapshot, publishedAt: exampleBaseDate } : undefined,
      }));
      return record;
    });
    data = {
      academicStages: cloneJson(initialAcademicStages), classDefinitions: cloneJson(initialClassDefinitions),
      roomDefinitions: cloneJson(initialRoomDefinitions), classes, rooms: cloneJson(initialRooms),
      groups: cloneJson(initialGroups), students, paymentSettings: cloneJson(initialPaymentSettings),
      paymentRecords: records, paymentRuleVersions: rules, billingRuns: [], receipts: [],
      paymentProofs: [{ id: "PROOF-DEP-2026-008", studentId: "student-009", reference: "DEP-2026-008", note: "Comprovativo entregue pelo encarregado; aguarda conferência do depósito.", status: "pending", recordedAt: "2026-09-02T08:00:00.000Z", recordedBy: "Marta — Secretaria", draft: { studentId: "student-009", category: "tuition", monthKey: "aug", targetChargeId: "CHG-student-009-TUI-AUG", amount: 1500, paidOn: "2026-08-05", method: "Depósito bancário", reference: "DEP-2026-008", evidenceReference: "DEP-2026-008", lateReason: "Comprovativo apresentado após a data do depósito", description: "Mensalidade de Agosto", allowFutureAllocation: false, selectedChargeIds: [] } }],
    };
  }
  const state = withFinanceMirror({
    ...data, schemaVersion: 3, revision: 0, datasetId, savedAt: now, operations: [],
    scenario: { kind, version: 1, baseDate: exampleBaseDate,
      years: [{ id: "2026", status: "active" }, { id: "2027", status: "preparing" }] },
  }, `${exampleBaseDate}T08:00:00.000Z`);
  state.academic = academicStateFor(state);
  validateDemoState(state);
  return state;
}

export function hydrateDemoState(value: Record<string, unknown>, raw: string, now: string, datasetId: string): DemoState {
  validateDemoState(value);
  if (value.schemaVersion === 3) return cloneJson(value) as DemoState;
  const old = cloneJson(value) as StoredDemoState;
  const data: DemoData = { ...emptyDemoData(), ...old, receipts: [] };
  data.students = normalizeStudentsForEnrollmentPolicy(data.students, data.paymentSettings);
  data.paymentRuleVersions = buildDefaultPaymentRuleVersions(data.students, data.classes, data.paymentSettings, data.paymentRuleVersions);
  const state: DemoState = {
    ...data, schemaVersion: 3, revision: 0, datasetId, savedAt: old.savedAt ?? now,
    scenario: { kind: "legacy", version: 1, baseDate: old.savedAt?.slice(0, 10) ?? exampleBaseDate },
    operations: [], legacySource: { raw, convertedAt: now },
    migrationWarnings: new Set(data.students.map((student) => student.registrationNumber)).size < data.students.length
      ? ["O formato anterior contém números permanentes repetidos. Foram preservados; a revisão dos números será feita na organização académica."] : [],
  };
  // Carregar não recalcula cobranças/multas nem elimina registos do formato anterior.
  validateDemoState(state);
  return state;
}
