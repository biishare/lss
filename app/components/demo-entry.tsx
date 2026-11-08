"use client";

import { useState, type FormEvent } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { demoAccounts } from "../features/demo/demo-session";
import { institutionLogoText, institutionName } from "./school-admin-demo.model";

export function DemoEntry({ onEnter }: { onEnter: (accountId: string) => void }) {
  const [accountId, setAccountId] = useState<string>(demoAccounts[0].id);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEnter(accountId);
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10 text-slate-950">
      <section aria-labelledby="entry-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="mb-6 grid size-14 place-items-center rounded-lg bg-[#185c54] text-lg font-bold text-white">{institutionLogoText}</div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#185c54]">{institutionName}</p>
        <h1 id="entry-title" className="mt-3 text-2xl font-bold">Entrar no LSS</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Matrículas, pagamentos e acompanhamento da escola.</p>
        <form onSubmit={submit} className="mt-7 grid gap-5">
          <TextField
            select label="Conta de exemplo" value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            slotProps={{ select: { native: true } }} fullWidth
          >
            {demoAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.roleLabel}</option>)}
          </TextField>
          <Button type="submit" variant="contained" fullWidth>Abrir demonstração</Button>
        </form>
        <div className="mt-7 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-slate-800">Ambiente de demonstração</p>
          <p>Contas fictícias, sem palavra-passe. Os dados ficam neste navegador. Sair ou trocar de conta conserva o cenário.</p>
        </div>
      </section>
    </main>
  );
}
