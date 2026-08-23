import assert from "node:assert/strict";
import test from "node:test";
import {
  addMiscellaneousCharge,
  buildLedger,
  buildPaymentRecord,
  buildStudentFinanceProfile,
  getChargeBalance,
  getDebtBreakdown,
  getMiscellaneousCellState,
  getMonthCellState,
  getMonthsInRange,
  getRegistrationCellState,
  getTuitionInstallmentNumber,
  recordStudentPayment,
} from "../app/components/school-admin-demo.model.ts";
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
  assert.equal(june ? getMonthCellState(june, settings).label : "", "Pendente");
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
  assert.equal(june ? getMonthCellState(june, settings).label : "", "Ponderado");
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
    "Pendente",
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
  assert.equal(getMiscellaneousCellState(recordWithCharge).label, "Diversos (1)");
  assert.equal(getMiscellaneousCellState(recordWithCharge).detail, "Pendente");
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
  assert.equal(getMiscellaneousCellState(partiallyPaid).detail, "Parcial");
  assert.ok(
    debtBreakdown.some(
      (item) => item.label === charge.description && item.amount === 300,
    ),
  );
});
