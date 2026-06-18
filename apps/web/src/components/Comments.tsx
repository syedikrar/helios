import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../lib/api";
import { relative } from "../lib/format";
import { Button, Input } from "./ui";

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// Reusable threaded-comment panel for any entity (collaboration differentiator).
export function Comments({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const key = ["comments", entityType, entityId];

  const comments = useQuery({
    queryKey: key,
    queryFn: async () =>
      (
        await api.get<ApiResponse<Comment[]>>(
          `/comments?entityType=${entityType}&entityId=${entityId}`,
        )
      ).data.data,
  });

  const add = useMutation({
    mutationFn: () =>
      api.post("/comments", { entityType, entityId, body }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <MessageSquare size={15} /> Discussion ({comments.data?.length ?? 0})
      </div>
      <div className="space-y-3">
        {comments.data?.map((c) => (
          <div key={c.id} className="rounded-lg bg-navy-50 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-navy-700/60">
              <span className="font-medium text-navy-800">{c.authorName}</span>
              <span>{relative(c.createdAt)}</span>
            </div>
            <div className="mt-1 text-sm text-navy-800">{c.body}</div>
          </div>
        ))}
        {comments.data?.length === 0 && (
          <div className="text-sm text-navy-700/50">No comments yet.</div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) add.mutate();
          }}
        />
        <Button disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
          Post
        </Button>
      </div>
    </div>
  );
}
