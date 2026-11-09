import { TaskSurface, type MobileSurface } from "./task-surface";
import { addDays } from "../features/finance/domain/billing";

import { useId, type FormEvent, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import type { PaymentRuleVersion } from "../features/finance/domain/entities";
import {
  activeAcademicStages,
  buttonBase,
  cx,
  dueDateForMonth,
  financeStatusLabel,
  financeStatusOptions,
  firstPenaltyDateForMonth,
  formatCurrency,
  formatDate,
  formatDateTime,
  getChargeBalance,
  getDebtBreakdown,
  getMiscellaneousCharges,
  getMiscellaneousCellState,
  getMonthCellState,
  getPaymentsForCharges,
  getRegistrationCellState,
  getStudentTuitionStartMonth,
  getTuitionInstallmentNumber,
  inputClasses,
  monthLabel,
  parseMoney,
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
  type PaymentRuleDraft,
  type RoomDraft,
  type StudentLedgerRow,
} from "./school-admin-demo.model";

type StateLabelTone = FinanceCellTone | "active" | "inactive";

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("lss-page-container", className)}>{children}</div>
  );
}

export function ResponsiveCard({
  as = "section",
  children,
  className,
  description,
  footer,
  title,
  wide,
}: {
  as?: "article" | "div" | "section";
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  title?: string;
  wide?: boolean;
}) {
  const cardContent = (
    <>
      {(title || description) && (
        <div className="mb-5 min-w-0">
          {title && (
            <h3 className="break-words text-base font-semibold text-slate-950">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 break-words text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="min-w-0">{children}</div>
      {footer && <div className="lss-actions mt-5 justify-end">{footer}</div>}
    </>
  );
  const cardProps = {
    className: cx("lss-responsive-card", className),
    "data-wide": wide ? "true" : undefined,
  };

  if (as === "article") {
    return <article {...cardProps}>{cardContent}</article>;
  }

  if (as === "div") {
    return <div {...cardProps}>{cardContent}</div>;
  }

  return <section {...cardProps}>{cardContent}</section>;
}

export function StateLabel({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone: StateLabelTone;
}) {
  return (
    <Chip
      className={cx("lss-state-label", className)}
      data-tone={tone}
      label={children}
      size="small"
    />
  );
}

export function AppDialog({ actions, children, onClose, open, subtitle, title, mobile = "full-screen" }: {
  actions?: ReactNode; children: ReactNode; onClose(): void; open: boolean;
  subtitle?: string; title: string; mobile?: MobileSurface;
}) {
  return <TaskSurface open={open} title={title} subtitle={subtitle} onClose={onClose} actions={actions} mobile={mobile}>{children}</TaskSurface>;
}

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
        "group flex min-h-36 flex-col items-start rounded-lg border border-slate-200 border-t-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
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
  form,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  form?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <Button
      type={type}
      form={form}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      variant="contained"
      color="primary"
      className={buttonBase}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  form,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  form?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <Button
      type={type}
      form={form}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      variant="outlined"
      color="inherit"
      className={buttonBase}
    >
      {children}
    </Button>
  );
}

export function TextButton({
  ariaLabel,
  children,
  onClick,
  disabled,
}: {
  ariaLabel?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      variant="text"
      color="primary"
      className="min-h-11 max-w-full"
    >
      {children}
    </Button>
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
      className="min-h-11 max-w-full rounded-md bg-slate-100 px-3 py-2 text-left font-semibold leading-snug text-slate-700 hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: EntityStatus }) {
  return (
    <StateLabel tone={status === "active" ? "active" : "inactive"}>
      {statusLabel(status)}
    </StateLabel>
  );
}

export function StatusDot({ paid, label }: { paid: boolean; label: string }) {
  return <StateLabel tone={paid ? "paid" : "warning"}>{label}</StateLabel>;
}

export function FinanceCell({
  label,
  onClick,
  supporting,
  symbol,
  tone,
  title,
}: {
  label: string;
  onClick?: () => void;
  supporting?: string;
  symbol?: string;
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
    "inline-flex min-h-11 min-w-24 max-w-48 flex-col justify-center gap-1 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold leading-tight ring-1 whitespace-normal break-words",
    onClick &&
      "transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#185c54] focus:ring-offset-2",
    toneClasses[tone],
  );
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        {symbol && (
          <span
            aria-hidden="true"
            className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-sm bg-white/70 px-1 text-[10px] font-black leading-none ring-1 ring-black/10"
          >
            {symbol}
          </span>
        )}
        <span className="min-w-0 break-words">{label}</span>
      </span>
      {supporting && (
        <span className="break-words text-[11px] font-semibold">
          {supporting}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.focus();
          onClick();
        }}
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
    <div className="min-w-0">
      <span className="break-words text-slate-500">{label}</span>
      <p className="break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-md bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="break-words text-sm font-semibold text-slate-500">
        {label}
      </span>
      <strong className="break-words text-sm text-slate-950 sm:text-right">
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
    <ResponsiveCard as="article" className={cx("border-l-4", accent)} wide>
      <p className="break-words text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-3 grid min-w-0 gap-3">
        <strong className="break-words text-2xl font-bold text-slate-950 sm:text-3xl">
          {value}
        </strong>
        <StateLabel tone="neutral" className="w-fit">
          {supporting}
        </StateLabel>
      </div>
    </ResponsiveCard>
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
      className="lss-responsive-card"
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
      className="lss-responsive-card"
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
      className="lss-responsive-card"
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
      className="lss-responsive-card"
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
  notice,
  onChange,
  onSubmit,
}: {
  draft: FinanceSettingsDraft;
  notice: string;
  onChange: (draft: FinanceSettingsDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="lss-responsive-card"
    >
      <div>
        <h3 className="text-base font-semibold">Dados de pagamentos</h3>
        <p className="text-sm text-slate-500">
          Período de cobrança, valores e multas por atraso.
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
  return (
    <section className="lss-responsive-card">
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
          value={`Dia ${settings.secondPenaltyDay} / ${formatCurrency(settings.secondPenaltyAmount)}`}
        />
      </div>
    </section>
  );
}

function paymentRuleMonthsLabel(rule: PaymentRuleVersion) {
  if (rule.coveredMonthKeys.length === 0) {
    return "Sem meses";
  }

  return rule.coveredMonthKeys.map((monthKey) => monthLabel(monthKey)).join(", ");
}

export function PaymentRulesTable({
  levelLabel,
  onCreate,
  onEdit,
  readOnly = false,
  rules,
}: {
  levelLabel: (rule: PaymentRuleVersion) => string;
  onCreate: () => void;
  onEdit: (rule: PaymentRuleVersion) => void;
  readOnly?: boolean;
  rules: PaymentRuleVersion[];
}) {
  const groupedRules = Array.from(
    rules.reduce((groups, rule) => {
      const key = rule.policyId
        ? [
            rule.policyId,
            rule.academicYearId,
            rule.validFrom,
            rule.status,
            rule.inscriptionFee,
            rule.monthlyFee,
            rule.coveredMonthKeys.join(","),
          ].join(":")
        : rule.id;
      const group = groups.get(key) ?? [];
      group.push(rule);
      groups.set(key, group);
      return groups;
    }, new Map<string, PaymentRuleVersion[]>()),
  )
    .map(([key, grouped]) => ({
      key,
      rules: grouped.sort((a, b) => levelLabel(a).localeCompare(levelLabel(b), "pt-PT")),
    }))
    .sort((a, b) => {
      const firstA = a.rules[0];
      const firstB = b.rules[0];
      return (
        firstB.academicYearId.localeCompare(firstA.academicYearId) ||
        (firstA.policyName ?? levelLabel(firstA)).localeCompare(
          firstB.policyName ?? levelLabel(firstB),
          "pt-PT",
        ) ||
        firstB.version - firstA.version
      );
    });

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Políticas de pagamento
          </h3>
          <p className="text-sm text-slate-500">
            Defina uma vez e associe às classes abrangidas.
          </p>
        </div>
        {!readOnly && <PrimaryButton onClick={onCreate}>Nova política</PrimaryButton>}
      </div>

      <div className="table-scroll" role="region" aria-label="Políticas de pagamento por classe" tabIndex={0}>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Política</th>
              <th className="px-5 py-3 font-semibold">Ano</th>
              <th className="px-5 py-3 font-semibold">Classes</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Inscrição</th>
              <th className="px-4 py-3 font-semibold">Mensalidade</th>
              <th className="px-4 py-3 font-semibold">Período / limite</th>
              <th className="px-4 py-3 font-semibold">Multas</th>
              {!readOnly && <th className="px-5 py-3 font-semibold">Acção</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedRules.length > 0 ? (
              groupedRules.map(({ key, rules: policyRules }) => {
                const rule = policyRules[0];
                const versions = Array.from(new Set(policyRules.map((item) => item.version)))
                  .sort((a, b) => b - a)
                  .map((version) => `V${version}`)
                  .join(", ");
                const firstMonth = rule.coveredMonthKeys[0];
                const lastMonth = rule.coveredMonthKeys.at(-1);

                return (
                <tr key={key} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <span className="block font-semibold text-slate-950">
                      {rule.policyName ?? `Política ${levelLabel(rule)}`}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatDate(rule.validFrom)}
                      {rule.validUntil ? ` até ${formatDate(rule.validUntil)}` : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {rule.academicYearId}
                  </td>
                  <td className="max-w-72 px-5 py-4 font-semibold text-slate-700">
                    {policyRules.map(levelLabel).join(", ")}
                  </td>
                  <td className="px-4 py-4">
                    <StateLabel tone={rule.status === "active" ? "active" : "inactive"}>
                      {rule.status === "active" ? "Activa" : "Inactiva"} · {versions}
                    </StateLabel>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatCurrency(rule.inscriptionFee)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatCurrency(rule.monthlyFee)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {firstMonth && lastMonth
                      ? `${monthLabel(firstMonth)}–${monthLabel(lastMonth)}`
                      : paymentRuleMonthsLabel(rule)}
                    <span className="block text-xs">Dia {rule.monthlyDueDay}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    Dia {rule.firstPenalty.thresholdDay}: {rule.firstPenalty.percent ?? 0}%
                    <span className="block">
                      Dia {rule.secondPenalty.thresholdDay}: {rule.secondPenalty.percent ?? 0}%
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-5 py-4">
                      <TextButton onClick={() => onEdit(rule)}>Nova versão</TextButton>
                    </td>
                  )}
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="px-5 py-8 text-center text-slate-500">
                  Sem políticas de pagamento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PaymentRuleDialog({
  classOptions,
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  classOptions: Array<{ id: string; name: string; status: EntityStatus }>;
  draft: PaymentRuleDraft | null;
  onChange: (draft: PaymentRuleDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = useId();

  if (!draft) {
    return null;
  }

  const selectedClasses = new Set(draft.educationLevelIds);
  const startMonth = draft.coveredMonthKeys[0] ?? monthOptions[0].key;
  const endMonth = draft.coveredMonthKeys.at(-1) ?? monthOptions.at(-1)?.key ?? startMonth;
  const monthsBetween = (startKey: string, endKey: string) => {
    const startIndex = monthOptions.findIndex((month) => month.key === startKey);
    const endIndex = monthOptions.findIndex((month) => month.key === endKey);

    if (startIndex < 0 || endIndex < 0) {
      return [];
    }

    const range =
      startIndex <= endIndex
        ? monthOptions.slice(startIndex, endIndex + 1)
        : [...monthOptions.slice(startIndex), ...monthOptions.slice(0, endIndex + 1)];

    return range.map((month) => month.key);
  };
  const toggleClass = (classId: string) => {
    const educationLevelIds = selectedClasses.has(classId)
      ? draft.educationLevelIds.filter((item) => item !== classId)
      : [...draft.educationLevelIds, classId];

    onChange({ ...draft, educationLevelIds });
  };

  return (
    <AppDialog
      actions={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton type="submit" form={formId}>
            Guardar política
          </PrimaryButton>
        </>
      }
      onClose={onClose}
      open={Boolean(draft)}
      subtitle={`${draft.academicYearId} · ${draft.educationLevelIds.length} classe(s) seleccionada(s)`}
      title={draft.ruleId ? "Nova versão da política" : "Nova política de pagamento"}
    >
      <form id={formId} onSubmit={onSubmit} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldLabel label="Nome da política">
            <input
              value={draft.policyName}
              onChange={(event) => onChange({ ...draft, policyName: event.target.value })}
              className={inputClasses()}
              placeholder="Ex.: Ensino Secundário I"
              required
            />
          </FieldLabel>
          <FieldLabel label="Ano lectivo">
            <input
              value={draft.academicYearId}
              onChange={(event) => onChange({ ...draft, academicYearId: event.target.value })}
              className={inputClasses()}
              inputMode="numeric"
              pattern="[0-9]{4}"
              required
            />
          </FieldLabel>
          <FieldLabel label="Estado">
            <select
              value={draft.status}
              onChange={(event) => onChange({ ...draft, status: event.target.value as EntityStatus })}
              className={inputClasses()}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </FieldLabel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Valor da inscrição">
            <input
              value={draft.inscriptionFee}
              onChange={(event) => onChange({ ...draft, inscriptionFee: event.target.value })}
              className={inputClasses()}
              min="0"
              step="0.01"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="Valor da mensalidade">
            <input
              value={draft.monthlyFee}
              onChange={(event) => onChange({ ...draft, monthlyFee: event.target.value })}
              className={inputClasses()}
              min="0"
              step="0.01"
              type="number"
            />
          </FieldLabel>
        </div>

        <fieldset className="min-w-0 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-600">
            Classes abrangidas pela política
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {classOptions.map((schoolClass) => (
              <label
                key={schoolClass.id}
                className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                <input
                  checked={selectedClasses.has(schoolClass.id)}
                  onChange={() => toggleClass(schoolClass.id)}
                  type="checkbox"
                  className="size-5 accent-[#207a70]"
                />
                <span>{schoolClass.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldLabel label="Mês inicial">
            <select
              value={startMonth}
              onChange={(event) =>
                onChange({
                  ...draft,
                  coveredMonthKeys: monthsBetween(event.target.value, endMonth),
                })
              }
              className={inputClasses()}
            >
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>{month.label}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Mês final">
            <select
              value={endMonth}
              onChange={(event) =>
                onChange({
                  ...draft,
                  coveredMonthKeys: monthsBetween(startMonth, event.target.value),
                })
              }
              className={inputClasses()}
            >
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>{month.label}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Dia limite para pagamento">
            <input
              value={draft.monthlyDueDay}
              onChange={(event) => onChange({ ...draft, monthlyDueDay: event.target.value })}
              className={inputClasses()}
              max="31"
              min="1"
              type="number"
            />
          </FieldLabel>
        </div>

        <fieldset className="min-w-0 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-600">
            Multas, quando aplicável
          </legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-4">
            <FieldLabel label="1.ª multa — dia">
              <input value={draft.firstPenaltyDay} onChange={(event) => onChange({ ...draft, firstPenaltyDay: event.target.value })} className={inputClasses()} max="31" min="1" type="number" />
            </FieldLabel>
            <FieldLabel label="1.ª multa (%)">
              <input value={draft.firstPenaltyPercent} onChange={(event) => onChange({ ...draft, firstPenaltyPercent: event.target.value })} className={inputClasses()} min="0" step="any" type="number" />
            </FieldLabel>
            <FieldLabel label="2.ª multa — dia">
              <input value={draft.secondPenaltyDay} onChange={(event) => onChange({ ...draft, secondPenaltyDay: event.target.value })} className={inputClasses()} max="31" min="1" type="number" />
            </FieldLabel>
            <FieldLabel label="2.ª multa total (%)">
              <input value={draft.secondPenaltyPercent} onChange={(event) => onChange({ ...draft, secondPenaltyPercent: event.target.value })} className={inputClasses()} min="0" step="any" type="number" />
            </FieldLabel>
          </div>
        </fieldset>
      </form>
    </AppDialog>
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
      className="lss-responsive-card"
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
                className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
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

export { ReceiptDialog as PaymentReceiptDialog } from "../features/finance/receipt-view";

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <span className="break-words text-sm font-semibold text-slate-500">
        {label}
      </span>
      <span className="break-words text-sm font-semibold text-slate-900 sm:text-right">
        {value}
      </span>
    </div>
  );
}

function HistoryList({
  canCorrect,
  items,
  onCorrectPayment,
  onShowReceipt,
}: {
  canCorrect: boolean;
  items: ReturnType<typeof getPaymentsForCharges>;
  onCorrectPayment: (paymentId: string) => void;
  onShowReceipt: (paymentId: string) => void;
}) {
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
              {formatDate(item.effectivePaymentDate)}
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            {item.method}
            {item.legacyReference ? ` - ${item.legacyReference}` : ""}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Registado por {item.recordedBy} em {formatDateTime(item.recordedAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.kind === "credit-application" ? <span className="break-words text-xs text-slate-500">Crédito de {item.origin?.paymentId} · sem novo recebimento</span> : <TextButton onClick={() => onShowReceipt(item.id)}>Recibo</TextButton>}
            {canCorrect && item.kind !== "credit-application" && (
              <TextButton onClick={() => onCorrectPayment(item.id)}>
                Corrigir
              </TextButton>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
export function FinanceCellDialog({
  canManagePayments,
  inline = false,
  months,
  onClose,
  onCorrectPayment,
  onCreateMiscellaneous,
  onRegisterPayment,
  onShowReceipt,
  row,
  selection,
  settings,
  studentContextLabel,
}: {
  canManagePayments: boolean;
  inline?: boolean;
  months: MonthOption[];
  onClose: () => void;
  onCorrectPayment: (studentId: string, paymentId: string) => void;
  onCreateMiscellaneous: () => void;
  onRegisterPayment: (
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentCategory;
      studentId: string;
    },
  ) => void;
  onShowReceipt: (studentId: string, paymentId: string) => void;
  row?: StudentLedgerRow;
  selection: FinanceCellSelection | null;
  settings: PaymentSettings;
  studentContextLabel: string;
}) {
  if (!selection || !row) {
    return null;
  }

  const student = row.student;
  const stableNumber = student.stableNumber ?? "Sem numero";
  const paymentAction = (
    draft: Partial<PaymentLaunchDraft> & {
      category: PaymentCategory;
      studentId: string;
    },
  ) => {
    onRegisterPayment(draft);
  };
  let title = "Detalhe financeiro";
  let subtitle = student.fullName;
  let rubricLabel = "Rubrica";
  let statusLabelText = "Consulta";
  let statusDetail = "Consulta financeira";
  let statusTone: StateLabelTone = "neutral";
  let statusSymbol = "";
  let body: ReactNode = null;
  let history = getPaymentsForCharges(row.record, []);
  let action: ReactNode = null;

  const setStatus = ({
    detail,
    label,
    symbol,
    tone,
  }: {
    detail: string;
    label: string;
    symbol: string;
    tone: FinanceCellTone;
  }) => {
    statusLabelText = label;
    statusDetail = detail;
    statusTone = tone;
    statusSymbol = symbol;
  };

  if (selection.kind === "registration") {
    const status = getRegistrationCellState(row.ledger, settings);
    const balance = row.ledger.registrationBalance + row.ledger.registrationPenaltyBalance;

    title = "Detalhes da inscrição";
    subtitle = `${student.fullName} / ${student.registrationNumber}`;
    rubricLabel = "Inscrição/Renovação";
    setStatus(status);
    history = getPaymentsForCharges(row.record, [registrationChargeId(student.id)]);
    body = (
      <>
        <DetailLine label="Valor base" value={formatCurrency(row.ledger.registrationBaseAmount)} />
        <DetailLine label="Desconto" value={formatCurrency(row.ledger.registrationDiscount)} />
        <DetailLine label="Valor devido" value={formatCurrency(row.ledger.registrationDue)} />
        <DetailLine label="Pago" value={formatCurrency(row.ledger.registrationPaid + row.ledger.registrationPenaltyPaid)} />
        <DetailLine label="Multa" value={formatCurrency(row.ledger.registrationPenaltyTotal)} />
        <DetailLine label="Saldo" value={formatCurrency(balance)} />
        <DetailLine label="Matrícula" value={formatDate(student.enrollmentDate)} />
      </>
    );

    if (canManagePayments && balance > 0) {
      action = (
        <PrimaryButton
          onClick={() =>
            paymentAction({
              studentId: student.id,
              category: "registration",
              amount: String(balance),
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

    const charge = row.record.charges.find((item) => item.category === "tuition" && item.monthKey === selection.monthKey);
    const policy = charge?.snapshot?.penaltyPolicy;
    const currentAlgorithm = charge?.snapshot?.calculationVersion === "v3";
    const firstPenalty = currentAlgorithm ? policy && policy.firstPercent > 0 && month?.dueOn ? formatDate(addDays(month.dueOn, policy.firstAfterDays)) : "Sem multa configurada" : month?.state === "forecast" ? "Após emissão, conforme a regra" : formatDate(firstPenaltyDateForMonth(selection.monthKey, settings));
    const secondPenalty = currentAlgorithm ? policy?.secondEnabled && month?.dueOn ? formatDate(addDays(month.dueOn, policy.secondAfterDays)) : "Desactivada" : month?.state === "forecast" ? "Após emissão, conforme a regra" : formatDate(secondPenaltyDateForMonth(selection.monthKey, settings));

    title = "Detalhes da mensalidade";
    subtitle = `${student.fullName} / ${month?.month.label ?? monthLabel(selection.monthKey)}`;
    rubricLabel = `${month?.month.label ?? monthLabel(selection.monthKey)}${
      installmentNumber ? ` / ${installmentNumber}ª mensalidade` : ""
    }`;
    if (status) {
      setStatus(status);
    }
    history = getPaymentsForCharges(row.record, [
      tuitionChargeId(student.id, selection.monthKey),
    ]);
    body = month ? (
      month.applicable ? (
        <>
          <DetailLine label="Valor base" value={formatCurrency(month.baseAmount)} />
          <DetailLine label="Desconto" value={formatCurrency(month.discount)} />
          <DetailLine label="Valor devido" value={formatCurrency(month.due)} />
          <DetailLine label="Pago" value={formatCurrency(month.paid + month.finePaid)} />
          <DetailLine label="Multa" value={formatCurrency(month.fineTotal)} />
          <DetailLine label="Saldo" value={formatCurrency(month.balance + month.fineBalance)} />
          <DetailLine label="Regra" value={month.ruleLabel} />
          <DetailLine label="Vencimento" value={formatDate(month.dueOn ?? dueDateForMonth(month.month.key, settings))} />
          <DetailLine label="1ª multa" value={firstPenalty} />
          <DetailLine label="2ª multa" value={secondPenalty} />
        </>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
          Mensalidade não aplicável. O aluno ainda não iniciou mensalidades neste período.
        </p>
      )
    ) : null;

    if (canManagePayments && month?.applicable && month.balance + month.fineBalance > 0) {
      action = (
        <PrimaryButton
          onClick={() =>
            paymentAction({
              studentId: student.id,
              category: "tuition",
              monthKey: month.month.key,
              amount: String(month.balance + month.fineBalance),
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
    const miscellaneousState = getMiscellaneousCellState(row.record);

    title = "Detalhes de diversos";
    subtitle = `${student.fullName} / cobranças extras`;
    rubricLabel = "Diversos";
    setStatus(miscellaneousState);
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <strong className="min-w-0 break-words text-sm text-slate-950">
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

    action = <>
      {canManagePayments && firstOpenCharge && <PrimaryButton onClick={() => paymentAction({ studentId: student.id, category: "miscellaneous", amount: "" })}>Escolher cobrança</PrimaryButton>}
      {canManagePayments && <SecondaryButton onClick={onCreateMiscellaneous}>Nova cobrança diversa</SecondaryButton>}
    </>;
  }

  if (selection.kind === "debt") {
    const breakdown = getDebtBreakdown(row);
    const timing = row.ledger.totals;
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);


    title = "Detalhes da síntese";
    subtitle = `${student.fullName} / total ${formatCurrency(total)}`;
    rubricLabel = "Síntese financeira";
    statusLabelText = total > 0 ? "Dívida" : "Regularizado";
    statusDetail = total > 0 ? "Existe saldo por liquidar" : "Sem dívida aberta";
    statusTone = total > 0 ? "danger" : "paid";
    statusSymbol = total > 0 ? "!" : "OK";
    history = getPaymentsForCharges(
      row.record,
      row.record.charges.map((charge) => charge.id),
    );
    body =
      breakdown.length > 0 ? (
        <div className="grid gap-2">
          <DetailLine label="Dívida vencida" value={formatCurrency(timing.overdueDebt)} />
          <DetailLine label="Valor a vencer" value={formatCurrency(timing.futureDue)} />
          {breakdown.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-3"
            >
              <div className="min-w-0">
                <strong className="break-words text-sm text-slate-950">{item.label}</strong>
                <p className="mt-1 break-words text-xs text-slate-500">{item.detail}</p>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
          Este aluno não tem dívida.
        </p>
      );

    if (canManagePayments && total > 0) {
      action = <PrimaryButton onClick={() => paymentAction({ studentId: student.id, category: "tuition", amount: "" })}>Escolher cobrança</PrimaryButton>;
    }
  }

  const footerActions = (
    <>
      {!canManagePayments && (
        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-600">
          Director: modo de consulta, sem autorização para mutações financeiras.
        </p>
      )}
      {action}
      <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
    </>
  );

  const content = (
      <div className="grid min-w-0 gap-5">
        <section className="min-w-0">
          <h4 className="text-sm font-bold uppercase text-slate-500">
            Identificação
          </h4>
          <div className="mt-2 rounded-lg border border-slate-200 px-4">
            <DetailLine label="Aluno" value={student.fullName} />
            <DetailLine label="Número estável" value={stableNumber} />
            <DetailLine label="Matrícula" value={student.registrationNumber} />
            <DetailLine label="Nível/Turma" value={studentContextLabel} />
            <DetailLine label="Ano lectivo" value={settings.academicYear} />
            <DetailLine label="Rubrica" value={rubricLabel} />
          </div>
        </section>

        <section className="min-w-0">
          <h4 className="text-sm font-bold uppercase text-slate-500">
            Estado
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <StateLabel tone={statusTone}>
              {statusSymbol ? `${statusSymbol} - ${statusLabelText}` : statusLabelText}
            </StateLabel>
            <span className="min-w-0 break-words text-sm font-semibold text-slate-600">
              {statusDetail}
            </span>
          </div>
        </section>

        <section className="min-w-0">
          <h4 className="text-sm font-bold uppercase text-slate-500">
            Resumo
          </h4>
          <div className="mt-2 rounded-lg border border-slate-200 px-4">
            {body}
          </div>
        </section>

        <section className="min-w-0">
          <h4 className="text-sm font-bold uppercase text-slate-500">
            Histórico
          </h4>
          <div className="mt-2">
            <HistoryList
              canCorrect={canManagePayments}
              items={history}
              onCorrectPayment={(paymentId) => onCorrectPayment(student.id, paymentId)}
              onShowReceipt={(paymentId) => onShowReceipt(student.id, paymentId)}
            />
          </div>
        </section>
      </div>
  );
  if (inline) return <section aria-label={title}><h3 className="mb-4 font-bold">{title}</h3>{content}</section>;
  return <AppDialog mobile="sheet" actions={footerActions} onClose={onClose}
    open={Boolean(selection && row)} subtitle={subtitle} title={title}>{content}</AppDialog>;
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
      className="lss-responsive-card"
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
            step="0.01"
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
    <div className="grid min-w-0 gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,14rem)_minmax(0,1fr)]">
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
