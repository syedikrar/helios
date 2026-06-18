import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { useAuth } from "../../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../../components/ui";

const prioColor: Record<string, string> = { HIGH: "bg-red-50 text-red-600", MEDIUM: "bg-amber-50 text-amber-600", LOW: "bg-navy-100 text-navy-600" };
const wpColor: Record<string, string> = {
  PLANNED: "bg-navy-100 text-navy-600", READY: "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600", COMPLETE: "bg-teal-50 text-teal-600", ON_HOLD: "bg-red-50 text-red-600",
};
const matColor: Record<string, string> = {
  REQUIRED: "bg-navy-100 text-navy-600", ORDERED: "bg-blue-50 text-blue-600",
  RECEIVED: "bg-teal-50 text-teal-600", SHORTAGE: "bg-red-50 text-red-600",
};

// ---------- Scoping ----------
export function ScopingPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ description: "", discipline: "Mechanical", priority: "MEDIUM", estimatedHours: 0 });
  const q = useQuery({
    queryKey: ["scoping", projectId],
    queryFn: async () => (await api.get(`/scoping?projectId=${projectId}`)).data,
  });
  const create = useMutation({
    mutationFn: () => api.post("/scoping", { projectId, ...form, estimatedHours: Number(form.estimatedHours) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scoping", projectId] }); setForm({ description: "", discipline: "Mechanical", priority: "MEDIUM", estimatedHours: 0 }); },
  });
  if (q.isLoading) return <Spinner />;
  const items = q.data?.data ?? []; const meta = q.data?.meta ?? {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <Stat label="Scope items" v={String(meta.total ?? 0)} />
        <Stat label="Estimated hours" v={(meta.estimatedHours ?? 0).toLocaleString()} />
        {Object.entries(meta.byStatus ?? {}).map(([k, v]) => <Stat key={k} label={k} v={String(v)} />)}
      </div>
      {hasPermission("scoping:create") && (
        <Card className="flex flex-wrap items-end gap-2 p-3">
          <Input className="flex-1" placeholder="Scope description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="rounded-lg border border-navy-100 px-2 py-2 text-sm" value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })}>
            {["Mechanical", "Piping", "Inspection", "Electrical", "Civil"].map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="rounded-lg border border-navy-100 px-2 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["HIGH", "MEDIUM", "LOW"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <Input className="w-24" type="number" placeholder="Hrs" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })} />
          <Button disabled={!form.description || create.isPending} onClick={() => create.mutate()}>Add scope</Button>
        </Card>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
            <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Tag</th><th className="px-3 py-2">Discipline</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2 text-right">Hrs</th><th className="px-3 py-2">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-navy-100">
            {items.map((s: any) => (
              <tr key={s.id}>
                <td className="px-3 py-1.5 font-mono text-xs">{s.ref}</td>
                <td className="px-3 py-1.5">{s.description}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{s.equipmentTag}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{s.discipline}</td>
                <td className="px-3 py-1.5"><Badge className={prioColor[s.priority]}>{s.priority}</Badge></td>
                <td className="px-3 py-1.5 text-right">{s.estimatedHours}</td>
                <td className="px-3 py-1.5 text-xs text-navy-700/60">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- Work Packs ----------
export function WorkPackPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["workpacks", projectId],
    queryFn: async () => (await api.get<ApiResponse<any[]>>(`/workpacks?projectId=${projectId}`)).data.data,
  });
  if (q.isLoading) return <Spinner />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {q.data?.map((wp) => (
        <Card key={wp.id} className="p-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-navy-100 text-navy-700">{wp.ref}</Badge>
            <Badge className={wpColor[wp.status]}>{wp.status}</Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-navy-900">{wp.title}</h3>
          <div className="mt-1 text-xs text-navy-700/50">{wp.discipline} · {wp.contractor}</div>
          <div className="mt-3 h-2 w-full rounded-full bg-navy-100">
            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${wp.progressPercent}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-navy-700/60">
            <span>{wp.progressPercent}%</span>
            <span>{wp.hoursBurned}/{wp.plannedHours} hrs · {wp._count.materials} materials</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------- Materials ----------
export function MaterialPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["materials", projectId],
    queryFn: async () => (await api.get(`/materials?projectId=${projectId}`)).data,
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/materials/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", projectId] }),
  });
  if (q.isLoading) return <Spinner />;
  const mats = q.data?.data ?? []; const meta = q.data?.meta ?? {};
  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Stat label="Materials" v={String(meta.total ?? 0)} />
        <Stat label="Received" v={String(meta.received ?? 0)} />
        <Stat label="Shortages" v={String(meta.shortages ?? 0)} tone={meta.shortages ? "bad" : "good"} />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
            <th className="px-3 py-2">Part</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Work pack</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-navy-100">
            {mats.map((m: any) => (
              <tr key={m.id} className={m.status === "SHORTAGE" ? "bg-red-50/40" : ""}>
                <td className="px-3 py-1.5 font-mono text-xs">{m.partNo}</td>
                <td className="px-3 py-1.5">{m.description}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{m.workPack?.ref}</td>
                <td className="px-3 py-1.5 text-right">{m.quantity} {m.unit}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{m.supplier}</td>
                <td className="px-3 py-1.5">
                  {hasPermission("material:edit") ? (
                    <select className="rounded border border-navy-100 px-1 py-0.5 text-xs" value={m.status} onChange={(e) => setStatus.mutate({ id: m.id, status: e.target.value })}>
                      {["REQUIRED", "ORDERED", "RECEIVED", "SHORTAGE"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <Badge className={matColor[m.status]}>{m.status}</Badge>}
                </td>
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
