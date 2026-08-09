"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  initialClasses,
  initialGroups,
  initialPaymentRecords,
  initialPaymentSettings,
  initialStudents,
  monthOptions,
  type ClassGroup,
  type EntityStatus,
  type MonthOption,
  type PaymentEntry,
  type PaymentSettings,
  type SchoolClass,
  type Student,
  type StudentPaymentRecord,
} from "../lib/school-demo-data";

type View = "dashboard" | "classes" | "groups" | "students" | "payments";
type PaymentSection = "data" | "entry" | "reports";
type PaymentCategory = "inscription" | "renewal" | "tuition";

type ClassDraft = {
  id: string;
  name: string;
  status: EntityStatus;
};

type GroupDraft = {
  name: string;
  classId: string;
  status: EntityStatus;
};

type StudentDraft = {
  fullName: string;
  classId: string;
  groupId: string;
};

type PaymentLaunchDraft = {
  studentId: string;
  category: PaymentCategory;
  monthKey: string;
  amount: string;
  method: string;
  reference: string;
};

type MonthLedger = {
  month: MonthOption;
  entry: PaymentEntry;
  carryIn: number;
  balance: number;
  carryOut: number;
  fine: number;
};

const navigation: Array<{ id: View; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "classes", label: "Classes" },
  { id: "groups", label: "Turmas" },
  { id: "students", label: "Alunos" },
  { id: "payments", label: "Pagamentos" },
];

const paymentSections: Array<{ id: PaymentSection; label: string }> = [
  { id: "data", label: "Dados de pagamentos" },
  { id: "entry", label: "Lançar pagamento" },
  { id: "reports", label: "Relatórios" },
];

const paymentCategories: Array<{ id: PaymentCategory; label: string }> = [
  { id: "inscription", label: "Inscrição/Matrícula" },
  { id: "renewal", label: "Renovação" },
  { id: "tuition", label: "Propina mensal" },
];

const statusOptions: Array<{ value: EntityStatus; label: string }> = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const buttonBase =
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const moneyFormatter = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 0,
});

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
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

function formatStudentNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function defaultClassName(classId: string) {
  return /^\d+$/.test(classId) ? `${classId}ª Classe` : classId;
}

function getGroupCode(groupName: string) {
  const cleanedName = groupName.trim().replace(/^turma\s+/i, "").trim();
  const match = cleanedName.match(/[a-z0-9]/i);

  return (match?.[0] ?? "A").toUpperCase();
}

function buildGroupId(classId: string, groupName: string) {
  if (!classId) {
    return "Aguardando classe";
  }

  return `${classId}${getGroupCode(groupName)}${new Date().getFullYear()}`;
}

function statusLabel(status: EntityStatus) {
  return status === "active" ? "Activo" : "Inactivo";
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
  };
}

