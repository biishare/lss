"use client";

import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import { apiRequest } from "./client";
import { dateLabel, money, schoolDay } from "./format";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

const labels = {
  receipts: "Recebimentos do mês",
  overdue: "Dívida vencida",
  enrollments: "Matrículas confirmadas",
  occupancy: "Vagas disponíveis",
} as const;

export type DirectorReport = keyof typeof labels;

export function directorReport(value: string | null): DirectorReport | undefined {
  return value && Object.hasOwn(labels, value) ? value as DirectorReport : undefined;
}

export function directorReportDates(kind: DirectorReport | undefined, year?: Year) {
  const today = schoolDay();
  if (kind === "receipts") return { from: today.slice(0, 7) + "-01", to: today };
  if (kind === "overdue" && year) {
    const to = today < year.endsOn ? today : year.endsOn;
    return { from: year.startsOn > to ? to : year.startsOn, to };
  }
  return undefined;
}

function Indicator({ kind, year, open }: {
  kind: DirectorReport; year?: Year; open(kind: DirectorReport): void;
}) {
  const dates = directorReportDates(kind, year);
  const query = { ...dates, yearId: kind === "receipts" ? undefined : year?.id, limit: 1 };
  const report = useRemote(JSON.stringify(query), signal =>
    apiRequest("GET", "/api/v1/reports/{kind}", { params: { kind }, query, signal }));
  const value = report.value;
  const display = value && (value.unit === "cents"
    ? money(value.totalAmountCents ?? 0)
    : String(value.totalQuantity ?? 0));
  const scope = kind === "receipts" && dates
    ? dateLabel(dates.from) + " a " + dateLabel(dates.to)
    : [year?.label, dates && "Até " + dateLabel(dates.to)].filter(Boolean).join(" · ");

  return <article className="grid min-w-0 content-start gap-2 rounded-xl border border-slate-200 p-4">
    <h3 className="text-sm font-semibold text-slate-700">{labels[kind]}</h3>
    {scope && <p className="text-xs text-slate-600">{scope}</p>}
    {report.loading && <div role="status" aria-label={"A carregar " + labels[kind].toLowerCase()}>
      <Skeleton animation={false} width={100} height={34} />
    </div>}
    {report.error && <div>
      <p role="alert" className="text-sm text-rose-900">{report.error}</p>
      <Button size="small" onClick={report.refresh}>Tentar novamente</Button>
    </div>}
    {display && <>
      <p className="break-words text-2xl font-bold tabular-nums">{display}</p>
      {kind === "receipts" && value?.refundedCents ? <p className="text-xs text-slate-600">
        Líquido após devoluções {money(value.netAfterRefundsCents ?? 0)}
      </p> : null}
      {kind === "occupancy" && value && <p className="text-xs text-slate-600">
        {value.total} {value.total === 1 ? "turma" : "turmas"}
      </p>}
      <Button size="small" className="justify-self-start" onClick={() => open(kind)}
        aria-label={"Ver relatório de " + labels[kind].toLowerCase()}>Ver relatório</Button>
    </>}
  </article>;
}

export function DirectorIndicators({ year, open }: {
  year?: Year; open(kind: DirectorReport): void;
}) {
  const kinds: DirectorReport[] = year ? ["receipts", "overdue", "enrollments", "occupancy"] : ["receipts"];
  return <section aria-label="Indicadores do Director" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {kinds.map(kind => <Indicator key={kind} kind={kind} year={year} open={open} />)}
  </section>;
}
