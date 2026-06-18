import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, Card, Spinner } from "../../components/ui";

export function AiCopilotPage() {
  const { hasPermission } = useAuth();
  const [desc, setDesc] = useState("Conceptual estimate for a 50,000 bpd crude unit revamp, US Gulf Coast");

  const gen = useMutation({
    mutationFn: async () =>
      (await api.post<ApiResponse<any>>("/ai/estimate", { description: desc })).data.data,
  });

  const anomalies = useQuery({
    queryKey: ["ai-anomalies"],
    queryFn: async () => (await api.get<ApiResponse<any>>("/ai/anomalies")).data.data,
    enabled: hasPermission("ai:view"),
  });

  const result = gen.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-teal-500" />
        <h1 className="text-2xl font-bold text-navy-900">AI Estimating Copilot</h1>
        <Badge className="bg-amber-50 text-amber-600">heuristic · LLM-ready</Badge>
      </div>

      {hasPermission("ai:create") && (
        <Card className="p-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-navy-700/60">
            Describe the project in natural language
          </label>
          <textarea
            className="h-24 w-full rounded-lg border border-navy-100 p-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-navy-700/50">
              Deterministic suggestion engine pulls from the Cost Library. Wire a real LLM into <code>generateSkeleton()</code> later.
            </p>
            <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
              <Wand2 size={15} /> {gen.isPending ? "Generating…" : "Generate estimate"}
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-navy-100 text-navy-700">{result.basis.archetype}</Badge>
              <Badge className="bg-navy-100 text-navy-700">capacity {result.basis.capacity.toLocaleString()}</Badge>
              <Badge className="bg-navy-100 text-navy-700">region ×{result.basis.regionFactor}</Badge>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-navy-700/50">Suggested total</div>
              <div className="text-xl font-bold text-teal-600">{money(result.total)}</div>
            </div>
          </div>
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-navy-700/70">
            {result.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
          <table className="mt-4 w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
              <th className="px-3 py-2">Discipline</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-navy-100">
              {result.lineItems.map((l: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 text-navy-700/60">{l.discipline}</td>
                  <td className="px-3 py-1.5">{l.description}</td>
                  <td className="px-3 py-1.5 text-right">{l.quantity}</td>
                  <td className="px-3 py-1.5 text-right text-navy-700/60">{money(l.unitRate)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Anomaly detection */}
      {hasPermission("ai:view") && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-navy-900">
            <AlertTriangle size={16} className="text-amber-500" /> Overrun anomaly detection
          </h2>
          {anomalies.isLoading ? <Spinner /> : (
            <Card className="divide-y divide-navy-100">
              <div className="px-4 py-2 text-xs text-navy-700/60">
                Scanned {anomalies.data?.scanned} baselined projects · {anomalies.data?.flagged.length} flagged
              </div>
              {anomalies.data?.flagged.map((f: any) => (
                <div key={f.projectId} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-navy-900">{f.code} · {f.name}</span>
                    <Badge className={f.severity === "HIGH" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}>{f.severity}</Badge>
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-navy-700/70">
                    {f.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              ))}
              {anomalies.data?.flagged.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-navy-700/50">No anomalies — all projects within tolerance.</div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
