import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { Badge, Card, Spinner } from "../../components/ui";

interface PortfolioRow {
  id: string; name: string; description: string; projectCount: number;
  totalBac: number; totalEac: number; variance: number;
  avgCpi: number; avgSpi: number; atRisk: number;
  projects: { id: string; code: string; name: string; cpi: number; spi: number; percentComplete: number; health: string; anomaly: boolean }[];
}

const cellColor: Record<string, string> = {
  GREEN: "bg-teal-500", AMBER: "bg-amber-500", RED: "bg-red-500", NONE: "bg-navy-200",
};

export function PortfolioPage() {
  const q = useQuery({
    queryKey: ["portfolios"],
    queryFn: async () => (await api.get<ApiResponse<PortfolioRow[]>>("/portfolios")).data.data,
  });
  if (q.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Portfolio</h1>
        <p className="text-sm text-navy-700/60">Roll-up across projects — health, weighted CPI/SPI, budget vs forecast.</p>
      </div>
      {q.data?.map((pf) => (
        <Card key={pf.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-navy-900">{pf.name}</h2>
              <p className="text-sm text-navy-700/60">{pf.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Mini k="Projects" v={String(pf.projectCount)} />
              <Mini k="Total BAC" v={money(pf.totalBac)} />
              <Mini k="Total EAC" v={money(pf.totalEac)} tone={pf.totalEac > pf.totalBac ? "bad" : "good"} />
              <Mini k="Variance" v={money(pf.variance)} tone={pf.variance < 0 ? "bad" : "good"} />
              <Mini k="Avg CPI" v={String(pf.avgCpi)} />
              <Mini k="At risk" v={String(pf.atRisk)} tone={pf.atRisk > 0 ? "bad" : "good"} />
            </div>
          </div>
          {/* Heatmap */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pf.projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}?tab=controls`} className="flex items-center gap-3 rounded-lg border border-navy-100 px-3 py-2 hover:bg-navy-50">
                <span className={`h-8 w-2 rounded ${cellColor[p.health]}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy-900">{p.name}</div>
                  <div className="text-xs text-navy-700/50">CPI {p.cpi} · SPI {p.spi} · {p.percentComplete}%</div>
                </div>
                {p.anomaly && <Badge className="bg-red-50 text-red-600">!</Badge>}
              </Link>
            ))}
            {pf.projects.length === 0 && <div className="text-sm text-navy-700/50">No projects.</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Mini({ k, v, tone }: { k: string; v: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-navy-50 px-3 py-1.5 text-right">
      <div className="text-[10px] uppercase text-navy-700/50">{k}</div>
      <div className={`text-sm font-bold ${tone === "bad" ? "text-red-600" : tone === "good" ? "text-teal-600" : "text-navy-900"}`}>{v}</div>
    </div>
  );
}
