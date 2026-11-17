"use client";

import { Activity, lazy, Suspense, useEffect, useReducer, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { WorkspaceShell } from "../../components/workspace-shell";
import { WorkspacePlaceholder } from "../../components/workspace-startup";
import type { WorkspaceView } from "../../components/school-admin-demo.model";
import { institutionName, workspacePath, workspaceView } from "../../lib/workspace-navigation";
import { apiRequest, isSchoolActor, issueMessage, SchoolApiError, type Schema, type SchoolActor } from "./client";
import { Heading, ResourceState, Select } from "./controls";
import { DirectorIndicators, directorReport, type DirectorReport } from "./director-indicators";
import { useRemote } from "./use-remote";

const Academics = lazy(() => import("./academics").then(module => ({ default: module.Academics })));
const Payments = lazy(() => import("./payments").then(module => ({ default: module.Payments })));
const Reports = lazy(() => import("./reports").then(module => ({ default: module.Reports })));
const Settings = lazy(() => import("./settings").then(module => ({ default: module.Settings })));

export type Year = Schema<"AcademicYear">;

export function CentralWorkspace({ actor, initialView }: { actor: SchoolActor; initialView: WorkspaceView }) {
  const [view, setView] = useState(initialView);
  const [visited, setVisited] = useState<WorkspaceView[]>([initialView]);
  const [yearId, setYearId] = useState("");
  const [students, setStudents] = useState({ enrollments: "", payments: "" });
  const [report, setReport] = useState<DirectorReport>();
  const [reportRevision, resetReport] = useReducer((revision: number) => revision + 1, 0);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const canWrite = actor.role === "secretaria";
  const catalog = useRemote("school", (signal) => Promise.all([
    apiRequest("GET", "/api/v1/institution", { signal }),
    apiRequest("GET", "/api/v1/academic-years", { query: { page: 1, limit: 100 }, signal }),
  ]));
  const years = catalog.value?.[1].items ?? [];
  const year = years.find((entry) => entry.id === yearId) ?? years.find(entry => entry.status === "active") ?? years[0];

  useEffect(() => {
    function readLocation() {
      const params = new URLSearchParams(window.location.search);
      const route = workspaceView(window.location.pathname);
      setView(route);
      setVisited(previous => previous.includes(route) ? previous : [...previous, route]);
      setYearId(params.get("year") ?? "");
      if (route === "enrollments" || route === "payments") {
        setStudents(previous => ({ ...previous, [route]: params.get("student") ?? "" }));
      }
      if (route === "reports") setReport(directorReport(params.get("indicador")));
    }
    const restore = window.setTimeout(readLocation, 0);
    window.addEventListener("popstate", readLocation);
    return () => { window.clearTimeout(restore); window.removeEventListener("popstate", readLocation); };
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    let checking = false;
    async function verify() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const current = await apiRequest("GET", "/api/v1/me", { signal: abort.signal });
        if (!isSchoolActor(current) || current.id !== actor.id || current.role !== actor.role) {
          window.location.replace("/?sessao=expirada");
        }
      } catch (cause) {
        if (!abort.signal.aborted && cause instanceof SchoolApiError && cause.status === 401) issueMessage(cause);
      } finally { checking = false; }
    }
    const interval = window.setInterval(verify, 60_000);
    window.addEventListener("focus", verify);
    return () => { abort.abort(); window.clearInterval(interval); window.removeEventListener("focus", verify); };
  }, [actor.id, actor.role]);

  function navigate(next: WorkspaceView, student?: string, indicator?: DirectorReport) {
    const query = new URLSearchParams();
    if (year) query.set("year", year.id);
    if (next === "enrollments" || next === "payments") {
      const id = student ?? students[next];
      if (id) query.set("student", id);
      setStudents(previous => ({ ...previous, [next]: id }));
    }
    if (next === "reports") {
      const requested = indicator ?? report;
      if (requested) query.set("indicador", requested);
      setReport(requested);
      if (indicator) resetReport();
    }
    window.history.pushState(null, "", workspacePath(next) + (query.size ? "?" + query.toString() : ""));
    setView(next);
    setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
  }

  function changeYear(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("year", id);
    window.history.replaceState(null, "", url.pathname + url.search);
    setYearId(id);
  }

  function selectStudent(area: "enrollments" | "payments", id: string) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("student", id);
    else url.searchParams.delete("student");
    window.history.replaceState(null, "", url.pathname + url.search);
    setStudents(previous => ({ ...previous, [area]: id }));
  }

  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/sign-out");
      window.location.replace("/");
    } catch (cause) {
      setError(issueMessage(cause));
      setLeaving(false);
    }
  }

  return <WorkspaceShell activeView={view} accountName={actor.name} roleLabel={canWrite ? "Secretaria" : "Director"}
    institutionLabel={catalog.value?.[0].name ?? institutionName} year={year?.label ?? ""}
    collapsed={collapsed} onCollapsedChange={setCollapsed} onNavigate={navigate} onSignOut={() => { void signOut(); }}
    expanded={false} onExpandedChange={() => {}}>
    <div className="grid min-w-0 gap-4">
      {error && <Alert severity="error">{error}</Alert>}
      <ResourceState {...catalog} retry={catalog.refresh} />
      {catalog.value && <>
        {years.length > 0 && <div className="w-full max-w-xs">
          <Select fullWidth size="small" label="Ano lectivo" value={year?.id ?? ""}
            onChange={event => changeYear(event.target.value)}>
            {years.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
        </div>}
        <Suspense fallback={<WorkspacePlaceholder view={view} />}>
          {view === "overview" && <section className="lss-responsive-card grid gap-4">
            <Heading title={canWrite ? "Atendimento escolar" : "Acompanhamento escolar"}
              detail={year ? undefined : canWrite ? "Configure o ano lectivo para iniciar as matrículas." : "Ainda não há ano lectivo configurado."} />
            {actor.role === "director" && actor.permissions.readReports &&
              <DirectorIndicators year={year} open={indicator => navigate("reports", undefined, indicator)} />}
            <div className="lss-action-row" data-edge-to-edge>
              <Button variant="contained" onClick={() => navigate(year ? "enrollments" : "catalog")}>{year ? "Alunos e turmas" : "Configurações"}</Button>
              <Button variant="outlined" onClick={() => navigate("payments")}>Pagamentos</Button>
              <Button variant="outlined" onClick={() => navigate("reports")}>Relatórios</Button>
            </div>
          </section>}
          {visited.includes("enrollments") && <Activity mode={view === "enrollments" ? "visible" : "hidden"}>
            <Academics key={year?.id ?? ""} year={year} canWrite={canWrite} selected={students.enrollments}
              selectStudent={(id) => selectStudent("enrollments", id)} openPayment={(id) => navigate("payments", id)} />
          </Activity>}
          {visited.includes("payments") && <Activity mode={view === "payments" ? "visible" : "hidden"}>
            <Payments key={year?.id ?? ""} year={year} canWrite={canWrite} selected={students.payments}
              selectStudent={(id) => selectStudent("payments", id)} />
          </Activity>}
          {visited.includes("reports") && <Activity mode={view === "reports" ? "visible" : "hidden"}>
            <Reports key={JSON.stringify([year?.id, report, reportRevision])} year={year} initialReport={report} canWrite={canWrite}
              openStudent={(id) => navigate("enrollments", id)} />
          </Activity>}
          {visited.includes("catalog") && <Activity mode={view === "catalog" ? "visible" : "hidden"}>
            <Settings institution={catalog.value[0]} year={year} years={years}
              canWrite={canWrite} canEditInstitution={actor.permissions.updateInstitution} refresh={catalog.refresh} />
          </Activity>}
        </Suspense>
      </>}
    </div>
  </WorkspaceShell>;
}
