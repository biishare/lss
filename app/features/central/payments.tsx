"use client";

import { Activity, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { TaskSurface } from "../../components/task-surface";
import { apiRequest, type Schema } from "./client";
import { CommandDialog, DateField, Heading, Paging, RecordList, ResourceState, Select } from "./controls";
import { extraChargeTitle, SchoolExtraTask, StudentExtraTask } from "./extra-charges";
import { cents, dateLabel, methods, money, schoolDay, statuses, text } from "./format";
import { ClassPaymentSheet, type SheetSelection } from "./payment-sheet";
import { PreviewTask } from "./preview-task";
import { Receipt } from "./receipts";
import { StudentSearch, type Student } from "./students";
import { useRemote } from "./use-remote";
import type { Year } from "./workspace";

type Charge = Schema<"FinanceCharge">;
type Payment = Schema<"FinancePayment">;
type Proof = Schema<"FinanceProof">;
type ReceiptData = Schema<"FinanceReceipt">;
type Mode = "payment" | "proof" | "credit" | "refund" | "extra" | "benefit";
type Operation = { kind: Mode } | { kind: "correction"; payment: Payment } |
  { kind: "review"; proof: Proof } | { kind: "adjust"; charge: Charge };

const labels = {
  payment: "Registar pagamento", proof: "Registar comprovativo", credit: "Aplicar crédito",
  refund: "Devolver crédito", extra: extraChargeTitle, benefit: "Registar benefício",
  correction: "Corrigir pagamento", review: "Conferir comprovativo", adjust: "Ajustar cobrança",
} as const;

function MethodField({ initial = "cash" }: { initial?: keyof typeof methods }) {
  return <Select label="Meio de pagamento" name="method" defaultValue={initial} required>
    {Object.entries(methods).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
  </Select>;
}

function ChargeFields({ charges, initialChargeId }: { charges: Charge[]; initialChargeId?: string }) {
  return <fieldset className="grid gap-1 border-0 p-0">
    <legend className="mb-1 text-sm font-semibold">Cobranças a liquidar</legend>
    {charges.map(charge => <FormControlLabel key={charge.id} label={charge.label + " · " + money(charge.outstandingCents)}
      control={<Checkbox name="chargeId" value={charge.id} defaultChecked={charge.id === initialChargeId} />} />)}
    {charges.length === 0 && <p className="text-sm text-slate-600">Sem cobranças com saldo nesta página.</p>}
  </fieldset>;
}

function PaymentFields({ charges, payment, initialChargeId }: { charges: Charge[]; payment?: Payment; initialChargeId?: string }) {
  const initialAmount = payment?.amountCents ?? charges.find(charge => charge.id === initialChargeId)?.outstandingCents;
  const amount = initialAmount === undefined ? "" :
    Math.floor(initialAmount / 100) + "." + String(initialAmount % 100).padStart(2, "0");
  return <>
    <TextField label="Valor em MT" name="amount" required defaultValue={amount}
      slotProps={{ htmlInput: { inputMode: "decimal" } }} />
    <DateField label="Data efectiva" name="effectiveOn" defaultValue={payment?.effectiveOn ?? schoolDay()} required />
    <MethodField initial={payment?.method} />
    <TextField label="Referência" name="reference" defaultValue={payment?.reference ?? ""} />
    <ChargeFields charges={charges} initialChargeId={initialChargeId} />
    <FormControlLabel control={<Checkbox name="asCredit" />} label="Manter o valor como crédito" />
  </>;
}

function paymentInput(studentId: string, data: FormData): Schema<"FinancePaymentInput"> {
  return { studentId, amountCents: cents(data.get("amount")), effectiveOn: text(data, "effectiveOn"),
    method: text(data, "method") as keyof typeof methods, reference: text(data, "reference") || null,
    chargeIds: data.getAll("chargeId").map(String), asCredit: data.has("asCredit") };
}

function PaymentReview({ result }: { result: { amountCents: number; allocatedCents?: number; creditCents?: number; lines?: Schema<"FinanceLine">[] } }) {
  return <div className="grid gap-3">
    <p className="text-lg font-semibold">{money(result.amountCents)}</p>
    {result.allocatedCents !== undefined && <p>Valor aplicado <strong>{money(result.allocatedCents)}</strong></p>}
    {result.creditCents !== undefined && <p>Crédito após a operação <strong>{money(result.creditCents)}</strong></p>}
    {result.lines && <RecordList rows={result.lines.map(line => ({ ...line, id: line.chargeId }))} empty="Sem aplicações a cobranças."
      render={line => <><span>{line.label} · {line.competence}</span><strong>{money(line.principalCents + line.penaltyCents)}</strong></>} />}
  </div>;
}

function FinanceTask({ op, student, year, charges, initialChargeId, close, change }: {
  op: Operation; student: Pick<Student, "id" | "fullName">; year?: Year; charges: Charge[];
  initialChargeId?: string; close(): void;
  change(message: string, receipt?: ReceiptData): void;
}) {
  const studentId = student.id;
  const common = { title: labels[op.kind], subtitle: student.fullName, close };
  const openCharges = charges.filter(entry => entry.outstandingCents > 0);
  const confirmed = (result: Schema<"FinancePaymentResult">) => change("Pagamento confirmado.", result.receipt);

  if (op.kind === "payment") return <PreviewTask {...common}
    prepare={data => paymentInput(studentId, data)}
    preview={body => apiRequest("POST", "/api/v1/finance/payments/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/payments", { body: { ...body, previewToken }, key })}
    review={result => <PaymentReview result={result} />} label="Confirmar pagamento" complete={confirmed}>
    <PaymentFields charges={openCharges} initialChargeId={initialChargeId} />
  </PreviewTask>;

  if (op.kind === "proof") return <CommandDialog {...common}
    submit={(data, key) => apiRequest("POST", "/api/v1/finance/proofs", { body: { ...paymentInput(studentId, data), evidence: text(data, "evidence") }, key })}
    completed={() => change("Comprovativo registado para conferência.")}>
    <PaymentFields charges={openCharges} />
    <TextField label="Dados do comprovativo" name="evidence" multiline minRows={2} required />
  </CommandDialog>;

  if (op.kind === "review") {
    const params = { id: op.proof.id };
    return <PreviewTask {...common}
      prepare={data => ({ decision: text(data, "decision") as "confirmed" | "rejected", reason: text(data, "reason") })}
      preview={async data => data.decision === "confirmed"
        ? apiRequest("POST", "/api/v1/finance/proofs/{id}/preview", { params }) : null}
      submit={(body, result, key) => apiRequest("POST", "/api/v1/finance/proofs/{id}/decision", { params, key,
        body: result ? { decision: "confirmed", reason: body.reason, previewToken: result.previewToken } : { decision: "rejected", reason: body.reason } })}
      review={result => result ? <PaymentReview result={result} /> : <Alert severity="warning">Confirme a rejeição deste comprovativo.</Alert>}
      complete={result => change("Conferência registada.", "receipt" in result ? result.receipt : undefined)}>
      <p>{money(op.proof.intent.amountCents)} · {methods[op.proof.intent.method]} · {dateLabel(op.proof.intent.effectiveOn)}</p>
      <p className="break-words">{op.proof.evidence}</p>
      <Select label="Resultado da conferência" name="decision" defaultValue="confirmed" required>
        <option value="confirmed">Confirmar recebimento</option><option value="rejected">Rejeitar comprovativo</option>
      </Select>
      <TextField label="Motivo" name="reason" required />
    </PreviewTask>;
  }

  if (op.kind === "correction") {
    const params = { id: op.payment.id };
    return <PreviewTask {...common}
      prepare={data => ({ replacement: paymentInput(studentId, data), reason: text(data, "reason") })}
      preview={body => apiRequest("POST", "/api/v1/finance/payments/{id}/corrections/preview", { params, body })}
      submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/payments/{id}/corrections", {
        params, body: { ...body, previewToken }, key,
      })}
      review={result => <><Alert severity="warning">A correcção substitui o recebimento e preserva o histórico.</Alert>
        <PaymentReview result={result} /></>}
      complete={(result) => change("Correcção confirmada.", result.receipt)}>
      <PaymentFields charges={charges.filter(item => item.status !== "cancelled")} payment={op.payment} />
      <TextField label="Motivo da correcção" name="reason" required />
    </PreviewTask>;
  }

  if (op.kind === "credit") return <PreviewTask {...common}
    prepare={data => ({ studentId, amountCents: cents(data.get("amount")), effectiveOn: text(data, "effectiveOn"),
      chargeIds: data.getAll("chargeId").map(String) })}
    preview={body => apiRequest("POST", "/api/v1/finance/credit/applications/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/credit/applications", { body: { ...body, previewToken }, key })}
    review={result => <PaymentReview result={result} />} complete={() => change("Crédito aplicado.")}>
    <TextField label="Valor em MT" name="amount" required slotProps={{ htmlInput: { inputMode: "decimal" } }} />
    <DateField label="Data efectiva" name="effectiveOn" defaultValue={schoolDay()} required />
    <ChargeFields charges={openCharges} />
  </PreviewTask>;

  if (op.kind === "refund") return <PreviewTask {...common}
    prepare={data => ({ studentId, amountCents: cents(data.get("amount")), effectiveOn: text(data, "effectiveOn"),
      method: text(data, "method") as keyof typeof methods, reason: text(data, "reason") })}
    preview={body => apiRequest("POST", "/api/v1/finance/refunds/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/refunds", { body: { ...body, previewToken }, key })}
    review={result => <PaymentReview result={result} />} complete={() => change("Devolução registada.")}>
    <TextField label="Valor em MT" name="amount" required slotProps={{ htmlInput: { inputMode: "decimal" } }} />
    <DateField label="Data efectiva" name="effectiveOn" defaultValue={schoolDay()} required />
    <MethodField /><TextField label="Motivo da devolução" name="reason" required />
  </PreviewTask>;

  if (op.kind === "adjust") {
    const params = { id: op.charge.id };
    return <PreviewTask {...common}
      prepare={data => ({ revision: op.charge.revision, dueCents: cents(data.get("amount")), cancel: data.has("cancel"),
        effectiveOn: text(data, "effectiveOn"), reason: text(data, "reason") })}
      preview={body => apiRequest("POST", "/api/v1/finance/charges/{id}/adjustments/preview", { params, body })}
      submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/charges/{id}/adjustments", {
        params, body: { ...body, previewToken }, key,
      })}
      review={result => <p>Valor devido {money(result.charge.dueCents)} · Crédito libertado {money(result.creditReleasedCents)}</p>}
      complete={() => change("Cobrança actualizada.")}>
      <TextField label="Novo valor devido em MT" name="amount" required defaultValue={(op.charge.dueCents / 100).toFixed(2)} />
      <FormControlLabel control={<Checkbox name="cancel" />} label="Anular a cobrança com valor devido zero" />
      <DateField label="Data efectiva" name="effectiveOn" defaultValue={schoolDay()} required /><TextField label="Motivo" name="reason" required />
    </PreviewTask>;
  }

  if (op.kind === "benefit") return <PreviewTask {...common}
    prepare={(data): Schema<"FinanceBenefitInput"> => {
      const percent = cents(data.get("percent"));
      return { studentId, enrollmentId: null, authorizationReference: text(data, "authorizationReference") || null,
        kind: text(data, "kind") as Schema<"FinanceBenefitInput">["kind"], basisPoints: percent,
        kinds: data.getAll("kindOfCharge").map(String) as Schema<"FinanceBenefitInput">["kinds"],
        fromMonth: text(data, "fromMonth"), throughMonth: text(data, "throughMonth"),
        mode: data.has("retroactive") ? "retroactive" : "future", reason: text(data, "reason") };
    }}
    preview={body => apiRequest("POST", "/api/v1/finance/benefits/preview", { body })}
    submit={(body, { previewToken }, key) => apiRequest("POST", "/api/v1/finance/benefits", { body: { ...body, previewToken }, key })}
    review={result => <p>Cobranças afectadas {result.charges.length} · Crédito libertado {money(result.creditReleasedCents)}</p>}
    complete={() => change("Benefício guardado.")}>
    <Select label="Benefício" name="kind" defaultValue="discount" required>
      <option value="discount">Desconto</option><option value="full-scholarship">Bolsa integral</option>
      <option value="partial-scholarship">Bolsa parcial</option><option value="exemption">Isenção</option>
    </Select>
    <TextField label="Percentagem" name="percent" required />
    <fieldset className="border-0 p-0"><legend className="text-sm">Aplicar a</legend>
      {["registration", "tuition", "extra"].map(kind => <FormControlLabel key={kind}
        control={<Checkbox name="kindOfCharge" value={kind} />} label={statuses[kind]} />)}
    </fieldset>
    <DateField label="Competência inicial" name="fromMonth" type="month" defaultValue={year?.billingMonths[0]} required />
    <DateField label="Competência final" name="throughMonth" type="month" defaultValue={year?.billingMonths.at(-1)} required />
    <FormControlLabel control={<Checkbox name="retroactive" />} label="Recalcular cobranças emitidas" />
    <TextField label="Referência de autorização" name="authorizationReference" />
    <TextField label="Motivo" name="reason" required />
  </PreviewTask>;

  return <StudentExtraTask student={student} year={year} close={close} change={change} />;
}

