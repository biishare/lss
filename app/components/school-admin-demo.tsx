"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type EntityStatus,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
  type StudentPaymentRecord,
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
  buildPaymentLevelRules,
  buildGroupId,
  buildLedger,
  buildPaymentRecord,
  buildStudentFinanceProfile,
  calculateRegistrationDue,
  currentAcademicYear,
  cx,
  financeStatusLabel,
  firstAvailableClassDefinitionId,
  firstAvailableRoomDefinitionId,
  formatCurrency,
  formatDate,
  formatDateTime,
  getMiscellaneousCellState,
  getConfiguredPaymentMonths,
  getMonthCellState,
  getRegistrationCellState,
  getStudentDebt,
  getStudentUpcomingBalance,
  getStudentEnrollmentDate,
  getStudentTuitionStartMonth,
  getTuitionInstallmentNumber,
  inputClasses,
  institutionLogoText,
  institutionName,
  loadStoredState,
  monthByKey,
  monthLabel,
  nextId,
  nextRegistrationNumber,
  nextRoomDefinitionId,
  nextStageDefinitionId,
  normalizePaymentRecord,
  normalizePaymentSettings,
  normalizeStudentForPolicy,
  normalizeText,
  nowIso,
  paidOnToIso,
  parseMoney,
  paymentEffectiveDate,
  paymentRuleForStudent,
  paymentMethods,
  paymentSections,
  profiles,
  recordStudentPayment,
  repriceOpenCoreCharges,
  rowMatchesPaymentAlertFilter,
  roomById,
  roomLabel,
  sortByName,
  sortClasses,
  sortStudents,
  stableStudentNumber,
  stageLabel,
  statusOptions,
  storageKey,
  storedArray,
  summarizePaymentRows,
  today,
  workspaceNavigation,
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
  type PaymentAlertFilter,
  type PaymentWorkspaceSection,
  type ProfileId,
  type RoomDefinitionDraft,
  type RoomDraft,
  type StoredDemoState,
  type WorkspaceView,
} from "./school-admin-demo.model";
import {
  ClassForm,
  CrumbButton,
  EnrollmentForm,
  FieldLabel,
  FinanceCell,
  FinanceCellDialog,
  FinanceSettingsForm,
  FlowStep,
  GroupForm,
  MetricCard,
  MiscellaneousChargeForm,
  PaymentForm,
  PaymentSettingsSummary,
  PrimaryButton,
  ProfileCard,
  RoomForm,
  SecondaryButton,
  StatusBadge,
  StatusDot,
  StudentFilters,
  StudentFinanceForm,
  SummaryLine,
  SummaryMini,
  TextButton,
} from "./school-admin-demo.components";

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
  const [miscellaneousNotice, setMiscellaneousNotice] = useState("");
  const [selectedPaymentStudentIds, setSelectedPaymentStudentIds] = useState<
    string[]
  >([]);
  const [selectedFinanceCell, setSelectedFinanceCell] =
    useState<FinanceCellSelection | null>(null);
  const [billingMonthKey, setBillingMonthKey] = useState(
    initialPaymentSettings.startMonth,
  );
  const [paymentAlertFilter, setPaymentAlertFilter] =
    useState<PaymentAlertFilter>("all");
  const [financeSettingsDraft, setFinanceSettingsDraft] =
    useState<FinanceSettingsDraft>(() =>
      buildFinanceSettingsDraft(initialPaymentSettings, initialAcademicStages),
    );
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
    effectivePaymentDate: today(),
    method: paymentMethods[0],
    allowAdvancePayment: false,
    recordedBy: "Secretaria",
    description: "",
  });
  const [miscellaneousChargeDraft, setMiscellaneousChargeDraft] =
    useState<MiscellaneousChargeDraft>({
      type: "Prova",
      description: "",
      amount: "0",
      dueOn: today(),
      target: "group",
    });

  useEffect(() => {
    const loadStateId = window.setTimeout(() => {
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
      const loadedPaymentSettings = normalizePaymentSettings(
        storedState.paymentSettings ?? initialPaymentSettings,
      );
      const rawPaymentRecords = storedArray(
        storedState.paymentRecords,
        initialPaymentRecords,
      );
      const loadedBaseStudents = storedArray(
        storedState.students,
        initialStudents,
      ).map((student) => {
        const classDefinition = loadedClassDefinitions.find(
          (definition) => definition.id === student.classId,
        );
        const schoolClass = loadedClasses.find(
          (item) => item.id === student.classId,
        );
        const levelByName = loadedAcademicStages.find(
          (level) => level.name === schoolClass?.stage,
        );

        return normalizeStudentForPolicy(
          {
            ...student,
            educationLevelId:
              student.educationLevelId ??
              classDefinition?.stageId ??
              schoolClass?.stageId ??
              levelByName?.id,
          },
          loadedPaymentSettings,
        );
      });
      const loadedPaymentMonths = getConfiguredPaymentMonths(
        loadedPaymentSettings,
      );
      const loadedPaymentRecords = loadedBaseStudents.map((student) => {
        const rawRecord =
          rawPaymentRecords.find((record) => record.studentId === student.id) ??
          buildPaymentRecord(student.id);

        return normalizePaymentRecord(
          rawRecord,
          student,
          loadedPaymentMonths,
          loadedPaymentSettings,
        );
      });
      const loadedStudents = loadedBaseStudents.map((student) => {
        const paymentRecord =
          loadedPaymentRecords.find((record) => record.studentId === student.id) ??
          buildPaymentRecord(student.id);
        const ledger = buildLedger(
          student,
          paymentRecord,
          loadedPaymentMonths,
          loadedPaymentSettings,
        );
        const registrationStatus: Student["registrationStatus"] =
          ledger.registrationBalance === 0 ? "paid" : "pending";

        return {
          ...student,
          registrationStatus,
        };
      });
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
      setFinanceSettingsDraft(
        buildFinanceSettingsDraft(loadedPaymentSettings, loadedAcademicStages),
      );
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
        amount: String(
          paymentRuleForStudent(loadedPaymentSettings, loadedFirstStudent).monthlyFee,
        ),
        effectivePaymentDate: draft.effectivePaymentDate || today(),
      }));
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(loadStateId);
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
  const currentClassDefinition = classDefinitions.find(
    (definition) => definition.id === currentClassId,
  );
  const currentClassRule = paymentRuleForStudent(paymentSettings, {
    educationLevelId:
      currentClass?.stageId ?? currentClassDefinition?.stageId,
  });
  const groupsForCurrentClass = useMemo(
    () => sortByName(groups.filter((group) => group.classId === currentClassId)),
    [groups, currentClassId],
  );
  const currentGroup =
    groupsForCurrentClass.find((group) => group.id === selectedGroupId) ??
    groupsForCurrentClass[0];
  const currentGroupId = currentGroup?.id ?? "";
  const paymentMonths = useMemo(
    () => getConfiguredPaymentMonths(paymentSettings),
    [paymentSettings],
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
        const rawRecord =
          paymentRecords.find((item) => item.studentId === student.id) ??
          buildPaymentRecord(student.id);
        const record = normalizePaymentRecord(
          rawRecord,
          student,
          paymentMonths,
          paymentSettings,
        );

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
    return filteredPaymentRows.filter((row) => visibleIds.has(row.student.id));
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

  const schoolPaymentSummary = useMemo(
    () => summarizePaymentRows(allPaymentRows),
    [allPaymentRows],
  );
  const schoolUpcomingBalance = useMemo(
    () =>
      allPaymentRows.reduce(
        (total, row) =>
          total + getStudentUpcomingBalance(row.ledger, row.record),
        0,
      ),
    [allPaymentRows],
  );
  const miscellaneousPaymentRows = useMemo(
    () =>
      allPaymentRows
        .flatMap((row) => {
          return row.record.allocations.flatMap((allocation) => {
            const charge = row.record.charges.find(
              (item) => item.id === allocation.chargeId,
            );

            if (charge?.category !== "miscellaneous") {
              return [];
            }

            const payment = row.record.payments.find(
              (item) => item.id === allocation.paymentId,
            );

            return [
              {
                student: row.student,
                payment: {
                  amount: allocation.amount,
                  effectivePaymentDate: payment
                    ? paymentEffectiveDate(payment)
                    : charge.createdAt.slice(0, 10),
                  paidAt: payment
                    ? paidOnToIso(paymentEffectiveDate(payment))
                    : charge.createdAt,
                  paidDay: payment
                    ? Number(paymentEffectiveDate(payment).slice(8, 10))
                    : 0,
                  method: payment?.method,
                  description: charge.description,
                  recordedAt: payment?.recordedAt ?? charge.createdAt,
                  recordedBy: payment?.recordedBy ?? "Registo antigo",
                },
              },
            ];
          });
        })
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

    return total + (month?.paid ?? 0);
  }, 0);
  const selectedMonthBalance = paymentRows.reduce((total, row) => {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === billingMonthKey,
    );

    return total + (month?.balance ?? 0);
  }, 0);
  const selectedUnallocatedCredit = paymentRows.reduce(
    (total, row) => total + row.ledger.totals.carry,
    0,
  );
  const dashboardSummary = useMemo(() => {
    const monthRevenue = allPaymentRows.reduce((total, row) => {
      const month = row.ledger.monthly.find(
        (item) => item.month.key === billingMonthKey,
      );

      return total + (month?.paid ?? 0);
    }, 0);
    const totalDebt = allPaymentRows.reduce(
      (total, row) => total + getStudentDebt(row.ledger, row.record),
      0,
    );
    const overdueRows = allPaymentRows.filter((row) =>
      rowMatchesPaymentAlertFilter(
        row,
        "overdue",
        paymentMonths,
        paymentSettings,
      ),
    );
    const firstFineRows = allPaymentRows.filter((row) =>
      rowMatchesPaymentAlertFilter(
        row,
        "first-fine",
        paymentMonths,
        paymentSettings,
      ),
    );
    const secondFineRows = allPaymentRows.filter((row) =>
      rowMatchesPaymentAlertFilter(
        row,
        "second-fine",
        paymentMonths,
        paymentSettings,
      ),
    );
    const supportedStudents = students.filter(
      (student) => student.financialProfile.status !== "regular",
    );

    return {
      monthRevenue,
      totalDebt,
      overdueStudents: overdueRows.length,
      firstFineStudents: firstFineRows.length,
      secondFineStudents: secondFineRows.length,
      supportedStudents: supportedStudents.length,
    };
  }, [allPaymentRows, billingMonthKey, paymentMonths, paymentSettings, students]);
  const paymentAlertCounts = useMemo(
    () => ({
      registration: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          "registration",
          paymentMonths,
          paymentSettings,
        ),
      ).length,
      overdue: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          "overdue",
          paymentMonths,
          paymentSettings,
        ),
      ).length,
      firstFine: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          "first-fine",
          paymentMonths,
          paymentSettings,
        ),
      ).length,
      secondFine: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          "second-fine",
          paymentMonths,
          paymentSettings,
        ),
      ).length,
      debt: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(row, "debt", paymentMonths, paymentSettings),
      ).length,
      rulesEnding: paymentRows.filter((row) =>
        rowMatchesPaymentAlertFilter(
          row,
          "rules-ending",
          paymentMonths,
          paymentSettings,
        ),
      ).length,
    }),
    [paymentMonths, paymentRows, paymentSettings],
  );
  const nearCapacityGroups = groupsWithStats.filter(
    (group) => group.capacity > 0 && group.studentsTotal >= group.capacity * 0.9,
  );
  type PaymentAlertItem = {
    id: string;
    title: string;
    detail: string;
    count: number;
    tone: "danger" | "warning" | "info";
    filter?: PaymentAlertFilter;
    view?: WorkspaceView;
  };
  const paymentAlertItems: PaymentAlertItem[] = [
    {
      id: "registration",
      title: "Inscricoes pendentes",
      detail: "Alunos com inscrição por liquidar nesta turma.",
      count: paymentAlertCounts.registration,
      tone: "warning",
      filter: "registration",
    },
    {
      id: "overdue",
      title: "Mensalidades vencidas",
      detail: "Alunos com mensalidades fora do prazo.",
      count: paymentAlertCounts.overdue,
      tone: "danger",
      filter: "overdue",
    },
    {
      id: "first-fine",
      title: "1ª multa",
      detail: "Alunos actualmente em primeira multa.",
      count: paymentAlertCounts.firstFine,
      tone: "warning",
      filter: "first-fine",
    },
    {
      id: "second-fine",
      title: "2ª multa",
      detail: "Alunos actualmente em segunda multa.",
      count: paymentAlertCounts.secondFine,
      tone: "danger",
      filter: "second-fine",
    },
    {
      id: "debt",
      title: "Dívidas acumuladas",
      detail: "Alunos com valor em falta nesta turma.",
      count: paymentAlertCounts.debt,
      tone: "danger",
      filter: "debt",
    },
    {
      id: "rules-ending",
      title: "Regras a terminar",
      detail: "Bolsas, isencoes ou ponderacoes no mes final.",
      count: paymentAlertCounts.rulesEnding,
      tone: "info",
      filter: "rules-ending",
    },
    {
      id: "capacity",
      title: "Turmas quase cheias",
      detail: "Turmas da classe actual perto da lotacao.",
      count: nearCapacityGroups.length,
      tone: "warning",
      view: "groups",
    },
  ];
  const paymentAlerts = paymentAlertItems.filter((alert) => alert.count > 0);
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

  function openPaymentAlert(filter: PaymentAlertFilter) {
    setStudentSearch("");
    setPaymentAlertFilter(filter);
    setActiveView("payments");
    setActivePaymentSection("entry");
  }

  function openCapacityAlert() {
    setActiveView("groups");
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
      const student = students.find((item) => item.id === studentId);
      const record =
        paymentRecords.find((item) => item.studentId === studentId) ??
        buildPaymentRecord(studentId);
      const ledger = student
        ? buildLedger(student, record, paymentMonths, paymentSettings)
        : undefined;
      const registrationOutstanding =
        (ledger?.registrationBalance ?? 0) +
        (ledger?.registrationFine ?? 0);
      const registrationPending = registrationOutstanding > 0;

      setPaymentDraft((draft) => ({
        ...draft,
        studentId,
        category: registrationPending ? "registration" : draft.category,
        monthKey: student
          ? getStudentTuitionStartMonth(student, paymentSettings)
          : draft.monthKey,
        amount: registrationPending
          ? String(registrationOutstanding)
          : draft.amount,
        targetChargeId: "",
        effectivePaymentDate: today(),
        allowAdvancePayment: false,
      }));
    }
  }

  function openFinanceCell(selection: FinanceCellSelection) {
    setSelectedFinanceCell(selection);
  }

  function registerPaymentFromCell(
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentLaunchDraft["category"];
      studentId: string;
    },
  ) {
    setActiveView("payments");
    setActivePaymentSection("entry");
    setSelectedFinanceCell(null);
    setPaymentDraft((currentDraft) => ({
      ...currentDraft,
      studentId: draft.studentId,
      category: draft.category,
      monthKey: draft.monthKey ?? currentDraft.monthKey,
      targetChargeId: draft.targetChargeId ?? "",
      amount: draft.amount ?? currentDraft.amount,
      effectivePaymentDate: today(),
      allowAdvancePayment: false,
      description: draft.description ?? "",
    }));
  }

  function openMiscellaneousChargeForm() {
    setActiveView("payments");
    setActivePaymentSection("entry");
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

    setPaymentRecords((records) => {
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
    });
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
      stageId: selectedDefinition.stageId,
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

  function saveEnrollment(openPaymentAfterSave: boolean) {
    const trimmedName = enrollmentDraft.fullName.trim();
    const selectedGroup = groups.find(
      (group) => group.id === enrollmentDraft.groupId,
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
    const selectedClassDefinition = classDefinitions.find(
      (definition) => definition.id === selectedGroup.classId,
    );
    const educationLevelId = selectedClassDefinition?.stageId;
    const enrollmentRule = paymentRuleForStudent(paymentSettings, {
      educationLevelId,
    });

    const newStudent: Student = {
      id: nextId(students, "ALU"),
      registrationNumber: nextRegistrationNumber(students),
      fullName: trimmedName,
      guardianName: enrollmentDraft.guardianName.trim() || "Por registar",
      guardianPhone: enrollmentDraft.guardianPhone.trim() || "Por registar",
      enrollmentType: enrollmentDraft.enrollmentType,
      enrollmentDate: enrollmentDraft.enrollmentDate || today(),
      tuitionStartMonth: enrollmentDraft.tuitionStartMonth || enrollmentRule.startMonth,
      registrationStatus: "pending",
      financialProfile: enrollmentFinanceProfile,
      educationLevelId,
      classId: selectedGroup.classId,
      groupId: selectedGroup.id,
      createdAt: enrollmentDraft.enrollmentDate || today(),
    };
    const registrationDue = calculateRegistrationDue(newStudent, paymentSettings);
    newStudent.registrationStatus = registrationDue.due === 0 ? "paid" : "pending";

    setStudents((items) => [...items, newStudent]);
    setPaymentRecords((items) => [...items, buildPaymentRecord(newStudent.id)]);
    setPaymentDraft((draft) => ({
      ...draft,
      studentId: newStudent.id,
      category: "registration",
      monthKey: newStudent.tuitionStartMonth,
      targetChargeId: "",
      amount: String(registrationDue.due),
      effectivePaymentDate: today(),
      allowAdvancePayment: false,
      description: "",
    }));
    setSelectedClassId(newStudent.classId);
    setSelectedGroupId(newStudent.groupId);
    resetEnrollmentDraft(newStudent.classId, newStudent.groupId);

    if (openPaymentAfterSave) {
      setActiveView("payments");
      setActivePaymentSection("entry");
      return;
    }

    setEnrollmentNotice(
      `${newStudent.registrationNumber} guardada. Inscrição pendente para pagamento.`,
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
    const updatedAt = nowIso();
    const version = (paymentSettings.version ?? 1) + 1;
    const activeLevelIds = new Set(academicStages.map((level) => level.id));
    const completeLevelDrafts = [
      ...academicStages.map((level) =>
        financeSettingsDraft.levelRules.find((rule) => rule.levelId === level.id) ?? {
          levelId: level.id,
          levelName: level.name,
          inscriptionRenewalFee: financeSettingsDraft.inscriptionRenewalFee,
          monthlyFee: financeSettingsDraft.monthlyFee,
          startMonth: financeSettingsDraft.startMonth,
          endMonth: financeSettingsDraft.endMonth,
          firstPenaltyDay: financeSettingsDraft.firstPenaltyDay,
          firstPenaltyAmount: financeSettingsDraft.firstPenaltyAmount,
          secondPenaltyDay: financeSettingsDraft.secondPenaltyDay,
          secondPenaltyAmount: financeSettingsDraft.secondPenaltyAmount,
        },
      ),
      ...financeSettingsDraft.levelRules.filter(
        (rule) => !activeLevelIds.has(rule.levelId),
      ),
    ];
    const completeDraft: FinanceSettingsDraft = {
      ...financeSettingsDraft,
      levelRules: completeLevelDrafts,
    };

    const nextSettings: PaymentSettings = {
      academicYear: completeDraft.academicYear.trim() || currentAcademicYear(),
      inscriptionRenewalFee: parseMoney(
        completeDraft.inscriptionRenewalFee,
      ),
      monthlyFee: parseMoney(completeDraft.monthlyFee),
      startMonth: completeDraft.startMonth,
      endMonth: completeDraft.endMonth,
      firstPenaltyDay: Math.max(
        1,
        Math.min(31, Number(completeDraft.firstPenaltyDay) || 1),
      ),
      firstPenaltyAmount: parseMoney(completeDraft.firstPenaltyAmount),
      secondPenaltyDay: Math.max(
        1,
        Math.min(31, Number(completeDraft.secondPenaltyDay) || 1),
      ),
      secondPenaltyAmount: parseMoney(completeDraft.secondPenaltyAmount),
      levelRules: buildPaymentLevelRules(completeDraft, version, updatedAt),
      version,
      updatedAt,
    };
    const selectedStudent = students.find(
      (student) => student.id === paymentDraft.studentId,
    );
    const selectedRule = paymentRuleForStudent(nextSettings, selectedStudent);

    setPaymentSettings(nextSettings);
    setFinanceSettingsDraft(
      buildFinanceSettingsDraft(nextSettings, academicStages),
    );
    setBillingMonthKey(nextSettings.startMonth);
    setPaymentDraft((draft) => ({
      ...draft,
      monthKey: nextSettings.startMonth,
      targetChargeId: draft.category === "miscellaneous" ? draft.targetChargeId : "",
      amount:
        draft.category === "tuition"
          ? String(selectedRule.monthlyFee)
          : draft.category === "registration"
            ? String(selectedRule.inscriptionRenewalFee)
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
    const currentStudent = students.find(
      (student) => student.id === financeProfileDraft.studentId,
    );
    const updatedStudent = currentStudent
      ? { ...currentStudent, financialProfile: nextProfile }
      : undefined;
    const updatedRecord = updatedStudent
      ? repriceOpenCoreCharges(
          paymentRecords.find((record) => record.studentId === updatedStudent.id) ??
            buildPaymentRecord(updatedStudent.id),
          updatedStudent,
          paymentMonths,
          paymentSettings,
        )
      : undefined;
    const updatedRegistrationStatus: Student["registrationStatus"] =
      updatedStudent && updatedRecord
        ? buildLedger(
            updatedStudent,
            updatedRecord,
            paymentMonths,
            paymentSettings,
          ).registrationBalance === 0
          ? "paid"
          : "pending"
        : "pending";

    setStudents((items) =>
      items.map((student) =>
        student.id === financeProfileDraft.studentId
          ? {
              ...student,
              financialProfile: nextProfile,
              registrationStatus: updatedRegistrationStatus,
            }
          : student,
      ),
    );
    if (updatedStudent && updatedRecord) {
      setPaymentRecords((items) =>
        items.some((record) => record.studentId === updatedStudent.id)
          ? items.map((record) =>
              record.studentId === updatedStudent.id ? updatedRecord : record,
            )
          : [...items, updatedRecord],
      );
    }
    setFinanceProfileDraft((draft) => ({
      ...draft,
      discountPercent: String(nextProfile.discountPercent),
      authorizedBy: nextProfile.authorizedBy ?? "",
      registeredBy: nextProfile.registeredBy ?? "Secretaria",
    }));
    setFinanceNotice("Regra do aluno guardada com historico.");
  }

  function generateMonthlyBilling() {
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
      amount: paymentRuleForStudent(
        paymentSettings,
        paymentRows[0]?.student,
      ).monthlyFee,
      expectedTotal: selectedMonthExpected,
      createdAt: nowIso(),
    };

    setBillingRuns((items) => [newRun, ...items]);
    setPaymentRecords((items) => {
      const nextItems = [...items];

      [...chargedRows, ...exemptedRows].forEach((row) => {
        const normalizedRecord = normalizePaymentRecord(
          row.record,
          row.student,
          paymentMonths,
          paymentSettings,
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
    setBillingNotice(
      `${selectedMonth?.label ?? "Mes"} gerado: ${newRun.studentIds.length} alunos cobrados e ${newRun.exemptedStudentIds.length} isentos.`,
    );
  }

  function launchPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseMoney(paymentDraft.amount);
    const student = students.find((item) => item.id === paymentDraft.studentId);

    if (!paymentDraft.studentId || amount <= 0 || !student) {
      return;
    }

    const existingRecord =
      paymentRecords.find((record) => record.studentId === paymentDraft.studentId) ??
      buildPaymentRecord(paymentDraft.studentId);
    const nextRecord = recordStudentPayment({
      record: existingRecord,
      student,
      months: paymentMonths,
      settings: paymentSettings,
      category: paymentDraft.category,
      monthKey: paymentDraft.monthKey,
      targetChargeId: paymentDraft.targetChargeId,
      amount,
      effectivePaymentDate: paymentDraft.effectivePaymentDate || today(),
      recordedAt: nowIso(),
      recordedBy: paymentDraft.recordedBy,
      method: paymentDraft.method,
      allowAdvancePayment: paymentDraft.allowAdvancePayment,
      description: paymentDraft.description.trim(),
    });

    setPaymentRecords((items) => {
      if (items.some((record) => record.studentId === paymentDraft.studentId)) {
        return items.map((record) =>
          record.studentId === paymentDraft.studentId ? nextRecord : record,
        );
      }

      return [...items, nextRecord];
    });

    const registrationStatus: Student["registrationStatus"] =
      buildLedger(student, nextRecord, paymentMonths, paymentSettings)
        .registrationBalance === 0
        ? "paid"
        : "pending";

    setStudents((items) =>
      items.map((item) =>
        item.id === paymentDraft.studentId
          ? { ...item, registrationStatus }
          : item,
      ),
    );

    setPaymentDraft((draft) => ({
      ...draft,
      amount:
        draft.category === "tuition"
          ? String(paymentRuleForStudent(paymentSettings, student).monthlyFee)
          : draft.category === "registration"
            ? String(
                calculateRegistrationDue(student, paymentSettings).due,
              )
            : "0",
      targetChargeId: "",
      effectivePaymentDate: today(),
      allowAdvancePayment: false,
      description: draft.category === "miscellaneous" ? "" : draft.description,
    }));
  }

  if (!activeProfile) {
    return renderProfilePortal();
  }

  return renderWorkspace();

  function renderProfilePortal() {
    return (
      <main className="grid min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-10">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-28 place-items-center rounded-md border-2 border-[#185c54] bg-white text-2xl font-black text-[#185c54] shadow-sm sm:size-32">
              {institutionLogoText}
            </div>
            <h1 className="mt-5 text-4xl font-black text-slate-950 sm:text-5xl">
              {institutionName}
            </h1>
          </div>

          <div className="grid w-full gap-4 md:grid-cols-2">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onOpen={() => enterProfile(profile.id)}
              />
            ))}
          </div>
        </section>
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
    const canManageAcademics = selectedProfile.id === "secretaria";
    const canManagePayments = selectedProfile.id === "secretaria";
    const showAcademicContext = selectedProfile.id === "secretaria";

    return (
      <main className="min-h-screen bg-[#f4f7f8] text-slate-950">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-md bg-[#185c54] text-sm font-black text-white">
                {institutionLogoText}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#185c54]">
                  {institutionName}
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
                  Selecção actual
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
                    value={formatCurrency(currentClassRule.monthlyFee)}
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
            </div>
          </div>
        </div>
      </main>
    );
  }

  function renderOverview() {
    const canManageAcademics = selectedProfile.id === "secretaria";
    const canManagePayments = selectedProfile.id === "secretaria";

    return (
      <div className="grid gap-6">
        {selectedProfile.id === "director" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Alunos matriculados"
              value={students.length}
              supporting="Total registado"
              accent="border-l-[#2867d8]"
            />
            <MetricCard
              label="Turmas activas"
              value={activeGroupsTotal}
              supporting={`${groups.length} turmas no total`}
              accent="border-l-[#25965a]"
            />
            <MetricCard
              label="Receita do mes"
              value={formatCurrency(dashboardSummary.monthRevenue)}
              supporting={monthLabel(billingMonthKey)}
              accent="border-l-[#185c54]"
            />
            <MetricCard
              label="Divida total"
              value={formatCurrency(dashboardSummary.totalDebt)}
              supporting="Inclui multas"
              accent="border-l-[#d08a19]"
            />
            <MetricCard
              label="Mensalidades atrasadas"
              value={dashboardSummary.overdueStudents}
              supporting="Alunos com atraso"
              accent="border-l-[#d08a19]"
            />
            <MetricCard
              label="1ª multa"
              value={dashboardSummary.firstFineStudents}
              supporting="Alunos neste prazo"
              accent="border-l-[#f59e0b]"
            />
            <MetricCard
              label="2ª multa"
              value={dashboardSummary.secondFineStudents}
              supporting="Alunos neste prazo"
              accent="border-l-[#dc2626]"
            />
            <MetricCard
              label="Bolsas e isencoes"
              value={dashboardSummary.supportedStudents}
              supporting="Regras especiais"
              accent="border-l-[#8b5cf6]"
            />
          </div>
        ) : (
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
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold">Alertas internos</h3>
            <p className="text-sm text-slate-500">
              Clique num alerta para abrir a lista correspondente.
            </p>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {paymentAlerts.length > 0 ? (
              paymentAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() =>
                    alert.filter
                      ? openPaymentAlert(alert.filter)
                      : openCapacityAlert()
                  }
                  className={cx(
                    "rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    alert.tone === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : alert.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-sky-200 bg-sky-50 text-sky-900",
                  )}
                >
                  <span className="text-2xl font-bold">{alert.count}</span>
                  <span className="mt-2 block text-sm font-semibold">
                    {alert.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 opacity-80">
                    {alert.detail}
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                Sem alertas para a seleccao actual.
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">
                  {canManageAcademics ? "Académico" : "Consulta"}
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
              {!canManageAcademics && !canManagePayments && (
                <FlowStep
                  number="01"
                  title="Relatórios"
                  onClick={() => setActiveView("reports")}
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
                        {canManageAcademics ? (
                          <TextButton
                            onClick={() => {
                              selectClass(schoolClass.id);
                              setActiveView("groups");
                            }}
                          >
                            Ver turmas
                          </TextButton>
                        ) : (
                          <span className="text-sm font-semibold text-slate-500">
                            Consulta
                          </span>
                        )}
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
                  visibleStudents.map((student) => {
                    const paymentRow = allPaymentRows.find(
                      (row) => row.student.id === student.id,
                    );
                    const registrationPaid =
                      (paymentRow?.ledger.registrationBalance ??
                        calculateRegistrationDue(student, paymentSettings).due) === 0;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-mono text-sm font-semibold">
                          {stableStudentNumber(student)}
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
          onSaveAndPay={saveEnrollmentAndOpenPayment}
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
              levels={activeAcademicStages(academicStages)}
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
                    Preparação mensal da cobrança por turma.
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
                  supporting={`${paymentRows.length} alunos da turma`}
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
                  label="Crédito não aplicado"
                  value={formatCurrency(selectedUnallocatedCredit)}
                  supporting="Antecipação é explícita"
                  accent="border-l-[#0ea5c7]"
                />
                <MetricCard
                  label="Descontos"
                  value={formatCurrency(selectedMonthDiscount)}
                  supporting={selectedMonthBillingRun ? "Mês gerado" : "Mês por gerar"}
                  accent="border-l-[#8b5cf6]"
                />
              </div>

              {billingNotice && (
                <div className="mx-5 mb-5 rounded-md bg-teal-50 px-4 py-3 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
                  {billingNotice}
                </div>
              )}
            </section>

            {selectedProfile.id === "secretaria" && (
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

            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
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
                  <table className="w-full min-w-[1480px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">
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
                            className="size-4 rounded border-slate-300 text-[#185c54]"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">Nº</th>
                        <th className="px-5 py-3 font-semibold">Aluno</th>
                        <th className="px-4 py-3 font-semibold">Inscrição</th>
                        {paymentMonths.map((month) => (
                          <th key={month.key} className="px-3 py-3 font-semibold">
                            {month.shortLabel}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Diversos</th>
                        <th className="px-4 py-3 font-semibold">Dívida</th>
                        <th className="px-5 py-3 font-semibold">Accao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visiblePaymentRows.length > 0 ? (
                        visiblePaymentRows.map((row) => {
                          const registrationState = getRegistrationCellState(
                            row.ledger,
                            paymentSettings,
                          );
                          const miscellaneousState = getMiscellaneousCellState(
                            row.record,
                          );
                          const debt = getStudentDebt(row.ledger, row.record);
                          const upcoming = getStudentUpcomingBalance(
                            row.ledger,
                            row.record,
                          );

                          return (
                            <tr
                              key={row.student.id}
                              className="hover:bg-slate-50/80"
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedPaymentStudentIdSet.has(
                                    row.student.id,
                                  )}
                                  onChange={() =>
                                    togglePaymentStudentSelection(row.student.id)
                                  }
                                  aria-label={`Seleccionar ${row.student.fullName}`}
                                  className="size-4 rounded border-slate-300 text-[#185c54]"
                                />
                              </td>
                              <td className="px-4 py-4 font-mono text-sm font-semibold text-slate-600">
                                {stableStudentNumber(row.student)}
                              </td>
                              <td className="px-5 py-4">
                                <span className="block font-semibold">
                                  {row.student.fullName}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {row.student.registrationNumber}
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
                                    row.ledger.registrationBalance > 0
                                      ? formatCurrency(row.ledger.registrationBalance)
                                      : registrationState.detail
                                  }
                                  tone={registrationState.tone}
                                  title={`Ver inscrição de ${row.student.fullName}`}
                                />
                              </td>
                              {row.ledger.monthly.map((month) => {
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
                                const monthSupporting = month.applicable
                                  ? month.due > 0
                                    ? installmentNumber
                                      ? `${installmentNumber}ª · ${formatCurrency(month.due)}`
                                      : formatCurrency(month.due)
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
                                      supporting={monthSupporting}
                                      tone={monthState.tone}
                                      title={`Ver mensalidade de ${month.month.label} de ${row.student.fullName}`}
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
                                  tone={miscellaneousState.tone}
                                  title={`Ver diversos de ${row.student.fullName}`}
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
                                  supporting={
                                    debt > 0
                                      ? "Dívida vencida"
                                      : upcoming > 0
                                        ? `${formatCurrency(upcoming)} a vencer`
                                        : "Sem dívida"
                                  }
                                  tone={debt > 0 ? "danger" : upcoming > 0 ? "info" : "paid"}
                                  title={`Ver dívida de ${row.student.fullName}`}
                                />
                              </td>
                              <td className="px-5 py-4">
                                <TextButton
                                  onClick={() => openPaymentEntry(row.student.id)}
                                >
                                  Lançar
                                </TextButton>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={paymentMonths.length + 7}
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

        <FinanceCellDialog
          canManagePayments={selectedProfile.id === "secretaria"}
          months={paymentMonths}
          row={selectedFinanceRow}
          selection={selectedFinanceCell}
          settings={paymentSettings}
          onClose={() => setSelectedFinanceCell(null)}
          onCreateMiscellaneous={openMiscellaneousChargeForm}
          onRegisterPayment={registerPaymentFromCell}
        />
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="grid gap-6">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
            label="Dívida vencida"
            value={formatCurrency(dashboardSummary.totalDebt)}
            supporting="Exclui valores futuros"
            accent="border-l-[#d08a19]"
          />
          <MetricCard
            label="A vencer"
            value={formatCurrency(schoolUpcomingBalance)}
            supporting="Ainda dentro do prazo"
            accent="border-l-[#0ea5c7]"
          />
          <MetricCard
            label="Diversos"
            value={formatCurrency(schoolPaymentSummary.miscellaneous)}
            supporting="Pagamentos extras"
            accent="border-l-[#64748b]"
          />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Mensalidades geradas</h3>
              <p className="text-sm text-slate-500">
                Histórico de gerações por turma e mês.
              </p>
            </div>
            {selectedProfile.id === "secretaria" && (
              <SecondaryButton onClick={() => setActiveView("payments")}>
                Nova geracao
              </SecondaryButton>
            )}
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
                Recebimentos que não abatem inscrição nem mensalidades.
              </p>
            </div>
            <SecondaryButton onClick={openMiscellaneousChargeForm}>
              Nova cobrança
            </SecondaryButton>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Aluno</th>
                  <th className="px-5 py-3 font-semibold">Descrição</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold">Forma</th>
                  <th className="px-5 py-3 font-semibold">Data efectiva</th>
                  <th className="px-5 py-3 font-semibold">Registado em</th>
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
                        {formatDate(payment.effectivePaymentDate)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDateTime(payment.recordedAt)} · {payment.recordedBy}
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
