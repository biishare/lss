import assert from "node:assert/strict";
import test from "node:test";
import {
  addMiscellaneousCharge,
  applyStudentPaymentPreview,
  buildDefaultPaymentRuleVersion,
  buildPaymentReceipt,
  buildPaymentReceiptFromRecord,
  buildPaymentRuleDraft,
  buildLedger,
  buildPaymentRecord,
  buildStudentFinanceProfile,
  correctStudentPayment,
  createNextPaymentRuleVersion,
  calculateMonthlyDue,
  calculateRegistrationDue,
  ensurePenaltyChargesForRecord,
  getChargeBalance,
  getDebtBreakdown,
  getMiscellaneousCellState,
  getMonthCellState,
  getMonthsInRange,
  getPenaltyChargesForBase,
  getRegistrationCellState,
  getStudentDebt,
  getStudentDebtTiming,
  getTuitionInstallmentNumber,
  nextStableNumberForGroup,
  normalizePaymentRecord,
  normalizeStudentsForEnrollmentPolicy,
  previewStudentPayment,
  recordStudentPayment,
  summarizePaymentRows,
  tuitionChargeId,
  type OfficialPaymentState,
} from "../app/components/school-admin-demo.model.ts";
import {
  assertCanPerformFinanceAction,
  canPerformFinanceAction,
} from "../app/features/finance/domain/access-control.ts";
import { validateFinanceBook } from "../app/features/finance/domain/invariants.ts";
import {
  migrateLegacyStoredState,
  restoreLegacySafetyExport,
  type LegacyStoredDemoState,
} from "../app/features/finance/domain/migration.ts";
import type { PaymentRuleVersion } from "../app/features/finance/domain/entities.ts";
import {
  initialPaymentSettings,
  type PaymentSettings,
  type Student,
} from "../app/lib/school-demo-data.ts";

const settings: PaymentSettings = {
  ...initialPaymentSettings,
  academicYear: "2026",
  startMonth: "mar",
  endMonth: "nov",
  firstPenaltyDay: 10,
  firstPenaltyAmount: 100,
  secondPenaltyDay: 20,
  secondPenaltyAmount: 250,
};

const student: Student = {
  id: "ALU-001",
  registrationNumber: "GA-2026-001",
  fullName: "Ana Manuel",
  guardianName: "Maria Manuel",
  guardianPhone: "840000000",
  enrollmentType: "new",
  enrollmentDate: "2026-06-03",
  tuitionStartMonth: "jun",
  registrationStatus: "pending",
  financialProfile: {
    status: "regular",
    discountPercent: 0,
  },
  classId: "10",
  groupId: "10A2026",
  createdAt: "2026-06-03",
};

function createLegacyMigrationState(): LegacyStoredDemoState {
  const legacyStudent: Student = {
    ...student,
    id: "ALU-010",
    registrationNumber: "GA-2026-010",
    fullName: "Beatriz Pedro",
    enrollmentDate: "2026-04-01",
    tuitionStartMonth: "jun",
    createdAt: "2026-04-01",
  };

  return {
    academicStages: [
      {
        id: "secundario",
        name: "Secundario",
        status: "active",
        createdAt: "2026-01-01",
      },
    ],
    classDefinitions: [
      {
        id: "10",
        name: "10. classe",
        stageId: "secundario",
        status: "active",
        createdAt: "2026-01-01",
      },
    ],
    roomDefinitions: [],
    classes: [
      {
        id: "10",
        name: "10. classe",
        stage: "Secundario",
        academicYear: "2026",
        status: "active",
        createdAt: "2026-01-01",
      },
    ],
    rooms: [],
    groups: [
      {
        id: "10A2026",
        name: "Turma A",
        classId: "10",
        shift: "Manha",
        roomId: "",
        capacity: 35,
        status: "active",
        createdAt: "2026-01-01",
      },
    ],
    students: [legacyStudent],
    paymentSettings: settings,
    paymentRecords: [
      {
        ...buildPaymentRecord(legacyStudent.id),
        inscriptionRenewal: {
          amount: 3500,
          paidDay: 5,
          paidAt: "2026-04-05T08:00:00.000Z",
          method: "Transferencia",
          reference: "LEG-REG",
        },
        monthlyPayments: {
          jun: {
            amount: 1500,
            paidDay: 3,
            paidAt: "2026-06-03T08:00:00.000Z",
            method: "Transferencia",
            reference: "LEG-JUN",
          },
        },
        miscellaneousPayments: [
          {
            amount: 500,
            paidDay: 6,
            paidAt: "2026-06-06T08:00:00.000Z",
            method: "Numerario",
            reference: "LEG-MISC",
            description: "Certificado",
          },
        ],
      },
    ],
    billingRuns: [],
  };
}

