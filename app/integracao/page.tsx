import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadIntegrationCheck } from "../lib/integration-check";

export const metadata: Metadata = { title: "Ligação à base de dados" };
export const dynamic = "force-dynamic";

const checkMessages = {
  unconfigured: "O endereço da API ainda não está configurado.",
  "api-unavailable": "Não foi possível obter uma resposta válida da API.",
  "database-unavailable": "A API respondeu, mas a ligação à base de dados está indisponível.",
  "invalid-record": "O registo de teste precisa de um valor de texto válido.",
};

async function CheckResult() {
  const result = await loadIntegrationCheck();

  if (result.status === "connected") {
    return (
      <section className="lss-responsive-card space-y-3" aria-labelledby="integration-result">
        <h2 id="integration-result" className="text-lg font-semibold text-(--lss-color-success)">
          Ligação confirmada
        </h2>
        {result.value === null ? (
          <p>A base respondeu. Ainda não existe um registo de teste.</p>
        ) : (
          <p>Valor lido na base de dados <strong className="block">{result.value}</strong></p>
        )}
      </section>
    );
  }

  return (
    <section className="lss-responsive-card space-y-3" aria-labelledby="integration-result">
      <h2 id="integration-result" className="text-lg font-semibold text-(--lss-color-warning)">
        Leitura indisponível
      </h2>
      <p>{checkMessages[result.status]}</p>
    </section>
  );
}

export default function IntegrationPage() {
  if (process.env.LSS_ENABLE_INTEGRATION_CHECK !== "true" || process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Ligação à base de dados</h1>
      <Suspense fallback={
        <div className="lss-responsive-card space-y-3" role="status">
          <span className="sr-only">A verificar a ligação</span>
          <div className="h-5 w-40 rounded bg-slate-200 motion-safe:animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-slate-200 motion-safe:animate-pulse" />
        </div>
      }>
        <CheckResult />
      </Suspense>
      <form action="/integracao" method="get">
        <button className="rounded-md bg-(--lss-color-primary) px-4 py-2 font-medium text-white" type="submit">
          Voltar a verificar
        </button>
      </form>
    </main>
  );
}
