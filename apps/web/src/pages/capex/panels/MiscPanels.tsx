import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { money } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../../components/ui";

const CUR = "USD";

// ---------- Overview ----------
export function OverviewPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/dashboard/${projectId}`)).data.data,
  });
  if (q.isLoading || !q.data) return <Spinner />;
  const d = q.data;
  const breakdown = Object.entries(d.costBreakdown).map(([k, v]) => ({ name: k, value: (v as number) / 100 }));
  const colors = ["#15233B", "#14735C", "#B07D1E", "#1f3354", "#0f5d4a", "#8f6418", "#6b7280"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="BAC" v={money(d.evm.bac, CUR)} />
        <Stat label="EAC" v={money(d.evm.eac, CUR)} tone={d.evm.eac > d.evm.bac ? "bad" : "good"} />
        <Stat label="CPI" v={String(d.evm.cpi)} />
        <Stat label="SPI" v={String(d.evm.spi)} />
        <Stat label="Open changes" v={String(d.openChanges)} />
        <Stat label="Risk exposure" v={money(d.riskExposure, CUR)} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-navy-900">Cost breakdown by discipline</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={breakdown} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e7f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v: number) => money(Math.round(v * 100), CUR)} />
            <Bar dataKey="value">
              {breakdown.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-sm text-navy-700/60">
          Embodied carbon: {(d.carbon / 1000).toFixed(1)} tCO₂e · Approved change impact:{" "}
          {money(d.approvedChangeImpact, CUR)}
        </div>
      </Card>
    </div>
  );
}

// ---------- Change ----------
export function ChangePanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", costImpact: 0, timeImpact: 0 });
  const q = useQuery({
    queryKey: ["change", projectId],
    queryFn: async () => (await api.get(`/change?projectId=${projectId}`)).data,
  });
  const create = useMutation({
    mutationFn: () => api.post("/change", { projectId, title: form.title, costImpact: Math.round(form.costImpact * 100), timeImpact: form.timeImpact }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["change", projectId] }); setForm({ title: "", costImpact: 0, timeImpact: 0 }); },
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/change/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change", projectId] }),
  });
  if (q.isLoading) return <Spinner />;
  const data = q.data?.data ?? [];
  const meta = q.data?.meta ?? {};
  const colors: Record<string, string> = { OPEN: "bg-navy-100 text-navy-600", ASSESSED: "bg-amber-50 text-amber-600", APPROVED: "bg-teal-50 text-teal-600", REJECTED: "bg-red-50 text-red-600" };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Stat label="Open / total" v={`${data.filter((c: any) => c.status === "OPEN").length} / ${meta.total}`} />
        <Stat label="Approved cost impact" v={money(meta.approvedCostImpact ?? 0, CUR)} tone={(meta.approvedCostImpact ?? 0) > 0 ? "bad" : "good"} />
        <Stat label="Approved time impact" v={`${meta.approvedTimeImpact ?? 0} days`} />
      </div>
      {hasPermission("change:create") && (
        <Card className="flex flex-wrap items-end gap-2 p-3">
          <Input placeholder="Change title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1" />
          <Input type="number" placeholder="Cost impact" value={form.costImpact} onChange={(e) => setForm({ ...form, costImpact: Number(e.target.value) })} className="w-32" />
          <Input type="number" placeholder="Days" value={form.timeImpact} onChange={(e) => setForm({ ...form, timeImpact: Number(e.target.value) })} className="w-20" />
          <Button disabled={!form.title || create.isPending} onClick={() => create.mutate()}>Raise change</Button>
        </Card>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
            <tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Title</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {data.map((c: any) => (
              <tr key={c.id}>
                <td className="px-3 py-1.5 font-mono text-xs">{c.ref}</td>
                <td className="px-3 py-1.5">{c.title}</td>
                <td className={`px-3 py-1.5 text-right ${c.costImpact < 0 ? "text-teal-600" : "text-navy-900"}`}>{money(c.costImpact, CUR)}</td>
                <td className="px-3 py-1.5 text-right">{c.timeImpact}</td>
                <td className="px-3 py-1.5">
                  {hasPermission("change:approve") && c.status !== "APPROVED" && c.status !== "REJECTED" ? (
                    <select className="rounded border border-navy-100 px-1 py-0.5 text-xs" value={c.status} onChange={(e) => setStatus.mutate({ id: c.id, status: e.target.value })}>
                      {["OPEN", "ASSESSED", "APPROVED", "REJECTED"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <Badge className={colors[c.status]}>{c.status}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- Risk ----------
export function RiskPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["risk", projectId],
    queryFn: async () => (await api.get(`/risk?projectId=${projectId}`)).data,
  });
  if (q.isLoading) return <Spinner />;
  const data = q.data?.data ?? [];
  const meta = q.data?.meta ?? {};
  const sev = (p: number, impact: number) => {
    const ev = p * impact;
    return ev > 4_00000 ? "bg-red-50 text-red-600" : ev > 2_00000 ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600";
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Stat label="Risks" v={String(meta.total ?? 0)} />
        <Stat label="Expected value" v={money(meta.expectedValue ?? 0, CUR)} />
        <Stat label="P50 contingency" v={money(meta.p50 ?? 0, CUR)} />
        <Stat label="P80 contingency" v={money(meta.p80 ?? 0, CUR)} tone="bad" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
            <tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Risk</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Prob.</th><th className="px-3 py-2 text-right">Impact</th><th className="px-3 py-2 text-right">Expected</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {data.map((r: any) => (
              <tr key={r.id}>
                <td className="px-3 py-1.5 font-mono text-xs">{r.ref}</td>
                <td className="px-3 py-1.5">{r.title}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{r.category}</td>
                <td className="px-3 py-1.5 text-right">{Math.round(r.probability * 100)}%</td>
                <td className="px-3 py-1.5 text-right">{money(r.impactCost, CUR)}</td>
                <td className="px-3 py-1.5 text-right"><Badge className={sev(r.probability, r.impactCost)}>{money(r.expectedValue, CUR)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- Schedule ----------
export function SchedulePanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["schedule", projectId],
    queryFn: async () => (await api.get<ApiResponse<any[]>>(`/schedule?projectId=${projectId}`)).data.data,
  });
  if (q.isLoading) return <Spinner />;
  const acts = q.data ?? [];
  if (!acts.length) return <Card className="p-8 text-center text-navy-700/60">No schedule activities.</Card>;
  const all = acts.flatMap((a) => [new Date(a.startDate).getTime(), new Date(a.endDate).getTime()]);
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  return (
    <Card className="overflow-hidden p-4">
      <h3 className="mb-3 font-semibold text-navy-900">Schedule (simple Gantt)</h3>
      <div className="space-y-1.5">
        {acts.map((a) => {
          const s = ((new Date(a.startDate).getTime() - min) / span) * 100;
          const w = ((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / span) * 100;
          return (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <div className="w-48 truncate text-navy-800">{a.wbs} · {a.name}</div>
              <div className="relative h-4 flex-1 rounded bg-navy-50">
                <div className="absolute h-4 rounded bg-navy-700/30" style={{ left: `${s}%`, width: `${w}%` }} />
                <div className="absolute h-4 rounded bg-teal-500" style={{ left: `${s}%`, width: `${(w * a.percentComplete) / 100}%` }} />
              </div>
              <div className="w-10 text-right text-navy-700/60">{a.percentComplete}%</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- Tendering ----------
export function TenderPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["tenders", projectId],
    queryFn: async () => (await api.get<ApiResponse<any[]>>(`/tenders?projectId=${projectId}`)).data.data,
  });
  const [open, setOpen] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["tender", open],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/tenders/${open}`)).data.data,
    enabled: !!open,
  });
  const award = useMutation({
    mutationFn: (bidId: string) => api.post(`/tenders/${open}/award`, { bidId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tender", open] }); qc.invalidateQueries({ queryKey: ["tenders", projectId] }); },
  });
  if (list.isLoading) return <Spinner />;
  if (!list.data?.length) return <Card className="p-8 text-center text-navy-700/60">No tenders.</Card>;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="divide-y divide-navy-100">
        {list.data.map((t) => (
          <button key={t.id} onClick={() => setOpen(t.id)} className={`block w-full px-4 py-3 text-left hover:bg-navy-50 ${open === t.id ? "bg-navy-50" : ""}`}>
            <div className="flex justify-between"><span className="font-medium text-navy-900">{t.title}</span><Badge className="bg-navy-100 text-navy-600">{t.status}</Badge></div>
            <div className="text-xs text-navy-700/50">{t.ref} · ref est {money(t.referenceEstimate, CUR)} · {t._count.bids} bids</div>
          </button>
        ))}
      </Card>
      <div className="lg:col-span-2">
        {detail.data ? (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
                <tr><th className="px-3 py-2">Vendor</th><th className="px-3 py-2 text-right">Bid</th><th className="px-3 py-2 text-right">vs ref</th><th className="px-3 py-2 text-right">Score</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {detail.data.bids.map((b: any) => {
                  const delta = b.amount - detail.data.referenceEstimate;
                  return (
                    <tr key={b.id} className={b.awarded ? "bg-teal-50/40" : ""}>
                      <td className="px-3 py-2 font-medium">{b.vendor}{b.awarded && <Badge className="ml-2 bg-teal-50 text-teal-600">awarded</Badge>}</td>
                      <td className="px-3 py-2 text-right">{money(b.amount, CUR)}</td>
                      <td className={`px-3 py-2 text-right ${delta > 0 ? "text-red-600" : "text-teal-600"}`}>{delta > 0 ? "+" : ""}{money(delta, CUR)}</td>
                      <td className="px-3 py-2 text-right">{b.score ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {hasPermission("tendering:approve") && detail.data.status !== "AWARDED" && (
                          <Button onClick={() => award.mutate(b.id)} disabled={award.isPending}>Award</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : <Card className="grid place-items-center p-12 text-navy-700/50">Select a tender.</Card>}
      </div>
    </div>
  );
}

// ---------- Benchmarking ----------
export function BenchmarkPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["benchmark-compare", projectId],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/benchmarks/compare?projectId=${projectId}`)).data.data,
  });
  if (q.isLoading || !q.data) return <Spinner />;
  const byDisc = Object.entries(q.data.byDiscipline) as [string, number][];
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-2 font-semibold text-navy-900">This project — cost by discipline</h3>
        <div className="text-sm text-navy-700/60">BAC {money(q.data.bac, CUR)} · benchmarked against {q.data.benchmarks.length} anonymised reference projects.</div>
        <div className="mt-3 space-y-1">
          {byDisc.sort((a, b) => b[1] - a[1]).map(([d, v]) => {
            const max = Math.max(...byDisc.map((x) => x[1]));
            return (
              <div key={d} className="flex items-center gap-2 text-xs">
                <div className="w-32 text-navy-800">{d}</div>
                <div className="h-3 flex-1 rounded bg-navy-50"><div className="h-3 rounded bg-teal-500" style={{ width: `${(v / max) * 100}%` }} /></div>
                <div className="w-24 text-right text-navy-700/70">{money(v, CUR)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
            <tr><th className="px-3 py-2">Benchmark</th><th className="px-3 py-2">Metric</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2">Discipline</th><th className="px-3 py-2">Region</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {q.data.benchmarks.map((b: any) => (
              <tr key={b.id}>
                <td className="px-3 py-1.5">{b.name}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{b.metric}</td>
                <td className="px-3 py-1.5 text-right">{b.value.toLocaleString()} {b.unit}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{b.discipline}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{b.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: "good" | "bad" }) {
  return (
    <Card className="px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className={`text-sm font-bold ${tone === "bad" ? "text-red-600" : tone === "good" ? "text-teal-600" : "text-navy-900"}`}>{v}</div>
    </Card>
  );
}