test("planilha financeira respeita mes inicial do aluno", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const record = buildPaymentRecord(student.id);
  const ledger = buildLedger(student, record, months, settings, "2026-06-05");
  const march = ledger.monthly.find((month) => month.month.key === "mar");
  const june = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(getTuitionInstallmentNumber(student, "mar", months, settings), null);
  assert.equal(getTuitionInstallmentNumber(student, "jun", months, settings), 1);
  assert.equal(march?.applicable, false);
  assert.equal(march ? getMonthCellState(march, settings).label : "", "—");
  assert.equal(june ? getMonthCellState(june, settings).label : "", "A vencer");
});

test("pagamento antecipado abate inscricao e primeira mensalidade", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const record = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings,
    category: "registration",
    monthKey: "jun",
    amount: 5000,
    paidOn: "2026-04-07",
    recordedAt: "2026-04-15T09:30:00.000Z",
    method: "Transferencia",
    reference: "DEP-0704",
    description: "",
    allowFutureAllocation: true,
  });
  const ledger = buildLedger(student, record, months, settings);
  const june = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(ledger.registrationBalance, 0);
  assert.equal(getRegistrationCellState(ledger, settings).label, "Pago");
  assert.equal(june?.paid, 1500);
  assert.equal(june?.fine, 0);
  assert.equal(june ? getMonthCellState(june, settings).label : "", "Pago");
});

test("ponderacao guarda autorizacao e termina no fim do periodo", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const financialProfile = buildStudentFinanceProfile(
    undefined,
    {
      studentId: student.id,
      status: "weighted",
      discountPercent: "40",
      startMonth: "jun",
      endMonth: "jul",
      reason: "Autorizacao temporaria",
      authorizedBy: "Director",
      registeredBy: "Secretaria",
    },
    "2026-06-05T08:00:00.000Z",
  );
  const weightedStudent: Student = {
    ...student,
    financialProfile,
  };
  const ledger = buildLedger(
    weightedStudent,
    buildPaymentRecord(weightedStudent.id),
    months,
    settings,
    "2026-06-05",
  );
  const june = ledger.monthly.find((month) => month.month.key === "jun");
  const august = ledger.monthly.find((month) => month.month.key === "aug");

  assert.equal(financialProfile.history?.length, 1);
  assert.equal(financialProfile.history?.[0]?.authorizedBy, "Director");
  assert.equal(june?.due, 900);
  assert.equal(june ? getMonthCellState(june, settings).label : "", "A vencer");
  assert.equal(august?.due, 1500);
  assert.equal(august?.ruleLabel, "Regular");
});

test("mensalidade em aberto recebe multa conforme o prazo", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const firstFineLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    settings,
    "2026-06-11",
  );
  const secondFineLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    settings,
    "2026-06-21",
  );
  const futureMonth = secondFineLedger.monthly.find(
    (month) => month.month.key === "jul",
  );
  const firstFineMonth = firstFineLedger.monthly.find(
    (month) => month.month.key === "jun",
  );
  const secondFineMonth = secondFineLedger.monthly.find(
    (month) => month.month.key === "jun",
  );

  assert.equal(firstFineMonth?.fine, 100);
  assert.equal(
    firstFineMonth ? getMonthCellState(firstFineMonth, settings).label : "",
    "1ª multa",
  );
  assert.equal(secondFineMonth?.fine, 350);
  assert.equal(
    secondFineMonth ? getMonthCellState(secondFineMonth, settings).label : "",
    "2ª multa",
  );
  assert.equal(futureMonth?.fine, 0);
  assert.equal(
    futureMonth ? getMonthCellState(futureMonth, settings).label : "",
    "A vencer",
  );
});

