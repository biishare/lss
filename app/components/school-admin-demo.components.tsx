import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  monthOptions,
  type AcademicStageDefinition,
  type ClassDefinition,
  type ClassGroup,
  type EntityStatus,
  type FinanceStatus,
  type MonthOption,
  type Payment,
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
  paymentCategories,
  paymentMethods,
  profiles,
  registrationChargeId,
  today,
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
  type PaymentCorrectionDraft,
  type MiscellaneousChargeDraft,
  type PaymentCategory,
  type PaymentLaunchDraft,
  type PaymentPreview,
  type PaymentReceipt,
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
    <span className={cx("lss-state-label", className)} data-tone={tone}>
      {children}
    </span>
  );
}

export function AppDialog({
  actions,
  children,
  onClose,
  open,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  subtitle?: string;
  title: string;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="lss-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        aria-describedby={subtitle ? subtitleId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="lss-dialog-shell"
        role="dialog"
        tabIndex={-1}
      >
        <div className="lss-dialog-header">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                id={titleId}
                className="break-words text-lg font-bold text-slate-950"
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  id={subtitleId}
                  className="mt-1 break-words text-sm leading-6 text-slate-500"
                >
                  {subtitle}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-md border border-slate-200 text-xl font-semibold text-slate-600 hover:bg-slate-50"
              aria-label="Fechar dialogo"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>
        <div className="lss-dialog-body" tabIndex={0}>{children}</div>
        {actions && <div className="lss-dialog-footer lss-actions">{actions}</div>}
      </div>
    </div>
  );
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
    <button
      type={type}
      form={form}
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
    <button
      type={type}
      form={form}
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
    <button
      type="button"
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex min-h-11 max-w-full items-center justify-center rounded-md px-3 py-2 text-center text-sm font-semibold leading-snug text-[#185c54] transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
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
  onEdit,
  rules,
}: {
  levelLabel: (rule: PaymentRuleVersion) => string;
  onEdit: (rule: PaymentRuleVersion) => void;
  rules: PaymentRuleVersion[];
}) {
  const sortedRules = [...rules].sort(
    (a, b) =>
      a.academicYearId.localeCompare(b.academicYearId) ||
      levelLabel(a).localeCompare(levelLabel(b), "pt-PT") ||
      b.version - a.version,
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Regras por nivel
          </h3>
        </div>
      </div>

      <div className="table-scroll" role="region" aria-label="Regras financeiras por nivel" tabIndex={0}>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Ano</th>
              <th className="px-5 py-3 font-semibold">Nivel</th>
              <th className="px-4 py-3 font-semibold">Versao</th>
              <th className="px-4 py-3 font-semibold">Inscricao</th>
              <th className="px-4 py-3 font-semibold">Mensalidade</th>
              <th className="px-4 py-3 font-semibold">Multas</th>
              <th className="px-4 py-3 font-semibold">Meses</th>
              <th className="px-4 py-3 font-semibold">Validade</th>
              <th className="px-5 py-3 font-semibold">Accao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRules.length > 0 ? (
              sortedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {rule.academicYearId}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-950">
                    {levelLabel(rule)}
                  </td>
                  <td className="px-4 py-4">
                    <StateLabel tone={rule.status === "active" ? "active" : "inactive"}>
                      V{rule.version}
                    </StateLabel>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatCurrency(rule.inscriptionFee)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatCurrency(rule.monthlyFee)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    Dia {rule.firstPenalty.thresholdDay}: {rule.firstPenalty.percent ?? 0}% / Dia {rule.secondPenalty.thresholdDay}: {rule.secondPenalty.percent ?? 0}%
                  </td>
                  <td className="max-w-64 px-4 py-4 text-slate-600">
                    <span className="line-clamp-2 break-words">
                      {paymentRuleMonthsLabel(rule)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(rule.validFrom)}
                    {rule.validUntil ? ` ate ${formatDate(rule.validUntil)}` : ""}
                  </td>
                  <td className="px-5 py-4">
                    <TextButton onClick={() => onEdit(rule)}>Editar</TextButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                  Sem regras financeiras.
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
  draft,
  levelName,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: PaymentRuleDraft | null;
  levelName: string;
  onChange: (draft: PaymentRuleDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = useId();

  if (!draft) {
    return null;
  }

  const selectedMonths = new Set(draft.coveredMonthKeys);
  const toggleMonth = (monthKey: string) => {
    const nextMonths = selectedMonths.has(monthKey)
      ? draft.coveredMonthKeys.filter((item) => item !== monthKey)
      : [...draft.coveredMonthKeys, monthKey];

    onChange({ ...draft, coveredMonthKeys: nextMonths });
  };

  return (
    <AppDialog
      actions={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton type="submit" form={formId}>
            Guardar nova versao
          </PrimaryButton>
        </>
      }
      onClose={onClose}
      open={Boolean(draft)}
      subtitle={`${draft.academicYearId} / ${levelName}`}
      title="Editar regra financeira"
    >
      <form id={formId} onSubmit={onSubmit} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Ano lectivo">
            <input value={draft.academicYearId} className={inputClasses()} disabled readOnly />
          </FieldLabel>
          <FieldLabel label="Nivel">
            <input value={levelName} className={inputClasses()} disabled readOnly />
          </FieldLabel>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldLabel label="Valida a partir de">
            <input
              value={draft.validFrom}
              onChange={(event) => onChange({ ...draft, validFrom: event.target.value })}
              className={inputClasses()}
              type="date"
            />
          </FieldLabel>
          <FieldLabel label="Inscricao">
            <input
              value={draft.inscriptionFee}
              onChange={(event) => onChange({ ...draft, inscriptionFee: event.target.value })}
              className={inputClasses()}
              min="0"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="Mensalidade">
            <input
              value={draft.monthlyFee}
              onChange={(event) => onChange({ ...draft, monthlyFee: event.target.value })}
              className={inputClasses()}
              min="0"
              type="number"
            />
          </FieldLabel>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldLabel label="Vencimento mensal">
            <input
              value={draft.monthlyDueDay}
              onChange={(event) => onChange({ ...draft, monthlyDueDay: event.target.value })}
              className={inputClasses()}
              max="31"
              min="1"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="1a multa dia">
            <input
              value={draft.firstPenaltyDay}
              onChange={(event) => onChange({ ...draft, firstPenaltyDay: event.target.value })}
              className={inputClasses()}
              max="31"
              min="1"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="1a multa (%)">
            <input
              value={draft.firstPenaltyPercent}
              onChange={(event) => onChange({ ...draft, firstPenaltyPercent: event.target.value })}
              className={inputClasses()}
              min="0"
              type="number"
            />
          </FieldLabel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="2a multa dia">
            <input
              value={draft.secondPenaltyDay}
              onChange={(event) => onChange({ ...draft, secondPenaltyDay: event.target.value })}
              className={inputClasses()}
              max="31"
              min="1"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="2a multa total (%)">
            <input
              value={draft.secondPenaltyPercent}
              onChange={(event) => onChange({ ...draft, secondPenaltyPercent: event.target.value })}
              className={inputClasses()}
              min="0"
              type="number"
            />
          </FieldLabel>
        </div>

        <fieldset className="min-w-0 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-600">
            Meses cobertos
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {monthOptions.map((month) => (
              <label
                key={month.key}
                className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                <input
                  checked={selectedMonths.has(month.key)}
                  onChange={() => toggleMonth(month.key)}
                  type="checkbox"
                  className="size-5 accent-[#207a70]"
                />
                <span>{month.label}</span>
              </label>
            ))}
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

function daysBetweenDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86400000));
}

export function PaymentForm({
  allRows,
  allStudents,
  draft,
  months,
  preview,
  recordedAtPreview,
  selectedRow,
  selectedStudent,
  settings,
  onChange,
  onSubmit,
}: {
  allRows: StudentLedgerRow[];
  allStudents: Student[];
  draft: PaymentLaunchDraft;
  months: MonthOption[];
  preview?: PaymentPreview;
  recordedAtPreview: string;
  selectedRow?: StudentLedgerRow;
  selectedStudent?: Student;
  settings: PaymentSettings;
  onChange: (draft: PaymentLaunchDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedRowForDraft =
    selectedRow ?? allRows.find((row) => row.student.id === draft.studentId);
  const selectedStudentForDraft = selectedStudent ?? selectedRowForDraft?.student;
  const selectedMonthLedger = selectedRowForDraft?.ledger.monthly.find(
    (item) => item.month.key === draft.monthKey,
  );
  const receivedAmount = parseMoney(draft.amount);
  const canAllocateFuture = draft.category !== "miscellaneous";
  const miscellaneousCharges = selectedRowForDraft
    ? getMiscellaneousCharges(selectedRowForDraft.record)
    : [];
  const effectiveDateFuture = Boolean(draft.paidOn && draft.paidOn > today());
  const recordLagDays = draft.paidOn
    ? daysBetweenDates(draft.paidOn, recordedAtPreview.slice(0, 10))
    : 0;
  const suggestedAmountFor = (
    category: PaymentCategory,
    row: StudentLedgerRow | undefined,
    monthKey: string,
    targetChargeId?: string,
  ) => {
    if (!row) {
      return category === "registration"
        ? settings.inscriptionRenewalFee
        : category === "tuition"
          ? settings.monthlyFee
          : 0;
    }

    if (category === "registration") {
      return row.ledger.registrationBalance + row.ledger.registrationPenaltyBalance;
    }

    if (category === "tuition") {
      const month = row.ledger.monthly.find((item) => item.month.key === monthKey);

      return month ? month.balance + month.fineBalance : settings.monthlyFee;
    }

    const charge = getMiscellaneousCharges(row.record).find(
      (item) => item.id === targetChargeId,
    );

    return charge ? getChargeBalance(row.record, charge) : 0;
  };
  const previewItems = preview?.items ?? [];

  return (
    <form onSubmit={onSubmit} className="lss-responsive-card">
      <div>
        <h3 className="text-base font-semibold">Lancar pagamento</h3>
        <p className="text-sm text-slate-500">
          Recebimentos de inscricao/renovacao, mensalidade e pagamentos diversos.
        </p>
      </div>

      {canAllocateFuture && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
          Meses futuros so recebem saldo remanescente com pagamento antecipado activo.
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <FieldLabel label="Aluno">
          <select
            value={draft.studentId}
            onChange={(event) => {
              const nextStudentId = event.target.value;
              const nextStudent = allStudents.find(
                (student) => student.id === nextStudentId,
              );
              const nextRow = allRows.find((row) => row.student.id === nextStudentId);
              const nextMonthKey = nextStudent
                ? getStudentTuitionStartMonth(nextStudent, settings)
                : draft.monthKey;

              onChange({
                ...draft,
                studentId: nextStudentId,
                monthKey: draft.category === "tuition" ? draft.monthKey : nextMonthKey,
                targetChargeId: "",
                amount: String(
                  suggestedAmountFor(
                    draft.category,
                    nextRow,
                    draft.category === "tuition" ? draft.monthKey : nextMonthKey,
                  ),
                ),
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
              const nextMonthKey =
                category === "registration" && selectedStudentForDraft
                  ? getStudentTuitionStartMonth(selectedStudentForDraft, settings)
                  : draft.monthKey;

              onChange({
                ...draft,
                category,
                monthKey: nextMonthKey,
                targetChargeId: "",
                amount: String(
                  suggestedAmountFor(category, selectedRowForDraft, nextMonthKey),
                ),
                description: category === "miscellaneous" ? "" : draft.description,
                allowFutureAllocation:
                  category === "miscellaneous" ? false : draft.allowFutureAllocation,
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

        <FieldLabel label="Mes da mensalidade">
          <select
            value={draft.monthKey}
            onChange={(event) => {
              const monthKey = event.target.value;

              onChange({
                ...draft,
                monthKey,
                amount:
                  draft.category === "tuition"
                    ? String(
                        suggestedAmountFor(
                          "tuition",
                          selectedRowForDraft,
                          monthKey,
                        ),
                      )
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
          <FieldLabel label="Cobranca diversa">
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
                    ? String(selectedRowForDraft ? getChargeBalance(selectedRowForDraft.record, charge) : charge.amount)
                    : "0",
                  description: charge?.description ?? "",
                });
              }}
              className={inputClasses()}
            >
              <option value="">Novo recebimento diverso</option>
              {miscellaneousCharges.map((charge) => {
                const balance = selectedRowForDraft
                  ? getChargeBalance(selectedRowForDraft.record, charge)
                  : charge.amount;

                return (
                  <option key={charge.id} value={charge.id}>
                    {charge.description} - saldo {formatCurrency(balance)}
                  </option>
                );
              })}
            </select>
          </FieldLabel>
        )}

        {draft.category === "miscellaneous" && !draft.targetChargeId && (
          <FieldLabel label="Descricao do pagamento diverso">
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
            value={draft.paidOn}
            onChange={(event) => onChange({ ...draft, paidOn: event.target.value })}
            className={inputClasses()}
            max={today()}
            type="date"
          />
        </FieldLabel>

        {effectiveDateFuture && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            A data efectiva nao pode estar no futuro.
          </p>
        )}

        {recordLagDays > 7 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
            O comprovativo tem {recordLagDays} dias face ao registo de hoje.
          </p>
        )}

        {canAllocateFuture && (
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
            <input
              checked={draft.allowFutureAllocation}
              onChange={(event) =>
                onChange({
                  ...draft,
                  allowFutureAllocation: event.target.checked,
                })
              }
              type="checkbox"
              className="size-5 accent-[#207a70]"
            />
            <span>Pagamento antecipado para meses futuros</span>
          </label>
        )}

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
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SummaryLine label="Aluno" value={selectedStudentForDraft?.fullName ?? "Sem aluno"} />
        {draft.category === "tuition" && selectedMonthLedger && (
          <SummaryLine
            label="Regra"
            value={`${selectedMonthLedger.ruleLabel} / devido ${formatCurrency(selectedMonthLedger.due)}`}
          />
        )}
        {draft.category === "registration" && selectedRowForDraft && (
          <SummaryLine
            label="Inscricao devida"
            value={formatCurrency(selectedRowForDraft.ledger.registrationDue)}
          />
        )}
        <SummaryLine label="Data efectiva" value={draft.paidOn ? formatDate(draft.paidOn) : "Obrigatoria"} />
        <SummaryLine label="Data de registo" value={formatDateTime(recordedAtPreview)} />
        <SummaryLine label="Valor" value={formatCurrency(receivedAmount)} />
        <SummaryLine label="Multa prevista" value={formatCurrency(preview?.penaltyTotal ?? 0)} />
        <SummaryLine label="Total alocado" value={formatCurrency(preview?.totalAllocated ?? 0)} />
        <SummaryLine label="Sobra nao alocada" value={formatCurrency(preview?.unallocatedAmount ?? 0)} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold uppercase text-slate-500">
          Alocacoes previstas
        </h4>
        <div className="mt-3 grid gap-2">
          {previewItems.length > 0 ? (
            previewItems.map((item) => (
              <div
                key={item.chargeId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <strong className="break-words text-slate-950">
                    {item.label}
                  </strong>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.kind === "penalty" ? "Multa" : "Base"} / saldo apos {formatCurrency(item.balanceAfter)}
                  </p>
                </div>
                <span className="font-bold text-slate-800">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
              Nenhuma rubrica aberta para este pagamento.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton
          type="submit"
          disabled={
            !draft.studentId ||
            !draft.paidOn ||
            receivedAmount <= 0 ||
            effectiveDateFuture
          }
        >
          Confirmar pagamento
        </PrimaryButton>
      </div>
    </form>
  );
}

export function PaymentReceiptDialog({
  onClose,
  onPrint,
  receipt,
}: {
  onClose: () => void;
  onPrint: () => void;
  receipt: PaymentReceipt | null;
}) {
  if (!receipt) {
    return null;
  }

  return (
    <AppDialog
      actions={
        <>
          <SecondaryButton onClick={onPrint}>Imprimir</SecondaryButton>
          <PrimaryButton onClick={onClose}>Fechar</PrimaryButton>
        </>
      }
      onClose={onClose}
      open={Boolean(receipt)}
      subtitle={receipt.studentName}
      title={`Recibo ${receipt.id}`}
    >
      <div className="grid min-w-0 gap-5">
        <section className="min-w-0 rounded-lg border border-slate-200 px-4">
          <DetailLine label="Aluno" value={receipt.studentName} />
          <DetailLine label="Matricula" value={receipt.registrationNumber} />
          <DetailLine label="Pagamento" value={receipt.paymentId} />
          <DetailLine label="Valor recebido" value={formatCurrency(receipt.amount)} />
          <DetailLine label="Forma" value={receipt.method} />
          <DetailLine label="Data efectiva" value={formatDate(receipt.effectivePaymentDate)} />
          <DetailLine label="Data de registo" value={formatDateTime(receipt.recordedAt)} />
          <DetailLine label="Operador" value={receipt.recordedBy} />
        </section>

        <section className="min-w-0">
          <h4 className="text-sm font-bold uppercase text-slate-500">Rubricas</h4>
          <div className="mt-2 grid gap-2">
            {receipt.items.length > 0 ? (
              receipt.items.map((item) => (
                <div
                  key={`${receipt.paymentId}-${item.chargeId}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <strong className="break-words text-slate-950">{item.label}</strong>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.kind === "penalty" ? "Multa" : "Base"}
                    </p>
                  </div>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Pagamento sem alocacao aplicada.
              </p>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 px-4">
          <DetailLine label="Multa liquidada" value={formatCurrency(receipt.penaltyTotal)} />
          <DetailLine label="Sobra nao alocada" value={formatCurrency(receipt.unallocatedAmount)} />
        </section>
      </div>
    </AppDialog>
  );
}

export function PaymentCorrectionDialog({
  draft,
  maxAmount,
  onChange,
  onClose,
  onSubmit,
  payment,
  recordedAtPreview,
  studentName,
}: {
  draft: PaymentCorrectionDraft;
  maxAmount: number;
  onChange: (draft: PaymentCorrectionDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  payment?: Payment;
  recordedAtPreview: string;
  studentName: string;
}) {
  const formId = useId();
  const amount = parseMoney(draft.amount);

  if (!payment) {
    return null;
  }

  return (
    <AppDialog
      actions={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton
            type="submit"
            form={formId}
            disabled={!draft.reason.trim() || amount <= 0 || amount > maxAmount}
          >
            Confirmar correcao
          </PrimaryButton>
        </>
      }
      onClose={onClose}
      open={Boolean(payment)}
      subtitle={studentName}
      title="Corrigir pagamento"
    >
      <form id={formId} onSubmit={onSubmit} className="grid min-w-0 gap-4">
        <div className="rounded-lg border border-slate-200 px-4">
          <DetailLine label="Pagamento original" value={payment.id} />
          <DetailLine label="Valor original" value={formatCurrency(payment.amount)} />
          <DetailLine label="Data efectiva" value={formatDate(payment.effectivePaymentDate ?? payment.paidOn)} />
          <DetailLine label="Registado em" value={formatDateTime(payment.recordedAt)} />
          <DetailLine label="Operador" value={payment.recordedBy ?? "Secretaria"} />
          <DetailLine label="Maximo corrigivel" value={formatCurrency(maxAmount)} />
        </div>

        <FieldLabel label="Valor do ajuste">
          <input
            value={draft.amount}
            onChange={(event) => onChange({ ...draft, amount: event.target.value })}
            className={inputClasses()}
            max={String(maxAmount)}
            min="0"
            type="number"
          />
        </FieldLabel>

        <FieldLabel label="Motivo da correcao">
          <textarea
            value={draft.reason}
            onChange={(event) => onChange({ ...draft, reason: event.target.value })}
            className={cx(inputClasses(), "min-h-24 resize-y")}
            placeholder="Ex.: comprovativo associado ao aluno incorrecto"
          />
        </FieldLabel>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4">
          <DetailLine label="Data de registo" value={formatDateTime(recordedAtPreview)} />
        </div>
      </form>
    </AppDialog>
  );
}
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
            <TextButton onClick={() => onShowReceipt(item.id)}>Recibo</TextButton>
            {canCorrect && (
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
          <DetailLine label="Vencimento" value={formatDate(dueDateForMonth(month.month.key, settings))} />
          <DetailLine label="1ª multa" value={formatDate(firstPenaltyDateForMonth(month.month.key, settings))} />
          <DetailLine label="2ª multa" value={formatDate(secondPenaltyDateForMonth(month.month.key, settings))} />
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

    action = (
      <>
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
          <SecondaryButton onClick={onCreateMiscellaneous}>
            Nova cobrança diversa
          </SecondaryButton>
        )}
      </>
    );
  }

  if (selection.kind === "debt") {
    const breakdown = getDebtBreakdown(row);
    const timing = row.ledger.totals;
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const firstMonthlyDebt = row.ledger.monthly.find(
      (month) => month.balance + month.fineBalance > 0,
    );
    const firstMiscCharge = getMiscellaneousCharges(row.record).find(
      (charge) => getChargeBalance(row.record, charge) > 0,
    );

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
      action = (
        <PrimaryButton
          onClick={() => {
            if (row.ledger.registrationBalance + row.ledger.registrationPenaltyBalance > 0) {
              paymentAction({
                studentId: student.id,
                category: "registration",
                amount: String(row.ledger.registrationBalance + row.ledger.registrationPenaltyBalance),
                monthKey: getStudentTuitionStartMonth(student, settings),
              });
              return;
            }

            if (firstMonthlyDebt) {
              paymentAction({
                studentId: student.id,
                category: "tuition",
                monthKey: firstMonthlyDebt.month.key,
                amount: String(firstMonthlyDebt.balance + firstMonthlyDebt.fineBalance),
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

  return (
    <AppDialog
      actions={footerActions}
      onClose={onClose}
      open={Boolean(selection && row)}
      subtitle={subtitle}
      title={title}
    >
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
    </AppDialog>
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