export function Payments({ year, canWrite, selected, selectStudent }: {
  year?: Year; canWrite: boolean; selected: string; selectStudent(id: string): void;
}) {
  const [sheetRevision, setSheetRevision] = useState(0);
  const [schoolExtra, setSchoolExtra] = useState(false);
  const [sheetSelection, setSheetSelection] = useState<SheetSelection>();
  const [paying, setPaying] = useState(false);
  const [sheetReceipt, setSheetReceipt] = useState<ReceiptData>();
  const [notice, setNotice] = useState("");

  function closeCharge() {
    setSheetSelection(undefined);
    setPaying(false);
  }

  function refreshSheet() {
    setSheetRevision(current => current + 1);
  }

  const charge = sheetSelection?.charge;
  const payable = charge && charge.status !== "unconfigured" && charge.status !== "cancelled" && charge.outstandingCents > 0
    ? charge : undefined;

  return <div className="grid min-w-0 gap-4">
    <Heading title="Pagamentos" action={selected ? <Button onClick={() => selectStudent("")}>Voltar à planilha</Button> :
      canWrite && year && year.status !== "closed" && <Button variant="outlined" onClick={() => { setNotice(""); setSchoolExtra(true); }}>
        {extraChargeTitle}
      </Button>} />
    <Activity mode={selected ? "hidden" : "visible"}>
      {notice && <Alert severity="success" className="mb-4">{notice}</Alert>}
      {year ? <ClassPaymentSheet key={year.id} year={year} revision={sheetRevision} openAccount={selectStudent}
        openCharge={value => { setNotice(""); setSheetSelection(value); }} />
        : <p className="text-sm text-slate-600">Seleccione um ano lectivo para consultar a planilha da turma.</p>}
    </Activity>
    <StudentSearch open={value => selectStudent(value.id)} selected={selected} label="Abrir conta" />
    {selected && <StudentPayments key={selected} year={year} canWrite={canWrite} selected={selected} onChange={refreshSheet} />}
    {!selected && schoolExtra && canWrite && year && <SchoolExtraTask year={year} close={() => setSchoolExtra(false)}
      change={message => { setSchoolExtra(false); setNotice(message); refreshSheet(); }} />}
    {!selected && sheetSelection && (paying && canWrite && payable
      ? <FinanceTask op={{ kind: "payment" }} student={sheetSelection.student} year={year}
          charges={[payable]} initialChargeId={payable.id} close={closeCharge}
          change={(message, saved) => {
            closeCharge();
            setNotice(message);
            setSheetReceipt(saved);
            refreshSheet();
          }} />
      : <TaskSurface title={sheetSelection.title} subtitle={sheetSelection.student.fullName} onClose={closeCharge}
          actions={<>
            <Button onClick={closeCharge}>Fechar</Button>
            {canWrite && payable && <Button variant="contained" onClick={() => setPaying(true)}>Registar pagamento</Button>}
          </>}>
          <p><strong>{sheetSelection.status}</strong></p>
          {charge && charge.status !== "unconfigured" && <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm">
            <dt>Vencimento</dt><dd>{dateLabel(charge.dueOn)}</dd>
            <dt>Valor da cobrança</dt><dd>{money(charge.dueCents)}</dd>
            <dt>Multa</dt><dd>{money(charge.penaltyCents)}</dd>
            <dt>Valor pago</dt><dd>{money(charge.principalPaidCents + charge.penaltyPaidCents)}</dd>
            <dt className="font-semibold">{charge.status === "forecast" ? "Valor previsto" : "Saldo"}</dt>
            <dd className="font-semibold">{money(charge.outstandingCents)}</dd>
          </dl>}
        </TaskSurface>)}
    {sheetReceipt && <Receipt id={sheetReceipt.id} initial={sheetReceipt} close={() => setSheetReceipt(undefined)} />}
  </div>;
}

