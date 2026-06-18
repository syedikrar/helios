import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2 } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { useAuth } from "../../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../../components/ui";

const colLabel: Record<string, string> = {
  PLANNED: "Planned", READY: "Ready", IN_PROGRESS: "In progress", ON_HOLD: "On hold", COMPLETE: "Complete",
};

// ---------- Execution board ----------
export function ExecutionPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("execution:edit");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["execution", projectId],
    queryFn: async () => (await api.get<ApiResponse<any>>(`/execution?projectId=${projectId}`)).data.data,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; status?: string; progressPercent?: number }) =>
      api.patch(`/execution/workpacks/${v.id}`, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["execution", projectId] }),
  });
  if (q.isLoading || !q.data) return <Spinner />;
  const { board, columns, meta } = q.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <Stat label="Work packs" v={String(meta.total)} />
        <Stat label="Overall progress" v={`${meta.overallProgress}%`} />
        <Stat label="Hours burned" v={`${meta.burnedHours.toLocaleString()} / ${meta.plannedHours.toLocaleString()}`} />
        <Stat label="Complete" v={`${meta.complete}/${meta.total}`} tone="good" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {columns.map((col: string) => (
          <div key={col} className="rounded-xl bg-navy-100/40 p-2">
            <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
              {colLabel[col]} ({board[col].length})
            </div>
            <div className="space-y-2">
              {board[col].map((wp: any) => (
                <Card key={wp.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-navy-600">{wp.ref}</span>
                    <span className="text-xs text-navy-700/50">{wp.progressPercent}%</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-navy-900">{wp.title}</div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-navy-100">
                    <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${wp.progressPercent}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] text-navy-700/50">{wp.contractor}</div>
                  {canEdit && (
                    <div className="mt-2 flex gap-1">
                      <button
                        className="rounded border border-navy-100 px-1.5 py-0.5 text-[10px] hover:bg-navy-50"
                        onClick={() => update.mutate({ id: wp.id, progressPercent: Math.min(100, wp.progressPercent + 10), status: wp.progressPercent + 10 >= 100 ? "COMPLETE" : "IN_PROGRESS" })}
                      >
                        +10%
                      </button>
                      <select
                        className="rounded border border-navy-100 px-1 py-0.5 text-[10px]"
                        value={wp.status}
                        onChange={(e) => update.mutate({ id: wp.id, status: e.target.value })}
                      >
                        {columns.map((c: string) => <option key={c} value={c}>{colLabel[c]}</option>)}
                      </select>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Lessons Learned ----------
export function LessonsPanel({ projectId }: { projectId: string }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ category: "Planning", description: "", recommendation: "" });
  const q = useQuery({
    queryKey: ["lessons", projectId],
    queryFn: async () => (await api.get<ApiResponse<any[]>>(`/lessons?projectId=${projectId}`)).data.data,
  });
  const create = useMutation({
    mutationFn: () => api.post("/lessons", { projectId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons", projectId] }); setForm({ category: "Planning", description: "", recommendation: "" }); },
  });
  const push = useMutation({
    mutationFn: (id: string) => api.post(`/lessons/${id}/push-to-library`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons", projectId] }),
  });
  if (q.isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {hasPermission("lessons:create") && (
        <Card className="space-y-2 p-3">
          <div className="flex gap-2">
            <select className="rounded-lg border border-navy-100 px-2 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Planning", "Welding", "Safety", "Cost", "Quality", "Schedule"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <Input className="flex-1" placeholder="What happened?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Input className="flex-1" placeholder="Recommendation" value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} />
            <Button disabled={!form.description || create.isPending} onClick={() => create.mutate()}>Capture</Button>
          </div>
        </Card>
      )}
      <div className="space-y-3">
        {q.data?.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-navy-100 text-navy-700">{l.category}</Badge>
              {l.pushedToLibrary ? (
                <Badge className="bg-teal-50 text-teal-600"><CheckCircle2 size={11} className="mr-1" /> in cost library</Badge>
              ) : hasPermission("lessons:edit") ? (
                <Button variant="ghost" onClick={() => push.mutate(l.id)} disabled={push.isPending}>
                  <BookOpen size={13} /> Push to library
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-navy-900">{l.description}</p>
            {l.recommendation && <p className="mt-1 text-sm text-navy-700/70">→ {l.recommendation}</p>}
          </Card>
        ))}
        {q.data?.length === 0 && <Card className="p-8 text-center text-navy-700/50">No lessons captured yet.</Card>}
      </div>
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