test("cobranca diversa fica pendente e pagamento abate item existente", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const recordWithCharge = addMiscellaneousCharge(
    buildPaymentRecord(student.id),
    student,
    {
      type: "Prova",
      description: "Prova Trimestral",
      amount: "500",
      dueOn: "2026-06-30",
      target: "group",
    },
    "2026-06-01T08:00:00.000Z",
  );
  const charge = recordWithCharge.charges.find(
    (item) => item.category === "miscellaneous",
  );

  assert.ok(charge);
  assert.equal(getMiscellaneousCellState(recordWithCharge).label, "Pendente");
  assert.equal(getMiscellaneousCellState(recordWithCharge).detail, "Diversos (1)");
  assert.equal(getChargeBalance(recordWithCharge, charge), 500);

  const partiallyPaid = recordStudentPayment({
    record: recordWithCharge,
    student,
    months,
    settings,
    category: "miscellaneous",
    monthKey: "jun",
    targetChargeId: charge.id,
    amount: 200,
    paidOn: "2026-06-10",
    recordedAt: "2026-06-10T09:00:00.000Z",
    method: "Numerario",
    reference: "",
    description: charge.description,
  });
  const ledger = buildLedger(student, partiallyPaid, months, settings, "2026-06-10");
  const debtBreakdown = getDebtBreakdown({
    student,
    record: partiallyPaid,
    ledger,
  });

  assert.equal(getChargeBalance(partiallyPaid, charge), 300);
  assert.equal(getMiscellaneousCellState(partiallyPaid).label, "Parcial");
  assert.equal(getMiscellaneousCellState(partiallyPaid).detail, "Diversos (1)");
  assert.ok(
    debtBreakdown.some(
      (item) => item.label === charge.description && item.amount === 300,
    ),
  );
});

test("migracao legada cria livro financeiro reversivel e concilia totais", () => {
  const legacyState = createLegacyMigrationState();
  const migration = migrateLegacyStoredState(legacyState, {
    storageKey: "test-storage",
    migratedAt: "2026-06-07T10:00:00.000Z",
    recordedBy: "Secretaria Teste",
  });
  const enrollment = migration.financeBook.enrollments.find(
    (item) => item.studentId === "ALU-010",
  );
  const registrationPayment = migration.financeBook.payments.find(
    (item) => item.id === "PAY-MIG-ALU-010-REG",
  );

  assert.equal(migration.preview.reconciled, true);
  assert.deepEqual(migration.preview.before, migration.preview.after);
  assert.equal(migration.preview.after.paymentTotal, 5500);
  assert.equal(migration.preview.violations.length, 0);
  assert.deepEqual(restoreLegacySafetyExport(migration.safetyExport), legacyState);
  assert.equal(enrollment?.academicYearId, "2026");
  assert.equal(enrollment?.educationLevelId, "secundario");
  assert.equal(enrollment?.stableNumber, "001");
  assert.equal(registrationPayment?.effectivePaymentDate, "2026-04-05");
  assert.equal(registrationPayment?.recordedBy, "Secretaria Teste");
  assert.equal(registrationPayment?.legacyReference, "LEG-REG");
  assert.ok(
    migration.preview.warnings.some(
      (warning) => warning.code === "legacy-payment-entry",
    ),
  );
});

test("numeros de matricula estaveis sobrevivem a ordenacao visual", () => {
  const sourceStudents: Student[] = [
    {
      ...student,
      id: "ALU-020",
      registrationNumber: "GA-2026-020",
      fullName: "Zelia Manuel",
      enrollmentDate: "2026-06-02",
      stableNumber: "002",
    },
    {
      ...student,
      id: "ALU-019",
      registrationNumber: "GA-2026-019",
      fullName: "Ana Manuel",
      enrollmentDate: "2026-06-01",
      stableNumber: "001",
    },
  ];
  const normalizedStudents = normalizeStudentsForEnrollmentPolicy(
    [...sourceStudents].reverse(),
    settings,
  );

  assert.equal(
    normalizedStudents.find((item) => item.id === "ALU-020")?.stableNumber,
    "002",
  );
  assert.equal(
    normalizedStudents.find((item) => item.id === "ALU-019")?.stableNumber,
    "001",
  );
  assert.equal(
    nextStableNumberForGroup(
      normalizedStudents,
      "10A2026",
      settings,
      settings.academicYear,
    ),
    "003",
  );
});

test("director consulta mas fica bloqueado em mutacoes financeiras", () => {
  const readAccess = canPerformFinanceAction("director", "read-finance");
  const mutationAccess = canPerformFinanceAction("director", "record-payment");

  assert.equal(readAccess.allowed, true);
  assert.equal(mutationAccess.allowed, false);
  assert.throws(
    () => assertCanPerformFinanceAction("director", "record-payment"),
    /Director pode consultar/,
  );
  assert.doesNotThrow(() =>
    assertCanPerformFinanceAction("secretaria", "record-payment"),
  );
});

