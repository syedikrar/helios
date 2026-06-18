import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plug } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { relative } from "../../lib/format";
import { Badge, Button, Card, Spinner } from "../../components/ui";

interface Connector {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  lastSyncAt: string | null;
  _count: { logs: number };
}

const statusColor: Record<string, string> = {
  CONNECTED: "bg-teal-50 text-teal-600",
  DISCONNECTED: "bg-navy-100 text-navy-600",
  ERROR: "bg-red-50 text-red-600",
};

export function IntegrationsPage() {
  const qc = useQueryClient();
  const connectors = useQuery({
    queryKey: ["connectors"],
    queryFn: async () =>
      (await api.get<ApiResponse<Connector[]>>("/connectors")).data.data,
  });

  const sync = useMutation({
    mutationFn: (id: string) => api.post(`/connectors/${id}/sync`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Integrations</h1>
        <p className="text-sm text-navy-700/60">
          Open-platform connector hub. All connectors are mocked for the MVP —
          "Sync now" imports/exports demo data and records a sync log.
        </p>
      </div>

      {connectors.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.data?.map((c) => (
            <Card key={c.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Plug size={18} className="text-teal-500" />
                  <div>
                    <div className="font-semibold text-navy-900">{c.name}</div>
                    <div className="text-xs text-navy-700/50">{c.category}</div>
                  </div>
                </div>
                <Badge className={statusColor[c.status]}>{c.status}</Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-navy-700/70">
                {c.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-navy-700/50">
                <span>
                  {c.lastSyncAt
                    ? `Last sync ${relative(c.lastSyncAt)}`
                    : "Never synced"}
                </span>
                <span>{c._count.logs} logs</span>
              </div>
              <Button
                variant="ghost"
                className="mt-3"
                disabled={sync.isPending && sync.variables === c.id}
                onClick={() => sync.mutate(c.id)}
              >
                <RefreshCw
                  size={14}
                  className={
                    sync.isPending && sync.variables === c.id
                      ? "animate-spin"
                      : ""
                  }
                />
                Sync now
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
