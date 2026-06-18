import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Card, Spinner } from "../../components/ui";
import { EvmPanel } from "./panels/EvmPanel";
import { EstimatePanel } from "./panels/EstimatePanel";
import {
  OverviewPanel, ChangePanel, RiskPanel, SchedulePanel, TenderPanel, BenchmarkPanel,
} from "./panels/MiscPanels";
import { ScopingPanel, WorkPackPanel, MaterialPanel } from "../sto/panels/PlanningPanels";
import { WeldPanel, QaPanel, SafeguardPanel } from "../sto/panels/QualityPanels";
import { ExecutionPanel, LessonsPanel } from "../sto/panels/ExecutionPanels";

type Tab = { key: string; label: string; perm: string; Panel: (p: { projectId: string }) => JSX.Element };

const OVERVIEW: Tab = { key: "overview", label: "Overview", perm: "dashboarding:view", Panel: OverviewPanel };

const CAPEX_TABS: Tab[] = [
  { key: "estimate", label: "Estimate", perm: "estimating:view", Panel: EstimatePanel },
  { key: "controls", label: "Controls / EVM", perm: "controls:view", Panel: EvmPanel },
  { key: "change", label: "Change", perm: "change:view", Panel: ChangePanel },
  { key: "risk", label: "Risk", perm: "risk:view", Panel: RiskPanel },
  { key: "schedule", label: "Schedule", perm: "scheduling:view", Panel: SchedulePanel },
  { key: "tendering", label: "Tendering", perm: "tendering:view", Panel: TenderPanel },
  { key: "benchmark", label: "Benchmarking", perm: "benchmarking:view", Panel: BenchmarkPanel },
];

const STO_TABS: Tab[] = [
  { key: "scoping", label: "Scoping", perm: "scoping:view", Panel: ScopingPanel },
  { key: "workpack", label: "Work Packs", perm: "workpack:view", Panel: WorkPackPanel },
  { key: "material", label: "Materials", perm: "material:view", Panel: MaterialPanel },
  { key: "weld", label: "Weld", perm: "weld:view", Panel: WeldPanel },
  { key: "qaqc", label: "QA/QC", perm: "qaqc:view", Panel: QaPanel },
  { key: "safeguarding", label: "Safeguarding", perm: "safeguarding:view", Panel: SafeguardPanel },
  { key: "execution", label: "Execution", perm: "execution:view", Panel: ExecutionPanel },
  { key: "lessons", label: "Lessons", perm: "lessons:view", Panel: LessonsPanel },
];

export function ProjectDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/projects/${id}`)).data.data,
  });

  if (project.isLoading || !project.data) return <Spinner />;
  const p = project.data;

  const tabs = [OVERVIEW, ...(p.type === "STO" ? STO_TABS : CAPEX_TABS)].filter((t) =>
    hasPermission(t.perm),
  );
  const requested = params.get("tab");
  const current = tabs.find((t) => t.key === requested) ?? tabs[0];
  const Active = current?.Panel;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/projects" className="text-sm text-teal-600 hover:underline">← Projects</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Badge className="bg-navy-100 text-navy-700">{p.code}</Badge>
          <h1 className="text-2xl font-bold text-navy-900">{p.name}</h1>
          <Badge className={p.type === "STO" ? "bg-amber-50 text-amber-600" : "bg-navy-100 text-navy-600"}>{p.type}</Badge>
          <Badge className="bg-navy-100 text-navy-600">{p.status}</Badge>
        </div>
        {p.description && <p className="mt-1 text-sm text-navy-700/60">{p.description}</p>}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-navy-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              current?.key === t.key ? "border-teal-500 text-teal-700" : "border-transparent text-navy-700/60 hover:text-navy-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {Active ? <Active projectId={p.id} /> : <Card className="p-8 text-center text-navy-700/50">No accessible views.</Card>}
    </div>
  );
}
