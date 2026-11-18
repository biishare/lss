"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import { apiRequest, type Schema } from "./client";
import { Heading, Paging, ResourceState, Select } from "./controls";
import { dateLabel, money, schoolDay } from "./format";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

type Sheet = Schema<"FinancePaymentSheet">;
type SheetRow = Sheet["items"][number];
type SheetCharge = SheetRow["charges"][number];
export type SheetSelection = {
  student: { id: string; fullName: string };
  title: string;
  status: string;
  charge: SheetCharge;
};

const periods = { month: "Mês", term: "Trimestre", year: "Ano" } as const;
const monthFormatter = new Intl.DateTimeFormat("pt-MZ", { month: "long", timeZone: "UTC" });

function monthName(month: string) {
  const label = monthFormatter.format(new Date(month + "-01T00:00:00Z"));
  return label[0].toLocaleUpperCase("pt-MZ") + label.slice(1);
}

const states = {
  unconfigured: { label: "Preço por configurar", color: "bg-amber-50 text-amber-900" },
  forecast: { label: "Previsto", color: "bg-sky-50 text-sky-900" },
  cancelled: { label: "Anulada", color: "bg-slate-100 text-slate-700" },
  scholarship: { label: "Bolseiro", color: "bg-teal-50 text-teal-900" },
  exempt: { label: "Isento", color: "bg-teal-50 text-teal-900" },
  settled: { label: "Pago", color: "bg-teal-50 text-teal-900" },
  partial: { label: "Parcial", color: "bg-amber-50 text-amber-900" },
  overdue: { label: "Em atraso", color: "bg-rose-50 text-rose-900" },
  open: { label: "A vencer", color: "bg-sky-50 text-sky-900" },
} as const;

function chargeState(charge: SheetCharge, today: string) {
  const state = states[charge.status];
  if (charge.status === "settled" && charge.penaltyPaidCents > 0) return { ...state, label: "Pago com multa" };
  if (charge.status === "partial") {
    if (charge.principalPaidCents >= charge.dueCents && charge.penaltyPaidCents < charge.penaltyCents) {
      return { ...state, label: "Multa por pagar" };
    }
    if (charge.dueOn < today) return { ...state, label: "Parcial em atraso" };
  }
  return state;
}

function ChargeCell({ row, charge, title, today, open, showTitle = false }: {
  row: SheetRow; charge?: SheetCharge; title: string; today: string; open(value: SheetSelection): void; showTitle?: boolean;
}) {
  if (!charge) return <span className="text-slate-500">Não aplicável</span>;
  const { label, color } = chargeState(charge, today);
  const status = charge.pendingProof ? label + " · Em análise" : label;
  return <button type="button"
    aria-label={row.fullName + ", " + title + ", " + status}
    onClick={() => open({ student: { id: row.studentId, fullName: row.fullName }, title, status, charge })}
    className={"grid min-h-11 w-full gap-0.5 rounded-lg px-2 py-1.5 text-left leading-snug hover:ring-1 focus-visible:ring-2 focus-visible:ring-teal-700 " + color}>
    {showTitle && <span className="font-semibold [overflow-wrap:anywhere]">{title}</span>}
    <span className={showTitle ? "text-xs" : "font-semibold"}>{label}</span>
    {charge.pendingProof && <span className="text-xs font-semibold">Em análise</span>}
    {charge.status !== "unconfigured" && charge.outstandingCents > 0 &&
      <span className="text-xs">{money(charge.outstandingCents)}</span>}
  </button>;
}

async function listChoices<T>(fetchPage: (page: number) => Promise<{ items: T[]; total: number; limit: number }>) {
  const first = await fetchPage(1);
  const items = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / first.limit); page += 1) {
    items.push(...(await fetchPage(page)).items);
  }
  return items;
}