function StudentPayments({ year, canWrite, selected, onChange }: { year?: Year; canWrite: boolean; selected: string; onChange(): void }) {
  const [section, setSection] = useState<"charges" | "payments" | "proofs" | "history">("charges");
  const [sectionPage, setSectionPage] = useState(1);
  const [op, setOp] = useState<Operation>();
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; initial?: ReceiptData }>();
  const student = useRemote(selected || null, (signal) => apiRequest("GET", "/api/v1/students/{id}", { params: { id: selected }, signal }));
  const credit = useRemote(selected || null, (signal) =>
    apiRequest("GET", "/api/v1/finance/credit", { query: { studentId: selected, page: 1, limit: 1 }, signal }));
  const charges = useRemote(selected && (section === "charges" || op) ? selected + ":" + (section === "charges" ? sectionPage : 1) : null, (signal) =>
    apiRequest("GET", "/api/v1/finance/charges", { query: { studentId: selected, page: section === "charges" ? sectionPage : 1, limit: 25 }, signal }));
  const payments = useRemote(selected && section === "payments" ? selected + ":" + sectionPage : null, (signal) =>
    apiRequest("GET", "/api/v1/finance/payments", { query: { studentId: selected, page: sectionPage, limit: 12 }, signal }));
  const proofs = useRemote(selected && section === "proofs" ? selected + ":" + sectionPage : null, (signal) =>
    apiRequest("GET", "/api/v1/finance/proofs", { query: { studentId: selected, page: sectionPage, limit: 12 }, signal }));
  const history = useRemote(selected && section === "history" ? selected + ":" + sectionPage : null, (signal) =>
    apiRequest("GET", "/api/v1/finance/history", { query: { studentId: selected, page: sectionPage, limit: 12 }, signal }));
  const financeSections = { charges: "Cobranças", payments: "Recebimentos", proofs: "Comprovativos", history: "Histórico" } as const;
  const rowData = { charges, payments, proofs, history }[section];
  const operations: Mode[] = ["payment", "proof", "credit", "refund", "extra", "benefit"];

  return <div className="grid gap-4">
    {notice && <Alert severity="success">{notice}</Alert>}
    <ResourceState {...student} retry={student.refresh} />
    {student.value && <section className="grid gap-3">
      <div className="lss-responsive-card grid gap-2">
        <Heading title={student.value.fullName} detail={student.value.permanentNumber ?? undefined} />
        <ResourceState {...credit} retry={credit.refresh} />
        {credit.value && <p>Crédito disponível <strong>{money(credit.value.balanceCents)}</strong></p>}
      </div>
      {canWrite && <div className="lss-action-row" data-edge-to-edge role="group" aria-label="Acções de pagamento">
        {operations.map(kind => <Button key={kind} variant={kind === "payment" ? "contained" : "outlined"}
          onClick={() => setOp({ kind })}>{labels[kind]}</Button>)}
      </div>}
      <nav className="lss-action-row" data-edge-to-edge aria-label="Conta do aluno">
        {Object.entries(financeSections).map(([kind, label]) => <Button key={kind} aria-pressed={section === kind}
          variant={section === kind ? "contained" : "text"} onClick={() => { setSection(kind as typeof section); setSectionPage(1); }}>{label}</Button>)}
      </nav>
      <div className="lss-responsive-card grid gap-2">
        <ResourceState {...rowData} retry={rowData.refresh} />
        {section === "charges" && charges.value && <RecordList rows={charges.value.items} empty="Sem cobranças registadas."
          render={charge => <>
            <div><strong>{charge.label}</strong><p className="text-sm text-slate-600">{charge.competence} · {statuses[charge.status] ?? charge.status}</p>
              {charge.pendingProof && <p className="text-sm">Aguarda conferência</p>}</div>
            <div className="flex items-center gap-2"><strong>{charge.status === "unconfigured" ? "Preço por configurar" : money(charge.outstandingCents)}</strong>
              {canWrite && charge.status !== "unconfigured" && charge.issuedAt && charge.status !== "cancelled" &&
                <Button size="small" onClick={() => setOp({ kind: "adjust", charge })}>Ajustar</Button>}
            </div>
          </>} />}
        {section === "payments" && payments.value && <RecordList rows={payments.value.items} empty="Sem recebimentos registados."
          render={payment => <>
            <div><strong>{money(payment.amountCents)}</strong>
              <p className="text-sm text-slate-600">{dateLabel(payment.effectiveOn)} · {methods[payment.method]} · {statuses[payment.status]}</p></div>
            <div className="flex flex-wrap gap-2">
              {payment.receiptId && <Button onClick={() => setReceipt({ id: payment.receiptId! })}>Recibo {payment.receiptNumber}</Button>}
              {canWrite && payment.status === "confirmed" && <Button onClick={() => setOp({ kind: "correction", payment })}>Corrigir</Button>}
            </div>
          </>} />}
        {section === "proofs" && proofs.value && <RecordList rows={proofs.value.items} empty="Sem comprovativos registados."
          render={proof => <>
            <div><strong>{money(proof.intent.amountCents)} · {statuses[proof.status]}</strong>
              <p className="text-sm text-slate-600">{dateLabel(proof.recordedAt)} · {methods[proof.intent.method]}</p></div>
            {canWrite && proof.status === "pending" && <Button onClick={() => setOp({ kind: "review", proof })}>Conferir</Button>}
          </>} />}
        {section === "history" && history.value && <RecordList rows={history.value.items} empty="Sem alterações financeiras registadas."
          render={entry => <div><strong>{entry.reason || entry.action}</strong>
            <p className="text-sm text-slate-600">{dateLabel(entry.effectiveOn ?? entry.recordedAt)}</p></div>} />}
        {rowData.value && <Paging {...rowData.value} change={setSectionPage} />}
      </div>
    </section>}
    {op && student.value && (charges.value
      ? <FinanceTask op={op} student={student.value} year={year} charges={charges.value.items.filter((charge) => charge.status !== "unconfigured")}
          close={() => setOp(undefined)} change={(message, saved) => {
            setOp(undefined);
            setNotice(message);
            if (saved) setReceipt({ id: saved.id, initial: saved });
            credit.refresh();
            charges.refresh();
            payments.refresh();
            proofs.refresh();
            history.refresh();
            onChange();
          }} />
      : <div className="lss-responsive-card"><ResourceState {...charges} retry={charges.refresh} />
          <Button onClick={() => setOp(undefined)}>Cancelar operação</Button></div>)}
    {receipt && <Receipt id={receipt.id} initial={receipt.initial} close={() => setReceipt(undefined)} />}
  </div>;
}
