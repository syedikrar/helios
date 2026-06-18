import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Leaf } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { Card, Spinner } from "../../components/ui";

export function EsgPage() {
  const q = useQuery({
    queryKey: ["esg"],
    queryFn: async () => (await api.get<ApiResponse<any>>("/esg")).data.data,
  });
  if (q.isLoading || !q.data) return <Spinner />;
  const d = q.data;
  const chart = d.projects.map((p: any) => ({ name: p.code, value: p.tco2e }));
  const colors = ["#14735C", "#15233B", "#B07D1E", "#1f3354", "#0f5d4a"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Leaf className="text-teal-500" />
        <h1 className="text-2xl font-bold text-navy-900">ESG / Carbon</h1>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total embodied carbon" v={`${d.totalTco2e.toLocaleString()} tCO₂e`} />
        <Stat label="Baselined cost" v={money(d.totalBac)} />
        <Stat label="Avg carbon intensity" v={`${d.avgIntensity} tCO₂e/$M`} />
      </div>

      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-navy-900">Embodied carbon by project</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e7f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}t`} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString()} tCO₂e`} />
            <Bar dataKey="value">{chart.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
            <th className="px-4 py-2">Project</th><th className="px-4 py-2 text-right">tCO₂e</th><th className="px-4 py-2 text-right">Baseline cost</th><th className="px-4 py-2 text-right">Intensity (tCO₂e/$M)</th>
          </tr></thead>
          <tbody className="divide-y divide-navy-100">
            {d.projects.map((p: any) => (
              <tr key={p.projectId}>
                <td className="px-4 py-2"><span className="font-mono text-xs text-navy-600">{p.code}</span> · {p.name}</td>
                <td className="px-4 py-2 text-right font-medium">{p.tco2e.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-navy-700/70">{money(p.bac)}</td>
                <td className="px-4 py-2 text-right">{p.intensity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-navy-700/50">
        Carbon is rolled up from estimate line-item factors (kgCO₂e per unit) on baselined projects.
      </p>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className="text-2xl font-bold text-navy-900">{v}</div>
    </Card>
  );
}