function calculateFine(entry: PaymentEntry, settings: PaymentSettings) {
  if (entry.amount <= 0 || entry.paidDay <= 0) {
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

function buildLedger(
  record: StudentPaymentRecord,
  months: MonthOption[],
  settings: PaymentSettings,
) {
  const registrationBalance = Math.max(
    0,
    settings.inscriptionRenewalFee - record.inscriptionRenewal.amount,
  );
  let carry = Math.max(
    0,
    record.inscriptionRenewal.amount - settings.inscriptionRenewalFee,
  );
  let totalPaid = record.inscriptionRenewal.amount;
  let totalBalance = registrationBalance;
  let totalFine = calculateFine(record.inscriptionRenewal, settings);

  const monthly = months.map((month) => {
    const entry = record.monthlyPayments[month.key] ?? emptyEntry();
    const available = entry.amount + carry;
    const balance = Math.max(0, settings.monthlyFee - available);
    const carryOut = Math.max(0, available - settings.monthlyFee);
    const fine = calculateFine(entry, settings);
    const item: MonthLedger = {
      month,
      entry,
      carryIn: carry,
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
      paid: totalPaid,
      balance: totalBalance,
      fine: totalFine,
      carry,
    },
  };
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
      onClick={onClick}
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
      onClick={onClick}
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
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-[#185c54] transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
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

function inputClasses() {
  return "min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#2f7d73]";
}

export function SchoolAdminDemo() {
  const firstClassId = initialClasses[0]?.id ?? "";
  const firstGroupId = initialGroups[0]?.id ?? "";
  const firstStudentId = initialStudents[0]?.id ?? "";
  const [classes, setClasses] = useState<SchoolClass[]>(initialClasses);
  const [groups, setGroups] = useState<ClassGroup[]>(initialGroups);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [paymentSettings] = useState<PaymentSettings>(initialPaymentSettings);
  const [paymentRecords, setPaymentRecords] =
    useState<StudentPaymentRecord[]>(initialPaymentRecords);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activePaymentSection, setActivePaymentSection] =
    useState<PaymentSection>("data");
  const [selectedClassId, setSelectedClassId] = useState(firstClassId);
  const [selectedGroupId, setSelectedGroupId] = useState(firstGroupId);
  const [studentSearch, setStudentSearch] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [classError, setClassError] = useState("");
  const [classDraft, setClassDraft] = useState<ClassDraft>({
    id: "",
    name: "",
    status: "active",
  });
  const [groupDraft, setGroupDraft] = useState<GroupDraft>({
    name: "",
    classId: firstClassId,
    status: "active",
  });
  const [studentDraft, setStudentDraft] = useState<StudentDraft>({
    fullName: "",
    classId: firstClassId,
    groupId: firstGroupId,
  });
  const [paymentDraft, setPaymentDraft] = useState<PaymentLaunchDraft>({
    studentId: firstStudentId,
    category: "tuition",
    monthKey: initialPaymentSettings.startMonth,
    amount: String(initialPaymentSettings.monthlyFee),
    method: "Numerário",
    reference: "",
  });

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
        className:
          classes.find((schoolClass) => schoolClass.id === group.classId)
            ?.name ?? "Sem classe",
        studentsTotal: students.filter((student) => student.groupId === group.id)
          .length,
      })),
    [classes, groupsForCurrentClass, students],
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

  const paymentRows = useMemo(
    () =>
      visibleStudents.map((student) => {
        const record =
          paymentRecords.find((item) => item.studentId === student.id) ??
          buildPaymentRecord(student.id);

        return {
          student,
          record,
          ledger: buildLedger(record, paymentMonths, paymentSettings),
        };
      }),
    [paymentMonths, paymentRecords, paymentSettings, visibleStudents],
  );

  const paymentSummary = useMemo(
    () =>
      paymentRows.reduce(
        (summary, row) => ({
          paid: summary.paid + row.ledger.totals.paid,
          balance: summary.balance + row.ledger.totals.balance,
          fine: summary.fine + row.ledger.totals.fine,
          carry: summary.carry + row.ledger.totals.carry,
        }),
        { paid: 0, balance: 0, fine: 0, carry: 0 },
      ),
    [paymentRows],
  );

  const activeClassesTotal = classes.filter(
    (schoolClass) => schoolClass.status === "active",
  ).length;
  const activeGroupsTotal = groups.filter((group) => group.status === "active")
    .length;

  function selectClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setSelectedClassId(classId);
    setSelectedGroupId(nextGroup?.id ?? "");
    setGroupDraft((draft) => ({ ...draft, classId }));
    setStudentDraft((draft) => ({
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
    setStudentDraft((draft) => ({
      ...draft,
      classId: group.classId,
      groupId: group.id,
    }));
  }

  function resetClassForm() {
    setEditingClassId(null);
    setClassError("");
    setClassDraft({ id: "", name: "", status: "active" });
  }

  function resetGroupForm(classId = currentClassId) {
    setEditingGroupId(null);
    setGroupDraft({ name: "", classId, status: "active" });
  }

  function resetStudentForm(classId = currentClassId, groupId = currentGroupId) {
    setEditingStudentId(null);
    setStudentDraft({
      fullName: "",
      classId,
      groupId,
    });
  }

  function startNewClass() {
    setActiveView("classes");
    resetClassForm();
  }

  function startNewGroup() {
    setActiveView("groups");
    resetGroupForm(currentClassId);
  }

  function startNewStudent() {
    setActiveView("students");
    resetStudentForm(currentClassId, currentGroupId);
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

    const classId = classDraft.id.trim();
    const trimmedName = classDraft.name.trim() || defaultClassName(classId);

    if (!classId) {
      setClassError("Informe o ano/nível que será usado como ID.");
      return;
    }

    const duplicateClass = classes.some(
      (schoolClass) =>
        schoolClass.id === classId && schoolClass.id !== editingClassId,
    );

    if (duplicateClass) {
      setClassError("Já existe uma classe para este ano/nível.");
      return;
    }

    if (editingClassId) {
      const groupIdMap = new Map(
        groups
          .filter((group) => group.classId === editingClassId)
          .map((group) => [group.id, buildGroupId(classId, group.name)]),
      );

      setClasses((items) =>
        items.map((schoolClass) =>
          schoolClass.id === editingClassId
            ? {
                ...schoolClass,
                id: classId,
                name: trimmedName,
                status: classDraft.status,
              }
            : schoolClass,
        ),
      );
      setGroups((items) =>
        items.map((group) =>
          group.classId === editingClassId
            ? {
                ...group,
                id: groupIdMap.get(group.id) ?? group.id,
                classId,
              }
            : group,
        ),
      );
      setStudents((items) =>
        items.map((student) =>
          student.classId === editingClassId
            ? {
                ...student,
                classId,
                groupId: groupIdMap.get(student.groupId) ?? student.groupId,
              }
            : student,
        ),
      );
      setSelectedClassId(classId);
      setSelectedGroupId((groupId) => groupIdMap.get(groupId) ?? groupId);
      resetClassForm();
      return;
    }

    const newClass: SchoolClass = {
      id: classId,
      name: trimmedName,
      status: classDraft.status,
      createdAt: today(),
    };

    setClasses((items) => [...items, newClass]);
    setSelectedClassId(newClass.id);
    setSelectedGroupId("");
    setGroupDraft({ name: "", classId: newClass.id, status: "active" });
    setStudentDraft({
      fullName: "",
      classId: newClass.id,
      groupId: "",
    });
    resetClassForm();
  }

  function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = groupDraft.name.trim();

    if (!trimmedName || !groupDraft.classId) {
      return;
    }

    const automaticGroupId = buildGroupId(groupDraft.classId, trimmedName);

    if (editingGroupId) {
      setGroups((items) =>
        items.map((group) =>
          group.id === editingGroupId
            ? {
                ...group,
                id: automaticGroupId,
                name: trimmedName,
                classId: groupDraft.classId,
                status: groupDraft.status,
              }
            : group,
        ),
      );
      setStudents((items) =>
        items.map((student) =>
          student.groupId === editingGroupId
            ? {
                ...student,
                classId: groupDraft.classId,
                groupId: automaticGroupId,
              }
            : student,
        ),
      );
      setSelectedClassId(groupDraft.classId);
      setSelectedGroupId(automaticGroupId);
      setStudentDraft((draft) => ({
        ...draft,
        classId: groupDraft.classId,
        groupId: automaticGroupId,
      }));
      resetGroupForm(groupDraft.classId);
      return;
    }

    const newGroup: ClassGroup = {
      id: automaticGroupId,
      name: trimmedName,
      classId: groupDraft.classId,
      status: groupDraft.status,
      createdAt: today(),
    };

    setGroups((items) => [...items, newGroup]);
    setSelectedClassId(newGroup.classId);
    setSelectedGroupId(newGroup.id);
    setStudentDraft((draft) => ({
      ...draft,
      classId: newGroup.classId,
      groupId: newGroup.id,
    }));
    resetGroupForm(newGroup.classId);
  }

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = studentDraft.fullName.trim();
    const selectedGroup = groups.find((group) => group.id === studentDraft.groupId);

    if (!trimmedName || !selectedGroup) {
      return;
    }

    if (editingStudentId) {
      setStudents((items) =>
        items.map((student) =>
          student.id === editingStudentId
            ? {
                ...student,
                fullName: trimmedName,
                classId: selectedGroup.classId,
                groupId: selectedGroup.id,
              }
            : student,
        ),
      );
      selectGroup(selectedGroup.id);
      resetStudentForm(selectedGroup.classId, selectedGroup.id);
      return;
    }

    const newStudent: Student = {
      id: nextId(students, "ALU"),
      fullName: trimmedName,
      classId: selectedGroup.classId,
      groupId: selectedGroup.id,
      createdAt: today(),
    };

    setStudents((items) => [...items, newStudent]);
    setPaymentRecords((items) => [...items, buildPaymentRecord(newStudent.id)]);
    setPaymentDraft((draft) => ({ ...draft, studentId: newStudent.id }));
    setSelectedClassId(newStudent.classId);
    setSelectedGroupId(newStudent.groupId);
    resetStudentForm(newStudent.classId, newStudent.groupId);
  }

  function editClass(schoolClass: SchoolClass) {
    setActiveView("classes");
    setSelectedClassId(schoolClass.id);
    setEditingClassId(schoolClass.id);
    setClassError("");
    setClassDraft({
      id: schoolClass.id,
      name: schoolClass.name,
      status: schoolClass.status,
    });
  }

  function editGroup(group: ClassGroup) {
    setActiveView("groups");
    setSelectedClassId(group.classId);
    setSelectedGroupId(group.id);
    setEditingGroupId(group.id);
    setGroupDraft({
      name: group.name,
      classId: group.classId,
      status: group.status,
    });
  }

  function editStudent(student: Student) {
    setActiveView("students");
    setSelectedClassId(student.classId);
    setSelectedGroupId(student.groupId);
    setEditingStudentId(student.id);
    setStudentDraft({
      fullName: student.fullName,
      classId: student.classId,
      groupId: student.groupId,
    });
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

  function changeStudentDraftClass(classId: string) {
    const nextGroup = groups.find((group) => group.classId === classId);

    setStudentDraft((draft) => ({
      ...draft,
      classId,
      groupId: nextGroup?.id ?? "",
    }));
  }

  function launchPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseMoney(paymentDraft.amount);
    const paymentDate = new Date();
    const paidDay = paymentDate.getDate();
    const paidAt = paymentDate.toISOString();

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
      };

      if (
        paymentDraft.category === "inscription" ||
        paymentDraft.category === "renewal"
      ) {
        nextRecord.inscriptionRenewal = {
          ...nextRecord.inscriptionRenewal,
          amount: nextRecord.inscriptionRenewal.amount + amount,
          paidDay,
          paidAt,
          method: paymentDraft.method,
          reference: paymentDraft.reference.trim(),
        };
      } else {
        const currentEntry =
          nextRecord.monthlyPayments[paymentDraft.monthKey] ?? emptyEntry();
        nextRecord.monthlyPayments[paymentDraft.monthKey] = {
          ...currentEntry,
          amount: currentEntry.amount + amount,
          paidDay,
          paidAt,
          method: paymentDraft.method,
          reference: paymentDraft.reference.trim(),
        };
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
          : String(paymentSettings.inscriptionRenewalFee),
      reference: "",
    }));
    setActivePaymentSection("data");
  }

  function renderDashboard() {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total de classes"
            value={classes.length}
            supporting={`${activeClassesTotal} activas`}
            accent="border-l-[#2f7d73]"
          />
          <MetricCard
            label="Total de turmas"
            value={groups.length}
            supporting={`${activeGroupsTotal} activas`}
            accent="border-l-[#3572a5]"
          />
          <MetricCard
            label="Total de alunos"
            value={students.length}
            supporting={`${visibleStudents.length} na turma actual`}
            accent="border-l-[#d08a19]"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Mapa escolar
                </h2>
                <p className="text-sm text-slate-500">
                  O ID da classe é o ano/nível escolar.
                </p>
              </div>
              <PrimaryButton onClick={startNewClass}>Nova classe</PrimaryButton>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Ano/ID</th>
                    <th className="px-5 py-3 font-semibold">Classe</th>
                    <th className="px-5 py-3 font-semibold">Turmas</th>
                    <th className="px-5 py-3 font-semibold">Alunos</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classesWithStats.map((schoolClass) => (
                    <tr key={schoolClass.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-950">
                        {schoolClass.id}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {schoolClass.name}
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
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Resumo de pagamentos
              </h2>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Sem classe"} ·{" "}
                {currentGroup?.name ?? "Sem turma"}
              </p>
            </div>
            <div className="grid gap-3 p-5">
              <SummaryLine label="Recebido" value={formatCurrency(paymentSummary.paid)} />
              <SummaryLine label="Em falta" value={formatCurrency(paymentSummary.balance)} />
              <SummaryLine label="Multas" value={formatCurrency(paymentSummary.fine)} />
              <SummaryLine label="Remanescente" value={formatCurrency(paymentSummary.carry)} />
              <PrimaryButton
                onClick={() => {
                  setActiveView("payments");
                  setActivePaymentSection("data");
                }}
              >
                Abrir pagamentos
              </PrimaryButton>
            </div>
          </section>
        </div>

      </div>
    );
  }

  function renderClasses() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Classes
              </h2>
              <p className="text-sm text-slate-500">
                Uma classe por ano/nível escolar.
              </p>
            </div>
            <PrimaryButton onClick={startNewClass}>Nova classe</PrimaryButton>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ano/ID</th>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Data de criação</th>
                  <th className="px-5 py-3 font-semibold">Turmas</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classesWithStats.map((schoolClass) => (
                  <tr
                    key={schoolClass.id}
                    className={cx(
                      "hover:bg-slate-50/80",
                      selectedClassId === schoolClass.id && "bg-teal-50/50",
                    )}
                  >
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-950">
                      {schoolClass.id}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {schoolClass.name}
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
                        <TextButton onClick={() => editClass(schoolClass)}>
                          Editar
                        </TextButton>
                        <TextButton
                          onClick={() => toggleClassStatus(schoolClass.id)}
                        >
                          {schoolClass.status === "active"
                            ? "Desactivar"
                            : "Activar"}
                        </TextButton>
                        <TextButton
                          onClick={() => {
                            selectClass(schoolClass.id);
                            setActiveView("groups");
                          }}
                        >
                          Ver turmas
                        </TextButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="grid gap-6">
          <ClassForm
            draft={classDraft}
            editing={Boolean(editingClassId)}
            error={classError}
            onCancel={resetClassForm}
            onChange={(draft) => {
              setClassError("");
              setClassDraft(draft);
            }}
            onSubmit={submitClass}
          />
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Turmas da classe
              </h2>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Sem classe seleccionada"}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {groupsForCurrentClass.length > 0 ? (
                groupsForCurrentClass.map((group, index) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      selectGroup(group.id);
                      setActiveView("students");
                    }}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <span>
                      <span className="block font-semibold text-slate-950">
                        {index + 1}. {group.name}
                      </span>
                      <span className="text-sm text-slate-500">{group.id}</span>
                    </span>
                    <StatusBadge status={group.status} />
                  </button>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-slate-500">
                  Sem turmas nesta classe.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    );
  }

  function renderGroups() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Turmas
              </h2>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Seleccione uma classe"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={currentClassId}
                onChange={(event) => selectClass(event.target.value)}
                className={cx(inputClasses(), "w-56")}
                aria-label="Seleccionar classe"
              >
                {sortClasses(classes).map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
              <PrimaryButton onClick={startNewGroup}>Nova turma</PrimaryButton>
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nº</th>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Data de criação</th>
                  <th className="px-5 py-3 font-semibold">Alunos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acções</th>
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
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-950">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {group.name}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {group.id}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(group.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {group.studentsTotal}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={group.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <TextButton onClick={() => editGroup(group)}>
                            Editar
                          </TextButton>
                          <TextButton onClick={() => toggleGroupStatus(group.id)}>
                            {group.status === "active"
                              ? "Desactivar"
                              : "Activar"}
                          </TextButton>
                          <TextButton
                            onClick={() => {
                              selectGroup(group.id);
                              setActiveView("students");
                            }}
                          >
                            Ver alunos
                          </TextButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Sem turmas nesta classe.
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
          editing={Boolean(editingGroupId)}
          onCancel={() => resetGroupForm(currentClassId)}
          onChange={setGroupDraft}
          onSubmit={submitGroup}
        />
      </div>
    );
  }

  function renderStudents() {
    const studentDraftGroups = sortByName(
      groups.filter((group) => group.classId === studentDraft.classId),
    );

    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Alunos
              </h2>
              <p className="text-sm text-slate-500">
                {currentClass?.name ?? "Sem classe"} ·{" "}
                {currentGroup?.name ?? "Sem turma"}.
              </p>
            </div>
            <PrimaryButton onClick={startNewStudent} disabled={!currentGroupId}>
              Novo aluno
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
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nº</th>
                  <th className="px-5 py-3 font-semibold">Nome completo</th>
                  <th className="px-5 py-3 font-semibold">Data de criação</th>
                  <th className="px-5 py-3 font-semibold">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.length > 0 ? (
                  visibleStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-950">
                        {formatStudentNumber(index)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-semibold text-slate-950">
                          {student.fullName}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <TextButton onClick={() => editStudent(student)}>
                            Editar
                          </TextButton>
                          <TextButton onClick={() => openPaymentEntry(student.id)}>
                            Pagamentos
                          </TextButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                      Sem alunos para os filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <StudentForm
          classes={classes}
          draft={studentDraft}
          editing={Boolean(editingStudentId)}
          groups={studentDraftGroups}
          onCancel={() => resetStudentForm(currentClassId, currentGroupId)}
          onChange={setStudentDraft}
          onClassChange={changeStudentDraftClass}
          onSubmit={submitStudent}
        />
      </div>
    );
  }

  function renderPayments() {
    const paymentMenu = (
      <PaymentSectionMenu
        activeSection={activePaymentSection}
        onChange={setActivePaymentSection}
      />
    );
    const selectedPaymentStudent =
      allStudentsAlphabetically.find(
        (student) => student.id === paymentDraft.studentId,
      ) ?? allStudentsAlphabetically[0];

    if (activePaymentSection === "entry") {
      return (
        <div className="grid gap-6">
          {paymentMenu}

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Lançar pagamento
                </h2>
                <p className="text-sm text-slate-500">
                  Registo de caixa para inscrições, matrículas, renovações e propinas.
                </p>
              </div>
              <span className="rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
                Data/hora gerada pelo sistema
              </span>
            </div>

            <form onSubmit={launchPayment} className="grid gap-5 p-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <FieldLabel label="Aluno">
                  <select
                    value={paymentDraft.studentId}
                    onChange={(event) =>
                      setPaymentDraft((draft) => ({
                        ...draft,
                        studentId: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                  >
                    {allStudentsAlphabetically.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Tipo de pagamento">
                  <select
                    value={paymentDraft.category}
                    onChange={(event) => {
                      const category = event.target.value as PaymentCategory;
                      setPaymentDraft((draft) => ({
                        ...draft,
                        category,
                        amount:
                          category === "tuition"
                            ? String(paymentSettings.monthlyFee)
                            : String(paymentSettings.inscriptionRenewalFee),
                      }));
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

                <FieldLabel label="Mês da propina">
                  <select
                    value={paymentDraft.monthKey}
                    onChange={(event) =>
                      setPaymentDraft((draft) => ({
                        ...draft,
                        monthKey: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                    disabled={paymentDraft.category !== "tuition"}
                  >
                    {paymentMonths.map((month) => (
                      <option key={month.key} value={month.key}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <FieldLabel label="Valor recebido">
                  <input
                    value={paymentDraft.amount}
                    onChange={(event) =>
                      setPaymentDraft((draft) => ({
                        ...draft,
                        amount: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                    type="number"
                    min="0"
                  />
                </FieldLabel>

                <FieldLabel label="Forma de pagamento">
                  <select
                    value={paymentDraft.method}
                    onChange={(event) =>
                      setPaymentDraft((draft) => ({
                        ...draft,
                        method: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                  >
                    <option>Numerário</option>
                    <option>Transferência</option>
                    <option>Multicaixa</option>
                    <option>Depósito bancário</option>
                  </select>
                </FieldLabel>

                <FieldLabel label="Referência">
                  <input
                    value={paymentDraft.reference}
                    onChange={(event) =>
                      setPaymentDraft((draft) => ({
                        ...draft,
                        reference: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                    placeholder="Opcional"
                  />
                </FieldLabel>
              </div>

              <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
                <SummaryLine
                  label="Aluno"
                  value={selectedPaymentStudent?.fullName ?? "Sem aluno"}
                />
                <SummaryLine
                  label="Data/hora"
                  value={formatDateTime(new Date().toISOString())}
                />
                <SummaryLine
                  label="Valor"
                  value={formatCurrency(parseMoney(paymentDraft.amount))}
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                O fluxo recomendado é: seleccionar aluno, escolher o tipo de
                pagamento, confirmar o valor recebido e emitir recibo. A data,
                hora e operador devem ser gravados automaticamente pelo sistema.
              </div>

              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={!paymentDraft.studentId}>
                  Confirmar pagamento
                </PrimaryButton>
                <SecondaryButton onClick={() => setActivePaymentSection("data")}>
                  Ver dados
                </SecondaryButton>
              </div>
            </form>
          </section>
        </div>
      );
    }

    if (activePaymentSection === "reports") {
      return (
        <div className="grid gap-6">
          {paymentMenu}

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Relatórios financeiros
                </h2>
                <p className="text-sm text-slate-500">
                  Visão rápida da turma seleccionada.
                </p>
              </div>
              <SecondaryButton onClick={() => setActivePaymentSection("entry")}>
                Lançar pagamento
              </SecondaryButton>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Recebido"
                value={formatCurrency(paymentSummary.paid)}
                supporting="Pagamentos registados"
                accent="border-l-[#2f7d73]"
              />
              <MetricCard
                label="Em falta"
                value={formatCurrency(paymentSummary.balance)}
                supporting="Saldo por cobrar"
                accent="border-l-[#d08a19]"
              />
              <MetricCard
                label="Multas"
                value={formatCurrency(paymentSummary.fine)}
                supporting="Atrasos calculados"
                accent="border-l-[#b84b5f]"
              />
              <MetricCard
                label="Remanescente"
                value={formatCurrency(paymentSummary.carry)}
                supporting="Crédito futuro"
                accent="border-l-[#3572a5]"
              />
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Na versão real, este ecrã pode exportar PDF/Excel, filtrar por
              classe, turma, mês, tipo de pagamento e método, além de listar
              recibos anulados ou pendentes.
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {paymentMenu}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:grid">
            <div className="flex items-center gap-3 px-1">
              <div className="grid size-11 place-items-center rounded-md bg-[#185c54] text-sm font-bold text-white">
                GA
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-950">
                  Gestao Academica
                </h1>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id === "payments") {
                    setActivePaymentSection("data");
                  }
                }}
                className={cx(
                  "flex min-h-11 min-w-fit items-center rounded-md px-3 text-sm font-semibold transition-colors",
                  activeView === item.id
                    ? "bg-teal-50 text-[#185c54] ring-1 ring-teal-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-slate-200 bg-slate-50 p-4 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Selecção actual
            </p>
            <div className="mt-3 grid gap-3 text-sm">
              <div>
                <span className="text-slate-500">Classe</span>
                <p className="font-semibold text-slate-950">
                  {currentClass?.name ?? "Sem classe"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Turma</span>
                <p className="font-semibold text-slate-950">
                  {currentGroup?.name ?? "Sem turma"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#185c54]">
                  Módulo inicial
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  Classes, Turmas, Alunos e Pagamentos
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={startNewGroup}>
                  Nova turma
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    setActiveView("payments");
                    setActivePaymentSection("data");
                  }}
                  disabled={!currentGroupId}
                >
                  Pagamentos
                </SecondaryButton>
                <PrimaryButton onClick={startNewStudent} disabled={!currentGroupId}>
                  Novo aluno
                </PrimaryButton>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveView("classes")}
                className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"
              >
                {currentClass?.name ?? "Classe"}
              </button>
              <span className="text-slate-400">/</span>
              <button
                type="button"
                onClick={() => setActiveView("groups")}
                className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"
              >
                {currentGroup?.name ?? "Turma"}
              </button>
              <span className="text-slate-400">/</span>
              <button
                type="button"
                onClick={() => setActiveView("students")}
                className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Alunos
              </button>
              <span className="text-slate-400">/</span>
              <button
                type="button"
                onClick={() => {
                  setActiveView("payments");
                  setActivePaymentSection("data");
                }}
                className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Pagamentos
              </button>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {activeView === "dashboard" && renderDashboard()}
            {activeView === "classes" && renderClasses()}
            {activeView === "groups" && renderGroups()}
            {activeView === "students" && renderStudents()}
            {activeView === "payments" && renderPayments()}
          </div>
        </div>
      </div>
    </main>
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className="text-sm text-slate-950">{value}</strong>
    </div>
  );
}

function PaymentSectionMenu({
  activeSection,
  onChange,
}: {
  activeSection: PaymentSection;
  onChange: (section: PaymentSection) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3">
        {paymentSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={cx(
              "min-h-11 rounded-md px-4 text-sm font-semibold transition-colors",
              activeSection === section.id
                ? "bg-[#185c54] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </section>
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
      >
        {sortClasses(classes).map((schoolClass) => (
          <option key={schoolClass.id} value={schoolClass.id}>
            {schoolClass.name}
          </option>
        ))}
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

function ClassForm({
  draft,
  editing,
  error,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: ClassDraft;
  editing: boolean;
  error: string;
  onCancel: () => void;
  onChange: (draft: ClassDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          {editing ? "Editar classe" : "Criar classe"}
        </h2>
        <p className="text-sm text-slate-500">
          O ID é o ano/nível, por exemplo 8, 9 ou 10.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Ano/ID da classe">
          <input
            value={draft.id}
            onChange={(event) => onChange({ ...draft, id: event.target.value })}
            className={inputClasses()}
            placeholder="Ex.: 10"
          />
        </FieldLabel>

        <FieldLabel label="Nome da classe">
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            className={inputClasses()}
            placeholder="Ex.: 10ª Classe"
          />
        </FieldLabel>

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
        <PrimaryButton type="submit">
          {editing ? "Guardar alterações" : "Criar classe"}
        </PrimaryButton>
        {editing && <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>}
      </div>
    </form>
  );
}

function GroupForm({
  classes,
  draft,
  editing,
  onCancel,
  onChange,
  onSubmit,
}: {
  classes: SchoolClass[];
  draft: GroupDraft;
  editing: boolean;
  onCancel: () => void;
  onChange: (draft: GroupDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const automaticId = buildGroupId(draft.classId, draft.name || "Turma A");

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          {editing ? "Editar turma" : "Criar turma"}
        </h2>
        <p className="text-sm text-slate-500">A classe é obrigatória.</p>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Designação da turma">
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            className={inputClasses()}
            placeholder="Ex.: Turma A"
          />
        </FieldLabel>

        <FieldLabel label="Classe associada">
          <select
            value={draft.classId}
            onChange={(event) =>
              onChange({ ...draft, classId: event.target.value })
            }
            className={inputClasses()}
          >
            {sortClasses(classes).map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
        </FieldLabel>

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-semibold text-slate-500">ID automático</span>
          <strong className="mt-1 block font-mono text-slate-950">
            {automaticId}
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

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit">
          {editing ? "Guardar alterações" : "Criar turma"}
        </PrimaryButton>
        {editing && <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>}
      </div>
    </form>
  );
}

function StudentForm({
  classes,
  draft,
  editing,
  groups,
  onCancel,
  onChange,
  onClassChange,
  onSubmit,
}: {
  classes: SchoolClass[];
  draft: StudentDraft;
  editing: boolean;
  groups: ClassGroup[];
  onCancel: () => void;
  onChange: (draft: StudentDraft) => void;
  onClassChange: (classId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasGroups = groups.length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          {editing ? "Editar aluno" : "Adicionar aluno"}
        </h2>
        <p className="text-sm text-slate-500">
          A lista reorganiza por nome completo.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Nome completo">
          <input
            value={draft.fullName}
            onChange={(event) =>
              onChange({ ...draft, fullName: event.target.value })
            }
            className={inputClasses()}
            placeholder="Ex.: Ana Maria"
          />
        </FieldLabel>

        <FieldLabel label="Classe">
          <select
            value={draft.classId}
            onChange={(event) => onClassChange(event.target.value)}
            className={inputClasses()}
          >
            {sortClasses(classes).map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
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

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!hasGroups}>
          {editing ? "Guardar alterações" : "Adicionar aluno"}
        </PrimaryButton>
        {editing && <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>}
      </div>
    </form>
  );
}
