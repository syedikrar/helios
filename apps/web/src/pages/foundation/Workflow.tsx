import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Eye, Send } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, Card, Input, Spinner } from "../../components/ui";
import { Comments } from "../../components/Comments";

interface ApprovalEvent {
  id: string;
  type: string;
  actorEmail: string;
  comment: string | null;
  createdAt: string;
}
interface ApprovalRequest {
  id: string;
  entityType: string;
  title: string;
  status: string;
  submittedBy: string;
  updatedAt: string;
  events?: ApprovalEvent[];
}

const statusColor: Record<string, string> = {
  DRAFT: "bg-navy-100 text-navy-600",
  SUBMITTED: "bg-amber-50 text-amber-600",
  IN_REVIEW: "bg-blue-50 text-blue-600",
  APPROVED: "bg-teal-50 text-teal-600",
  REJECTED: "bg-red-50 text-red-600",
};

export function WorkflowPage() {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission("workflow:approve");
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const list = useQuery({
    queryKey: ["workflow"],
    queryFn: async () =>
      (await api.get<ApiResponse<ApprovalRequest[]>>("/workflow")).data.data,
  });

  const detail = useQuery({
    queryKey: ["workflow", selected],
    queryFn: async () =>
      (await api.get<ApiResponse<ApprovalRequest>>(`/workflow/${selected}`)).data
        .data,
    enabled: !!selected,
  });

  const transition = useMutation({
    mutationFn: (action: "REVIEW" | "APPROVE" | "REJECT") =>
      api.post(`/workflow/${selected}/transition`, { action, comment }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["workflow"] });
      qc.invalidateQueries({ queryKey: ["notif-count"] });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Workflow & Approvals</h1>
        <p className="text-sm text-navy-700/60">
          Generic submit → review → approve/reject engine with a full status
          timeline, applied across estimates, changes, tenders and work packs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* List */}
        <Card className="overflow-hidden">
          {list.isLoading ? (
            <div className="p-6">
              <Spinner />
            </div>
          ) : (
            <div className="divide-y divide-navy-100">
              {list.data?.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`block w-full px-4 py-3 text-left hover:bg-navy-50 ${
                    selected === r.id ? "bg-navy-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-navy-900">
                      {r.title}
                    </span>
                    <Badge className={statusColor[r.status]}>{r.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-navy-700/50">
                    {r.entityType} · by {r.submittedBy}
                  </div>
                </button>
              ))}
              {list.data?.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-navy-700/50">
                  No approval requests.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="grid place-items-center p-12 text-navy-700/50">
              Select an approval request to view its timeline.
            </Card>
          ) : detail.isLoading || !detail.data ? (
            <Card className="p-6">
              <Spinner />
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-navy-900">
                    {detail.data.title}
                  </h2>
                  <Badge className={statusColor[detail.data.status]}>
                    {detail.data.status}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="mt-4 space-y-3 border-l-2 border-navy-100 pl-4">
                  {detail.data.events?.map((e) => (
                    <div key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                      <div className="text-sm font-medium text-navy-900">
                        {e.type}
                        <span className="ml-2 text-xs font-normal text-navy-700/50">
                          {e.actorEmail} · {dateTime(e.createdAt)}
                        </span>
                      </div>
                      {e.comment && (
                        <div className="text-sm text-navy-700/70">{e.comment}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {canApprove &&
                  !["APPROVED", "REJECTED"].includes(detail.data.status) && (
                    <div className="mt-4 border-t border-navy-100 pt-4">
                      <Input
                        placeholder="Optional comment…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          disabled={transition.isPending}
                          onClick={() => transition.mutate("REVIEW")}
                        >
                          <Eye size={14} /> Mark in review
                        </Button>
                        <Button
                          disabled={transition.isPending}
                          onClick={() => transition.mutate("APPROVE")}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </Button>
                        <Button
                          variant="danger"
                          disabled={transition.isPending}
                          onClick={() => transition.mutate("REJECT")}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                {!canApprove && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-navy-700/50">
                    <Send size={12} /> You can view this request; approval requires
                    the workflow:approve permission.
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <Comments entityType="approval" entityId={detail.data.id} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