export function ClassPaymentSheet({ year, revision, openAccount, openCharge }: {
  year: Year; revision: number; openAccount(id: string): void; openCharge(value: SheetSelection): void;
}) {
  const [classId, setClassId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<keyof typeof periods>("month");
  const [monthChoice, setMonthChoice] = useState("");
  const classes = useRemote(year.id, signal => listChoices(page =>
    apiRequest("GET", "/api/v1/classes", { query: { yearId: year.id, page, limit: 100 }, signal })));
  const groups = useRemote(classId || null, signal => listChoices(page =>
    apiRequest("GET", "/api/v1/groups", { query: { classId, yearId: year.id, page, limit: 100 }, signal })));
  const sheet = useRemote(groupId ? JSON.stringify([groupId, page]) : null, signal =>
    apiRequest("GET", "/api/v1/finance/groups/{id}/payment-sheet", { params: { id: groupId }, query: { page, limit: 100 }, signal }));
  const refreshSheet = sheet.refresh;
  const viewedRevision = useRef(revision);
  useEffect(() => {
    if (viewedRevision.current === revision) return;
    viewedRevision.current = revision;
    refreshSheet();
  }, [revision, refreshSheet]);

  const data = sheet.value;
  const months = data?.months ?? [...year.billingMonths].sort();
  const currentMonth = (data?.today ?? schoolDay()).slice(0, 7);
  const month = months.includes(monthChoice) ? monthChoice : months.find(item => item >= currentMonth) ?? months.at(-1) ?? "";
  const termStart = Math.floor(Math.max(0, months.indexOf(month)) / 3) * 3;
  const visibleMonths = period === "year" ? months : period === "term" ? months.slice(termStart, termStart + 3) : months.filter(item => item === month);
  const widerColumns = period === "month" ? "hidden sm:table-cell" : "";

  return <section className="grid min-w-0 gap-3">
    <div className="lss-responsive-card grid gap-4" data-wide="true">
      <Heading title="Planilha financeira da turma" detail={data ? "Pauta em " + dateLabel(data.on) : undefined} />
      <ResourceState {...classes} retry={classes.refresh} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Classe" value={classId} disabled={!classes.value} onChange={event => {
          setClassId(event.target.value);
          setGroupId("");
          setPage(1);
        }}>
          <option value="">Seleccione a classe</option>
          {classes.value?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select label="Turma" value={groupId} disabled={!groups.value?.length} onChange={event => {
          setGroupId(event.target.value);
          setPage(1);
        }}>
          <option value="">Seleccione a turma</option>
          {groups.value?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        {period !== "year" && months.length > 0 && <Select label={period === "term" ? "Mês de referência" : "Mês"}
          value={month} onChange={event => setMonthChoice(event.target.value)}>
          {months.map(item => <option key={item} value={item}>{monthName(item)}</option>)}
        </Select>}
      </div>
      <ResourceState {...groups} retry={groups.refresh} />
      {groups.value?.length === 0 && <p className="text-sm text-slate-600">Sem turmas na classe seleccionada.</p>}
    </div>
    <div className="lss-action-row" data-edge-to-edge role="group" aria-label="Período da planilha">
      {Object.entries(periods).map(([value, label]) => <Button key={value} aria-pressed={period === value}
        variant={period === value ? "contained" : "text"} onClick={() => setPeriod(value as keyof typeof periods)}>{label}</Button>)}
    </div>
    <ResourceState loading={sheet.loading && !data} error={sheet.error} retry={refreshSheet} />
    {data && (data.items.length ? <>
      <div role="region" aria-label="Grelha de propinas" tabIndex={0} aria-busy={sheet.loading || undefined}
        className="max-h-[65vh] min-w-0 max-w-full overflow-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-teal-700">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 sm:min-w-48">Aluno</th>
              <th scope="col" className={"min-w-28 border-b border-slate-200 px-3 py-2 sm:min-w-36 " + widerColumns}>Inscrição</th>
              {visibleMonths.map(item => <th key={item} scope="col"
                className="min-w-28 border-b border-slate-200 px-3 py-2 sm:min-w-36">{monthName(item)}</th>)}
              <th scope="col" className="min-w-32 border-b border-slate-200 px-3 py-2 sm:min-w-40">Extras</th>
              <th scope="col" className={"whitespace-nowrap border-b border-slate-200 px-3 py-2 " + widerColumns}>Saldo emitido</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(row => {
              const registration = row.charges.find(charge => charge.kind === "registration");
              const tuition = new Map(row.charges.filter(charge => charge.kind === "tuition").map(charge => [charge.competence, charge]));
              const extras = row.charges.filter(charge => charge.kind === "extra").sort((a, b) =>
                a.competence.localeCompare(b.competence) || a.label.localeCompare(b.label));
              return <tr key={row.enrollmentId} className="bg-white">
                <th scope="row" className="sticky left-0 z-10 max-w-48 border-b border-r border-slate-100 bg-white px-3 py-2 align-top">
                  <button type="button" onClick={() => openAccount(row.studentId)}
                    className="min-h-11 text-left font-semibold text-teal-900 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700">{row.fullName}</button>
                  <span className="block text-xs font-normal text-slate-600">N.º {row.rosterNumber} · {row.permanentNumber}</span>
                </th>
                <td className={"border-b border-slate-100 p-2 align-top " + widerColumns}>
                  <ChargeCell row={row} charge={registration} title={registration?.label ?? "Inscrição"}
                    today={data.today} open={openCharge} />
                </td>
                {visibleMonths.map(item => <td key={item} className="border-b border-slate-100 p-2 align-top">
                  <ChargeCell row={row} charge={tuition.get(item)} title={"Propina de " + monthName(item)}
                    today={data.today} open={openCharge} />
                </td>)}
                <td className="max-w-48 border-b border-slate-100 p-2 align-top">
                  {extras.length > 0 ? <div className="grid gap-1">{extras.map(extra =>
                    <ChargeCell key={extra.id} row={row} charge={extra} title={extra.label} showTitle today={data.today} open={openCharge} />
                  )}</div> : <span className="px-1 text-slate-500" aria-label="Sem cobranças extra">—</span>}
                </td>
                <td className={"whitespace-nowrap border-b border-slate-100 p-3 align-top font-semibold " + widerColumns}>{money(row.balanceCents)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <Paging {...data} change={setPage} />
    </> : <p className="text-sm text-slate-600">Sem alunos na pauta da turma.</p>)}
  </section>;
}