test("invariantes detectam alocacao acima do pagamento", () => {
  const migration = migrateLegacyStoredState(createLegacyMigrationState(), {
    migratedAt: "2026-06-07T10:00:00.000Z",
  });
  const firstPayment = migration.financeBook.payments[0];
  const firstAllocation = migration.financeBook.allocations[0];

  assert.ok(firstPayment);
  assert.ok(firstAllocation);

  const inconsistentBook = {
    ...migration.financeBook,
    allocations: [
      {
        ...firstAllocation,
        amount: firstPayment.amount + 1,
      },
    ],
  };
  const violations = validateFinanceBook(inconsistentBook);

  assert.ok(
    violations.some(
      (violation) => violation.code === "allocation-payment-overflow",
    ),
  );
});
test("regras versionadas por ano e nivel determinam inscricao e mensalidade", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const levelStudent: Student = {
    ...student,
    academicYearId: "2026",
    educationLevelId: "secundario",
  };
  const customRule: PaymentRuleVersion = {
    ...buildDefaultPaymentRuleVersion(settings, "2026", "secundario", 2),
    id: "RULE-2026-SECUNDARIO-V002",
    version: 2,
    inscriptionFee: 4200,
    monthlyFee: 1800,
    monthlyDueDay: 5,
    firstPenalty: { thresholdDay: 10, percent: 5 },
    secondPenalty: { thresholdDay: 20, percent: 12 },
    validFrom: "2026-01-01",
  };
  const june = months.find((month) => month.key === "jun");

  assert.ok(june);

  const registrationDue = calculateRegistrationDue(levelStudent, settings, [customRule]);
  const monthlyDue = calculateMonthlyDue(levelStudent, june, settings, [customRule]);
  const ledger = buildLedger(
    levelStudent,
    buildPaymentRecord(levelStudent.id),
    months,
    settings,
    "2026-06-06",
    [customRule],
  );
  const ledgerJune = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(registrationDue.due, 4200);
  assert.equal(registrationDue.ruleVersionId, customRule.id);
  assert.equal(monthlyDue.due, 1800);
  assert.equal(monthlyDue.dueOn, "2026-06-05");
  assert.equal(ledgerJune?.due, 1800);
  assert.equal(ledgerJune?.state, "overdue");
});

test("bolsa integral cobre inscricao e mensalidades sem multa nem divida", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const scholarshipStudent: Student = {
    ...student,
    financialProfile: {
      status: "scholarship",
      discountPercent: 100,
      startMonth: settings.startMonth,
      endMonth: settings.endMonth,
      authorizedBy: "Director",
      registeredBy: "Secretaria",
      registeredAt: "2026-06-01T08:00:00.000Z",
    },
  };
  const ledger = buildLedger(
    scholarshipStudent,
    buildPaymentRecord(scholarshipStudent.id),
    months,
    settings,
    "2026-06-21",
  );
  const june = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(ledger.registrationDue, 0);
  assert.equal(ledger.registrationBalance, 0);
  assert.equal(ledger.registrationFine, 0);
  assert.equal(getRegistrationCellState(ledger, settings).label, "Bolseiro");
  assert.equal(june?.due, 0);
  assert.equal(june?.fine, 0);
  assert.equal(june ? getMonthCellState(june, settings).label : "", "Bolseiro");
  assert.equal(getStudentDebt(ledger, ledger.normalizedRecord), 0);
});

test("snapshot publicado impede alteracao retroactiva de regra e ponderacao", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const ruleV1 = buildDefaultPaymentRuleVersion(settings, "2026", "10", 1);
  const weightedProfile = buildStudentFinanceProfile(
    undefined,
    {
      studentId: student.id,
      status: "weighted",
      discountPercent: "40",
      startMonth: "jun",
      endMonth: "jul",
      reason: "Snapshot aprovado",
      authorizedBy: "Director",
      registeredBy: "Secretaria",
    },
    "2026-06-05T08:00:00.000Z",
  );
  const weightedStudent: Student = {
    ...student,
    educationLevelId: "10",
    financialProfile: weightedProfile,
  };
  const publishedRecord = normalizePaymentRecord(
    buildPaymentRecord(weightedStudent.id),
    weightedStudent,
    months,
    settings,
    [ruleV1],
    "2026-06-05",
  );
  const originalJuneCharge = publishedRecord.charges.find(
    (charge) => charge.id === tuitionChargeId(weightedStudent.id, "jun"),
  );
  const ruleV2: PaymentRuleVersion = {
    ...ruleV1,
    id: "RULE-2026-10-V002",
    version: 2,
    monthlyFee: 2200,
    validFrom: "2026-07-01",
  };
  const changedStudent: Student = {
    ...weightedStudent,
    financialProfile: { status: "regular", discountPercent: 0 },
  };
  const ledger = buildLedger(
    changedStudent,
    publishedRecord,
    months,
    settings,
    "2026-06-05",
    [ruleV2],
  );
  const june = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(originalJuneCharge?.dueAmount, 900);
  assert.equal(originalJuneCharge?.snapshot?.discountPercent, 40);
  assert.equal(originalJuneCharge?.snapshot?.ruleLabel, "Ponderacao 40%");
  assert.equal(june?.due, 900);
  assert.equal(june?.discount, 600);
  assert.equal(june?.ruleLabel, "Ponderacao 40%");
});

