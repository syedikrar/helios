import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@helios/types";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, Card, Input, Label, Spinner } from "../../components/ui";

interface CostItem {
  id: string;
  code: string;
  description: string;
  discipline: string;
  category: string;
  unit: string;
  baseRate: number;
  currency: string;
  locationFactor: number;
  region: string | null;
  isParametric: boolean;
  paramName: string | null;
  paramUnit: string | null;
}
interface Facets {
  disciplines: string[];
  categories: Record<string, string[]>;
  total: number;
}

export function CostLibraryPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("costlibrary:create");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);

  const facets = useQuery({
    queryKey: ["cl-facets"],
    queryFn: async () =>
      (await api.get<ApiResponse<Facets>>("/cost-library/facets")).data.data,
  });

  const list = useQuery({
    queryKey: ["cost-library", q, discipline, category],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "200" });
      if (q) params.set("q", q);
      if (discipline) params.set("discipline", discipline);
      if (category) params.set("category", category);
      const res = await api.get<ApiResponse<CostItem[]>>(
        `/cost-library?${params}`,
      );
      return res.data;
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Cost Library</h1>
          <p className="text-sm text-navy-700/60">
            CESK catalog — {facets.data?.total ?? "…"} unit rates, labour norms &
            parametric equipment models.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)}>+ Add item</Button>
        )}
      </div>

      {showForm && canCreate && (
        <CreateForm
          disciplines={facets.data?.disciplines ?? []}
          onDone={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["cost-library"] });
            qc.invalidateQueries({ queryKey: ["cl-facets"] });
          }}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label>Search</Label>
          <Input
            placeholder="Code or description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <Label>Discipline</Label>
          <select
            className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
            value={discipline}
            onChange={(e) => {
              setDiscipline(e.target.value);
              setCategory("");
            }}
          >
            <option value="">All</option>
            {facets.data?.disciplines.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Category</Label>
          <select
            className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!discipline}
          >
            <option value="">All</option>
            {(facets.data?.categories[discipline] ?? []).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="border-b border-navy-100 px-4 py-2 text-xs text-navy-700/60">
              {list.data?.meta?.total ?? 0} items
            </div>
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-700/60">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Discipline / Category</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">Base rate</th>
                  <th className="px-4 py-2 text-right">Loc. factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {list.data?.data.map((it) => (
                  <tr key={it.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-2 font-mono text-xs text-navy-700">
                      {it.code}
                    </td>
                    <td className="px-4 py-2 text-navy-900">
                      {it.description}
                      {it.isParametric && (
                        <Badge className="ml-2 bg-amber-50 text-amber-600">
                          parametric · {it.paramName}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-navy-700/70">
                      {it.discipline} · {it.category}
                    </td>
                    <td className="px-4 py-2 text-navy-700/70">{it.unit}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {money(it.baseRate, it.currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-navy-700/70">
                      {it.locationFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}

function CreateForm({
  disciplines,
  onDone,
}: {
  disciplines: string[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    code: "",
    description: "",
    discipline: disciplines[0] ?? "Civil",
    category: "",
    unit: "",
    baseRate: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () =>
      api.post("/cost-library", {
        ...form,
        baseRate: Math.round(Number(form.baseRate) * 100),
      }),
    onSuccess: onDone,
    onError: (e: any) =>
      setError(e?.response?.data?.message ?? "Failed to create"),
  });

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label>Code</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Discipline</Label>
          <Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div>
          <Label>Unit</Label>
          <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div>
          <Label>Base rate (major units)</Label>
          <Input
            type="number"
            value={form.baseRate}
            onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          disabled={create.isPending || !form.code || !form.description || !form.unit}
          onClick={() => create.mutate()}
        >
          Create
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
