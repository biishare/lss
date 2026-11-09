import type { FinanceBook } from "./entities";

export type FinanceInvariantCode =
  | "allocation-payment-missing"
  | "allocation-charge-missing"
  | "allocation-payment-overflow"
  | "charge-negative-amount"
  | "charge-negative-balance"
  | "charge-academic-year-mismatch"
  | "duplicate-penalty-stage"
  | "payment-negative-amount";

export type FinanceInvariantViolation = {
  code: FinanceInvariantCode;
  entityId: string;
  message: string;
};

export type FinanceBookTotals = {
  chargeTotal: number;
  penaltyTotal: number;
  paymentTotal: number;
  allocationTotal: number;
  balanceTotal: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizeFinanceBook(book: FinanceBook): FinanceBookTotals {
  const chargeTotal = book.charges.reduce(
    (total, charge) => total + charge.dueAmount,
    0,
  );
  const penaltyTotal = book.penaltyCharges.reduce(
    (total, charge) => total + charge.amount,
    0,
  );
  const paymentTotal = book.payments.filter((payment) => !payment.reversedBy && payment.kind !== "credit-application").reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const allocationTotal = book.allocations.reduce(
    (total, allocation) => total + allocation.amount,
    0,
  );

  return {
    chargeTotal: roundMoney(chargeTotal),
    penaltyTotal: roundMoney(penaltyTotal),
    paymentTotal: roundMoney(paymentTotal),
    allocationTotal: roundMoney(allocationTotal),
    balanceTotal: roundMoney(chargeTotal + penaltyTotal - allocationTotal),
  };
}

export function validateFinanceBook(book: FinanceBook): FinanceInvariantViolation[] {
  const violations: FinanceInvariantViolation[] = [];
  const paymentById = new Map(book.payments.map((payment) => [payment.id, payment]));
  const baseChargeById = new Map(book.charges.map((charge) => [charge.id, charge]));
  const penaltyChargeById = new Map(
    book.penaltyCharges.map((charge) => [charge.id, charge]),
  );
  const enrollmentById = new Map(
    book.enrollments.map((enrollment) => [enrollment.id, enrollment]),
  );
  const allocatedByPayment = new Map<string, number>();
  const allocatedByCharge = new Map<string, number>();
  const penaltyStages = new Set<string>();

  book.payments.forEach((payment) => {
    if (payment.amount < 0) {
      violations.push({
        code: "payment-negative-amount",
        entityId: payment.id,
        message: "Payment amount cannot be negative.",
      });
    }
  });

  book.charges.forEach((charge) => {
    if (
      charge.baseAmount < 0 ||
      charge.discountAmount < 0 ||
      charge.dueAmount < 0
    ) {
      violations.push({
        code: "charge-negative-amount",
        entityId: charge.id,
        message: "Charge amounts cannot be negative.",
      });
    }

    const enrollment = enrollmentById.get(charge.enrollmentId);

    if (enrollment && enrollment.academicYearId !== charge.academicYearId) {
      violations.push({
        code: "charge-academic-year-mismatch",
        entityId: charge.id,
        message: "Charge academic year must match its enrollment.",
      });
    }
  });

  book.penaltyCharges.forEach((charge) => {
    if (charge.amount < 0) {
      violations.push({
        code: "charge-negative-amount",
        entityId: charge.id,
        message: "Penalty amount cannot be negative.",
      });
    }

    const stageKey = `${charge.baseChargeId}:${charge.stage}`;

    if (penaltyStages.has(stageKey)) {
      violations.push({
        code: "duplicate-penalty-stage",
        entityId: charge.id,
        message: "Penalty stage cannot be applied twice for the same charge.",
      });
    }

    penaltyStages.add(stageKey);
  });

  book.allocations.forEach((allocation) => {
    const payment = paymentById.get(allocation.paymentId);
    const charge =
      baseChargeById.get(allocation.chargeId) ??
      penaltyChargeById.get(allocation.chargeId);

    if (!payment) {
      violations.push({
        code: "allocation-payment-missing",
        entityId: allocation.id,
        message: "Allocation must reference an existing payment.",
      });
    }

    if (!charge) {
      violations.push({
        code: "allocation-charge-missing",
        entityId: allocation.id,
        message: "Allocation must reference an existing charge.",
      });
      return;
    }

    allocatedByPayment.set(
      allocation.paymentId,
      (allocatedByPayment.get(allocation.paymentId) ?? 0) + allocation.amount,
    );
    allocatedByCharge.set(
      allocation.chargeId,
      (allocatedByCharge.get(allocation.chargeId) ?? 0) + allocation.amount,
    );
  });

  allocatedByPayment.forEach((allocated, paymentId) => {
    const payment = paymentById.get(paymentId);

    if (payment && roundMoney(allocated) > roundMoney(payment.amount)) {
      violations.push({
        code: "allocation-payment-overflow",
        entityId: paymentId,
        message: "Allocated amount cannot exceed payment amount.",
      });
    }
  });

  book.charges.forEach((charge) => {
    const allocated = allocatedByCharge.get(charge.id) ?? 0;

    if (roundMoney(allocated) > roundMoney(charge.dueAmount)) {
      violations.push({
        code: "charge-negative-balance",
        entityId: charge.id,
        message: "Charge balance cannot become negative.",
      });
    }
  });

  book.penaltyCharges.forEach((charge) => {
    const allocated = allocatedByCharge.get(charge.id) ?? 0;

    if (roundMoney(allocated) > roundMoney(charge.amount)) {
      violations.push({
        code: "charge-negative-balance",
        entityId: charge.id,
        message: "Penalty balance cannot become negative.",
      });
    }
  });

  return violations;
}