test("multas percentuais sao idempotentes por rubrica", () => {
  const percentSettings: PaymentSettings = {
    ...settings,
    firstPenaltyPercent: 5,
    secondPenaltyPercent: 10,
  };
  const months = getMonthsInRange(percentSettings.startMonth, percentSettings.endMonth);
  const once = ensurePenaltyChargesForRecord(
    buildPaymentRecord(student.id),
    student,
    months,
    percentSettings,
    [],
    "2026-06-21",
  );
  const twice = ensurePenaltyChargesForRecord(
    once,
    student,
    months,
    percentSettings,
    [],
    "2026-06-21",
  );
  const junePenalties = getPenaltyChargesForBase(twice, tuitionChargeId(student.id, "jun"));

  assert.deepEqual(
    junePenalties.map((penalty) => [penalty.stage, penalty.amount]),
    [
      ["first", 75],
      ["second", 75],
    ],
  );
  assert.equal(junePenalties.length, 2);
});

test("alocacao liquida rubrica e multa antes de meses futuros", () => {
  const percentSettings: PaymentSettings = {
    ...settings,
    firstPenaltyPercent: 5,
    secondPenaltyPercent: 10,
  };
  const months = getMonthsInRange(percentSettings.startMonth, percentSettings.endMonth);
  const registrationPaid = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings: percentSettings,
    category: "registration",
    monthKey: "jun",
    amount: 3500,
    paidOn: "2026-06-03",
    recordedAt: "2026-06-03T08:00:00.000Z",
    method: "Transferencia",
    reference: "REG-OK",
    description: "",
  });
  const overdueRecord = ensurePenaltyChargesForRecord(
    registrationPaid,
    student,
    months,
    percentSettings,
    [],
    "2026-06-21",
  );
  const paid = recordStudentPayment({
    record: overdueRecord,
    student,
    months,
    settings: percentSettings,
    category: "tuition",
    monthKey: "jun",
    amount: 1725,
    paidOn: "2026-06-21",
    recordedAt: "2026-06-21T09:00:00.000Z",
    method: "Transferencia",
    reference: "TUI-ORDER",
    description: "",
    allowFutureAllocation: true,
  });
  const payment = paid.payments.at(-1);

  assert.ok(payment);

  const allocationChargeIds = paid.allocations
    .filter((allocation) => allocation.paymentId === payment.id)
    .map((allocation) => allocation.chargeId);
  const juneChargeId = tuitionChargeId(student.id, "jun");
  const junePenaltyIds = getPenaltyChargesForBase(paid, juneChargeId).map(
    (penalty) => penalty.id,
  );

  assert.deepEqual(allocationChargeIds, [
    juneChargeId,
    ...junePenaltyIds,
    tuitionChargeId(student.id, "jul"),
  ]);
});

test("meses futuros exigem autorizacao explicita de pagamento antecipado", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const paid = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings,
    category: "registration",
    monthKey: "jun",
    amount: 5000,
    paidOn: "2026-06-03",
    recordedAt: "2026-06-03T09:00:00.000Z",
    method: "Transferencia",
    reference: "NO-FUTURE",
    description: "",
  });
  const ledger = buildLedger(student, paid, months, settings, "2026-06-03");
  const june = ledger.monthly.find((month) => month.month.key === "jun");

  assert.equal(ledger.registrationBalance, 0);
  assert.equal(june?.paid, 0);
  assert.equal(ledger.totals.carry, 1500);
});

