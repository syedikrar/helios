import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../lib/api";
import { relative } from "../lib/format";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const count = useQuery({
    queryKey: ["notif-count"],
    queryFn: async () =>
      (await api.get<ApiResponse<{ count: number }>>("/notifications/unread-count"))
        .data.data.count,
    refetchInterval: 20_000,
  });

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get<ApiResponse<Notification[]>>("/notifications")).data.data,
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-count"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = count.data ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-navy-100 p-2 text-navy-700 hover:bg-navy-50"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-navy-100 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-navy-100 px-3 py-2">
              <span className="text-sm font-semibold text-navy-900">
                Notifications
              </span>
              <button
                className="text-xs text-teal-600 hover:underline"
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {list.data?.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-navy-700/50">
                  Nothing here yet.
                </div>
              )}
              {list.data?.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-navy-50 px-3 py-2 ${
                    n.read ? "opacity-60" : "bg-teal-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-900">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-navy-700/50">
                      {relative(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <div className="mt-0.5 text-xs text-navy-700/70">{n.body}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
