"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PaymentDialog } from "../features/finance/payment-dialog";
import { FinanceServicePanel } from "../features/finance/service-panel";
import { executeService, type ServiceCommand } from "../features/finance/service-commands";
import { pendingProofFor, receiptStatus, personCreditSources } from "../features/finance/service-model";
import { RulesWorkspace } from "../features/finance/rules-workspace";
import { executeBilling, synchronizeSchool, type BillingCommand } from "../features/finance/billing-commands";
import {
  initialAcademicStages,
  initialClassDefinitions,
  initialClasses,
  initialGroups,
  initialPaymentSettings,
  initialRoomDefinitions,
  initialRooms,
  initialStudents,
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type EntityStatus,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
} from "../lib/school-demo-data";
import {
  addMiscellaneousCharge,
  activeAcademicStages,
  activeClassDefinitions,
  activeRoomDefinitions,
  activeRooms,
  availableClassDefinitions,
  availableRoomDefinitions,
  buildFinanceProfileDraft,
  buildFinanceSettingsDraft,
  buildDefaultPaymentRuleVersions,
  buildGroupId,
  buildLedger,
  buildPaymentReceiptFromRecord,
  buildPaymentRecord,
  buildPaymentRuleDraft,
  buildStudentFinanceProfile,
  createPaymentPolicyVersions,
  currentAcademicYear,
  cx,
  financeStatusLabel,
  firstAvailableClassDefinitionId,
  firstAvailableRoomDefinitionId,
  formatCurrency,
  formatDate,
  getMiscellaneousCellState,
  getMiscellaneousSummary,
  getMonthCellState,
  getMonthsInRange,
  getRegistrationCellState,
  getStudentDebt,
  getStudentDebtTiming,
  getStudentEnrollmentDate,
  getStudentTuitionStartMonth,
  getTuitionInstallmentNumber,
  inputClasses,
  monthByKey,
  monthLabel,
  nextId,
  nextRegistrationNumber,
  nextRoomDefinitionId,
  nextStableNumberForGroup,
  nextStageDefinitionId,
  normalizePaymentRecord,
  normalizeText,
  nowIso,
  parseMoney,
  paymentMethods,
  paymentSections,
  profiles,
  rowMatchesPaymentAlertFilter,
  roomById,
  roomLabel,
  sortByName,
  sortClasses,
  sortStudents,
  stageLabel,
  statusOptions,
  today,
  type AcademicStageDraft,
  type BillingRun,
  type ClassDefinitionDraft,
  type ClassDraft,
  type EnrollmentDraft,
  type FinanceCellSelection,
  type FinanceProfileDraft,
  type FinanceSettingsDraft,
  type GroupDraft,
  type MiscellaneousChargeDraft,
  type PaymentLaunchDraft,
  type PaymentReceipt,
  type PaymentRuleDraft,
  type PaymentAlertFilter,
  type ProfileId,
  type RoomDefinitionDraft,
  type RoomDraft,
  type StudentLedgerRow,
  type WorkspaceView,
} from "./school-admin-demo.model";
import {
  assertCanPerformFinanceAction,
  type FinanceAction,
} from "../features/finance/domain/access-control";
import {
  createLocalDemoRepository, parseDemoSnapshot, serializeDemoSnapshot,
  type DemoRepository,
} from "../features/demo/local-repository";
import {
  createDemoState, emptyDemoData, hydrateDemoState, type DemoData, type DemoState,
} from "../features/demo/demo-state";
import { confirmDemoPayment } from "../features/demo/payment-command";
import { readDemoDrafts, writeDemoDrafts } from "../features/demo/draft-storage";
import {
  ClassForm,
  EnrollmentForm,
  FieldLabel,
  FinanceCell,
  FinanceCellDialog,
  GroupForm,
  MetricCard,
  MiscellaneousChargeForm,
  PaymentReceiptDialog,
  PaymentRuleDialog,
  PaymentRulesTable,
  PrimaryButton,
  RoomForm,
  SecondaryButton,
  StateLabel,
  StatusBadge,
  StatusDot,
  StudentFilters,
  StudentFinanceForm,
  SummaryLine,
  TextButton,
} from "./school-admin-demo.components";

import { DemoEntry } from "./demo-entry";
import { WorkspaceShell } from "./workspace-shell";
import { demoSessionFor, demoSessionKey, readDemoSession, saveDemoSession } from "../features/demo/demo-session";
import { useWorkspaceContext } from "../features/demo/use-workspace-context";
import { useWorkspaceScroll } from "../features/demo/use-workspace-scroll";
import { DashboardWorkspace } from "../features/reports/dashboard";
import { ReportsWorkspace } from "../features/reports/workspace";
import { executeCash, type CashCommand } from "../features/cash/commands";
import { ensureBackupConfiguration, automaticBackup } from "../features/continuity/backups";
import { AcademicWorkspace } from "../features/academics/academic-workspace";
import { academicStateFor, projectStudents, schoolDate } from "../features/academics/model";
import { executeAcademic, type AcademicCommand } from "../features/academics/operations";