test("resumo separa divida vencida de valor a vencer", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const ledger = buildLedger(student, buildPaymentRecord(student.id), months, settings, "2026-06-11");
  const timing = getStudentDebtTiming(ledger, ledger.normalizedRecord);
  const summary = summarizePaymentRows([{ student, record: ledger.normalizedRecord, ledger }]);
  const june = ledger.monthly.find((month) => month.month.key === "jun");
  const july = ledger.monthly.find((month) => month.month.key === "jul");

  assert.equal(june?.state, "first-fine");
  assert.equal(july?.state, "future");
  assert.ok(timing.overdueDebt > 0);
  assert.ok(timing.futureDue > 0);
  assert.equal(summary.overdueDebt, ledger.totals.overdueDebt);
  assert.equal(summary.futureDue, ledger.totals.futureDue);
});
test("vocabulário oficial de estados da planilha tem exemplos", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const examples = new Map<
    OfficialPaymentState,
    { label: string; symbol: string }
  >();
  const capture = (cell: {
    state: OfficialPaymentState;
    label: string;
    symbol: string;
  }) => {
    examples.set(cell.state, { label: cell.label, symbol: cell.symbol });
  };
  const pendingLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    settings,
    "2026-06-10",
  );
  const firstFineLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    settings,
    "2026-06-11",
  );
  const secondFineLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    settings,
    "2026-06-21",
  );
  const overdueSettings: PaymentSettings = {
    ...settings,
    monthlyDueDay: 10,
    firstPenaltyDay: 20,
    secondPenaltyDay: 25,
  };
  const overdueLedger = buildLedger(
    student,
    buildPaymentRecord(student.id),
    months,
    overdueSettings,
    "2026-06-15",
  );
  const partialRecord = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings,
    category: "tuition",
    monthKey: "jun",
    amount: 500,
    paidOn: "2026-06-10",
    recordedAt: "2026-06-10T08:00:00.000Z",
    method: "Numerario",
    reference: "PARCIAL-JUN",
    description: "",
  });
  const paidRecord = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings,
    category: "tuition",
    monthKey: "jun",
    amount: settings.monthlyFee,
    paidOn: "2026-06-10",
    recordedAt: "2026-06-10T08:00:00.000Z",
    method: "Numerario",
    reference: "PAGO-JUN",
    description: "",
  });
  const fineRecord = ensurePenaltyChargesForRecord(
    buildPaymentRecord(student.id),
    student,
    months,
    settings,
    [],
    "2026-06-21",
  );
  const fineDueRecord = recordStudentPayment({
    record: fineRecord,
    student,
    months,
    settings,
    category: "tuition",
    monthKey: "jun",
    amount: settings.monthlyFee,
    paidOn: "2026-06-21",
    recordedAt: "2026-06-21T08:00:00.000Z",
    method: "Numerario",
    reference: "BASE-JUN",
    description: "",
  });
  const paidWithFineRecord = recordStudentPayment({
    record: fineRecord,
    student,
    months,
    settings,
    category: "tuition",
    monthKey: "jun",
    amount: settings.monthlyFee + settings.firstPenaltyAmount + settings.secondPenaltyAmount,
    paidOn: "2026-06-21",
    recordedAt: "2026-06-21T08:00:00.000Z",
    method: "Numerario",
    reference: "MULTA-JUN",
    description: "",
  });
  const scholarshipStudent: Student = {
    ...student,
    financialProfile: {
      status: "scholarship",
      discountPercent: 100,
      startMonth: settings.startMonth,
      endMonth: settings.endMonth,
      authorizedBy: "Director",
      registeredBy: "Secretaria",
      registeredAt: "2026-06-01T08:00:00.000Z",
    },
  };
  const scholarshipLedger = buildLedger(
    scholarshipStudent,
    buildPaymentRecord(scholarshipStudent.id),
    months,
    settings,
    "2026-06-21",
  );
  const captureMonth = (
    ledger: ReturnType<typeof buildLedger>,
    monthKey: string,
  ) => {
    const month = ledger.monthly.find((item) => item.month.key === monthKey);

    assert.ok(month);
    capture(getMonthCellState(month, settings));
  };

  captureMonth(pendingLedger, "mar");
  captureMonth(pendingLedger, "jun");
  captureMonth(pendingLedger, "jul");
  captureMonth(overdueLedger, "jun");
  captureMonth(firstFineLedger, "jun");
  captureMonth(secondFineLedger, "jun");
  captureMonth(
    buildLedger(student, partialRecord, months, settings, "2026-06-10"),
    "jun",
  );
  captureMonth(
    buildLedger(student, paidRecord, months, settings, "2026-06-10"),
    "jun",
  );
  captureMonth(
    buildLedger(student, fineDueRecord, months, settings, "2026-06-21"),
    "jun",
  );
  captureMonth(
    buildLedger(student, paidWithFineRecord, months, settings, "2026-06-21"),
    "jun",
  );
  capture(getRegistrationCellState(scholarshipLedger, settings));

  const expectedLabels: Partial<Record<OfficialPaymentState, string>> = {
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

  (Object.entries(expectedLabels) as Array<[OfficialPaymentState, string]>).forEach(
    ([state, label]) => {
      assert.equal(examples.get(state)?.label, label);
      assert.ok(examples.get(state)?.symbol);
    },
  );
});

