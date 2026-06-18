import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { NAV_ITEMS } from "../../nav";
import { Badge, Card, Spinner } from "../../components/ui";

// Flat module nav items land here: pick a project to open this module in context.
const TAB_BY_NAV: Record<string, string> = {
  estimating: "estimate", controls: "controls", change: "change", risk: "risk",
  scheduling: "schedule", tendering: "tendering", bim: "estimate", benchmarking: "benchmark",
  scoping: "scoping", workpack: "workpack", material: "material", weld: "weld",
  qaqc: "qaqc", safeguarding: "safeguarding", execution: "execution", lessons: "lessons",
};
// Which project type each module applies to (others are filtered out of the picker).
const STO_NAV = new Set(["scoping", "workpack", "material", "weld", "qaqc", "safeguarding", "execution", "lessons"]);

export function ModuleLanding() {
  const { pathname } = useLocation();
  const item = NAV_ITEMS.find((i) => i.path === pathname);
  const tab = item ? TAB_BY_NAV[item.key] ?? "overview" : "overview";
  const wantType = item && STO_NAV.has(item.key) ? "STO" : "CAPEX";

  const q = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<ApiResponse<any[]>>("/projects")).data.data,
  });
  if (q.isLoading) return <Spinner />;
  const projects = (q.data ?? []).filter((p) => p.type === wantType);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{item?.label}</h1>
        <p className="text-sm text-navy-700/60">Select a {wantType} project to open {item?.label} in context.</p>
      </div>
      <Card className="divide-y divide-navy-100">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}?tab=${tab}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-navy-50"
          >
            <div>
              <span className="font-medium text-navy-900">{p.name}</span>
              <span className="ml-2 text-xs text-navy-700/50">{p.code} · {p.type}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-navy-700/60">
              {p.bac > 0 && <span>{money(p.bac)}</span>}
              <Badge className="bg-navy-100 text-navy-600">CPI {p.cpi}</Badge>
              <ArrowRight size={15} className="text-teal-500" />
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