function stableNumberSortValue(stableNumber?: string) {
  const parsed = Number(stableNumber);

  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function compareFinanceRows(a: StudentLedgerRow, b: StudentLedgerRow) {
  const byStableNumber =
    stableNumberSortValue(a.student.stableNumber) -
    stableNumberSortValue(b.student.stableNumber);

  if (byStableNumber !== 0) {
    return byStableNumber;
  }

  return a.student.fullName.localeCompare(b.student.fullName, "pt-PT");
}

function stableNumberLabel(student: Student) {
  return student.stableNumber ?? "Sem numero";
}

function financeCellAriaLabel({
  balance,
  rubric,
  state,
  studentName,
}: {
  balance: string;
  rubric: string;
  state: string;
  studentName: string;
}) {
  return `${rubric}, ${studentName}, ${state}, saldo ${balance}. Abrir detalhe financeiro.`;
}

const sidebarPreferenceKey = "lss-demo-sidebar-collapsed";

export function SchoolAdminDemo({
  initialView = "overview",
  developerToolsEnabled = process.env.NEXT_PUBLIC_LSS_DEVELOPER_TOOLS === "true",
}: {
  initialView?: WorkspaceView;
  developerToolsEnabled?: boolean;
}) {
  const firstClassId = initialClasses[0]?.id ?? "";
  const firstGroupId = initialGroups[0]?.id ?? "";
  const firstStudentId = initialStudents[0]?.id ?? "";
  const firstRoom = activeRooms(initialRooms)[0];
  const firstRoomId = firstRoom?.id ?? "";
  const firstStageId = initialAcademicStages[0]?.id ?? "";
  const [storageReady, setStorageReady] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileId | null>(null);
  const [accountName, setAccountName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [storageToolsNotice, setStorageToolsNotice] = useState("");
  const [backupNotice, setBackupNotice] = useState("");
  const enrollmentRef = useRef<{ openEnrollment(): void } | null>(null);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [storageLoadError, setStorageLoadError] = useState("");
  const [originalStorageRaw, setOriginalStorageRaw] = useState<string | undefined>();
  const [storageToolsError, setStorageToolsError] = useState(false);
  const [draftStorageNotice, setDraftStorageNotice] = useState("");
  const repositoryRef = useRef<DemoRepository | null>(null);
  const paymentCommandRef = useRef<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAttemptId, setPaymentAttemptId] = useState<string | null>(null);
  const paymentDraftEdited = useRef(false);
  const financeTrigger = useRef<HTMLElement | null>(null);
  const paymentDraftsByYear = useRef<Record<string, { payment: PaymentLaunchDraft; paymentCommandId: string | null }>>({});
  const paymentDraftYear = useRef<string | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const {
    academicStages, classDefinitions, roomDefinitions, classes, rooms, groups,
    students: storedStudents, paymentSettings: operationalSettings, paymentRuleVersions, paymentRecords, billingRuns,
  } = useMemo(() => demoState ?? emptyDemoData(), [demoState]);
  const academic = useMemo(() => demoState ? academicStateFor(demoState) : null, [demoState]);
  const academicToday = schoolDate(nowIso());
  const students = useMemo(() => demoState && academic ? projectStudents(demoState, academic, academicToday) : storedStudents, [demoState, academic, academicToday, storedStudents]);
  const workspace = useWorkspaceContext(demoState?.datasetId, operationalSettings.academicYear, {
    classes, groups, students,
    years: academic?.years, people: academic?.people, defaultYearId: operationalSettings.academicYear,
    months: getMonthsInRange(operationalSettings.startMonth, operationalSettings.endMonth).map((month) => month.key),
  }, initialView, switchPaymentDraftYear);
  const selectedYearId = workspace.context.yearId || operationalSettings.academicYear;
  const paymentSettings = academic?.years.find((year) => year.id === selectedYearId)?.settings ?? operationalSettings;
  const { view: activeView, classId: selectedClassId, groupId: selectedGroupId,
    search: studentSearch, month: billingMonthKey, paymentSection: activePaymentSection,
    alertFilter: paymentAlertFilter, selectedStudentIds: selectedPaymentStudentIds } = workspace.context;
  const setActiveView = workspace.field("view", true);
  const setSelectedClassId = workspace.field("classId");
  const setSelectedGroupId = workspace.field("groupId");
  const setStudentSearch = workspace.field("search");
  const setBillingMonthKey = workspace.field("month");
  const setActivePaymentSection = workspace.field("paymentSection", true);
  const setPaymentAlertFilter = workspace.field("alertFilter");
  const setSelectedPaymentStudentIds = workspace.field("selectedStudentIds");
  const [expandedTable, setExpandedTable] = useState(false);
  const financeTableVisible = activeView === "payments" && (activePaymentSection === "entry"
    || (activeProfile === "director" && activePaymentSection !== "reports"));
  const workspacePositionKey = [activeView, activePaymentSection, selectedClassId, selectedGroupId].join(":");
  useWorkspaceScroll(workspacePositionKey, activeProfile ? demoState?.datasetId : undefined);
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
  const [miscellaneousNotice, setMiscellaneousNotice] = useState("");
  const [selectedFinanceCell, setSelectedFinanceCell] =
    useState<FinanceCellSelection | null>(null);
  const [, setFinanceSettingsDraft] =
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
    enrollmentDate: today(),
    tuitionStartMonth: initialPaymentSettings.startMonth,
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
    targetChargeId: "",
    amount: String(initialPaymentSettings.monthlyFee),
    paidOn: today(),
    method: paymentMethods[0],
    description: "",
    allowFutureAllocation: false,
  });
  const [paymentRuleDraft, setPaymentRuleDraft] =
    useState<PaymentRuleDraft | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);
  const [paymentCorrectionTarget, setPaymentCorrectionTarget] =
    useState<{ studentId: string; paymentId: string } | null>(null);
  const [miscellaneousChargeDraft, setMiscellaneousChargeDraft] =
    useState<MiscellaneousChargeDraft>({
      type: "Prova",
      description: "",
      amount: "0",
      dueOn: today(),
      target: "group",
    });

  useEffect(() => {
    const restoreSessionId = window.setTimeout(() => {
      let savedSidebar: string | null = null;
      try {
        const session = readDemoSession(window.sessionStorage);
        if (session) {
          setActiveProfile(session.account.role);
          setAccountName(session.account.name);
        }
        savedSidebar = window.localStorage.getItem(sidebarPreferenceKey);
      } catch { /* As preferências não substituem a leitura obrigatória dos dados. */ }

      setSidebarCollapsed(savedSidebar === "true");
      setPreferencesReady(true);
    }, 0);

    return () => window.clearTimeout(restoreSessionId);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem(
        sidebarPreferenceKey,
        String(sidebarCollapsed),
      );
    } catch {
      // A preferência visual é opcional e não deve impedir o uso da demo.
    }
  }, [sidebarCollapsed, preferencesReady]);

  useEffect(() => {
    const loadStateId = window.setTimeout(() => {
      const repository = createLocalDemoRepository({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      }, { onBackupIssue: setBackupNotice });
      repositoryRef.current = repository;
      let loaded = repository.load();
      if (loaded.status === "empty" && !developerToolsEnabled) {
        try {
          const state = repository.initialize(createDemoState("example", { now: nowIso(), datasetId: crypto.randomUUID() }));
          loaded = { status: "ready", state, originalRaw: JSON.stringify(state) };
        } catch (error) {
          setStorageLoadError(error instanceof Error ? error.message : "Não foi possível preparar os dados.");
          setStorageReady(true);
          return;
        }
      }
      if (loaded.status !== "ready") {
        if (loaded.status === "error") {
          setStorageLoadError(loaded.message);
          setOriginalStorageRaw(loaded.originalRaw);
        }
        setStorageReady(true);
        return;
      }
      const state = loaded.state;
      setDemoState(state);
      const {
        academicStages: loadedAcademicStages, classDefinitions: loadedClassDefinitions,
        roomDefinitions: loadedRoomDefinitions, classes: loadedClasses, rooms: loadedRooms,
        groups: loadedGroups, students: loadedStudents, paymentSettings: loadedPaymentSettings,
      } = state;
      const loadedFirstClassId = loadedClasses[0]?.id ?? "";
      const loadedFirstGroupId =
        loadedGroups.find((group) => group.classId === loadedFirstClassId)?.id ??
        loadedGroups[0]?.id ??
        "";
      const loadedFirstStudent = loadedStudents[0];
      const loadedFirstRoom = activeRooms(loadedRooms)[0];
      const loadedFirstStageId = loadedAcademicStages[0]?.id ?? "";

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
        tuitionStartMonth: draft.tuitionStartMonth || loadedPaymentSettings.startMonth,
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
        targetChargeId: "",
        amount: String(loadedPaymentSettings.monthlyFee),
        paidOn: draft.paidOn || today(),
        allowFutureAllocation: false,
      }));
      const drafts = readDemoDrafts({
        getItem: (key) => window.sessionStorage.getItem(key),
        setItem: (key, value) => window.sessionStorage.setItem(key, value),
      }, state.datasetId);
      if (drafts) {
        paymentDraftsByYear.current = drafts.paymentByYear ?? {};
        setPaymentDraft(drafts.payment);
        setEnrollmentDraft(drafts.enrollment);
        paymentCommandRef.current = drafts.paymentCommandId; setPaymentAttemptId(drafts.paymentCommandId); paymentDraftEdited.current = true;
      }
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(loadStateId);
  }, [developerToolsEnabled]);

  useEffect(() => {
    if (!storageReady || !demoState || activeProfile !== "secretaria") return;
    const saveDraft = () => writeDemoDrafts(window.sessionStorage, {
      datasetId: demoState.datasetId, payment: paymentDraft, enrollment: enrollmentDraft,
      paymentCommandId: paymentCommandRef.current,
      paymentByYear: paymentDraftsByYear.current,
    });
    const timer = window.setTimeout(() => {
      try {
        saveDraft();
        setDraftStorageNotice("");
      } catch {
        setDraftStorageNotice("O rascunho permanece neste ecrã, mas não pôde ser guardado para reabertura.");
      }
    }, 0);
    const flush = () => { try { saveDraft(); } catch { /* O formulário continua conservado em memória. */ } };
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [storageReady, demoState, activeProfile, paymentDraft, enrollmentDraft, paymentAttemptId]);

  useEffect(() => {
    if (!storageReady || !demoState || activeProfile !== "secretaria" || !repositoryRef.current) return;
    const synchronize = () => {
      try {
        const next = synchronizeSchool(repositoryRef.current!, demoState, activeProfile, nowIso());
        if (next.revision !== demoState.revision) setDemoState(next);
      } catch (error) {
        setStorageToolsError(true);
        setStorageToolsNotice(error instanceof Error ? error.message : "Não foi possível actualizar as cobranças.");
      }
    };
    const timer = window.setTimeout(synchronize, 0);
    const interval = window.setInterval(synchronize, 60_000);
    window.addEventListener("focus", synchronize);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener("focus", synchronize); };
  }, [storageReady, demoState, activeProfile, activeView]);

  const effectivePaymentRuleVersions = useMemo(
    () =>
      buildDefaultPaymentRuleVersions(
        students,
        classes,
        paymentSettings,
        paymentRuleVersions,
      ),
    [classes, paymentRuleVersions, paymentSettings, students],
  );

  const yearClasses = useMemo(() => classes.filter((item) => item.academicYear === selectedYearId), [classes, selectedYearId]);
  const yearStudents = useMemo(() => students.filter((item) => (item.academicYearId ?? operationalSettings.academicYear) === selectedYearId && item.enrollmentStatus !== "cancelled"), [students, selectedYearId, operationalSettings.academicYear]);
  const currentClass =
    yearClasses.find((schoolClass) => schoolClass.id === selectedClassId) ??
    yearClasses[0];
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
    () => getMonthsInRange(paymentSettings.startMonth, paymentSettings.endMonth).filter((month) => !academic || academic.years.find((year) => year.id === selectedYearId)?.billingMonths.includes(month.key)),
    [paymentSettings.startMonth, paymentSettings.endMonth, academic, selectedYearId],
  );

  const classesWithStats = useMemo(
    () =>
      sortClasses(yearClasses).map((schoolClass) => {
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
    [yearClasses, groups, students],
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

  const classesById = useMemo(
    () => new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass])),
    [classes],
  );
  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );
  const studentContextLabel = (student: Student) => {
    const schoolClass = classesById.get(student.classId);
    const group = groupsById.get(student.groupId);

    return `${schoolClass?.name ?? "Sem classe"} / ${group?.name ?? "Sem turma"}`;
  };

  const allStudentsAlphabetically = useMemo(
    () => sortStudents(students.filter((student) => (student.academicYearId ?? operationalSettings.academicYear) === selectedYearId)),
    [students, selectedYearId, operationalSettings.academicYear],
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
        const rawRecord =
          paymentRecords.find((item) => item.studentId === student.id) ??
          buildPaymentRecord(student.id);
        const record = normalizePaymentRecord(
          rawRecord,
          student,
          paymentMonths,
          paymentSettings,
          effectivePaymentRuleVersions,
        );

        return {
          student,
          record,
          ledger: buildLedger(
            student,
            record,
            paymentMonths,
            paymentSettings,
            undefined,
            effectivePaymentRuleVersions,
          ),
        };
      }),
    [
      allStudentsAlphabetically,
      effectivePaymentRuleVersions,
      paymentMonths,
      paymentRecords,
      paymentSettings,
    ],
  );

  const paymentRows = useMemo(
    () => allPaymentRows.filter((row) => row.student.groupId === currentGroupId),
    [allPaymentRows, currentGroupId],
  );

  const filteredPaymentRows = useMemo(
    () =>
      paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          paymentAlertFilter,
          paymentMonths,
          paymentSettings,
        ),
      ),
    [paymentAlertFilter, paymentMonths, paymentRows, paymentSettings],
  );

  const visiblePaymentRows = useMemo(() => {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));

    return filteredPaymentRows
      .filter((row) => visibleIds.has(row.student.id))
      .sort(compareFinanceRows);
  }, [filteredPaymentRows, visibleStudents]);
  const selectedPaymentStudentIdSet = useMemo(
    () => new Set(selectedPaymentStudentIds),
    [selectedPaymentStudentIds],
  );
  const selectedPaymentRows = useMemo(
    () =>
      paymentRows.filter((row) => selectedPaymentStudentIdSet.has(row.student.id)),
    [paymentRows, selectedPaymentStudentIdSet],
  );
  const selectedFinanceRow = selectedFinanceCell
    ? allPaymentRows.find((row) => row.student.id === selectedFinanceCell.studentId)
    : undefined;
  const selectedFinanceContextLabel = selectedFinanceRow
    ? studentContextLabel(selectedFinanceRow.student)
    : "Sem contexto";

  const selectedMonth = monthByKey(billingMonthKey) ?? paymentMonths[0];
  const billingRunsForGroup = billingRuns.filter(
    (run) => run.groupId === currentGroupId,
  );
  const selectedMonthBillingRun = billingRunsForGroup.find(
    (run) => run.monthKey === billingMonthKey,
  );
  const selectedMonthExpected = paymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.due ?? 0);
  }, 0);
  const selectedMonthDiscount = paymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.discount ?? 0);
  }, 0);
  const selectedMonthPaid = paymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.paid ?? 0) + (month?.finePaid ?? 0);
  }, 0);
  const selectedMonthBalance = paymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.balance ?? 0) + (month?.fineBalance ?? 0);
  }, 0);
  const selectedMonthCarryOut = paymentRows.reduce((total, row) => total + (demoState ? personCreditSources(demoState, row.student.id).reduce((sum, source) => sum + source.available, 0) : row.ledger.totals.carry), 0);
  const selectedProfile =
    profiles.find((profile) => profile.id === activeProfile) ?? profiles[1];
  useEffect(() => {
    if (activeProfile !== "secretaria" || !demoState) return;
    const timer = window.setTimeout(() => {
      try { ensureBackupConfiguration(window.localStorage); automaticBackup(window.localStorage, demoState, nowIso(), setBackupNotice); }
      catch (error) { setBackupNotice(error instanceof Error ? error.message : "Não foi possível preparar as cópias locais."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeProfile, demoState]);

  function guardMutation(
    action: FinanceAction,
    onDenied: (message: string) => void = setFinanceNotice,
  ) {
    try {
      assertCanPerformFinanceAction(selectedProfile.id, action);
      return true;
    } catch (error) {
      onDenied(error instanceof Error ? error.message : "Operacao nao autorizada.");
      return false;
    }
  }

  function enterDemo(accountId: string) {
    const session = demoSessionFor(accountId);
    if (!session) return;
    try { saveDemoSession(window.sessionStorage, session); }
    catch {
      setStorageToolsError(true);
      setStorageToolsNotice("A sessão não pôde ser guardada. Ao recarregar, será necessário entrar novamente.");
    }
    setAccountName(session.account.name);
    setActiveProfile(session.account.role);
    workspace.update({ view: activeView }, true);
  }

  function switchPaymentDraftYear(yearId: string) {
    const sourceYear = students.find((item) => item.id === paymentDraft.studentId)?.academicYearId ?? paymentDraftYear.current ?? operationalSettings.academicYear;
    if (!yearId || sourceYear === yearId) { paymentDraftYear.current = yearId || sourceYear; return; }
    paymentDraftsByYear.current[sourceYear] = { payment: paymentDraft, paymentCommandId: paymentCommandRef.current };
    const saved = paymentDraftsByYear.current[yearId];
    const settings = academic?.years.find((year) => year.id === yearId)?.settings ?? operationalSettings;
    const student = students.find((item) => item.academicYearId === yearId);
    setPaymentDraft(saved?.payment ?? { ...paymentDraft, studentId: student?.id ?? "", category: "tuition", monthKey: settings.startMonth, targetChargeId: "", amount: student ? String(settings.monthlyFee) : "0", paidOn: today(), description: "", allowFutureAllocation: false });
    paymentCommandRef.current = saved?.paymentCommandId ?? null; setPaymentAttemptId(saved?.paymentCommandId ?? null); paymentDraftEdited.current = Boolean(saved);
    paymentDraftYear.current = yearId;
    setSelectedFinanceCell(null);
  }

  function executeAcademicCommand(command: AcademicCommand, id: string) {
    if (!repositoryRef.current || !demoState || !activeProfile) throw new Error("Entre na sua conta e aguarde os dados.");
    const result = executeAcademic(repositoryRef.current, demoState, command, { id, role: activeProfile, recordedAt: nowIso() });
    setDemoState(result.state); setStorageToolsError(false); setStorageToolsNotice(""); return result;
  }

  function executeBillingCommand(command: BillingCommand, id: string) {
    if (!repositoryRef.current || !demoState || !activeProfile) throw new Error("Entre na sua conta e aguarde os dados.");
    const result = executeBilling(repositoryRef.current, demoState, command, { id, role: activeProfile, recordedAt: nowIso() });
    setDemoState(result.state); setStorageToolsError(false); setStorageToolsNotice("");
  }

  function confirmAcademicPayment(draft: PaymentLaunchDraft, id: string) {
    if (!repositoryRef.current || !demoState || !activeProfile) throw new Error("Entre na sua conta e aguarde os dados.");
    const result = confirmDemoPayment(repositoryRef.current, { expected: demoState, role: activeProfile, commandId: id, draft, recordedAt: nowIso() });
    setDemoState(result.state); setStorageToolsError(false); setStorageToolsNotice(""); return result;
  }

  function signOut() {
    try { window.sessionStorage.removeItem(demoSessionKey); } catch { /* Sair continua disponível. */ }
    setActiveProfile(null);
    setPaymentDialogOpen(false); setPaymentCorrectionTarget(null); setPaymentReceipt(null);
    setAccountName("");
    setExpandedTable(false);
    window.history.replaceState(null, "", "/");
  }

  function navigateTo(view: WorkspaceView) {
    setSelectedFinanceCell(null);
    setExpandedTable(false);
    setActiveView(view);
  }

  function showStorageError(error: unknown, onError = setStorageToolsNotice) {
    const message = error instanceof Error ? error.message : "Não foi possível guardar os dados.";
    setStorageToolsError(true);
    setStorageToolsNotice(message);
    onError(message);
  }

  function commitChanges(patch: Partial<DemoData>, action: FinanceAction = "manage-academic-structure") {
    try {
      if (!repositoryRef.current || !demoState || activeProfile !== "secretaria") {
        throw new Error("Entre como Secretaria e aguarde o carregamento dos dados.");
      }
      const result = repositoryRef.current.commit({
        role: activeProfile, action, expected: demoState,
        command: { id: crypto.randomUUID(), payload: { revision: demoState.revision, fields: Object.keys(patch) } },
        change: () => ({ patch }),
      });
      setDemoState(result.state);
      setStorageToolsError(false);
      setStorageToolsNotice("");
      return true;
    } catch (error) {
      showStorageError(error);
      return false;
    }
  }

  function updateValue<T,>(current: T, update: T | ((value: T) => T)): T {
    return typeof update === "function" ? (update as (value: T) => T)(current) : update;
  }

  function downloadJson(contents: string, filename: string) {
    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportDemoData() {
    try {
      if (originalStorageRaw !== undefined && storageLoadError) {
        downloadJson(originalStorageRaw, `lss-original-${today()}.json`);
        return;
      }
      const loaded = repositoryRef.current?.load();
      if (!loaded || loaded.status !== "ready") throw new Error("Não existem dados legíveis para exportar.");
      downloadJson(serializeDemoSnapshot(loaded.state), `lss-backup-${today()}.json`);
      setStorageToolsError(false);
      setStorageToolsNotice("Exportação concluída. O ficheiro foi descarregado.");
    } catch (error) { showStorageError(error); }
  }

  async function importDemoData(file?: File) {
    if (!developerToolsEnabled || !file || activeProfile !== "secretaria" || !repositoryRef.current) return;
    try {
      const raw = await file.text();
      const incoming = hydrateDemoState(parseDemoSnapshot(raw), raw, nowIso(), crypto.randomUUID());
      const confirmed = window.confirm(
        `O ficheiro contém ${incoming.students.length} alunos, ${incoming.groups.length} turmas e ${incoming.paymentRecords.length} registos financeiros. ` +
        "Vai substituir o cenário local. O original ilegível, se existir, será conservado. Deseja continuar?",
      );
      if (!confirmed) {
        setStorageToolsNotice("Importação cancelada; os dados actuais foram preservados.");
        return;
      }
      const next = demoState
        ? repositoryRef.current.replace(demoState, incoming, activeProfile)
        : originalStorageRaw !== undefined
          ? repositoryRef.current.recover(originalStorageRaw, incoming, activeProfile)
          : repositoryRef.current.initialize(incoming);
      setDemoState(next);
      window.location.reload();
    } catch (error) { showStorageError(error); }
  }

  function initializeDemo(kind: "example" | "empty") {
    try {
      if (!developerToolsEnabled || !repositoryRef.current || activeProfile !== "secretaria") return;
      const state = createDemoState(kind, { now: nowIso(), datasetId: crypto.randomUUID() });
      setDemoState(repositoryRef.current.initialize(state));
      window.location.reload();
    } catch (error) { showStorageError(error); }
  }

  function resetDemoData() {
    if (!developerToolsEnabled || !demoState || activeProfile !== "secretaria" || !repositoryRef.current) return;
    if (!window.confirm("Repor a demo vai substituir o cenário local. Exporte primeiro para conservar uma cópia. Deseja continuar?")) {
      setStorageToolsNotice("Reposição cancelada; os dados actuais foram preservados.");
      return;
    }
    try {
      const incoming = createDemoState("example", { now: nowIso(), datasetId: crypto.randomUUID() });
      setDemoState(repositoryRef.current.replace(demoState, incoming, activeProfile));
      window.location.reload();
    } catch (error) { showStorageError(error); }
  }

  function selectClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setSelectedClassId(classId);
    setSelectedGroupId(nextGroup?.id ?? "");
    setSelectedPaymentStudentIds([]);
    setSelectedFinanceCell(null);
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
    setSelectedPaymentStudentIds([]);
    setSelectedFinanceCell(null);
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
      enrollmentDate: today(),
      tuitionStartMonth: paymentSettings.startMonth,
      classId,
      groupId,
    });
  }

  function startNewEnrollment() {
    setActiveView("enrollments");
    resetEnrollmentDraft(currentClassId, currentGroupId);
  }

  function submitAcademicStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setStageDefinitionError)) {
      return;
    }

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

    if (!commitChanges({ academicStages: updateValue(academicStages, nextStages) }, "manage-academic-structure")) return;
    setClassDefinitionDraft((draft) => ({
      ...draft,
      stageId: draft.stageId || newStage.id,
    }));
    resetAcademicStageDraft();
  }

  function submitClassDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setClassDefinitionError)) {
      return;
    }

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

    if (!commitChanges({ classDefinitions: updateValue(classDefinitions, nextDefinitions) }, "manage-academic-structure")) return;
    setClassDraft((draft) => ({
      ...draft,
      definitionId: draft.definitionId || newDefinition.id,
    }));
    resetClassDefinitionDraft(academicStages);
  }

  function submitRoomDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setRoomDefinitionError)) {
      return;
    }

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

    if (!commitChanges({ roomDefinitions: updateValue(roomDefinitions, nextDefinitions) }, "manage-academic-structure")) return;
    setRoomDraft((draft) => ({
      ...draft,
      definitionId: draft.definitionId || newDefinition.id,
    }));
    resetRoomDefinitionDraft();
  }

  function toggleAcademicStageStatus(stageId: string) {
    if (!guardMutation("manage-academic-structure", setStageDefinitionError)) {
      return;
    }

    if (!commitChanges({ academicStages: updateValue(academicStages, (items) =>
      items.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              status: stage.status === "active" ? "inactive" : "active",
            }
          : stage,
      )) }, "manage-academic-structure")) return;
  }

  function toggleClassDefinitionStatus(definitionId: string) {
    if (!guardMutation("manage-academic-structure", setClassDefinitionError)) {
      return;
    }

    if (!commitChanges({ classDefinitions: updateValue(classDefinitions, (items) =>
      items.map((definition) =>
        definition.id === definitionId
          ? {
              ...definition,
              status: definition.status === "active" ? "inactive" : "active",
            }
          : definition,
      )) }, "manage-academic-structure")) return;
  }

  function toggleRoomDefinitionStatus(definitionId: string) {
    if (!guardMutation("manage-academic-structure", setRoomDefinitionError)) {
      return;
    }

    if (!commitChanges({ roomDefinitions: updateValue(roomDefinitions, (items) =>
      items.map((definition) =>
        definition.id === definitionId
          ? {
              ...definition,
              status: definition.status === "active" ? "inactive" : "active",
            }
          : definition,
      )) }, "manage-academic-structure")) return;
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setRoomError)) {
      return;
    }

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

    if (!commitChanges({ rooms: updateValue(rooms, nextRooms) }, "manage-academic-structure")) return;
    setGroupDraft((draft) => ({
      ...draft,
      roomId: draft.roomId || newRoom.id,
      capacity: draft.roomId ? draft.capacity : String(newRoom.capacity),
    }));
    resetRoomDraft(nextRooms, roomDefinitions);
  }

  function openPaymentEntry(studentId?: string) {
    if (!studentId && !paymentDraftEdited.current) studentId = paymentDraft.studentId || yearStudents[0]?.id;
    financeTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPaymentDialogOpen(true);
    if (studentId) { paymentCommandRef.current = null; setPaymentAttemptId(null); paymentDraftEdited.current = false; }
    workspace.update({ view: "payments", paymentSection: "entry" }, true);

    if (studentId) {
      const student = students.find((item) => item.id === studentId);
      const record =
        paymentRecords.find((item) => item.studentId === studentId) ??
        buildPaymentRecord(studentId);
      const ledger = student
        ? buildLedger(
            student,
            record,
            paymentMonths,
            paymentSettings,
            undefined,
            effectivePaymentRuleVersions,
          )
        : undefined;
      const registrationPending = (ledger?.registrationBalance ?? 0) > 0;
      const openMonth = ledger?.monthly.find((month) => month.applicable && month.balance + month.fineBalance > 0);

      setPaymentDraft((draft) => ({
        ...draft,
        studentId,
        selectedChargeIds: [], additionalTargets: [], creditOnly: false, primaryAllocationAmount: undefined,
        category: registrationPending ? "registration" : "tuition",
        monthKey: openMonth?.month.key ?? draft.monthKey,
        amount: registrationPending
          ? String(ledger?.registrationBalance ?? paymentSettings.inscriptionRenewalFee)
          : String((openMonth?.balance ?? 0) + (openMonth?.fineBalance ?? 0)),
        targetChargeId: "",
        paidOn: today(),
        allowFutureAllocation: false,
      }));
    }
  }

  function openFinanceCell(selection: FinanceCellSelection) {
    financeTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedFinanceCell(selection);
  }

  function registerPaymentFromCell(
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentLaunchDraft["category"];
      studentId: string;
    },
  ) {
    setPaymentDialogOpen(true);
    paymentCommandRef.current = null; setPaymentAttemptId(null); paymentDraftEdited.current = false;
    workspace.update({ view: "payments", paymentSection: "entry" }, true);
    setSelectedFinanceCell(null);
    setPaymentDraft((currentDraft) => ({
      ...currentDraft,
      studentId: draft.studentId,
      selectedChargeIds: [], additionalTargets: [], creditOnly: false, primaryAllocationAmount: undefined,
      category: draft.category,
      monthKey: draft.monthKey ?? currentDraft.monthKey,
      targetChargeId: draft.targetChargeId ?? "",
      amount: draft.amount ?? currentDraft.amount,
      paidOn: today(),
      description: draft.description ?? "",
      allowFutureAllocation: draft.allowFutureAllocation ?? false,
    }));
  }

  function openMiscellaneousChargeForm() {
    workspace.update({ view: "payments", paymentSection: "settings" }, true);
    setSelectedFinanceCell(null);
    setMiscellaneousNotice("");
  }

  function togglePaymentStudentSelection(studentId: string) {
    setSelectedPaymentStudentIds((ids) =>
      ids.includes(studentId)
        ? ids.filter((id) => id !== studentId)
        : [...ids, studentId],
    );
  }

  function toggleAllVisiblePaymentStudents() {
    const visibleIds = visiblePaymentRows.map((row) => row.student.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedPaymentStudentIdSet.has(id));

    setSelectedPaymentStudentIds((ids) => {
      if (allVisibleSelected) {
        return ids.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...ids, ...visibleIds]));
    });
  }

  function submitMiscellaneousCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("publish-charges", setMiscellaneousNotice)) {
      return;
    }

    const targetRows =
      miscellaneousChargeDraft.target === "selected"
        ? selectedPaymentRows
        : paymentRows;
    const amount = parseMoney(miscellaneousChargeDraft.amount);

    if (targetRows.length === 0) {
      setMiscellaneousNotice("Seleccione alunos ou uma turma com alunos.");
      return;
    }

    if (amount <= 0) {
      setMiscellaneousNotice("Informe o valor da cobrança.");
      return;
    }

    const createdAt = nowIso();

    if (!commitChanges({ paymentRecords: updateValue(paymentRecords, (records) => {
      const nextRecords = [...records];

      targetRows.forEach((row) => {
        const currentRecord =
          nextRecords.find((record) => record.studentId === row.student.id) ??
          buildPaymentRecord(row.student.id);
        const nextRecord = addMiscellaneousCharge(
          currentRecord,
          row.student,
          miscellaneousChargeDraft,
          createdAt,
        );
        const recordIndex = nextRecords.findIndex(
          (record) => record.studentId === row.student.id,
        );

        if (recordIndex >= 0) {
          nextRecords[recordIndex] = nextRecord;
          return;
        }

        nextRecords.push(nextRecord);
      });

      return nextRecords;
    }) }, "publish-charges")) return;
    setMiscellaneousNotice(
      `${targetRows.length} cobranças criadas. Total previsto: ${formatCurrency(
        targetRows.length * amount,
      )}.`,
    );
    setMiscellaneousChargeDraft((draft) => ({
      ...draft,
      description: "",
      amount: "0",
      dueOn: today(),
      target: "group",
    }));
  }

  function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setClassError)) {
      return;
    }

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
      academicYearId: currentAcademicYear(),
      educationLevelId: selectedDefinition.id,
      status: classDraft.status,
      createdAt: today(),
    };
    const nextClasses = [...classes, newClass];

    if (!commitChanges({ classes: updateValue(classes, nextClasses) }, "manage-academic-structure")) return;
    setSelectedClassId(newClass.id);
    setSelectedGroupId("");
    resetGroupDraft(newClass.id);
    resetEnrollmentDraft(newClass.id, "");
    resetClassDraft(nextClasses, classDefinitions, academicStages);
  }

  function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-academic-structure", setGroupError)) {
      return;
    }

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

    if (!commitChanges({ groups: updateValue(groups, (items) => [...items, newGroup]) }, "manage-academic-structure")) return;
    setSelectedClassId(newGroup.classId);
    setSelectedGroupId(newGroup.id);
    setEnrollmentDraft((draft) => ({
      ...draft,
      classId: newGroup.classId,
      groupId: newGroup.id,
    }));
    resetGroupDraft(newGroup.classId);
  }

  function saveEnrollment(openPaymentAfterSave: boolean) {
    if (!guardMutation("manage-enrollment", setEnrollmentNotice)) {
      return;
    }

    const trimmedName = enrollmentDraft.fullName.trim();
    const selectedGroup = groups.find(
      (group) => group.id === enrollmentDraft.groupId,
    );
    const selectedClass = classes.find(
      (schoolClass) => schoolClass.id === selectedGroup?.classId,
    );

    if (!trimmedName || !selectedGroup) {
      setEnrollmentNotice("Escolha uma turma e informe o nome do aluno.");
      return;
    }

    const enrollmentFinanceProfile = buildStudentFinanceProfile(
      undefined,
      {
        studentId: "",
        status: enrollmentDraft.financeStatus,
        discountPercent: enrollmentDraft.discountPercent,
        startMonth: enrollmentDraft.exceptionStartMonth,
        endMonth: enrollmentDraft.exceptionEndMonth,
        reason: enrollmentDraft.exceptionReason,
        authorizedBy:
          enrollmentDraft.financeStatus === "regular" ? "" : "Secretaria",
        registeredBy: "Secretaria",
      },
      nowIso(),
    );
    const newStudentId = nextId(students, "ALU");
    const academicYearId =
      selectedClass?.academicYearId ??
      selectedClass?.academicYear ??
      paymentSettings.academicYear;
    const educationLevelId =
      selectedClass?.educationLevelId ?? selectedClass?.stage ?? selectedGroup.classId;

    const provisionalStudent: Student = {
      id: newStudentId,
      enrollmentId: `ENR-${academicYearId}-${newStudentId}`,
      academicYearId,
      educationLevelId,
      stableNumber: nextStableNumberForGroup(
        students,
        selectedGroup.id,
        paymentSettings,
        academicYearId,
      ),
      registrationNumber: nextRegistrationNumber(students),
      fullName: trimmedName,
      guardianName: enrollmentDraft.guardianName.trim() || "Por registar",
      guardianPhone: enrollmentDraft.guardianPhone.trim() || "Por registar",
      enrollmentType: enrollmentDraft.enrollmentType,
      enrollmentDate: enrollmentDraft.enrollmentDate || today(),
      tuitionStartMonth: enrollmentDraft.tuitionStartMonth || paymentSettings.startMonth,
      registrationStatus: "pending",
      financialProfile: enrollmentFinanceProfile,
      classId: selectedGroup.classId,
      groupId: selectedGroup.id,
      createdAt: enrollmentDraft.enrollmentDate || today(),
    };
    const initialRecord = normalizePaymentRecord(
      buildPaymentRecord(provisionalStudent.id),
      provisionalStudent,
      paymentMonths,
      paymentSettings,
      effectivePaymentRuleVersions,
      provisionalStudent.enrollmentDate,
    );
    const initialLedger = buildLedger(
      provisionalStudent,
      initialRecord,
      paymentMonths,
      paymentSettings,
      provisionalStudent.enrollmentDate,
      effectivePaymentRuleVersions,
    );
    const registrationBalance =
      initialLedger.registrationBalance + initialLedger.registrationPenaltyBalance;
    const newStudent: Student = {
      ...provisionalStudent,
      registrationStatus: registrationBalance <= 0 ? "paid" : "pending",
    };

    if (!commitChanges({
      students: [...students, newStudent],
      paymentRecords: [...paymentRecords, initialLedger.normalizedRecord],
    }, "manage-enrollment")) return;
    paymentCommandRef.current = null;
    setPaymentDraft((draft) => ({
      ...draft,
      studentId: newStudent.id,
      category: "registration",
      monthKey: newStudent.tuitionStartMonth,
      targetChargeId: "",
      amount: String(registrationBalance),
      paidOn: today(),
      description: "",
      allowFutureAllocation: false,
    }));
    setSelectedClassId(newStudent.classId);
    setSelectedGroupId(newStudent.groupId);
    resetEnrollmentDraft(newStudent.classId, newStudent.groupId);

    if (openPaymentAfterSave && registrationBalance > 0) {
      workspace.update({ view: "payments", paymentSection: "entry" }, true);
      setBillingNotice(
        `${newStudent.registrationNumber} pronta para pagamento de inscricao: ${formatCurrency(registrationBalance)}.`,
      );
      return;
    }

    setEnrollmentNotice(
      registrationBalance > 0
        ? `${newStudent.registrationNumber} guardada. Inscricao pendente para pagamento.`
        : `${newStudent.registrationNumber} guardada. Inscricao sem valor exigivel.`,
    );
  }

  function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveEnrollment(false);
  }

  function saveEnrollmentAndOpenPayment() {
    saveEnrollment(true);
  }

  function toggleClassStatus(classId: string) {
    if (!guardMutation("manage-academic-structure", setClassError)) {
      return;
    }

    if (!commitChanges({ classes: updateValue(classes, (items) =>
      items.map((schoolClass) =>
        schoolClass.id === classId
          ? {
              ...schoolClass,
              status: schoolClass.status === "active" ? "inactive" : "active",
            }
          : schoolClass,
      )) }, "manage-academic-structure")) return;
  }

  function toggleGroupStatus(groupId: string) {
    if (!guardMutation("manage-academic-structure", setGroupError)) {
      return;
    }

    if (!commitChanges({ groups: updateValue(groups, (items) =>
      items.map((group) =>
        group.id === groupId
          ? {
              ...group,
              status: group.status === "active" ? "inactive" : "active",
            }
          : group,
      )) }, "manage-academic-structure")) return;
  }

  function toggleRoomStatus(roomId: string) {
    if (!guardMutation("manage-academic-structure", setRoomError)) {
      return;
    }

    if (!commitChanges({ rooms: updateValue(rooms, (items) =>
      items.map((room) =>
        room.id === roomId
          ? {
              ...room,
              status: room.status === "active" ? "inactive" : "active",
            }
          : room,
      )) }, "manage-academic-structure")) return;
  }

  function changeEnrollmentClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setEnrollmentDraft((draft) => ({
      ...draft,
      classId,
      groupId: nextGroup?.id ?? "",
    }));
  }

  function openPaymentRuleDialog(ruleId: string) {
    if (!guardMutation("manage-payment-rules", setFinanceSettingsNotice)) {
      return;
    }

    const rule = effectivePaymentRuleVersions.find((item) => item.id === ruleId);

    if (!rule) {
      setFinanceSettingsNotice("Regra financeira nao encontrada.");
      return;
    }

    setFinanceSettingsNotice("");
    setPaymentRuleDraft(buildPaymentRuleDraft(rule, effectivePaymentRuleVersions));
  }

  function openNewPaymentPolicyDialog() {
    if (!guardMutation("manage-payment-rules", setFinanceSettingsNotice)) {
      return;
    }

    const template = effectivePaymentRuleVersions.find(
      (rule) => rule.status === "active",
    );

    if (!template) {
      setFinanceSettingsNotice("Não existe uma regra base para criar a política.");
      return;
    }

    setFinanceSettingsNotice("");
    setPaymentRuleDraft({
      ...buildPaymentRuleDraft(template, effectivePaymentRuleVersions),
      ruleId: "",
      policyId: "",
      policyName: "",
      academicYearId: paymentSettings.academicYear,
      educationLevelId: "",
      educationLevelIds: [],
      status: "active",
      validFrom: `${paymentSettings.academicYear}-01-01`,
    });
  }

  function submitPaymentRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentRuleDraft) {
      return;
    }

    if (!guardMutation("manage-payment-rules", setFinanceSettingsNotice)) {
      return;
    }

    if (!paymentRuleDraft.policyName.trim()) {
      setFinanceSettingsNotice("Informe o nome da política de pagamento.");
      return;
    }

    if (!/^\d{4}$/.test(paymentRuleDraft.academicYearId.trim())) {
      setFinanceSettingsNotice("Informe um ano lectivo válido com quatro dígitos.");
      return;
    }

    if (paymentRuleDraft.educationLevelIds.length === 0) {
      setFinanceSettingsNotice("Seleccione pelo menos uma classe para a política.");
      return;
    }

    if (
      parseMoney(paymentRuleDraft.inscriptionFee) < 0 ||
      parseMoney(paymentRuleDraft.monthlyFee) < 0
    ) {
      setFinanceSettingsNotice("Os valores da política não podem ser negativos.");
      return;
    }

    if (!commitChanges({ paymentRuleVersions: updateValue(paymentRuleVersions, createPaymentPolicyVersions(
        effectivePaymentRuleVersions,
        {
          ...paymentRuleDraft,
          validFrom: `${paymentRuleDraft.academicYearId.trim()}-01-01`,
        },
        today(),
      )) }, "manage-payment-rules")) return;
    setPaymentRuleDraft(null);
    setFinanceSettingsNotice(
      "Política guardada por classe e ano lectivo. As versões anteriores ficaram no histórico.",
    );
  }

  function paymentRuleLevelLabel(rule: { educationLevelId: string }) {
    const stage = academicStages.find((item) => item.id === rule.educationLevelId);
    const classForLevel = classes.find(
      (schoolClass) => schoolClass.educationLevelId === rule.educationLevelId,
    );
    const definitionForLevel = classDefinitions.find(
      (definition) => definition.id === rule.educationLevelId,
    );

    return (
      definitionForLevel?.name ??
      classForLevel?.name ??
      stage?.name ??
      (rule.educationLevelId === "default" ? "Padrao" : rule.educationLevelId)
    );
  }

  function selectFinanceStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);

    setFinanceProfileDraft(buildFinanceProfileDraft(student, paymentSettings));
    setFinanceNotice("");
  }

  function submitFinanceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardMutation("manage-financial-aid", setFinanceNotice)) {
      return;
    }

    if (!financeProfileDraft.studentId) {
      setFinanceNotice("Seleccione um aluno para aplicar a regra.");
      return;
    }

    if (
      financeProfileDraft.status !== "regular" &&
      !financeProfileDraft.authorizedBy.trim()
    ) {
      setFinanceNotice("Informe quem autorizou esta regra.");
      return;
    }

    const nextProfile = buildStudentFinanceProfile(
      students.find((student) => student.id === financeProfileDraft.studentId)
        ?.financialProfile,
      financeProfileDraft,
      nowIso(),
    );

    if (!commitChanges({ students: updateValue(students, (items) =>
      items.map((student) =>
        student.id === financeProfileDraft.studentId
          ? {
              ...student,
              financialProfile: nextProfile,
            }
          : student,
      )) }, "manage-financial-aid")) return;
    setFinanceProfileDraft((draft) => ({
      ...draft,
      discountPercent: String(nextProfile.discountPercent),
      authorizedBy: nextProfile.authorizedBy ?? "",
      registeredBy: nextProfile.registeredBy ?? "Secretaria",
    }));
    setFinanceNotice("Regra do aluno guardada com historico.");
  }

  function generateMonthlyBilling() {
    if (!guardMutation("publish-charges", setBillingNotice)) {
      return;
    }

    if (!currentClassId || !currentGroupId || paymentRows.length === 0) {
      setBillingNotice("Escolha uma turma com alunos antes de gerar mensalidades.");
      return;
    }

    if (selectedMonthBillingRun) {
      setBillingNotice(
        `${selectedMonth?.label ?? "Mes"} ja foi gerado para esta turma.`,
      );
      return;
    }

    const chargedRows = paymentRows.filter((row) => {
      const month = row.ledger.monthly.find(
        (item) => item.month.key === billingMonthKey,
      );

      return (month?.due ?? 0) > 0;
    });
    const exemptedRows = paymentRows.filter((row) => {
      const month = row.ledger.monthly.find(
        (item) => item.month.key === billingMonthKey,
      );

      return month?.applicable !== false && (month?.due ?? 0) === 0;
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

    const nextRecords = updateValue(paymentRecords, (items) => {
      const nextItems = [...items];

      [...chargedRows, ...exemptedRows].forEach((row) => {
        const normalizedRecord = normalizePaymentRecord(
          row.record,
          row.student,
          paymentMonths,
          paymentSettings,
          effectivePaymentRuleVersions,
        );
        const recordIndex = nextItems.findIndex(
          (record) => record.studentId === row.student.id,
        );

        if (recordIndex >= 0) {
          nextItems[recordIndex] = normalizedRecord;
          return;
        }

        nextItems.push(normalizedRecord);
      });

      return nextItems;
    });
    if (!commitChanges({ billingRuns: [newRun, ...billingRuns], paymentRecords: nextRecords }, "publish-charges")) return;
    setBillingNotice(
      `${selectedMonth?.label ?? "Mes"} gerado: ${newRun.studentIds.length} alunos cobrados e ${newRun.exemptedStudentIds.length} isentos.`,
    );
  }

  function showPaymentReceipt(studentId: string, paymentId: string) {
    const row = allPaymentRows.find((item) => item.student.id === studentId);
    const payment = row?.record.payments.find((item) => item.id === paymentId);
    if (payment?.kind === "credit-application") { setBillingNotice(`Aplicação de crédito. Consulte o recebimento de origem ${payment.origin?.paymentId ?? "na ficha"}.`); return; }
    const receipt = demoState?.receipts.find((item) => item.studentId === studentId && item.paymentId === paymentId) ?? (row
      ? buildPaymentReceiptFromRecord(row.student, row.record, paymentId)
      : undefined);

    if (!receipt) {
      setBillingNotice("Recibo indisponivel para este pagamento.");
      return;
    }

    setPaymentReceipt(receipt);
  }

  function openPaymentCorrection(studentId: string, paymentId: string) {
    if (!guardMutation("correct-payment", setBillingNotice)) return;
    setSelectedFinanceCell(null);
    setPaymentCorrectionTarget({ studentId, paymentId });
  }

  function executeCashCommand(command: CashCommand, id: string) {
    if (!repositoryRef.current || !demoState || !activeProfile) throw new Error("Aguarde os dados da escola.");
    const result = executeCash(repositoryRef.current, demoState, command, { id, role: activeProfile, recordedAt: nowIso() });
    setDemoState(result.state); return String(result.result.message);
  }
  function openCashWorkspace() {
    setPaymentDialogOpen(false);
    workspace.update({ view: "reports", reportSection: "cash" }, true);
  }

  function executeServiceCommand(command: ServiceCommand, id: string) {
    if (!repositoryRef.current || !demoState || !activeProfile) throw new Error("Aguarde os dados da escola.");
    const result = executeService(repositoryRef.current, demoState, command, { id, role: activeProfile, recordedAt: nowIso() });
    setDemoState(result.state);
    return { receipt: result.result.receipt as PaymentReceipt | null, message: String(result.result.message) };
  }
  function closePaymentDialog() {
    setPaymentDialogOpen(false);
    window.requestAnimationFrame(() => financeTrigger.current?.focus({ preventScroll: true }));
  }

  function changePaymentDraft(draft: PaymentLaunchDraft) {
    paymentCommandRef.current = null; setPaymentAttemptId(null); paymentDraftEdited.current = true;
    setPaymentDraft(draft);
  }

  if (!storageReady || (demoState && !workspace.ready)) {
    return <main className="grid min-h-screen place-items-center p-6" role="status">A carregar os dados do LSS…</main>;
  }
  if (!activeProfile) {
    return <DemoEntry onEnter={enterDemo} schoolName={academic?.institution.name} logoText={academic?.institution.logoText} />;
  }

  if (storageLoadError || !demoState) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <section className="lss-responsive-card" aria-label="Acesso aos dados do LSS">
          <h1 className="text-xl font-bold">{storageLoadError ? "Não foi possível abrir os dados" : "Preparar o LSS"}</h1>
          <p className="mt-3 text-sm text-slate-600">
            {developerToolsEnabled
              ? storageLoadError || "Escolha uma escola de exemplo ou comece uma configuração vazia. Os dados ficam neste navegador."
              : "Tente novamente. Se o problema continuar, contacte o responsável pelo sistema. Os dados existentes foram conservados."}
          </p>
          {developerToolsEnabled && storageLoadError && <p className="mt-3 text-sm">O original foi conservado. Pode descarregá-lo e importar uma cópia válida.</p>}
          {developerToolsEnabled && (activeProfile === "secretaria" ? (
            <div className="lss-actions mt-5">
              {!storageLoadError && <>
                <PrimaryButton onClick={() => initializeDemo("example")}>Abrir escola de exemplo</PrimaryButton>
                <SecondaryButton onClick={() => initializeDemo("empty")}>Configurar do início</SecondaryButton>
              </>}
              {originalStorageRaw !== undefined && <SecondaryButton onClick={exportDemoData}>Descarregar original</SecondaryButton>}
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border p-3 text-sm font-semibold">
                Importar cópia válida
                <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => {
                  void importDemoData(event.target.files?.[0]); event.currentTarget.value = "";
                }} />
              </label>
            </div>
          ) : <p className="mt-4 text-sm">A Secretaria deve preparar ou recuperar o cenário antes da consulta pelo Director.</p>)}
          {storageToolsNotice && <p role="alert" className="mt-4 text-sm text-rose-800">{storageToolsNotice}</p>}
          <div className="lss-actions mt-4">
            <SecondaryButton onClick={() => window.location.reload()}>Tentar novamente</SecondaryButton>
            <SecondaryButton onClick={signOut}>Sair</SecondaryButton>
          </div>
        </section>
      </main>
    );
  }

  return renderWorkspace();

  function renderWorkspace() {
    const academicArea = ["classes", "rooms", "groups", "enrollments"].includes(activeView);
    return (
      <WorkspaceShell
        activeView={activeView} accountName={accountName || selectedProfile.title}
        institutionLabel={academic?.institution.name}
        roleLabel={selectedProfile.title} year={paymentSettings.academicYear}
        collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed}
        onNavigate={navigateTo} onSignOut={signOut}
        expandable={financeTableVisible} expanded={financeTableVisible && expandedTable}
        onExpandedChange={setExpandedTable}
      >
        {academicArea && developerToolsEnabled && !demoState?.academic && <nav aria-label="Ferramentas académicas anteriores" className="mb-5 flex flex-wrap gap-2">
          {([ ["enrollments", "Alunos"], ["groups", "Turmas"], ["classes", "Classes"], ["rooms", "Salas"] ] as const).map(([view, label]) => (
            <SecondaryButton key={view} onClick={() => setActiveView(view)}>{label}</SecondaryButton>
          ))}
        </nav>}
        {storageToolsError && <p role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{storageToolsNotice}</p>}
        {backupNotice && <p role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{backupNotice}</p>}
        {draftStorageNotice && <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{draftStorageNotice}</p>}
        {financeSettingsNotice && <p role="status" className="mb-4 rounded-md bg-slate-50 p-3 text-sm">{financeSettingsNotice}</p>}
        {developerToolsEnabled && demoState?.migrationWarnings?.map((warning) => <p key={warning} role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
        {activeView === "overview" && renderOverview()}
        {demoState && activeProfile && <AcademicWorkspace enrollmentRef={enrollmentRef} state={demoState} role={activeProfile} context={workspace.context} onContext={workspace.update} execute={executeAcademicCommand} confirmPayment={confirmAcademicPayment} serviceExecute={executeServiceCommand}/>}
        {developerToolsEnabled && activeView === "catalog" && (demoState?.academic ? renderDeveloperTools() : renderCatalog())}
        {developerToolsEnabled && !demoState?.academic && activeView === "classes" && renderClasses()}
        {developerToolsEnabled && !demoState?.academic && activeView === "rooms" && renderRooms()}
        {developerToolsEnabled && !demoState?.academic && activeView === "groups" && renderGroups()}
        {developerToolsEnabled && !demoState?.academic && activeView === "enrollments" && renderEnrollments()}
        {activeView === "payments" && renderPayments()}
        {activeView === "reports" && renderReports()}
      </WorkspaceShell>
    );
  }

  function renderOverview() {
    if (!demoState || !activeProfile) return null;
    return <DashboardWorkspace state={demoState} role={activeProfile} context={workspace.context} onContext={workspace.update} onEnroll={() => { workspace.update({ view: "enrollments", personId: "" }, true); enrollmentRef.current?.openEnrollment(); }} onPay={openPaymentEntry}/>;
  }

  function renderDeveloperTools() {
    if (activeProfile !== "secretaria") return null;
    return (
<section className="lss-responsive-card" data-wide="true">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Ferramentas de desenvolvimento</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Os dados ficam guardados neste navegador. Pode exportar uma cópia,
                importar um ficheiro compatível ou repor o conjunto inicial.
              </p>
            </div>
            <StateLabel tone={storageToolsError ? "warning" : "active"}>{storageToolsError ? "Dados anteriores conservados" : "Dados guardados"}</StateLabel>
          </div>
          <div className="lss-actions mt-5">
            <SecondaryButton onClick={exportDemoData}>Exportar JSON</SecondaryButton>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Importar JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void importDemoData(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={resetDemoData}
              className="min-h-11 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Repor dados iniciais
            </button>
          </div>
          {storageToolsNotice && (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200" role="status">
              {storageToolsNotice}
            </p>
          )}
        </section>
    );
  }

  function renderCatalog() {
    const sortedStages = sortByName(academicStages);
    const sortedClassDefinitions = sortByName(classDefinitions);
    const sortedRoomDefinitions = sortByName(roomDefinitions);
    const selectableStages = activeAcademicStages(academicStages);

    if (selectedProfile.id === "director") {
      return (
        <div className="grid gap-6">
          <div className="lss-card-grid">
            <MetricCard
              label="Níveis"
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

          <section className="lss-responsive-card" data-wide="true">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Parâmetros académicos</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Consulta apenas. O perfil Director não altera dados do sistema.
                </p>
              </div>
              <StateLabel tone="muted">Só leitura</StateLabel>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Níveis
                </p>
                <div className="mt-2 grid gap-2">
                  {sortedStages.map((stage) => (
                    <SummaryLine key={stage.id} label={stage.name} value={stage.status === "active" ? "Activo" : "Inactivo"} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Classes
                </p>
                <div className="mt-2 grid gap-2">
                  {sortedClassDefinitions.map((definition) => (
                    <SummaryLine key={definition.id} label={definition.name} value={stageLabel(academicStages, definition.stageId)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Salas
                </p>
                <div className="mt-2 grid gap-2">
                  {sortedRoomDefinitions.map((room) => (
                    <SummaryLine key={room.id} label={room.name} value={`${room.block} · ${room.capacity} lugares`} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        <div className="lss-card-grid">
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

        {developerToolsEnabled && <section className="lss-responsive-card" data-wide="true">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Ferramentas de desenvolvimento</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Os dados ficam guardados neste navegador. Pode exportar uma cópia,
                importar um ficheiro compatível ou repor o conjunto inicial.
              </p>
            </div>
            <StateLabel tone={storageToolsError ? "warning" : "active"}>{storageToolsError ? "Dados anteriores conservados" : "Dados guardados"}</StateLabel>
          </div>
          <div className="lss-actions mt-5">
            <SecondaryButton onClick={exportDemoData}>Exportar JSON</SecondaryButton>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Importar JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void importDemoData(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={resetDemoData}
              className="min-h-11 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Repor dados iniciais
            </button>
          </div>
          {storageToolsNotice && (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200" role="status">
              {storageToolsNotice}
            </p>
          )}
        </section>}

        <div className="lss-split-grid">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Niveis de ensino</h3>
            </div>
            <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
            className="lss-responsive-card"
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

        <div className="lss-split-grid">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Classes por nivel</h3>
            </div>
            <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
            className="lss-responsive-card"
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

        <div className="lss-split-grid">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">Salas da instituicao</h3>
            </div>
            <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
            className="lss-responsive-card"
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
      <div className="lss-split-grid">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Classes</h3>
            </div>
          </div>
          <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
      <div className="lss-split-grid">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Salas</h3>
            </div>
          </div>
          <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
      <div className="lss-split-grid">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
          <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
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
          classes={yearClasses}
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
      <div className="lss-split-grid">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Matriculas</h3>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Sem classe"} /{" "}
                {currentGroup?.name ?? "Sem turma"}.
              </p>
            </div>
            {selectedProfile.id === "secretaria" && (
              <PrimaryButton onClick={startNewEnrollment}>
                Matrícula
              </PrimaryButton>
            )}
          </div>

          <StudentFilters
            classes={yearClasses}
            currentClassId={currentClassId}
            currentGroupId={currentGroupId}
            groupsForCurrentClass={groupsForCurrentClass}
            onClassChange={selectClass}
            onGroupChange={selectGroup}
            onSearchChange={setStudentSearch}
            search={studentSearch}
          />

          <div className="table-scroll" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">N.</th>
                  <th className="px-5 py-3 font-semibold">Aluno</th>
                  <th className="px-5 py-3 font-semibold">Matricula</th>
                  <th className="px-5 py-3 font-semibold">Inscrição</th>
                  <th className="px-5 py-3 font-semibold">Encarregado</th>
                  <th className="px-5 py-3 font-semibold">Mensalidades</th>
                  <th className="px-5 py-3 font-semibold">Financas</th>
                  <th className="px-5 py-3 font-semibold">Matricula em</th>
                  <th className="px-5 py-3 font-semibold">Accoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.length > 0 ? (
                  visibleStudents.map((student, index) => {
                    const paymentRow = allPaymentRows.find(
                      (row) => row.student.id === student.id,
                    );
                    const registrationPaid =
                      (paymentRow?.ledger.registrationBalance ??
                        paymentSettings.inscriptionRenewalFee) === 0;

                    return (
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
                        <td className="px-5 py-4">
                          <StatusDot
                            paid={registrationPaid}
                            label={registrationPaid ? "Liquidada" : "Pendente"}
                          />
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {student.guardianName}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          Desde {monthLabel(getStudentTuitionStartMonth(student, paymentSettings))}
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
                          {formatDate(getStudentEnrollmentDate(student))}
                        </td>
                        <td className="px-5 py-4">
                          {selectedProfile.id === "secretaria" ? (
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                      Sem alunos para os filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedProfile.id === "secretaria" && (
          <EnrollmentForm
            classes={yearClasses}
            draft={enrollmentDraft}
            groups={draftGroups}
            notice={enrollmentNotice}
            onChange={(draft) => {
              setEnrollmentNotice("");
              setEnrollmentDraft(draft);
            }}
            onClassChange={changeEnrollmentClass}
            onReset={() => resetEnrollmentDraft(currentClassId, currentGroupId)}
            onSaveAndPay={saveEnrollmentAndOpenPayment}
            onSubmit={submitEnrollment}
          />
        )}
      </div>
    );
  }

  function renderPayments() {
    const visiblePaymentSections = paymentSections.filter((section) =>
      section.profiles.includes(selectedProfile.id),
    );
    const currentPaymentSection =
      visiblePaymentSections.find((section) => section.id === activePaymentSection) ??
      visiblePaymentSections[0];
    const canEditPaymentRules = selectedProfile.id === "secretaria";
    const activePaymentFilterLabel: Record<PaymentAlertFilter, string> = {
      all: "Todos os alunos",
      registration: "Inscricoes pendentes",
      overdue: "Mensalidades vencidas",
      "first-fine": "1ª multa",
      "second-fine": "2ª multa",
      debt: "Dívidas acumuladas",
      "rules-ending": "Regras a terminar",
    };

    const displayMonths = paymentMonths.filter((month, index) => {
      if (workspace.context.paymentPeriod === "month") return month.key === billingMonthKey;
      if (workspace.context.paymentPeriod === "term") return Math.floor(index / 3) === Math.floor(Math.max(0, paymentMonths.findIndex((item) => item.key === billingMonthKey)) / 3);
      return true;
    });
    const visibleMonthKeys = new Set(displayMonths.map((item) => item.key));
    return (
      <div className="grid gap-6">
        <nav aria-label="Áreas de pagamentos" data-workspace-secondary className="flex flex-wrap gap-2 pb-1">
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
          <div className="grid gap-6">
            {demoState && <RulesWorkspace state={demoState} yearId={selectedYearId} mode="rules" readOnly={!canEditPaymentRules} execute={executeBillingCommand} recordedAt={nowIso()} />}
            {developerToolsEnabled && <PaymentRulesTable
              rules={effectivePaymentRuleVersions}
              levelLabel={paymentRuleLevelLabel}
              onCreate={openNewPaymentPolicyDialog}
              onEdit={(rule) => openPaymentRuleDialog(rule.id)}
              readOnly={!canEditPaymentRules}
            />}
            {canEditPaymentRules && (
              <MiscellaneousChargeForm
                disabled={paymentRows.length === 0}
                draft={miscellaneousChargeDraft}
                groupStudentCount={paymentRows.length}
                notice={miscellaneousNotice}
                selectedCount={selectedPaymentRows.length}
                onChange={(draft) => {
                  setMiscellaneousNotice("");
                  setMiscellaneousChargeDraft(draft);
                }}
                onSubmit={submitMiscellaneousCharge}
              />
            )}
          </div>
        )}

        {currentPaymentSection?.id === "student-rules" && canEditPaymentRules && (
          <>
          {demoState && <RulesWorkspace state={demoState} yearId={selectedYearId} mode="aid" readOnly={!canEditPaymentRules} execute={executeBillingCommand} recordedAt={nowIso()} />}
          {developerToolsEnabled && <StudentFinanceForm
            draft={financeProfileDraft}
            notice={financeNotice}
            students={allStudentsAlphabetically}
            onChange={(draft) => {
              setFinanceNotice("");
              setFinanceProfileDraft(draft);
            }}
            onStudentChange={selectFinanceStudent}
            onSubmit={submitFinanceProfile}
          />}
          </>
        )}

        {currentPaymentSection?.id === "entry" && (
          <div className="grid gap-6">
            <section data-workspace-secondary className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold">Cobranças mensais</h3>
                  <p className="text-sm text-slate-500">
                    Emissão automática no início de cada mês; antecipação disponível nos meses previstos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">

                  {developerToolsEnabled && selectedProfile.id === "secretaria" && (
                    <PrimaryButton onClick={generateMonthlyBilling}>
                      Gerar propinas
                    </PrimaryButton>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 text-sm text-slate-600">
                <span>Previsto: <strong>{formatCurrency(selectedMonthExpected)}</strong></span>
                <span>Aplicado: <strong>{formatCurrency(selectedMonthPaid)}</strong></span>
                <span>Saldo: <strong>{formatCurrency(selectedMonthBalance)}</strong></span>
                <span>Crédito: <strong>{formatCurrency(selectedMonthCarryOut)}</strong></span>
                <span>Descontos: <strong>{formatCurrency(selectedMonthDiscount)}</strong></span>
                {selectedMonthBillingRun && <span>Cobranças emitidas</span>}
              </div>

              {billingNotice && (
                <div className="mx-5 mb-5 rounded-md bg-teal-50 px-4 py-3 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
                  {billingNotice}
                </div>
              )}
            </section>

            <div className="lss-section-grid lss-payment-grid">
              <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold">
                      Planilha financeira da turma
                    </h3>
                    <p className="text-sm text-slate-500">
                      {currentClass?.name ?? "Sem classe"} /{" "}
                      {currentGroup?.name ?? "Sem turma"} - inscrição,
                      mensalidades, diversos e dívida.
                    </p>
                    {paymentAlertFilter !== "all" && (
                      <p className="mt-2 text-sm font-semibold text-[#185c54]">
                        Filtro: {activePaymentFilterLabel[paymentAlertFilter]}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedPaymentRows.length} seleccionados para cobranças
                      em lote.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="text-xs font-semibold">Mês<select
                    value={billingMonthKey}
                    onChange={(event) => {
                      paymentCommandRef.current = null;
                      setBillingMonthKey(event.target.value);
                      setPaymentDraft((draft) => ({
                        ...draft,
                        monthKey: event.target.value,
                        targetChargeId:
                          draft.category === "miscellaneous"
                            ? draft.targetChargeId
                            : "",
                      }));
                      setBillingNotice("");
                    }}
                    className={cx(inputClasses(), "w-44")}
                    aria-label="Mês de mensalidade"
                  >
                    {paymentMonths.map((month) => (
                      <option key={month.key} value={month.key}>
                        {month.label}
                      </option>
                    ))}
                  </select></label>
                    <label className="text-xs font-semibold">Período<select aria-label="Período da planilha" className={inputClasses()} value={workspace.context.paymentPeriod ?? "year"} onChange={(event) => workspace.update({ paymentPeriod: event.target.value as "month" | "term" | "year" })}><option value="month">Mês</option><option value="term">Trimestre</option><option value="year">Ano</option></select></label>
                    {selectedProfile.id === "secretaria" && <PrimaryButton onClick={() => openPaymentEntry()}>Registar pagamento</PrimaryButton>}
                    {selectedPaymentRows.length > 0 && (
                      <SecondaryButton
                        onClick={() => setSelectedPaymentStudentIds([])}
                      >
                        Limpar selecção
                      </SecondaryButton>
                    )}
                    {paymentAlertFilter !== "all" && (
                      <SecondaryButton
                        onClick={() => setPaymentAlertFilter("all")}
                      >
                        Limpar filtro
                      </SecondaryButton>
                    )}
                    <SecondaryButton
                      onClick={() => setActivePaymentSection("reports")}
                    >
                      Ver relatorio
                    </SecondaryButton>
                  </div>
                </div>

                <StudentFilters
                  classes={yearClasses}
                  currentClassId={currentClassId}
                  currentGroupId={currentGroupId}
                  groupsForCurrentClass={groupsForCurrentClass}
                  onClassChange={selectClass}
                  onGroupChange={selectGroup}
                  onSearchChange={setStudentSearch}
                  search={studentSearch}
                />

                <div className="table-scroll" data-scroll-id="payments" role="region" aria-label="Tabela com deslocamento horizontal" tabIndex={0}>
                                    <table className="lss-finance-table w-full text-left text-sm" style={{ minWidth: Math.max(950, 780 + displayMonths.length * 120) }}>
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="finance-sticky-select px-4 py-3 font-semibold">
                          <input
                            type="checkbox"
                            checked={
                              visiblePaymentRows.length > 0 &&
                              visiblePaymentRows.every((row) =>
                                selectedPaymentStudentIdSet.has(row.student.id),
                              )
                            }
                            onChange={toggleAllVisiblePaymentStudents}
                            aria-label="Seleccionar alunos visíveis"
                            className="size-5 rounded border-slate-300 text-[#185c54]"
                          />
                        </th>
                        <th className="finance-sticky-number px-4 py-3 font-semibold">Nº</th>
                        <th className="finance-sticky-student px-5 py-3 font-semibold">Aluno</th>
                        <th className="px-4 py-3 font-semibold">Nível/Turma</th>
                        <th className="px-4 py-3 font-semibold">Inscrição</th>
                        {displayMonths.map((month) => (
                          <th key={month.key} className="px-3 py-3 font-semibold">
                            {month.shortLabel}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Diversos</th>
                        <th className="px-4 py-3 font-semibold">Dívida vencida</th>
                        <th className="px-4 py-3 font-semibold">A vencer</th>
                        <th className="px-4 py-3 font-semibold">Total geral</th>
                        <th className="px-5 py-3 font-semibold">Acção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visiblePaymentRows.length > 0 ? (
                        visiblePaymentRows.map((row) => {
                          const stableNumber = stableNumberLabel(row.student);
                          const studentContext = studentContextLabel(row.student);
                          const registrationState = getRegistrationCellState(
                            row.ledger,
                            paymentSettings,
                          );
                          const registrationBalance =
                            row.ledger.registrationBalance +
                            row.ledger.registrationPenaltyBalance;
                          const miscellaneousState = getMiscellaneousCellState(
                            row.record,
                          );
                          const miscellaneousSummary = getMiscellaneousSummary(row.record);
                          const debt = getStudentDebt(row.ledger, row.record);
                          const debtTiming = getStudentDebtTiming(row.ledger, row.record);

                          return (
                            <tr
                              key={row.student.id}
                              className="group hover:bg-slate-50/80"
                            >
                              <td className="finance-sticky-select bg-white px-4 py-4 group-hover:bg-slate-50/80">
                                <input
                                  type="checkbox"
                                  checked={selectedPaymentStudentIdSet.has(
                                    row.student.id,
                                  )}
                                  onChange={() =>
                                    togglePaymentStudentSelection(row.student.id)
                                  }
                                  aria-label={`Seleccionar ${row.student.fullName}`}
                                  className="size-5 rounded border-slate-300 text-[#185c54]"
                                />
                              </td>
                              <td className="finance-sticky-number bg-white px-4 py-4 font-mono text-sm font-semibold text-slate-600 group-hover:bg-slate-50/80">
                                {stableNumber}
                              </td>
                              <td className="finance-sticky-student bg-white px-5 py-4 group-hover:bg-slate-50/80">
                                <button type="button" className="block break-words font-semibold text-left text-teal-800 hover:underline" onClick={() => workspace.update({ view: "enrollments", personId: row.student.personId ?? row.student.id, studentTab: "Financeiro" }, true)}>{row.student.fullName}</button>
                                <span className="mt-1 block break-words text-xs text-slate-500">
                                  {row.student.registrationNumber}
                                </span>
                              </td>
                              <td className="finance-context-cell px-4 py-4 text-sm text-slate-600">
                                <span className="block break-words font-semibold text-slate-700">
                                  {studentContext}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {paymentSettings.academicYear}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <FinanceCell
                                  label={registrationState.label}
                                  onClick={() =>
                                    openFinanceCell({
                                      kind: "registration",
                                      studentId: row.student.id,
                                    })
                                  }
                                  supporting={
                                    registrationBalance > 0
                                      ? formatCurrency(registrationBalance)
                                      : registrationState.detail
                                  }
                                  symbol={registrationState.symbol}
                                  tone={registrationState.tone}
                                  title={financeCellAriaLabel({
                                    rubric: "Inscrição",
                                    studentName: row.student.fullName,
                                    state: registrationState.label,
                                    balance: formatCurrency(registrationBalance),
                                  })}
                                />
                              </td>
                              {row.ledger.monthly.filter((month) => visibleMonthKeys.has(month.month.key)).map((month) => {
                                const monthState = getMonthCellState(
                                  month,
                                  paymentSettings,
                                );
                                const installmentNumber =
                                  getTuitionInstallmentNumber(
                                    row.student,
                                    month.month.key,
                                    paymentMonths,
                                    paymentSettings,
                                  );
                                const monthBalance = month.balance + month.fineBalance;
                                const awaitingProof = demoState ? pendingProofFor(demoState, row.student.id, undefined, month.month.key) : undefined;
                                const monthSupporting = month.applicable
                                  ? monthBalance > 0
                                    ? installmentNumber
                                      ? `${installmentNumber}ª / ${formatCurrency(monthBalance)}`
                                      : formatCurrency(monthBalance)
                                    : monthState.detail
                                  : monthState.detail;

                                return (
                                  <td key={month.month.key} className="px-3 py-4">
                                    <FinanceCell
                                      label={monthState.label}
                                      onClick={() =>
                                        openFinanceCell({
                                          kind: "tuition",
                                          studentId: row.student.id,
                                          monthKey: month.month.key,
                                        })
                                      }
                                      supporting={awaitingProof ? "Em análise · saldo mantido" : monthSupporting}
                                      symbol={monthState.symbol}
                                      tone={monthState.tone}
                                      title={financeCellAriaLabel({
                                        rubric: `${month.month.label}${
                                          installmentNumber
                                            ? `, ${installmentNumber}ª mensalidade`
                                            : ""
                                        }`,
                                        studentName: row.student.fullName,
                                        state: monthState.label,
                                        balance: formatCurrency(monthBalance),
                                      })}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-4 py-4">
                                <FinanceCell
                                  label={miscellaneousState.label}
                                  onClick={() =>
                                    openFinanceCell({
                                      kind: "miscellaneous",
                                      studentId: row.student.id,
                                    })
                                  }
                                  supporting={miscellaneousState.detail}
                                  symbol={miscellaneousState.symbol}
                                  tone={miscellaneousState.tone}
                                  title={financeCellAriaLabel({
                                    rubric: "Diversos",
                                    studentName: row.student.fullName,
                                    state: miscellaneousState.label,
                                    balance: formatCurrency(miscellaneousSummary.balance),
                                  })}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <FinanceCell
                                  label={formatCurrency(debtTiming.overdueDebt)}
                                  onClick={() =>
                                    openFinanceCell({
                                      kind: "debt",
                                      studentId: row.student.id,
                                    })
                                  }
                                  supporting="Dívida vencida"
                                  symbol={debtTiming.overdueDebt > 0 ? "!" : "OK"}
                                  tone={debtTiming.overdueDebt > 0 ? "danger" : "paid"}
                                  title={financeCellAriaLabel({
                                    rubric: "Dívida vencida",
                                    studentName: row.student.fullName,
                                    state: debtTiming.overdueDebt > 0 ? "Em dívida" : "Sem dívida vencida",
                                    balance: formatCurrency(debtTiming.overdueDebt),
                                  })}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <FinanceCell
                                  label={formatCurrency(debtTiming.futureDue)}
                                  onClick={() =>
                                    openFinanceCell({
                                      kind: "debt",
                                      studentId: row.student.id,
                                    })
                                  }
                                  supporting="Valor a vencer"
                                  symbol={debtTiming.futureDue > 0 ? "AV" : "OK"}
                                  tone={debtTiming.futureDue > 0 ? "info" : "paid"}
                                  title={financeCellAriaLabel({
                                    rubric: "Valor a vencer",
                                    studentName: row.student.fullName,
                                    state: debtTiming.futureDue > 0 ? "A vencer" : "Sem valor a vencer",
                                    balance: formatCurrency(debtTiming.futureDue),
                                  })}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <FinanceCell
                                  label={formatCurrency(debt)}
                                  onClick={() =>
                                    openFinanceCell({
                                      kind: "debt",
                                      studentId: row.student.id,
                                    })
                                  }
                                  supporting="Total geral"
                                  symbol={debt > 0 ? "!" : "OK"}
                                  tone={debt > 0 ? "danger" : "paid"}
                                  title={financeCellAriaLabel({
                                    rubric: "Total geral",
                                    studentName: row.student.fullName,
                                    state: debt > 0 ? "Saldo por liquidar" : "Regularizado",
                                    balance: formatCurrency(debt),
                                  })}
                                />
                              </td>
                              <td className="px-5 py-4">
  {selectedProfile.id === "secretaria" ? (
    <TextButton
      ariaLabel={`Lançar pagamento para ${row.student.fullName}`}
      onClick={() => openPaymentEntry(row.student.id)}
    >
      Lançar
    </TextButton>
  ) : (
    <TextButton
      ariaLabel={`Consultar síntese financeira de ${row.student.fullName}`}
      onClick={() =>
        openFinanceCell({
          kind: "debt",
          studentId: row.student.id,
        })
      }
    >
      Consultar
    </TextButton>
  )}
</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={displayMonths.length + 10}
                            className="px-5 py-10 text-center text-slate-500"
                          >
                            Sem alunos para os filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>


            </div>
          </div>
        )}

        {currentPaymentSection?.id === "reports" && renderReports()}

        <FinanceCellDialog
          canManagePayments={selectedProfile.id === "secretaria"}
          months={paymentMonths}
          row={selectedFinanceRow}
          selection={selectedFinanceCell}
          settings={paymentSettings}
          studentContextLabel={selectedFinanceContextLabel}
          onClose={() => setSelectedFinanceCell(null)}
          onCorrectPayment={openPaymentCorrection}
          onCreateMiscellaneous={openMiscellaneousChargeForm}
          onRegisterPayment={registerPaymentFromCell}
          onShowReceipt={showPaymentReceipt}
        />
        <PaymentRuleDialog
          classOptions={classDefinitions}
          draft={paymentRuleDraft}
          onChange={setPaymentRuleDraft}
          onClose={() => setPaymentRuleDraft(null)}
          onSubmit={submitPaymentRule}
        />
        <PaymentReceiptDialog
          key={paymentReceipt?.id}
          receipt={paymentReceipt}
          status={demoState && paymentReceipt ? receiptStatus(demoState, paymentReceipt) : undefined}
          onClose={() => setPaymentReceipt(null)}
          onPrint={() => window.print()}
        />
        {demoState && <FinanceServicePanel state={demoState} studentId={paymentDraft.studentId} yearId={selectedYearId} readOnly={selectedProfile.id !== "secretaria"} execute={executeServiceCommand} correctionTarget={paymentCorrectionTarget} onCloseCorrection={() => { setPaymentCorrectionTarget(null); window.requestAnimationFrame(() => financeTrigger.current?.focus({ preventScroll: true })); }}/>}
        {paymentDialogOpen && demoState && selectedProfile.id === "secretaria" && <PaymentDialog onOpenCash={openCashWorkspace} state={demoState} draft={paymentDraft} onChange={changePaymentDraft} onClose={closePaymentDialog} commandId={paymentAttemptId} execute={executeServiceCommand} confirm={(draft, id) => { paymentCommandRef.current = id; setPaymentAttemptId(id); const receipt = confirmAcademicPayment(draft, id).receipt; paymentDraftEdited.current = false; setPaymentDraft((current) => ({ ...current, amount: "0" })); return receipt; }}/>}
      </div>
    );
  }

  function renderReports() {
    if (!demoState || !activeProfile || !repositoryRef.current) return null;
    return <ReportsWorkspace state={demoState} role={activeProfile} context={workspace.context} onContext={workspace.update} executeCash={executeCashCommand} executeService={executeServiceCommand} repository={repositoryRef.current} onRestore={(restored) => { setDemoState(restored); setStorageToolsError(false); setStorageToolsNotice(""); setFinanceSettingsNotice("Cópia restaurada e conferida. O estado anterior foi conservado."); }}/ >;
  }
}
