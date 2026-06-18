import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Wand2 } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { money } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../../components/ui";

interface Line {
  id: string; code: string | null; description: string; discipline: string | null;
  unit: string; quantity: number; unitRate: number;
}
interface Totals {
  direct: number; indirect: number; contingency: number; total: number;
  carbon: number; byDiscipline: Record<string, number>;
}
interface EstimateFull {
  id: string; name: string; code: string; aaceClass: string; method: string;
  status: string; currency: string; contingencyPct: number; indirectPct: number;
  lineItems: Line[]; totals: Totals;
  project: { currency: string };
}
interface EstimateSummary { id: string; name: string; status: string; totals: Totals; }

export function EstimatePanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["estimates", projectId],
    queryFn: async () =>
      (await api.get<ApiResponse<EstimateSummary[]>>(`/estimating?projectId=${projectId}`)).data.data,
  });

  const active = selected ?? list.data?.[0]?.id ?? null;

  if (list.isLoading) return <Spinner />;
  if (!list.data?.length)
    return <Card className="p-8 text-center text-navy-700/60">No estimates yet.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {list.data.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              active === e.id ? "border-teal-500 bg-teal-50 text-teal-700" : "border-navy-100 bg-white text-navy-700"
            }`}
          >
            {e.name} <Badge className="ml-1 bg-navy-100 text-navy-600">{e.status}</Badge>
          </button>
        ))}
      </div>
      {active && <EstimateEditor estimateId={active} canEdit={hasPermission("estimating:edit")} canPromote={hasPermission("estimating:approve")} onChanged={() => qc.invalidateQueries({ queryKey: ["estimates", projectId] })} />}
    </div>
  );
}

function EstimateEditor({ estimateId, canEdit, canPromote, onChanged }: {
  estimateId: string; canEdit: boolean; canPromote: boolean; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const key = ["estimate", estimateId];
  const est = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<ApiResponse<EstimateFull>>(`/estimating/${estimateId}`)).data.data,
  });
  const invalidate = () => { qc.invalidateQueries({ queryKey: key }); onChanged(); };

  const updateLine = useMutation({
    mutationFn: (v: { id: string; quantity: number }) =>
      api.patch(`/estimating/${estimateId}/lines/${v.id}`, { quantity: v.quantity }),
    onSuccess: invalidate,
  });
  const delLine = useMutation({
    mutationFn: (id: string) => api.delete(`/estimating/${estimateId}/lines/${id}`),
    onSuccess: invalidate,
  });
  const promote = useMutation({
    mutationFn: () => api.post(`/estimating/${estimateId}/promote`),
    onSuccess: invalidate,
  });

  if (est.isLoading || !est.data) return <Spinner />;
  const e = est.data;
  const cur = e.project.currency;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-navy-100 text-navy-700">AACE {e.aaceClass.replace("CLASS_", "Class ")}</Badge>
          <Badge className="bg-navy-100 text-navy-700">{e.method}</Badge>
          <Badge className="bg-navy-100 text-navy-700">indirect {e.indirectPct}%</Badge>
          <Badge className="bg-navy-100 text-navy-700">contingency {e.contingencyPct}%</Badge>
        </div>
        {canPromote && e.status !== "BASELINED" && (
          <Button onClick={() => promote.mutate()} disabled={promote.isPending}>
            Promote to baseline
          </Button>
        )}
        {e.status === "BASELINED" && <Badge className="bg-teal-50 text-teal-600">Baselined</Badge>}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tot label="Direct" v={money(e.totals.direct, cur)} />
        <Tot label="Indirect" v={money(e.totals.indirect, cur)} />
        <Tot label="Contingency" v={money(e.totals.contingency, cur)} />
        <Tot label="Total" v={money(e.totals.total, cur)} accent />
        <Tot label="Carbon (tCO₂e)" v={(e.totals.carbon / 1000).toFixed(1)} />
      </div>

      {canEdit && <LibraryPicker estimateId={estimateId} onAdded={invalidate} />}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Disc.</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit rate</th>
              <th className="px-3 py-2 text-right">Amount</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {e.lineItems.map((l) => (
              <tr key={l.id} className="hover:bg-navy-50/50">
                <td className="px-3 py-1.5 font-mono text-xs text-navy-600">{l.code}</td>
                <td className="px-3 py-1.5">{l.description}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{l.discipline}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{l.unit}</td>
                <td className="px-3 py-1.5 text-right">
                  {canEdit ? (
                    <input
                      type="number"
                      defaultValue={l.quantity}
                      key={l.quantity}
                      className="w-20 rounded border border-navy-100 px-1 text-right"
                      onBlur={(ev) => {
                        const v = Number(ev.target.value);
                        if (v !== l.quantity) updateLine.mutate({ id: l.id, quantity: v });
                      }}
                    />
                  ) : (
                    l.quantity
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-navy-700/70">{money(l.unitRate, cur)}</td>
                <td className="px-3 py-1.5 text-right font-medium">{money(Math.round(l.quantity * l.unitRate), cur)}</td>
                {canEdit && (
                  <td className="px-3 py-1.5 text-right">
                    <button onClick={() => delLine.mutate(l.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function LibraryPicker({ estimateId, onAdded }: { estimateId: string; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const search = useQuery({
    queryKey: ["cl-search", q],
    queryFn: async () =>
      (await api.get<ApiResponse<any[]>>(`/cost-library?q=${encodeURIComponent(q)}&pageSize=8`)).data.data,
    enabled: q.length >= 2,
  });
  const add = useMutation({
    mutationFn: (id: string) =>
      api.post(`/estimating/${estimateId}/lines`, { costLibraryItemId: id, quantity: 1 }),
    onSuccess: onAdded,
  });

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-navy-900">
        <Wand2 size={15} className="text-teal-500" /> Add from Cost Library
      </div>
      <Input placeholder="Search cost items (min 2 chars)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {search.data && search.data.length > 0 && (
        <div className="mt-2 divide-y divide-navy-100 rounded-lg border border-navy-100">
          {search.data.map((it) => (
            <button
              key={it.id}
              onClick={() => { add.mutate(it.id); setQ(""); }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-navy-50"
            >
              <span><span className="font-mono text-xs text-navy-500">{it.code}</span> · {it.description}</span>
              <span className="text-navy-700/60">{money(Math.round(it.baseRate * it.locationFactor))}/{it.unit}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function Tot({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <Card className="px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className={`text-sm font-bold ${accent ? "text-teal-600" : "text-navy-900"}`}>{v}</div>
    </Card>
  );
}
