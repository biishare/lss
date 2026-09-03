import assert from "node:assert/strict";
import test from "node:test";
import {
  createPaymentPolicyVersions,
  getPaymentRuleForStudent,
  type PaymentRuleDraft,
} from "../app/components/school-admin-demo.model.ts";
import {
  initialPaymentSettings,
  type Student,
} from "../app/lib/school-demo-data.ts";

function policyDraft(
  name: string,
  academicYearId: string,
  educationLevelIds: string[],
  inscriptionFee: string,
  monthlyFee: string,
): PaymentRuleDraft {
  return {
    ruleId: "",
    policyId: "",
    policyName: name,
    academicYearId,
    educationLevelId: educationLevelIds[0] ?? "",
    educationLevelIds,
    status: "active",
    validFrom: `${academicYearId}-01-01`,
    inscriptionFee,
    monthlyFee,
    monthlyDueDay: "10",
    firstPenaltyDay: "15",
    firstPenaltyPercent: "5",
    secondPenaltyDay: "25",
    secondPenaltyPercent: "10",
    coveredMonthKeys: ["feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"],
  };
}

function studentInClass(classId: string, academicYearId: string): Student {
  return {
    id: `student-${classId}-${academicYearId}`,
    enrollmentId: `enrollment-${classId}-${academicYearId}`,
    academicYearId,
    educationLevelId: classId,
    stableNumber: "01",
    registrationNumber: `LSS-${academicYearId}-001`,
    fullName: "Aluno de Teste",
    guardianName: "Encarregado de Teste",
    guardianPhone: "+258 84 000 0000",
    enrollmentType: "new",
    enrollmentDate: `${academicYearId}-01-15`,
    tuitionStartMonth: "feb",
    registrationStatus: "pending",
    financialProfile: { status: "regular", discountPercent: 0 },
    classId,
    groupId: `${classId}A${academicYearId}`,
    createdAt: `${academicYearId}-01-15T08:00:00.000Z`,
  };
}

test("uma política aplica os mesmos valores a todas as classes seleccionadas", () => {
  const draft = policyDraft("Ensino Secundário I", "2027", ["8", "9", "10"], "500", "800");
  const rules = createPaymentPolicyVersions([], draft, "2026-09-03");
  const activeRules = rules.filter((rule) => rule.status === "active");

  assert.equal(activeRules.length, 3);
  assert.deepEqual(
    activeRules.map((rule) => rule.educationLevelId).sort(),
    ["10", "8", "9"],
  );
  assert.equal(new Set(activeRules.map((rule) => rule.policyId)).size, 1);

  const applied = getPaymentRuleForStudent(
    studentInClass("9", "2027"),
    { ...initialPaymentSettings, academicYear: "2027" },
    rules,
  );
  assert.equal(applied.inscriptionFee, 500);
  assert.equal(applied.monthlyFee, 800);
});

test("activar uma nova política encerra a anterior para a mesma classe e ano", () => {
  const first = createPaymentPolicyVersions(
    [],
    policyDraft("Política A", "2027", ["8"], "500", "700"),
    "2026-09-03",
  );
  const second = createPaymentPolicyVersions(
    first,
    policyDraft("Política B", "2027", ["8"], "500", "800"),
    "2026-10-01",
  );
  const classRules = second.filter(
    (rule) => rule.academicYearId === "2027" && rule.educationLevelId === "8",
  );

  assert.equal(classRules.filter((rule) => rule.status === "active").length, 1);
  assert.equal(classRules.find((rule) => rule.status === "active")?.policyName, "Política B");
  assert.equal(classRules.find((rule) => rule.policyName === "Política A")?.status, "inactive");
});

test("políticas de anos diferentes conservam valores históricos independentes", () => {
  const rules2026 = createPaymentPolicyVersions(
    [],
    policyDraft("Secundário 2026", "2026", ["8"], "500", "700"),
    "2026-01-01",
  );
  const rules = createPaymentPolicyVersions(
    rules2026,
    policyDraft("Secundário 2027", "2027", ["8"], "500", "800"),
    "2026-09-03",
  );

  const applied2026 = getPaymentRuleForStudent(
    studentInClass("8", "2026"),
    { ...initialPaymentSettings, academicYear: "2026" },
    rules,
  );
  const applied2027 = getPaymentRuleForStudent(
    studentInClass("8", "2027"),
    { ...initialPaymentSettings, academicYear: "2027" },
    rules,
  );

  assert.equal(applied2026.monthlyFee, 700);
  assert.equal(applied2027.monthlyFee, 800);
});
