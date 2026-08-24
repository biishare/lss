import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import {
  monthOptions,
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type EntityStatus,
  type FinanceStatus,
  type MonthOption,
  type PaymentSettings,
  type RoomDefinition,
  type SchoolClass,
  type SchoolRoom,
  type Student,
} from "../lib/school-demo-data";
import {
  activeAcademicStages,
  buttonBase,
  calculateMonthlyDue,
  calculateRegistrationDue,
  cx,
  financeStatusLabel,
  financeStatusOptions,
  firstPenaltyDateForMonth,
  formatCurrency,
  formatDate,
  formatDateTime,
  getChargeBalance,
  getDebtBreakdown,
  getMiscellaneousCharges,
  getMonthCellState,
  getPaymentsForCharges,
  getRegistrationCellState,
  getStudentUpcomingBalance,
  getStudentTuitionStartMonth,
  getTuitionInstallmentNumber,
  inputClasses,
  monthByKey,
  monthLabel,
  parseMoney,
  paymentRuleForStudent,
  paymentCategories,
  paymentMethods,
  profiles,
  registrationChargeId,
  secondPenaltyDateForMonth,
  sortClasses,
  stageLabel,
  statusLabel,
  statusOptions,
  tuitionChargeId,
  type ClassDraft,
  type EnrollmentDraft,
  type FinanceCellSelection,
  type FinanceCellTone,
  type FinanceProfileDraft,
  type FinanceSettingsDraft,
  type GroupDraft,
  type MiscellaneousChargeDraft,
  type PaymentCategory,
  type PaymentLaunchDraft,
  type RoomDraft,
  type StudentLedgerRow,
} from "./school-admin-demo.model";

export function ProfileCard({
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
        "group flex min-h-36 w-full min-w-0 flex-col items-start rounded-lg border border-slate-200 border-t-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        profile.accent,
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
      <span className="mt-auto pt-5 text-sm font-bold text-[#185c54]">
        Entrar
      </span>
    </button>
  );
}

