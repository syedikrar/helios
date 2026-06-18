import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { Card, Spinner } from "../../components/ui";

interface Matrix {
  modules: { key: string; label: string; group: string }[];
  roles: { key: string; name: string }[];
  permissions: { key: string; module: string; action: string }[];
  grants: Record<string, string[]>;
}

export function PermissionMatrixPage() {
  const matrix = useQuery({
    queryKey: ["rbac-matrix"],
    queryFn: async () =>
      (await api.get<ApiResponse<Matrix>>("/rbac/matrix")).data.data,
  });

  if (matrix.isLoading || !matrix.data)
    return (
      <div className="p-6">
        <Spinner label="Loading matrix…" />
      </div>
    );

  const m = matrix.data;
  const grantSets = Object.fromEntries(
    Object.entries(m.grants).map(([k, v]) => [k, new Set(v)]),
  );
  const moduleLabel = Object.fromEntries(
    m.modules.map((mod) => [mod.key, mod.label]),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Permission Matrix</h1>
        <p className="mt-1 text-sm text-navy-700/70">
          {m.permissions.length} permissions × {m.roles.length} roles. A check
          means the role holds that <code>module:action</code> permission.
        </p>
      </div>

      <Card className="overflow-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-navy-50 px-3 py-2 text-left font-semibold text-navy-900">
                Permission
              </th>
              {m.roles.map((r) => (
                <th
                  key={r.key}
                  className="whitespace-nowrap bg-navy-50 px-2 py-2 text-center font-medium text-navy-700"
                  title={r.name}
                >
                  {r.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {m.permissions.map((p) => (
              <tr key={p.key} className="hover:bg-navy-50/50">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-navy-800">
                  <span className="text-navy-700/50">
                    {moduleLabel[p.module] ?? p.module}
                  </span>{" "}
                  · <span className="font-medium">{p.action}</span>
                </td>
                {m.roles.map((r) => (
                  <td key={r.key} className="px-2 py-1.5 text-center">
                    {grantSets[r.key]?.has(p.key) ? (
                      <Check className="mx-auto text-teal-500" size={14} />
                    ) : (
                      <span className="text-navy-100">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
