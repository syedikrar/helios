import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { Badge, Card, Spinner } from "../../components/ui";

interface ProjectRow {
  id: string; code: string; name: string; type: string; status: string;
  region: string | null; bac: number; cpi: number; spi: number;
  percentComplete: number; health: string; anomaly: boolean;
  portfolio: { name: string } | null;
}

const healthColor: Record<string, string> = {
  GREEN: "bg-teal-50 text-teal-600",
  AMBER: "bg-amber-50 text-amber-600",
  RED: "bg-red-50 text-red-600",
  NONE: "bg-navy-100 text-navy-500",
};

export function ProjectsPage() {
  const q = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<ApiResponse<ProjectRow[]>>("/projects")).data.data,
  });
  if (q.isLoading) return <Spinner />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Projects</h1>
        <p className="text-sm text-navy-700/60">Capital projects and turnarounds across the portfolio.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`}>
            <Card className="p-4 transition hover:border-teal-300 hover:shadow">
              <div className="flex items-center justify-between">
                <Badge className="bg-navy-100 text-navy-700">{p.code}</Badge>
                <div className="flex items-center gap-1">
                  {p.anomaly && <AlertTriangle size={14} className="text-red-500" />}
                  <Badge className={healthColor[p.health]}>{p.health}</Badge>
                </div>
              </div>
              <h3 className="mt-2 font-semibold text-navy-900">{p.name}</h3>
              <div className="mt-1 text-xs text-navy-700/50">
                {p.type} · {p.region ?? "—"} · {p.portfolio?.name ?? "Unassigned"}
              </div>
              {p.bac > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <KV k="BAC" v={money(p.bac)} />
                  <KV k="CPI" v={String(p.cpi)} />
                  <KV k="SPI" v={String(p.spi)} />
                </div>
              ) : (
                <div className="mt-3 text-xs text-navy-700/50">No baseline yet ({p.status})</div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-navy-700/40">{k}</div>
      <div className="font-semibold text-navy-900">{v}</div>
    </div>
  );
}
