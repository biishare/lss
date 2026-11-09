"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { StudentSearch } from "./student-search";
import { TaskSurface } from "../../components/task-surface";
import type { DemoState } from "../demo/demo-state";
import type { BillingCommand } from "./billing-commands";
import { billingForecast } from "./billing-commands";
import { academicStateFor, projectStudents } from "../academics/model";
import { monthOptions } from "../../lib/school-demo-data";
import { benefitFor, defaultRule, effectiveAmount, effectiveBenefitLabel, schoolToday, validateRule } from "./domain/billing";
import { cents, money, percentage, sumMoney } from "./domain/money";
import type { FinancialAid, PaymentRuleVersion } from "./domain/entities";

const currency = (value: number) => new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(value);
const cell = "px-3 py-3 text-left align-top whitespace-nowrap";
export function RulesWorkspace({ state, yearId, mode, readOnly, execute, recordedAt }: {
  state: DemoState; yearId: string; mode: "rules" | "aid"; readOnly: boolean;
  execute(command: BillingCommand, id: string): void; recordedAt: string;
}) {
  const academic = useMemo(() => academicStateFor(state), [state]);
  const today = schoolToday({ now: () => recordedAt });
  const students = projectStudents(state, academic, today).filter((student) => student.academicYearId === yearId);
  const year = academic.years.find((item) => item.id === yearId);
  const [studentId, setStudentId] = useState("");
  const selectedId = students.some((student) => student.id === studentId) ? studentId : "";
  const [choosingStudent, setChoosingStudent] = useState(false);
  const student = students.find((item) => item.id === selectedId), record = state.paymentRecords.find((item) => item.studentId === selectedId);
  const forecast = student ? billingForecast(state, student.id, recordedAt) : [];
  const levels = [...new Map(state.classes.filter((item) => item.academicYear === yearId).map((item) => { const id = state.classDefinitions.find((definition) => definition.id === (item.definitionId ?? item.educationLevelId ?? item.id))?.stageId ?? item.educationLevelId ?? item.id; return [id, { id, name: state.academicStages.find((level) => level.id === id)?.name ?? item.stage }]; })).values()];
  const [ruleAmounts, setRuleAmounts] = useState({ inscriptionFee: "", monthlyFee: "" });
  const [rule, setRule] = useState<PaymentRuleVersion | null>(null);
  const [aid, setAid] = useState<FinancialAid | null>(null);
  const [retroactive, setRetroactive] = useState(false);
  const [review, setReview] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [revoke, setRevoke] = useState<{ id: string; on: string; reason: string } | null>(null);
  const [commandId, setCommandId] = useState("");
  const [initialTask, setInitialTask] = useState("");
  const changeRule = (patch: Partial<PaymentRuleVersion>) => { setRule((value) => value ? { ...value, ...patch } : value); setReview(false); setError(""); };
  const changeAid = (patch: Partial<FinancialAid>) => { setAid((value) => value ? { ...value, ...patch } : value); setReview(false); setError(""); };
  function openRule() {
    if (!year || !levels.length) return;
    const example = students.find((student) => (student.pricingLevelId ?? student.educationLevelId) === levels[0].id) ?? { ...students[0], academicYearId: yearId, pricingLevelId: levels[0].id, educationLevelId: levels[0].id };
    const template = defaultRule(example, year.settings, state.paymentRuleVersions, recordedAt);
    setRuleAmounts({ inscriptionFee: String(template.inscriptionFee), monthlyFee: String(template.monthlyFee) });
    const next = { ...template, validFrom: today < year.startsOn ? year.startsOn : today > year.endsOn ? year.endsOn : today, reason: "" };
    setRule(next); setInitialTask(JSON.stringify(next));
    setReview(false); setError(""); setCommandId(crypto.randomUUID());
  }
  function openAid() {
    if (!student) return;
    const next: FinancialAid = { id: "", enrollmentId: student.enrollmentId ?? student.id, kind: "partial_scholarship", percent: 50, appliesToRegistration: false, appliesToTuition: true, effectiveFrom: today < year!.startsOn ? year!.startsOn : today, reason: "", authorizedBy: "", registeredBy: "", registeredAt: "" };
    setAid(next); setInitialTask(JSON.stringify(next));
    setRetroactive(false); setReview(false); setError(""); setCommandId(crypto.randomUUID());
  }
  function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (rule) { cents(ruleAmounts.inscriptionFee); cents(ruleAmounts.monthlyFee); validateRule(rule); }
      if (!review) { setReview(true); return; }
      if (rule) execute({ type: "rule", rule }, commandId);
      else if (aid) execute({ type: "aid", studentId: selectedId, aid, retroactive }, commandId);
      else if (revoke) execute({ type: "revoke-aid", studentId: selectedId, aidId: revoke.id, on: revoke.on, reason: revoke.reason }, commandId);
      setRule(null); setAid(null); setRevoke(null); setReview(false); setNotice("Alteração guardada. Os valores e o histórico foram actualizados.");
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível guardar."); }
  }
  const aidPreview = aid && record ? forecast.filter(({ item }) => retroactive || item.issueOn >= today).map(({ item, issued, forecast }) => {
    const benefit = benefitFor([...(record.financialAid ?? []), aid], item), charge = issued ?? forecast;
    if (!charge) return null;
    const base = cents(charge.baseAmount ?? charge.amount), after = money(base - percentage(base, Math.max(charge.snapshot?.discountPercent ?? 0, benefit.percent))), before = effectiveAmount(charge);
    const paid = sumMoney(record.allocations.filter((allocation) => allocation.chargeId === charge.id).map((allocation) => allocation.amount));
    return { id: item.id, label: charge.description, before, after: Math.min(before, after), credit: Math.max(0, money(Math.max(0, cents(paid) - cents(after)))) };
  }).filter((item) => item && item.before !== item.after) : [];
  return <Stack spacing={2}>
    {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
    {mode === "rules" ? <Box className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}><div><Typography variant="h6">Regras de cobrança · {year?.label ?? yearId}</Typography><Typography variant="body2" color="text.secondary">As cobranças emitidas conservam o preço e a regra da sua emissão.</Typography></div>{!readOnly && <Button variant="contained" disabled={!levels.length || year?.status === "closed"} onClick={openRule}>Nova vigência</Button>}</Stack>
      <div className="mt-4 max-w-full overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Nível / versão", "Vigência", "Inscrição", "Mensalidade", "Multa", "Registo"].map((label) => <th className={cell} key={label}>{label}</th>)}</tr></thead><tbody>{state.paymentRuleVersions.filter((item) => item.academicYearId === yearId).map((item) => <tr key={item.id} className="border-t border-slate-100"><td className={cell}>{levels.find((level) => level.id === item.educationLevelId)?.name ?? state.classDefinitions.find((definition) => definition.id === item.educationLevelId)?.name ?? item.educationLevelId} · v{item.version}</td><td className={cell}>{item.validFrom} → {item.supersededBy ? "Substituída antes da emissão" : item.validUntil ?? "em vigor"}</td><td className={cell}>{currency(item.inscriptionFee)}</td><td className={cell}>{currency(item.monthlyFee)}</td><td className={cell}>{item.calculationVersion === "v3" ? <>{item.penaltyPolicy?.firstPercent}% · {item.penaltyPolicy?.firstAfterDays} dia(s) após vencimento<br />{item.penaltyPolicy?.secondEnabled ? `${item.penaltyPolicy.secondPercent}% acumulados · ${item.penaltyPolicy.secondAfterDays} dias` : "Uma única etapa"}<br />Só mensalidades</> : "Regra anterior preservada"}</td><td className={cell}>{item.registeredBy ?? "Origem anterior"}<br />{item.reason}</td></tr>)}</tbody></table></div>
    </Box> : <Box className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <Stack spacing={2}><Typography variant="h6">Benefícios e calendário individual</Typography>{!student || choosingStudent ? <StudentSearch students={students} label="Pesquisar matrícula para benefício" onChoose={(item) => { setStudentId(item.id); setChoosingStudent(false); }} /> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{student.fullName} · {student.registrationNumber}</p><Button onClick={() => setChoosingStudent(true)}>Alterar matrícula</Button></div>}
        {student?.financialProfile.status === "weighted" && <Alert severity="warning">Esta condição anterior precisa de revisão. Os valores originais foram conservados.</Alert>}
        {student && !readOnly && <Button variant="outlined" onClick={openAid}>Adicionar benefício</Button>}
        {(record?.financialAid ?? []).map((item) => <Box key={item.id} className="rounded border border-slate-200 p-3"><Typography>{item.kind === "exception" ? "Isenção temporária" : item.kind === "scholarship" ? "Bolsa integral" : "Bolsa/desconto"} · {item.percent}%{item.revokedOn ? ` · termina em ${item.revokedOn}` : ""}</Typography><Typography variant="body2">{item.appliesToRegistration ? "Inscrição e " : ""}{item.appliesToTuition ? "mensalidades" : "inscrição"} · {monthOptions.find((month) => month.key === item.startMonth)?.label ?? "início"} a {monthOptions.find((month) => month.key === item.endMonth)?.label ?? "fim"} · {item.reason}</Typography><Typography variant="caption">{item.registeredBy} · {item.registeredAt}{item.authorizationReference ? ` · ${item.authorizationReference}` : ""}</Typography>{!readOnly && !item.revokedOn && <Button size="small" onClick={() => { const next = { id: item.id, on: today, reason: "" }; setRevoke(next); setInitialTask(JSON.stringify(next)); setReview(false); setError(""); setCommandId(crypto.randomUUID()); }}>Terminar benefício</Button>}</Box>)}
        <div className="max-w-full overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Item", "Estado", "Base", "Benefício", "Devido", "Vencimento / regra"].map((label) => <th className={cell} key={label}>{label}</th>)}</tr></thead><tbody>{forecast.map(({ item, issued, forecast }) => { const charge = issued ?? forecast; return <tr key={item.id} className="border-t border-slate-100"><td className={cell}>{charge?.description ?? item.competence}</td><td className={cell}>{issued ? effectiveAmount(issued) === 0 ? effectiveBenefitLabel(issued)?.includes("Bolsa") ? "Bolseiro" : "Isento" : "Emitido" : "Previsto"}</td><td className={cell}>{charge ? currency(charge.baseAmount ?? charge.amount) : "—"}</td><td className={cell}>{charge ? effectiveBenefitLabel(charge) ?? "Regular" : "Regra por configurar"}</td><td className={cell}>{charge ? currency(effectiveAmount(charge)) : "Por configurar"}</td><td className={cell}>{charge?.dueOn}<br />{charge?.snapshot?.ruleVersion ? `Versão ${charge.snapshot.ruleVersion}` : "Regra anterior"}</td></tr>; })}</tbody></table></div>
        {!!record?.penaltyCharges?.length && <div><Typography variant="subtitle1">Multas</Typography>{record.penaltyCharges.map((penalty) => <Typography key={penalty.id} variant="body2">{penalty.effectiveOn} · base {currency(penalty.snapshot.baseBalance)} × {penalty.snapshot.percent}% = {currency(penalty.amount)}{penalty.adjustedAmount !== undefined ? ` · após correcção ${currency(penalty.adjustedAmount)}` : ""}</Typography>)}</div>}
        {!!record?.financialAdjustments?.length && <div><Typography variant="subtitle1">Ajustamentos</Typography>{record.financialAdjustments.map((item) => <Typography key={item.id} variant="body2">{item.recordedAt} · {currency(item.previousAmount)} → {currency(item.nextAmount)} · {item.reason} · {item.evidenceReference} · {item.recordedBy}</Typography>)}</div>}
      </Stack>
    </Box>}
    <TaskSurface open={Boolean(rule || aid || revoke)} title={rule ? "Nova vigência" : aid ? "Adicionar benefício" : "Terminar benefício"} mobile="full-screen"
      dirty={JSON.stringify(rule ?? aid ?? revoke) !== initialTask || Boolean(aid && retroactive)}
      onClose={() => { setRule(null); setAid(null); setRevoke(null); }}
      actions={(close) => <><Button onClick={close}>Cancelar</Button><Button variant="contained" type="submit" form="rules-task-form">{review ? "Confirmar alteração" : "Rever efeito"}</Button></>}>
      <Box component="form" id="rules-task-form" onSubmit={save}><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {rule && <><TextField select label="Nível" value={rule.educationLevelId} onChange={(event) => changeRule({ educationLevelId: event.target.value })}>{levels.map((level) => <MenuItem key={level.id} value={level.id}>{level.name}</MenuItem>)}</TextField><TextField required type="date" label="Em vigor a partir de" slotProps={{ inputLabel: { shrink: true } }} value={rule.validFrom} onChange={(event) => changeRule({ validFrom: event.target.value })} />
          <TextField required label="Inscrição (MT)" value={ruleAmounts.inscriptionFee} onChange={(event) => { setRuleAmounts({ ...ruleAmounts, inscriptionFee: event.target.value }); changeRule({ inscriptionFee: Number(event.target.value) }); }} type="number" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} /><TextField required label="Mensalidade (MT)" value={ruleAmounts.monthlyFee} onChange={(event) => { setRuleAmounts({ ...ruleAmounts, monthlyFee: event.target.value }); changeRule({ monthlyFee: Number(event.target.value) }); }} type="number" slotProps={{ htmlInput: { min: 0, step: "0.01" } }} /><TextField required label="Dia do vencimento" type="number" value={rule.monthlyDueDay} onChange={(event) => changeRule({ monthlyDueDay: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1, max: 31 } }} />
          <Typography variant="body2">Meses: {rule.coveredMonthKeys.map((key) => monthOptions.find((item) => item.key === key)?.shortLabel).join(", ")}. O calendário é configurado no ano lectivo.</Typography>
          <TextField required label="Multa simples (%)" type="number" value={rule.penaltyPolicy!.firstPercent} onChange={(event) => changeRule({ penaltyPolicy: { ...rule.penaltyPolicy!, firstPercent: Number(event.target.value) } })} slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }} /><TextField required label="Dias após o vencimento" type="number" value={rule.penaltyPolicy!.firstAfterDays} onChange={(event) => changeRule({ penaltyPolicy: { ...rule.penaltyPolicy!, firstAfterDays: Number(event.target.value) } })} />
          <FormControlLabel control={<Checkbox checked={rule.penaltyPolicy!.secondEnabled} onChange={(event) => changeRule({ penaltyPolicy: { ...rule.penaltyPolicy!, secondEnabled: event.target.checked } })} />} label="Activar segunda etapa" />
          {rule.penaltyPolicy!.secondEnabled && <><TextField required label="Segunda taxa acumulada (%)" type="number" value={rule.penaltyPolicy!.secondPercent} onChange={(event) => changeRule({ penaltyPolicy: { ...rule.penaltyPolicy!, secondPercent: Number(event.target.value) } })} /><TextField required label="Segunda etapa: dias após vencimento" type="number" value={rule.penaltyPolicy!.secondAfterDays} onChange={(event) => changeRule({ penaltyPolicy: { ...rule.penaltyPolicy!, secondAfterDays: Number(event.target.value) } })} /></>}
          <TextField required label="Motivo" value={rule.reason ?? ""} onChange={(event) => changeRule({ reason: event.target.value })} />
          {review && <Alert severity="info">Inscrição {currency(rule.inscriptionFee)}; mensalidade {currency(rule.monthlyFee)}. Multa simples de {rule.penaltyPolicy!.firstPercent}%, apenas sobre principal em atraso. As cobranças já emitidas mantêm os valores.</Alert>}</>}
        {aid && <><TextField select label="Tipo de benefício" value={aid.kind} onChange={(event) => changeAid({ kind: event.target.value as FinancialAid["kind"], percent: event.target.value === "partial_scholarship" ? 50 : 100, appliesToRegistration: event.target.value === "scholarship", appliesToTuition: true })}><MenuItem value="scholarship">Bolsa integral</MenuItem><MenuItem value="partial_scholarship">Bolsa parcial / desconto</MenuItem><MenuItem value="exception">Isenção temporária</MenuItem></TextField>
          <TextField required label="Percentagem" type="number" disabled={aid.kind !== "partial_scholarship"} value={aid.percent} onChange={(event) => changeAid({ percent: Number(event.target.value) })} slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }} /><TextField required type="date" label="Início do benefício" value={aid.effectiveFrom ?? ""} onChange={(event) => changeAid({ effectiveFrom: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <FormControlLabel control={<Checkbox disabled={aid.kind === "scholarship"} checked={aid.appliesToRegistration} onChange={(event) => changeAid({ appliesToRegistration: event.target.checked })} />} label="Abrange inscrição" /><FormControlLabel control={<Checkbox disabled={aid.kind === "scholarship"} checked={aid.appliesToTuition} onChange={(event) => changeAid({ appliesToTuition: event.target.checked })} />} label="Abrange mensalidades" />
          {(["startMonth", "endMonth"] as const).map((field) => <TextField key={field} select label={field === "startMonth" ? "Mês inicial" : "Mês final"} value={aid[field] ?? ""} onChange={(event) => changeAid({ [field]: event.target.value || undefined })}><MenuItem value="">Todo o período</MenuItem>{monthOptions.filter((item) => year?.billingMonths.includes(item.key)).map((month) => <MenuItem key={month.key} value={month.key}>{month.label}</MenuItem>)}</TextField>)}
          <TextField required label="Motivo" value={aid.reason ?? ""} onChange={(event) => changeAid({ reason: event.target.value })} /><TextField label="Autorizado por" value={aid.authorizedBy} onChange={(event) => changeAid({ authorizedBy: event.target.value })} /><TextField label="Referência de autorização" value={aid.authorizationReference ?? ""} onChange={(event) => changeAid({ authorizationReference: event.target.value })} /><FormControlLabel control={<Checkbox checked={retroactive} onChange={(event) => { setRetroactive(event.target.checked); setReview(false); }} />} label="Aplicar também a cobranças já emitidas (retroactivo)" />
          {review && <Alert severity="info">Aplica-se o maior benefício elegível. Extras mantêm-se independentes.{aidPreview.length ? aidPreview.map((item) => item && <div key={item.id}>{item.label}: {currency(item.before)} → {currency(item.after)}{item.credit > 0 ? `; crédito ${currency(item.credit)}` : ""}</div>) : <div>Sem alteração nas cobranças existentes; será aplicado às futuras elegíveis.</div>}</Alert>}</>}
        {revoke && <><TextField required type="date" label="Termina a partir de" value={revoke.on} onChange={(event) => { setRevoke({ ...revoke, on: event.target.value }); setReview(false); }} slotProps={{ inputLabel: { shrink: true } }} /><TextField required label="Motivo" value={revoke.reason} onChange={(event) => { setRevoke({ ...revoke, reason: event.target.value }); setReview(false); }} />{review && <Alert severity="info">O benefício deixa de se aplicar a partir desta data. Cobranças emitidas conservam o histórico.</Alert>}</>}
      </Stack></Box>
    </TaskSurface>
  </Stack>;
}
