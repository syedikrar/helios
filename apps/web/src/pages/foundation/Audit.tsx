import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { Badge, Card, Input, Label, Spinner } from "../../components/ui";

interface AuditEntry {
  id: string;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}
interface AuditMeta {
  total: number;
  entityTypes: string[];
}

const actionColor: Record<string, string> = {
  CREATE: "bg-teal-50 text-teal-600",
  UPDATE: "bg-amber-50 text-amber-600",
  DELETE: "bg-red-50 text-red-600",
};

export function AuditPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");

  const audit = useQuery({
    queryKey: ["audit", entityType, action, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (q) params.set("q", q);
      const res = await api.get<ApiResponse<AuditEntry[]>>(`/audit?${params}`);
      return res.data as ApiResponse<AuditEntry[]> & { meta: AuditMeta };
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Audit Trail</h1>
        <p className="text-sm text-navy-700/60">
          Immutable record of every mutating action — captured automatically by
          the API audit interceptor.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Search summary</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <Label>Entity</Label>
          <select
            className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All</option>
            {audit.data?.meta?.entityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Action</Label>
          <select
            className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All</option>
            <option>CREATE</option>
            <option>UPDATE</option>
            <option>DELETE</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {audit.isLoading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Summary</th>
                <th className="px-4 py-2">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {audit.data?.data.map((e) => (
                <tr key={e.id} className="hover:bg-navy-50/50">
                  <td className="whitespace-nowrap px-4 py-2 text-navy-700/70">
                    {dateTime(e.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={actionColor[e.action]}>{e.action}</Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-navy-700">
                    {e.entityType}
                  </td>
                  <td className="px-4 py-2 text-navy-900">{e.summary}</td>
                  <td className="px-4 py-2 text-navy-700/60">{e.userEmail}</td>
                </tr>
              ))}
              {audit.data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-navy-700/50">
                    No audit entries match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