test("Fase 5: matricula bolseira nao exige pagamento de inscricao", () => {
  const scholarshipStudent: Student = {
    ...student,
    id: "ALU-BOLSA",
    registrationNumber: "GA-2026-099",
    financialProfile: {
      status: "scholarship",
      discountPercent: 100,
      startMonth: settings.startMonth,
      endMonth: settings.endMonth,
      reason: "Bolsa social",
      authorizedBy: "Director",
      registeredBy: "Secretaria",
      registeredAt: "2026-06-01T08:00:00.000Z",
    },
  };
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const record = normalizePaymentRecord(
    buildPaymentRecord(scholarshipStudent.id),
    scholarshipStudent,
    months,
    settings,
    [],
    scholarshipStudent.enrollmentDate,
  );
  const ledger = buildLedger(
    scholarshipStudent,
    record,
    months,
    settings,
    scholarshipStudent.enrollmentDate,
  );
  const registrationState = getRegistrationCellState(ledger, settings);

  assert.equal(calculateRegistrationDue(scholarshipStudent, settings).due, 0);
  assert.equal(ledger.registrationBalance, 0);
  assert.equal(registrationState.state, "scholarship");
});

test("Fase 5: previa e recibo usam data efectiva, multa e alocacoes reais", () => {
  const percentSettings: PaymentSettings = {
    ...settings,
    firstPenaltyPercent: 5,
    secondPenaltyPercent: 10,
  };
  const months = getMonthsInRange(percentSettings.startMonth, percentSettings.endMonth);
  const registrationPaid = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings: percentSettings,
    category: "registration",
    monthKey: "jun",
    amount: 3500,
    paidOn: "2026-06-03",
    recordedAt: "2026-06-03T08:00:00.000Z",
    method: "Transferencia",
    reference: "REG-LEGADO",
    description: "",
  });
  const overdueRecord = ensurePenaltyChargesForRecord(
    registrationPaid,
    student,
    months,
    percentSettings,
    [],
    "2026-06-21",
  );
  const preview = previewStudentPayment({
    record: overdueRecord,
    student,
    months,
    settings: percentSettings,
    category: "tuition",
    monthKey: "jun",
    amount: 1725,
    paidOn: "2026-06-21",
    effectivePaymentDate: "2026-06-21",
    recordedAt: "2026-06-25T11:30:00.000Z",
    recordedBy: "Secretaria",
    method: "Transferencia",
    description: "Mensalidade de Junho",
    allowFutureAllocation: true,
  });
  const applied = applyStudentPaymentPreview(preview);
  const receipt = buildPaymentReceipt(student, preview);
  const storedReceipt = buildPaymentReceiptFromRecord(
    student,
    applied,
    preview.payment.id,
  );

  assert.equal(preview.payment.effectivePaymentDate, "2026-06-21");
  assert.equal(preview.payment.recordedAt, "2026-06-25T11:30:00.000Z");
  assert.equal(preview.payment.reference, undefined);
  assert.equal(preview.penaltyTotal, 150);
  assert.equal(preview.unallocatedAmount, 0);
  assert.deepEqual(
    preview.items.map((item) => [item.kind, item.amount]),
    [
      ["base", 1500],
      ["penalty", 75],
      ["penalty", 75],
      ["base", 75],
    ],
  );
  assert.equal(receipt.id, `REC-${preview.payment.id}`);
  assert.equal(receipt.effectivePaymentDate, "2026-06-21");
  assert.equal(receipt.recordedAt, "2026-06-25T11:30:00.000Z");
  assert.equal(receipt.penaltyTotal, 150);
  assert.equal(storedReceipt?.penaltyTotal, 150);
});

