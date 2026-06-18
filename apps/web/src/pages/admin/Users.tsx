import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { Button, Card, Input, Label, Badge, Spinner } from "../../components/ui";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: { key: string; name: string }[];
}
interface RoleInfo {
  key: string;
  name: string;
  userCount: number;
}

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    roleKeys: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (await api.get<ApiResponse<AdminUser[]>>("/users")).data.data,
  });
  const roles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () =>
      (await api.get<ApiResponse<RoleInfo[]>>("/rbac/roles")).data.data,
  });

  const create = useMutation({
    mutationFn: () => api.post("/users", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setForm({ email: "", name: "", password: "", roleKeys: [] });
      setError(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message ?? "Failed to create user"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const toggleRole = (key: string) =>
    setForm((f) => ({
      ...f,
      roleKeys: f.roleKeys.includes(key)
        ? f.roleKeys.filter((k) => k !== key)
        : [...f.roleKeys, key],
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">Users</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User table */}
        <Card className="overflow-hidden lg:col-span-2">
          {users.isLoading ? (
            <div className="p-6">
              <Spinner />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Roles</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {users.data?.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-medium text-navy-900">{u.name}</td>
                    <td className="px-4 py-2 text-navy-700/70">{u.email}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.key}>{r.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => remove.mutate(u.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Create form */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-navy-900">Add user</h2>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Password (min 8)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Roles</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-navy-100 p-2">
                {roles.data?.map((r) => (
                  <label
                    key={r.key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.roleKeys.includes(r.key)}
                      onChange={() => toggleRole(r.key)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full"
              disabled={
                create.isPending ||
                !form.email ||
                !form.name ||
                form.password.length < 8 ||
                form.roleKeys.length === 0
              }
              onClick={() => create.mutate()}
            >
              Create user
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