export function PrimaryButton({
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

export function SecondaryButton({
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

export function TextButton({
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

export function CrumbButton({
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

export function StatusBadge({ status }: { status: EntityStatus }) {
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

export function StatusDot({ paid, label }: { paid: boolean; label: string }) {
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

export function FinanceCell({
  label,
  onClick,
  supporting,
  tone,
  title,
}: {
  label: string;
  onClick?: () => void;
  supporting?: string;
  tone: FinanceCellTone;
  title?: string;
}) {
  const toneClasses: Record<FinanceCellTone, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
    muted: "bg-slate-50 text-slate-500 ring-slate-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const classes = cx(
    "inline-flex min-h-10 min-w-20 max-w-28 flex-col justify-center rounded-md px-2.5 py-1.5 text-left text-xs font-semibold leading-tight ring-1",
    onClick &&
      "transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#185c54] focus:ring-offset-2",
    toneClasses[tone],
  );
  const content = (
    <>
      <span>{label}</span>
      {supporting && (
        <span className="mt-0.5 text-[11px] font-medium opacity-80">
          {supporting}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={classes}
        aria-label={title ?? `${label}${supporting ? `, ${supporting}` : ""}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes}>{content}</span>
  );
}

export function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-md bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className="min-w-0 break-words text-sm text-slate-950 sm:text-right">
        {value}
      </strong>
    </div>
  );
}

export function MetricCard({
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
        "min-w-0 rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm sm:p-5",
        accent,
      )}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-3 grid gap-3">
        <strong className="min-w-0 break-words text-2xl font-bold text-slate-950 sm:text-3xl">
          {value}
        </strong>
        <span className="max-w-full break-words rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 sm:w-fit">
          {supporting}
        </span>
      </div>
    </article>
  );
}

export function FlowStep({
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
      className="min-h-24 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#88c9bb] hover:bg-[#f0fbf8]"
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

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ClassForm({
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

export function RoomForm({
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

export function GroupForm({
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

export function EnrollmentForm({
  classes,
  draft,
  groups,
  notice,
  onChange,
  onClassChange,
  onReset,
  onSaveAndPay,
  onSubmit,
}: {
  classes: SchoolClass[];
  draft: EnrollmentDraft;
  groups: ClassGroup[];
  notice: string;
  onChange: (draft: EnrollmentDraft) => void;
  onClassChange: (classId: string) => void;
  onReset: () => void;
  onSaveAndPay: () => void;
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Data da matricula">
            <input
              value={draft.enrollmentDate}
              onChange={(event) =>
                onChange({ ...draft, enrollmentDate: event.target.value })
              }
              className={inputClasses()}
              type="date"
            />
          </FieldLabel>

          <FieldLabel label="Mensalidades a partir de">
            <select
              value={draft.tuitionStartMonth}
              onChange={(event) =>
                onChange({ ...draft, tuitionStartMonth: event.target.value })
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
                  disabled={
                    draft.financeStatus === "scholarship" ||
                    draft.financeStatus === "exception"
                  }
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
        <SecondaryButton
          onClick={onSaveAndPay}
          disabled={!hasGroups || classes.length === 0}
        >
          Guardar e efectuar pagamento
        </SecondaryButton>
        <SecondaryButton onClick={onReset}>Limpar</SecondaryButton>
      </div>
    </form>
  );
}

export function FinanceSettingsForm({
  draft,
  levels,
  notice,
  onChange,
  onSubmit,
}: {
  draft: FinanceSettingsDraft;
  levels: AcademicStageDefinition[];
  notice: string;
  onChange: (draft: FinanceSettingsDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const ruleForLevel = (level: AcademicStageDefinition) =>
    draft.levelRules.find((rule) => rule.levelId === level.id) ?? {
      levelId: level.id,
      levelName: level.name,
      inscriptionRenewalFee: draft.inscriptionRenewalFee,
      monthlyFee: draft.monthlyFee,
      startMonth: draft.startMonth,
      endMonth: draft.endMonth,
      firstPenaltyDay: draft.firstPenaltyDay,
      firstPenaltyAmount: draft.firstPenaltyAmount,
      secondPenaltyDay: draft.secondPenaltyDay,
      secondPenaltyAmount: draft.secondPenaltyAmount,
    };
  const updateLevelRule = (
    level: AcademicStageDefinition,
    field: keyof ReturnType<typeof ruleForLevel>,
    value: string,
  ) => {
    const nextRule = {
      ...ruleForLevel(level),
      levelName: level.name,
      [field]: value,
    };

    onChange({
      ...draft,
      levelRules: [
        ...draft.levelRules.filter((rule) => rule.levelId !== level.id),
        nextRule,
      ],
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Regras de pagamentos</h3>
        <p className="text-sm text-slate-500">
          A regra geral serve de fallback; os valores abaixo podem variar por nível.
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

        <FieldLabel label="Inscrição/Renovação">
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

      <section className="mt-6 min-w-0 border-t border-slate-200 pt-5">
        <div>
          <h4 className="text-sm font-bold text-slate-950">Tabela por nível</h4>
          <p className="mt-1 text-sm text-slate-500">
            Cada linha guarda a sua versão e não altera cobranças já geradas.
          </p>
        </div>

        {levels.length > 0 ? (
          <div className="table-scroll mt-4 rounded-lg border border-slate-200">
            <table className="min-w-[1280px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Nível</th>
                  <th className="px-3 py-3 font-semibold">Inscrição</th>
                  <th className="px-3 py-3 font-semibold">Mensalidade</th>
                  <th className="px-3 py-3 font-semibold">Início</th>
                  <th className="px-3 py-3 font-semibold">Fim</th>
                  <th className="px-3 py-3 font-semibold">1ª após dia</th>
                  <th className="px-3 py-3 font-semibold">1ª multa</th>
                  <th className="px-3 py-3 font-semibold">2ª após dia</th>
                  <th className="px-3 py-3 font-semibold">2ª multa total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {levels.map((level) => {
                  const rule = ruleForLevel(level);
                  const compactInput = cx(inputClasses(), "min-w-24 px-2");

                  return (
                    <tr key={level.id}>
                      <th className="px-3 py-3 font-semibold text-slate-900">
                        {level.name}
                      </th>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Inscrição de ${level.name}`}
                          className={compactInput}
                          min="0"
                          type="number"
                          value={rule.inscriptionRenewalFee}
                          onChange={(event) =>
                            updateLevelRule(
                              level,
                              "inscriptionRenewalFee",
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Mensalidade de ${level.name}`}
                          className={compactInput}
                          min="0"
                          type="number"
                          value={rule.monthlyFee}
                          onChange={(event) =>
                            updateLevelRule(level, "monthlyFee", event.target.value)
                          }
                        />
                      </td>
                      {(["startMonth", "endMonth"] as const).map((field) => (
                        <td key={field} className="px-2 py-2">
                          <select
                            aria-label={`${field === "startMonth" ? "Início" : "Fim"} de ${level.name}`}
                            className={compactInput}
                            value={rule[field]}
                            onChange={(event) =>
                              updateLevelRule(level, field, event.target.value)
                            }
                          >
                            {monthOptions.map((month) => (
                              <option key={month.key} value={month.key}>
                                {month.shortLabel}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                      {(
                        [
                          "firstPenaltyDay",
                          "firstPenaltyAmount",
                          "secondPenaltyDay",
                          "secondPenaltyAmount",
                        ] as const
                      ).map((field) => (
                        <td key={field} className="px-2 py-2">
                          <input
                            aria-label={`${field} de ${level.name}`}
                            className={compactInput}
                            min={field.includes("Day") ? "1" : "0"}
                            max={field.includes("Day") ? "31" : undefined}
                            type="number"
                            value={rule[field]}
                            onChange={(event) =>
                              updateLevelRule(level, field, event.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Crie níveis de ensino no catálogo para configurar valores diferentes.
          </p>
        )}
      </section>

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

export function PaymentSettingsSummary({ settings }: { settings: PaymentSettings }) {
  const levelRules = settings.levelRules ?? [];

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
          label="Inscrição/Renovação"
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
          value={`Dia ${settings.secondPenaltyDay} / total ${formatCurrency(settings.secondPenaltyAmount)}`}
        />
        <SummaryLine label="Versão" value={`v${settings.version ?? 1}`} />
      </div>

      {levelRules.length > 0 && (
        <div className="table-scroll mt-5 rounded-lg border border-slate-200">
          <table className="min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nível</th>
                <th className="px-4 py-3 font-semibold">Inscrição</th>
                <th className="px-4 py-3 font-semibold">Mensalidade</th>
                <th className="px-4 py-3 font-semibold">Período</th>
                <th className="px-4 py-3 font-semibold">Versão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {levelRules.map((rule) => (
                <tr key={`${rule.academicYear}-${rule.levelId}`}>
                  <td className="px-4 py-3 font-semibold">{rule.levelName}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(rule.inscriptionRenewalFee)}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(rule.monthlyFee)}</td>
                  <td className="px-4 py-3">
                    {monthLabel(rule.startMonth)}–{monthLabel(rule.endMonth)}
                  </td>
                  <td className="px-4 py-3">v{rule.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function StudentFinanceForm({
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
  const canEditPercent =
    draft.status === "partial_scholarship" || draft.status === "weighted";
  const needsRuleDetails = draft.status !== "regular";
  const ruleHistory = selectedStudent?.financialProfile.history ?? [];

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Bolsas e ponderacoes</h3>
        <p className="text-sm text-slate-500">
          Aplique uma regra por periodo e guarde quem autorizou.
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
              disabled={!canEditPercent}
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
              disabled={!needsRuleDetails}
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
              disabled={!needsRuleDetails}
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
            placeholder="Ex.: Bolsa autorizada pela Direccao"
          />
        </FieldLabel>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Autorizado por">
            <input
              value={draft.authorizedBy}
              onChange={(event) =>
                onChange({ ...draft, authorizedBy: event.target.value })
              }
              className={inputClasses()}
              placeholder="Ex.: Director"
            />
          </FieldLabel>

          <FieldLabel label="Registado por">
            <input
              value={draft.registeredBy}
              onChange={(event) =>
                onChange({ ...draft, registeredBy: event.target.value })
              }
              className={inputClasses()}
              placeholder="Ex.: Secretaria"
            />
          </FieldLabel>
        </div>
      </div>

      {ruleHistory.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-700">
            Histórico do aluno
          </h4>
          <div className="mt-3 divide-y divide-slate-100">
            {ruleHistory.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {financeStatusLabel(entry.status)} / {entry.discountPercent}%
                  </p>
                  <p className="text-slate-500">
                    {entry.status === "regular"
                      ? "Sem periodo especial"
                      : `${monthLabel(entry.startMonth)} ate ${monthLabel(entry.endMonth)}`}
                  </p>
                </div>
                <div className="text-left text-slate-500 sm:text-right">
                  <p>{formatDateTime(entry.registeredAt)}</p>
                  <p>Autorizado por {entry.authorizedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <SummaryLine
          label="Autorizacao"
          value={draft.authorizedBy.trim() || "Por preencher"}
        />
        <SummaryLine
          label="Registo"
          value={draft.registeredBy.trim() || "Secretaria"}
        />
      </div>

      {notice && (
        <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
          {notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!draft.studentId}>
          Guardar regra
        </PrimaryButton>
      </div>
    </form>
  );
}

export function PaymentForm({
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
  const selectedRule = paymentRuleForStudent(settings, selectedStudent);
  const selectedMonth = monthByKey(draft.monthKey) ?? months[0];
  const selectedMonthNumber = monthOptions.findIndex(
    (month) => month.key === draft.monthKey,
  );
  const selectedMonthPeriod =
    selectedMonthNumber >= 0
      ? `${selectedRule.academicYear}-${String(selectedMonthNumber + 1).padStart(2, "0")}`
      : "";
  const futureMonthBlocked =
    draft.category === "tuition" &&
    selectedMonthPeriod > draft.effectivePaymentDate.slice(0, 7) &&
    !draft.allowAdvancePayment;
  const suggestedMonthlyFee =
    selectedStudent && selectedMonth
      ? calculateMonthlyDue(selectedStudent, selectedMonth, settings)
      : { due: selectedRule.monthlyFee, discount: 0, ruleLabel: "Regular" };
  const selectedMonthLedger = selectedRow?.ledger.monthly.find(
    (item) => item.month.key === draft.monthKey,
  );
  const receivedAmount = parseMoney(draft.amount);
  const monthBalance = selectedMonthLedger
    ? selectedMonthLedger.balance + selectedMonthLedger.fine
    : suggestedMonthlyFee.due;
  const appliedToMonth =
    draft.category === "tuition" ? Math.min(receivedAmount, monthBalance) : 0;
  const surplusForNextMonths =
    draft.category === "tuition" ? Math.max(0, receivedAmount - appliedToMonth) : 0;
  const registrationBalance = selectedRow
    ? selectedRow.ledger.registrationBalance + selectedRow.ledger.registrationFine
    : selectedRule.inscriptionRenewalFee;
  const appliedToRegistration =
    draft.category === "registration"
      ? Math.min(receivedAmount, registrationBalance)
      : 0;
  const registrationSurplus =
    draft.category === "registration"
      ? Math.max(0, receivedAmount - appliedToRegistration)
      : 0;
  const miscellaneousCharges = selectedRow
    ? getMiscellaneousCharges(selectedRow.record)
    : [];
  const selectedMiscellaneousCharge = miscellaneousCharges.find(
    (charge) => charge.id === draft.targetChargeId,
  );
  const miscellaneousBalance = selectedMiscellaneousCharge
    ? selectedRow
      ? getChargeBalance(selectedRow.record, selectedMiscellaneousCharge)
      : selectedMiscellaneousCharge.amount
    : receivedAmount;
  const appliedToMiscellaneous =
    draft.category === "miscellaneous"
      ? Math.min(receivedAmount, miscellaneousBalance)
      : 0;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Lançar pagamento</h3>
        <p className="text-sm text-slate-500">
          Recebimentos de inscrição/renovação, mensalidade e pagamentos diversos.
        </p>
      </div>

      {draft.category !== "miscellaneous" && (
        <div className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 ring-1 ring-sky-100">
          O valor liquida primeiro o item seleccionado e a sua multa, depois
          outras dívidas vencidas. Meses futuros exigem pagamento antecipado.
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
                  : paymentRuleForStudent(settings, nextStudent).monthlyFee;
              const nextRegistrationDue = nextStudent
                ? calculateRegistrationDue(nextStudent, settings).due
                : paymentRuleForStudent(settings, nextStudent)
                    .inscriptionRenewalFee;

              onChange({
                ...draft,
                studentId: event.target.value,
                amount:
                  draft.category === "tuition"
                    ? String(nextFee)
                    : draft.category === "registration"
                      ? String(nextRegistrationDue)
                      : draft.amount,
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
                targetChargeId: "",
                allowAdvancePayment: false,
                amount:
                  category === "tuition"
                    ? String(suggestedMonthlyFee.due)
                    : category === "registration"
                      ? String(registrationBalance)
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

        <FieldLabel label="Mês da mensalidade">
          <select
            value={draft.monthKey}
            onChange={(event) => {
              const month = monthByKey(event.target.value) ?? months[0];
              const nextFee =
                selectedStudent && month
                  ? calculateMonthlyDue(selectedStudent, month, settings).due
                  : selectedRule.monthlyFee;
              const nextLedger = selectedRow?.ledger.monthly.find(
                (item) => item.month.key === event.target.value,
              );
              const nextOutstanding = nextLedger
                ? nextLedger.balance + nextLedger.fine
                : nextFee;

              onChange({
                ...draft,
                monthKey: event.target.value,
                amount:
                  draft.category === "tuition"
                    ? String(nextOutstanding)
                    : draft.amount,
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
          <FieldLabel label="Cobrança diversa">
            <select
              value={draft.targetChargeId ?? ""}
              onChange={(event) => {
                const charge = miscellaneousCharges.find(
                  (item) => item.id === event.target.value,
                );

                onChange({
                  ...draft,
                  targetChargeId: event.target.value,
                  amount: charge
                    ? String(
                        selectedRow
                          ? getChargeBalance(selectedRow.record, charge)
                          : charge.amount,
                      )
                    : "0",
                  description: charge?.description ?? "",
                });
              }}
              className={inputClasses()}
            >
              <option value="">Novo recebimento diverso</option>
              {miscellaneousCharges.map((charge) => {
                const balance = selectedRow
                  ? getChargeBalance(selectedRow.record, charge)
                  : charge.amount;

                return (
                  <option key={charge.id} value={charge.id}>
                    {charge.description} · saldo {formatCurrency(balance)}
                  </option>
                );
              })}
            </select>
          </FieldLabel>
        )}

        {draft.category === "miscellaneous" && !draft.targetChargeId && (
          <FieldLabel label="Descrição do pagamento diverso">
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

        <FieldLabel label="Data efectiva do pagamento (no comprovativo)">
          <input
            value={draft.effectivePaymentDate}
            onChange={(event) =>
              onChange({ ...draft, effectivePaymentDate: event.target.value })
            }
            className={inputClasses()}
            required
            type="date"
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

        {draft.category !== "miscellaneous" && (
          <label className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={draft.allowAdvancePayment}
              onChange={(event) =>
                onChange({
                  ...draft,
                  allowAdvancePayment: event.target.checked,
                })
              }
              className="mt-0.5 size-4 rounded border-slate-300 text-[#185c54]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                Pagamento antecipado
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Autoriza aplicar a sobra em mensalidades futuras. Sem esta opção,
                a sobra fica como crédito não aplicado.
              </span>
            </span>
          </label>
        )}
        {futureMonthBlocked && (
          <p className="rounded-md bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
            Este mês é futuro em relação à data efectiva. Active “Pagamento
            antecipado” para continuar.
          </p>
        )}
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
              label={
                draft.allowAdvancePayment
                  ? "Antecipado para meses seguintes"
                  : "Crédito não aplicado"
              }
              value={formatCurrency(surplusForNextMonths)}
            />
          </>
        )}
        {draft.category === "registration" && (
          <>
            <SummaryLine
              label="Aplicado na inscrição"
              value={formatCurrency(appliedToRegistration)}
            />
            <SummaryLine
              label={
                draft.allowAdvancePayment
                  ? "Antecipado para mensalidades"
                  : "Crédito não aplicado"
              }
              value={formatCurrency(registrationSurplus)}
            />
          </>
        )}
        {draft.category === "miscellaneous" && (
          <>
            <SummaryLine
              label={draft.targetChargeId ? "Cobrança" : "Pagamento diverso"}
              value={draft.description.trim() || "Descrição por preencher"}
            />
            <SummaryLine
              label="Aplicado"
              value={formatCurrency(appliedToMiscellaneous)}
            />
          </>
        )}
        <SummaryLine
          label="Data efectiva"
          value={formatDate(draft.effectivePaymentDate)}
        />
        <SummaryLine
          label="Registado em"
          value={formatDateTime(new Date().toISOString())}
        />
        <SummaryLine label="Registado por" value={draft.recordedBy} />
        <SummaryLine label="Valor" value={formatCurrency(parseMoney(draft.amount))} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton
          type="submit"
          disabled={
            !draft.studentId ||
            !draft.effectivePaymentDate ||
            receivedAmount <= 0 ||
            futureMonthBlocked
          }
        >
          Confirmar pagamento
        </PrimaryButton>
      </div>
    </form>
  );
}

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-sm font-semibold text-slate-900 sm:text-right">
        {value}
      </span>
    </div>
  );
}

function HistoryList({ items }: { items: ReturnType<typeof getPaymentsForCharges> }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
        Sem pagamentos registados para este item.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <strong className="text-slate-950">
              {formatCurrency(item.amount)}
            </strong>
            <span className="text-xs font-semibold text-slate-500">
              Efectivo em {formatDate(item.effectivePaymentDate)}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{item.method}</p>
          <p className="mt-1 text-xs text-slate-500">
            Registado por {item.recordedBy} em {formatDateTime(item.recordedAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FinanceCellDialog({
  canManagePayments,
  months,
  onClose,
  onCreateMiscellaneous,
  onRegisterPayment,
  row,
  selection,
  settings,
}: {
  canManagePayments: boolean;
  months: MonthOption[];
  onClose: () => void;
  onCreateMiscellaneous: () => void;
  onRegisterPayment: (
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentCategory;
      studentId: string;
    },
  ) => void;
  row?: StudentLedgerRow;
  selection: FinanceCellSelection | null;
  settings: PaymentSettings;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!selection || !row || !dialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) {
        dialog.close();
      }
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [row, selection]);

  const closeDialog = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    onClose();
  };

  if (!selection || !row) {
    return null;
  }

  const student = row.student;
  const paymentAction = (
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentCategory;
      studentId: string;
    },
  ) => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    onRegisterPayment(draft);
  };
  let title = "Detalhes";
  let subtitle = student.fullName;
  let body: ReactNode = null;
  let history = getPaymentsForCharges(row.record, []);
  let action: ReactNode = null;

  if (selection.kind === "registration") {
    const status = getRegistrationCellState(row.ledger, settings);
    const balance = row.ledger.registrationBalance;
    const outstanding = balance + row.ledger.registrationFine;

    title = "Detalhes da inscrição";
    subtitle = `${student.fullName} · ${student.registrationNumber}`;
    history = getPaymentsForCharges(row.record, [registrationChargeId(student.id)]);
    body = (
      <>
        <DetailLine label="Estado" value={status.label} />
        <DetailLine
          label="Valor normal"
          value={formatCurrency(
            row.ledger.registrationDue + row.ledger.registrationDiscount,
          )}
        />
        <DetailLine
          label="Desconto"
          value={formatCurrency(row.ledger.registrationDiscount)}
        />
        <DetailLine
          label="Pago"
          value={formatCurrency(row.ledger.registrationPaid)}
        />
        <DetailLine label="Saldo" value={formatCurrency(balance)} />
        <DetailLine
          label="Multa aplicada"
          value={formatCurrency(row.ledger.registrationAssessedFine)}
        />
        <DetailLine
          label="Multa paga"
          value={formatCurrency(row.ledger.registrationFinePaid)}
        />
        <DetailLine
          label="Multa por pagar"
          value={formatCurrency(row.ledger.registrationFine)}
        />
        <DetailLine label="Regra" value={row.ledger.registrationRuleLabel} />
        <DetailLine
          label="Matrícula"
          value={formatDate(student.enrollmentDate)}
        />
      </>
    );

    if (canManagePayments && outstanding > 0) {
      action = (
        <PrimaryButton
          onClick={() =>
            paymentAction({
              studentId: student.id,
              category: "registration",
              amount: String(outstanding),
              monthKey: getStudentTuitionStartMonth(student, settings),
            })
          }
        >
          Registar pagamento
        </PrimaryButton>
      );
    }
  }

  if (selection.kind === "tuition") {
    const month = row.ledger.monthly.find(
      (item) => item.month.key === selection.monthKey,
    );
    const status = month ? getMonthCellState(month, settings) : undefined;
    const installmentNumber = getTuitionInstallmentNumber(
      student,
      selection.monthKey,
      months,
      settings,
    );
    const paymentRule = paymentRuleForStudent(settings, student);

    title = "Detalhes da mensalidade";
    subtitle = `${student.fullName} · ${
      month?.month.label ?? monthLabel(selection.monthKey)
    }${installmentNumber ? ` · ${installmentNumber}ª mensalidade` : ""}`;
    history = getPaymentsForCharges(row.record, [
      tuitionChargeId(student.id, selection.monthKey),
    ]);
    body = month ? (
      month.applicable ? (
        <>
          <DetailLine label="Estado" value={status?.label ?? "Pendente"} />
          <DetailLine
            label="Valor normal"
            value={formatCurrency(month.due + month.discount)}
          />
          <DetailLine label="Desconto" value={formatCurrency(month.discount)} />
          <DetailLine label="Valor devido" value={formatCurrency(month.due)} />
          <DetailLine label="Pago" value={formatCurrency(month.paid)} />
          <DetailLine
            label="Multa aplicada"
            value={formatCurrency(month.assessedFine)}
          />
          <DetailLine label="Multa paga" value={formatCurrency(month.finePaid)} />
          <DetailLine label="Multa por pagar" value={formatCurrency(month.fine)} />
          <DetailLine label="Saldo" value={formatCurrency(month.balance)} />
          <DetailLine label="Regra" value={month.ruleLabel} />
          <DetailLine
            label="Vencimento"
            value={formatDate(month.dueOn)}
          />
          <DetailLine
            label="1ª multa"
            value={formatDate(firstPenaltyDateForMonth(month.month.key, paymentRule))}
          />
          <DetailLine
            label="2ª multa"
            value={formatDate(secondPenaltyDateForMonth(month.month.key, paymentRule))}
          />
        </>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
          Mensalidade não aplicável. O aluno ainda não iniciou mensalidades neste
          período.
        </p>
      )
    ) : null;

    if (
      canManagePayments &&
      month?.applicable &&
      month.balance + month.fine > 0
    ) {
      action = (
        <PrimaryButton
          onClick={() =>
            paymentAction({
              studentId: student.id,
              category: "tuition",
              monthKey: month.month.key,
              amount: String(month.balance + month.fine),
            })
          }
        >
          Registar pagamento
        </PrimaryButton>
      );
    }
  }

  if (selection.kind === "miscellaneous") {
    const charges = getMiscellaneousCharges(row.record);
    const chargeIds = charges.map((charge) => charge.id);
    const firstOpenCharge = charges.find(
      (charge) => getChargeBalance(row.record, charge) > 0,
    );

    title = "Detalhes de diversos";
    subtitle = `${student.fullName} · cobranças extras`;
    history = getPaymentsForCharges(row.record, chargeIds);
    body =
      charges.length > 0 ? (
        <div className="grid gap-3">
          {charges.map((charge) => {
            const balance = getChargeBalance(row.record, charge);

            return (
              <div
                key={charge.id}
                className="rounded-md border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-slate-950">
                    {charge.description}
                  </strong>
                  <span className="text-sm font-bold text-slate-700">
                    {formatCurrency(charge.amount)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Vence em {charge.dueOn ? formatDate(charge.dueOn) : "data por definir"}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Saldo: {formatCurrency(balance)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
          Sem cobranças diversas para este aluno.
        </p>
      );

    action = (
      <div className="flex flex-wrap gap-2">
        {canManagePayments && firstOpenCharge && (
          <PrimaryButton
            onClick={() =>
              paymentAction({
                studentId: student.id,
                category: "miscellaneous",
                targetChargeId: firstOpenCharge.id,
                amount: String(getChargeBalance(row.record, firstOpenCharge)),
                description: firstOpenCharge.description,
              })
            }
          >
            Registar pagamento
          </PrimaryButton>
        )}
        {canManagePayments && (
          <SecondaryButton
            onClick={() => {
              if (dialogRef.current?.open) {
                dialogRef.current.close();
              }
              onCreateMiscellaneous();
            }}
          >
            Nova cobrança diversa
          </SecondaryButton>
        )}
      </div>
    );
  }

  if (selection.kind === "debt") {
    const breakdown = getDebtBreakdown(row);
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const upcoming = getStudentUpcomingBalance(row.ledger, row.record);
    const firstMonthlyDebt = row.ledger.monthly.find(
      (month) => month.isOverdue && month.balance + month.fine > 0,
    );
    const firstMiscCharge = getMiscellaneousCharges(row.record).find(
      (charge) => getChargeBalance(row.record, charge) > 0,
    );

    title = "Detalhes da dívida";
    subtitle = `${student.fullName} · dívida vencida ${formatCurrency(total)}`;
    history = getPaymentsForCharges(
      row.record,
      row.record.charges.map((charge) => charge.id),
    );
    body =
      breakdown.length > 0 ? (
        <div className="grid gap-2">
          <div className="mb-1 rounded-md bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-800">
            A vencer: {formatCurrency(upcoming)} (não incluído na dívida)
          </div>
          {breakdown.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-3"
            >
              <div>
                <strong className="text-sm text-slate-950">{item.label}</strong>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
            Este aluno não tem dívida vencida.
          </p>
          <p className="rounded-md bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-800">
            A vencer: {formatCurrency(upcoming)}.
          </p>
        </div>
      );

    if (canManagePayments && total > 0) {
      action = (
        <PrimaryButton
          onClick={() => {
            if (
              row.ledger.registrationIsOverdue &&
              row.ledger.registrationBalance + row.ledger.registrationFine > 0
            ) {
              paymentAction({
                studentId: student.id,
                category: "registration",
                amount: String(
                  row.ledger.registrationBalance + row.ledger.registrationFine,
                ),
                monthKey: getStudentTuitionStartMonth(student, settings),
              });
              return;
            }

            if (firstMonthlyDebt) {
              paymentAction({
                studentId: student.id,
                category: "tuition",
                monthKey: firstMonthlyDebt.month.key,
                amount: String(firstMonthlyDebt.balance + firstMonthlyDebt.fine),
              });
              return;
            }

            if (firstMiscCharge) {
              paymentAction({
                studentId: student.id,
                category: "miscellaneous",
                targetChargeId: firstMiscCharge.id,
                amount: String(getChargeBalance(row.record, firstMiscCharge)),
                description: firstMiscCharge.description,
              });
            }
          }}
        >
          Registar pagamento
        </PrimaryButton>
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-slate-950/45 sm:h-auto sm:max-h-[90dvh] sm:w-[min(760px,calc(100vw-2rem))] sm:rounded-xl"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <article
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id={titleId} className="text-lg font-bold text-slate-950">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="grid size-10 place-items-center rounded-md border border-slate-200 text-xl font-semibold text-slate-500 hover:bg-slate-50"
              aria-label="Fechar detalhes"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 py-5 sm:px-5">
          <section>
            <h4 className="text-sm font-bold uppercase text-slate-500">
              Resumo
            </h4>
            <div className="mt-2 rounded-lg border border-slate-200 px-4">
              {body}
            </div>
          </section>

          {action && <div className="flex flex-wrap gap-2">{action}</div>}

          <section>
            <h4 className="text-sm font-bold uppercase text-slate-500">
              Histórico
            </h4>
            <div className="mt-2">
              <HistoryList items={history} />
            </div>
          </section>
        </div>
      </article>
    </dialog>
  );
}

export function MiscellaneousChargeForm({
  disabled,
  draft,
  groupStudentCount,
  notice,
  selectedCount,
  onChange,
  onSubmit,
}: {
  disabled: boolean;
  draft: MiscellaneousChargeDraft;
  groupStudentCount: number;
  notice: string;
  selectedCount: number;
  onChange: (draft: MiscellaneousChargeDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const targetCount = draft.target === "selected" ? selectedCount : groupStudentCount;
  const amount = parseMoney(draft.amount);
  const total = targetCount * amount;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold">Nova cobrança diversa</h3>
        <p className="text-sm text-slate-500">
          Use para provas, declarações, cartões, uniforme ou outra cobrança extra.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Tipo">
          <select
            value={draft.type}
            onChange={(event) => onChange({ ...draft, type: event.target.value })}
            className={inputClasses()}
          >
            {["Prova", "Declaração", "Cartão", "Uniforme", "Excursão", "Outro"].map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Valor por aluno">
          <input
            value={draft.amount}
            onChange={(event) => onChange({ ...draft, amount: event.target.value })}
            className={inputClasses()}
            min="0"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Vencimento">
          <input
            value={draft.dueOn}
            onChange={(event) => onChange({ ...draft, dueOn: event.target.value })}
            className={inputClasses()}
            type="date"
          />
        </FieldLabel>

        <FieldLabel label="Aplicar a">
          <select
            value={draft.target}
            onChange={(event) =>
              onChange({
                ...draft,
                target: event.target.value as MiscellaneousChargeDraft["target"],
              })
            }
            className={inputClasses()}
          >
            <option value="group">Turma inteira</option>
            <option value="selected">Alunos seleccionados</option>
          </select>
        </FieldLabel>
      </div>

      <div className="mt-4">
        <FieldLabel label="Descrição">
          <input
            value={draft.description}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            className={inputClasses()}
            placeholder="Ex.: Prova Trimestral - II Trimestre"
          />
        </FieldLabel>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <SummaryMini label="Alunos" value={String(targetCount)} />
        <SummaryMini label="Valor por aluno" value={formatCurrency(amount)} />
        <SummaryMini label="Total previsto" value={formatCurrency(total)} />
      </div>

      {notice && (
        <p className="mt-4 rounded-md bg-teal-50 px-4 py-3 text-sm font-semibold text-[#185c54] ring-1 ring-teal-100">
          {notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton
          type="submit"
          disabled={disabled || targetCount === 0 || amount <= 0}
        >
          Criar cobrança
        </PrimaryButton>
      </div>
    </form>
  );
}

export function StudentFilters({
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