test("Fase 5: correcao cria ajuste compensatorio auditavel sem apagar pagamento", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const paid = recordStudentPayment({
    record: buildPaymentRecord(student.id),
    student,
    months,
    settings,
    category: "registration",
    monthKey: "jun",
    amount: settings.inscriptionRenewalFee,
    paidOn: "2026-06-03",
    recordedAt: "2026-06-03T08:00:00.000Z",
    method: "Transferencia",
    description: "Inscricao",
  });
  const payment = paid.payments.at(-1);

  assert.ok(payment);

  const beforeLedger = buildLedger(student, paid, months, settings, "2026-06-12");
  const beforeDebt = getStudentDebt(beforeLedger, beforeLedger.normalizedRecord);
  const corrected = correctStudentPayment({
    record: paid,
    student,
    paymentId: payment.id,
    amount: settings.inscriptionRenewalFee,
    reason: "Pagamento associado ao aluno errado",
    recordedAt: "2026-06-12T10:00:00.000Z",
    recordedBy: "Secretaria",
  });

  assert.ok(corrected.correction);
  assert.ok(corrected.charge);
  assert.equal(corrected.record.payments.length, paid.payments.length);
  assert.equal(corrected.correction.paymentId, payment.id);
  assert.equal(corrected.correction.linkedChargeId, corrected.charge.id);
  assert.equal(corrected.charge.category, "miscellaneous");
  assert.equal(getChargeBalance(corrected.record, corrected.charge), settings.inscriptionRenewalFee);

  const afterLedger = buildLedger(
    student,
    corrected.record,
    months,
    settings,
    "2026-06-12",
  );
  const afterDebt = getStudentDebt(afterLedger, afterLedger.normalizedRecord);

  assert.equal(afterDebt, beforeDebt + settings.inscriptionRenewalFee);

  const migration = migrateLegacyStoredState(
    {
      students: [student],
      paymentSettings: settings,
      paymentRecords: [corrected.record],
    },
    { migratedAt: "2026-06-12T10:30:00.000Z", recordedBy: "Sistema" },
  );

  assert.equal(validateFinanceBook(migration.financeBook).length, 0);
  assert.ok(
    migration.financeBook.auditEvents.some(
      (event) => event.type === "correction" && event.entityId === payment.id,
    ),
  );
});

test("Fase 5: editar regra cria nova versao sem reescrever snapshot historico", () => {
  const months = getMonthsInRange(settings.startMonth, settings.endMonth);
  const baseRule = buildDefaultPaymentRuleVersion(settings, "2026", "secundario", 1);
  const historicalStudent: Student = {
    ...student,
    academicYearId: "2026",
    educationLevelId: "secundario",
  };
  const historicalRecord = normalizePaymentRecord(
    buildPaymentRecord(historicalStudent.id),
    historicalStudent,
    months,
    settings,
    [baseRule],
    "2026-06-10",
  );
  const draft = {
    ...buildPaymentRuleDraft(baseRule),
    validFrom: "2026-07-01",
    inscriptionFee: "4200",
    monthlyFee: "2100",
    monthlyDueDay: "8",
    firstPenaltyDay: "12",
    firstPenaltyPercent: "6",
    secondPenaltyDay: "22",
    secondPenaltyPercent: "12",
    coveredMonthKeys: ["jun", "jul", "aug"],
  };
  const versions = createNextPaymentRuleVersion([baseRule], draft, "2026-07-01");
  const inactiveRule = versions.find((rule) => rule.id === baseRule.id);
  const activeRule = versions.find(
    (rule) => rule.status === "active" && rule.version === 2,
  );

  assert.ok(inactiveRule);
  assert.ok(activeRule);
  assert.equal(inactiveRule.status, "inactive");
  assert.equal(inactiveRule.validUntil, "2026-06-30");
  assert.equal(activeRule.monthlyFee, 2100);
  assert.equal(activeRule.inscriptionFee, 4200);
  assert.equal(activeRule.firstPenalty.percent, 6);
  assert.equal(activeRule.secondPenalty.percent, 12);

  const preservedRecord = normalizePaymentRecord(
    historicalRecord,
    historicalStudent,
    months,
    settings,
    versions,
    "2026-07-02",
  );
  const preservedJune = preservedRecord.charges.find(
    (charge) => charge.id === tuitionChargeId(historicalStudent.id, "jun"),
  );
  const newStudent: Student = {
    ...historicalStudent,
    id: "ALU-NOVA-REGRA",
    registrationNumber: "GA-2026-120",
  };
  const newRecord = normalizePaymentRecord(
    buildPaymentRecord(newStudent.id),
    newStudent,
    months,
    settings,
    versions,
    "2026-07-02",
  );
  const newJune = newRecord.charges.find(
    (charge) => charge.id === tuitionChargeId(newStudent.id, "jun"),
  );

  assert.equal(preservedJune?.ruleVersionId, baseRule.id);
  assert.equal(preservedJune?.dueAmount, settings.monthlyFee);
  assert.equal(newJune?.ruleVersionId, activeRule.id);
  assert.equal(newJune?.dueAmount, 2100);
});