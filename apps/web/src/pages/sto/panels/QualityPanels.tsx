import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { useAuth } from "../../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../../components/ui";

const ndeColor: Record<string, string> = { PASS: "bg-teal-50 text-teal-600", FAIL: "bg-red-50 text-red-600", PENDING: "bg-amber-50 text-amber-600" };

// ---------- Weld Management ----------
export function WeldPanel({ projectId }: { projectId: string }) {
  const welds = useQuery({
    queryKey: ["welds", projectId],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/welds?projectId=${projectId}`)).data.data,
  });
  const welders = useQuery({
    queryKey: ["welders"],
    queryFn: async () => (await api.get<ApiResponse<any[]>>(`/welds/welders/list`)).data.data,
  });
  if (welds.isLoading || !welds.data) return <Spinner />;
  const { summary, lisl, welds: rows } = welds.data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Welds" v={String(summary.total)} />
        <Stat label="Accepted" v={String(summary.accepted)} tone="good" />
        <Stat label="Rejected" v={String(summary.rejected)} tone={summary.rejected ? "bad" : undefined} />
        <Stat label="Pending NDE" v={String(summary.pending)} />
        <Stat label="Repair rate" v={`${summary.repairRate}%`} tone={summary.repairRate > 5 ? "bad" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LISL */}
        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-4 py-2 text-sm font-semibold text-navy-900">LISL — Line Inspection Summary</div>
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
              <th className="px-3 py-2">Line / ISO</th><th className="px-3 py-2 text-right">Welds</th><th className="px-3 py-2 text-right">Acc.</th><th className="px-3 py-2 text-right">Rej.</th><th className="px-3 py-2 text-right">Pend.</th>
            </tr></thead>
            <tbody className="divide-y divide-navy-100">
              {lisl.map((l: any) => (
                <tr key={l.lineIso}>
                  <td className="px-3 py-1.5 font-mono text-xs">{l.lineIso}</td>
                  <td className="px-3 py-1.5 text-right">{l.total}</td>
                  <td className="px-3 py-1.5 text-right text-teal-600">{l.accepted}</td>
                  <td className={`px-3 py-1.5 text-right ${l.rejected ? "text-red-600" : ""}`}>{l.rejected}</td>
                  <td className="px-3 py-1.5 text-right text-amber-600">{l.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Welder cert overview */}
        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-4 py-2 text-sm font-semibold text-navy-900">Welder qualifications</div>
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
              <th className="px-3 py-2">Stamp</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Process</th><th className="px-3 py-2 text-right">Welds</th><th className="px-3 py-2">Cert</th>
            </tr></thead>
            <tbody className="divide-y divide-navy-100">
              {welders.data?.map((w) => (
                <tr key={w.id} className={w.expired ? "bg-red-50/50" : ""}>
                  <td className="px-3 py-1.5 font-mono text-xs">{w.stamp}</td>
                  <td className="px-3 py-1.5">{w.name}</td>
                  <td className="px-3 py-1.5 text-navy-700/60">{w.process}</td>
                  <td className="px-3 py-1.5 text-right">{w._count.welds}</td>
                  <td className="px-3 py-1.5">
                    {w.expired
                      ? <Badge className="bg-red-50 text-red-600"><AlertTriangle size={11} className="mr-1" /> expired</Badge>
                      : <Badge className="bg-teal-50 text-teal-600">valid</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Weld register */}
      <Card className="overflow-hidden">
        <div className="border-b border-navy-100 px-4 py-2 text-sm font-semibold text-navy-900">Weld register</div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
              <th className="px-3 py-2">Weld</th><th className="px-3 py-2">Line</th><th className="px-3 py-2">Joint</th><th className="px-3 py-2">Welder</th><th className="px-3 py-2">WPS</th><th className="px-3 py-2">Heat</th><th className="px-3 py-2">NDE</th>
            </tr></thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((w: any) => (
                <tr key={w.id}>
                  <td className="px-3 py-1.5 font-mono text-xs">{w.weldId}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-navy-600">{w.lineIso}</td>
                  <td className="px-3 py-1.5 text-navy-700/60">{w.joint}</td>
                  <td className="px-3 py-1.5">{w.welder?.stamp}</td>
                  <td className="px-3 py-1.5 text-navy-700/60">{w.wps?.ref}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-navy-600">{w.heatNo}</td>
                  <td className="px-3 py-1.5"><Badge className={ndeColor[w.ndeResult]}>{w.ndeResult}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------- QA/QC ----------
export function QaPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [ncr, setNcr] = useState({ title: "", severity: "MINOR" });
  const q = useQuery({
    queryKey: ["qa", projectId],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/qa?projectId=${projectId}`)).data.data,
  });
  const raiseNcr = useMutation({
    mutationFn: () => api.post("/qa/ncr", { projectId, ...ncr }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qa", projectId] }); setNcr({ title: "", severity: "MINOR" }); },
  });
  const setNcrStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/qa/ncr/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa", projectId] }),
  });
  if (q.isLoading || !q.data) return <Spinner />;
  const { checks, ncrs, meta } = q.data;
  const sevColor: Record<string, string> = { MINOR: "bg-navy-100 text-navy-600", MAJOR: "bg-amber-50 text-amber-600", CRITICAL: "bg-red-50 text-red-600" };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Stat label="Checks" v={String(meta.checks)} />
        <Stat label="Passed" v={String(meta.passed)} tone="good" />
        <Stat label="Failed" v={String(meta.failed)} tone={meta.failed ? "bad" : undefined} />
        <Stat label="Open NCRs" v={String(meta.openNcrs)} tone={meta.openNcrs ? "bad" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-4 py-2 text-sm font-semibold text-navy-900">Inspection checks</div>
          <div className="max-h-80 divide-y divide-navy-100 overflow-y-auto">
            {checks.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{c.checklist} <span className="text-xs text-navy-700/50">· {c.inspector}</span></span>
                <Badge className={c.result === "PASS" ? "bg-teal-50 text-teal-600" : c.result === "FAIL" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}>{c.result}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-4 py-2 text-sm font-semibold text-navy-900">Non-conformance reports</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-navy-100">
              {ncrs.map((n: any) => (
                <tr key={n.id}>
                  <td className="px-3 py-2 font-mono text-xs">{n.ref}</td>
                  <td className="px-3 py-2">{n.title}</td>
                  <td className="px-3 py-2"><Badge className={sevColor[n.severity]}>{n.severity}</Badge></td>
                  <td className="px-3 py-2">
                    {hasPermission("qaqc:edit") && n.status !== "CLOSED" ? (
                      <select className="rounded border border-navy-100 px-1 py-0.5 text-xs" value={n.status} onChange={(e) => setNcrStatus.mutate({ id: n.id, status: e.target.value })}>
                        {["OPEN", "IN_REVIEW", "CLOSED"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : <Badge className="bg-navy-100 text-navy-600">{n.status}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasPermission("qaqc:create") && (
            <div className="flex gap-2 border-t border-navy-100 p-3">
              <Input placeholder="Raise NCR…" value={ncr.title} onChange={(e) => setNcr({ ...ncr, title: e.target.value })} />
              <select className="rounded-lg border border-navy-100 px-2 text-sm" value={ncr.severity} onChange={(e) => setNcr({ ...ncr, severity: e.target.value })}>
                {["MINOR", "MAJOR", "CRITICAL"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <Button disabled={!ncr.title || raiseNcr.isPending} onClick={() => raiseNcr.mutate()}>Raise</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- Safeguarding ----------
export function SafeguardPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["safeguards", projectId],
    queryFn: async () => (await api.get(`/safeguards?projectId=${projectId}`)).data,
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/safeguards/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["safeguards", projectId] }),
  });
  if (q.isLoading) return <Spinner />;
  const items = q.data?.data ?? []; const meta = q.data?.meta ?? {};
  const sgColor: Record<string, string> = { OPEN: "bg-amber-50 text-amber-600", ACTIVE: "bg-blue-50 text-blue-600", CLOSED: "bg-teal-50 text-teal-600" };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <Stat label="Permits / safeguards" v={String(meta.total ?? 0)} />
        <Stat label="Open / active" v={String(meta.open ?? 0)} tone={meta.open ? "bad" : "good"} />
        {meta.open > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <ShieldCheck size={14} /> Open safeguards block execution sign-off.
          </div>
        )}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60"><tr>
            <th className="px-3 py-2">Type</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Responsible</th><th className="px-3 py-2">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-navy-100">
            {items.map((s: any) => (
              <tr key={s.id}>
                <td className="px-3 py-1.5"><Badge className="bg-navy-100 text-navy-600">{s.type}</Badge></td>
                <td className="px-3 py-1.5">{s.title}</td>
                <td className="px-3 py-1.5 text-navy-700/60">{s.responsible}</td>
                <td className="px-3 py-1.5">
                  {hasPermission("safeguarding:edit") && s.status !== "CLOSED" ? (
                    <select className="rounded border border-navy-100 px-1 py-0.5 text-xs" value={s.status} onChange={(e) => setStatus.mutate({ id: s.id, status: e.target.value })}>
                      {["OPEN", "ACTIVE", "CLOSED"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  ) : <Badge className={sgColor[s.status]}>{s.status}</Badge>}
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
