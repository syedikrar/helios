import { useQuery } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { ApiResponse } from "@helios/types";
import { api } from "../../../lib/api";
import { money } from "../../../lib/format";
import { Badge, Card, Spinner } from "../../../components/ui";

interface SCurvePoint {
  label: string;
  pvCum: number;
  evCum: number | null;
  acCum: number | null;
}
interface Evm {
  bac: number; pv: number; ev: number; ac: number; cv: number; sv: number;
  cpi: number; spi: number; eac: number; etc: number; vac: number; tcpi: number;
  percentComplete: number; anomaly: boolean; health: string;
  statusLabel: string | null;
  sCurve: SCurvePoint[];
  forecast: { best: number; likely: number; worst: number };
}
interface ControlsResponse {
  project: { id: string; name: string; currency: string };
  baseline: { bac: number } | null;
  evm: Evm;
}

const healthColor: Record<string, string> = {
  GREEN: "bg-teal-50 text-teal-600",
  AMBER: "bg-amber-50 text-amber-600",
  RED: "bg-red-50 text-red-600",
  NONE: "bg-navy-100 text-navy-500",
};

export function EvmPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["controls", projectId],
    queryFn: async () =>
      (await api.get<ApiResponse<ControlsResponse>>(`/controls/${projectId}`)).data
        .data,
  });

  if (q.isLoading || !q.data) return <Spinner label="Computing EVM…" />;
  const { evm, project } = q.data;
  const cur = project.currency;

  if (!q.data.baseline) {
    return (
      <Card className="p-8 text-center text-navy-700/60">
        No baseline set. Promote an approved estimate to baseline to enable EVM.
      </Card>
    );
  }

  const chartData = evm.sCurve.map((p) => ({
    label: p.label,
    PV: p.pvCum / 100,
    EV: p.evCum === null ? null : p.evCum / 100,
    AC: p.acCum === null ? null : p.acCum / 100,
  }));

  return (
    <div className="space-y-5">
      {evm.anomaly && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertTriangle size={16} />
          Cost overrun anomaly detected — CPI {evm.cpi} is below the 0.90 threshold.
          Forecast at completion exceeds budget by {money(Math.abs(evm.vac), cur)}.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="BAC" value={money(evm.bac, cur)} />
        <Metric label="EV" value={money(evm.ev, cur)} />
        <Metric label="AC" value={money(evm.ac, cur)} />
        <Gauge label="CPI" value={evm.cpi} />
        <Gauge label="SPI" value={evm.spi} />
        <Metric label="EAC" value={money(evm.eac, cur)} />
        <Metric
          label="VAC"
          value={money(evm.vac, cur)}
          tone={evm.vac < 0 ? "bad" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* S-curve */}
        <Card className="p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-navy-900">S-curve (cumulative)</h3>
            <Badge className={healthColor[evm.health]}>
              {evm.health} · {evm.percentComplete}% complete
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e7f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(v: number) => money(Math.round(v * 100), cur)}
              />
              <Legend />
              <Area type="monotone" dataKey="PV" stroke="#15233B" fill="#15233B" fillOpacity={0.06} />
              <Line type="monotone" dataKey="EV" stroke="#14735C" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="AC" stroke="#B07D1E" strokeWidth={2} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Forecast + variances */}
        <Card className="p-4">
          <h3 className="mb-3 font-semibold text-navy-900">Forecast at completion</h3>
          <div className="space-y-2">
            <ForecastBar label="Best case" value={evm.forecast.best} bac={evm.bac} cur={cur} />
            <ForecastBar label="Likely (BAC/CPI)" value={evm.forecast.likely} bac={evm.bac} cur={cur} />
            <ForecastBar label="Worst case" value={evm.forecast.worst} bac={evm.bac} cur={cur} />
          </div>
          <div className="mt-4 space-y-1 border-t border-navy-100 pt-3 text-sm">
            <Row label="Cost variance (CV)" value={money(evm.cv, cur)} bad={evm.cv < 0} />
            <Row label="Schedule variance (SV)" value={money(evm.sv, cur)} bad={evm.sv < 0} />
            <Row label="ETC (to complete)" value={money(evm.etc, cur)} />
            <Row label="TCPI" value={String(evm.tcpi)} bad={evm.tcpi > 1.1} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card className="px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className={`text-sm font-bold ${tone === "bad" ? "text-red-600" : tone === "good" ? "text-teal-600" : "text-navy-900"}`}>
        {value}
      </div>
    </Card>
  );
}

function Gauge({ label, value }: { label: string; value: number }) {
  const color = value >= 0.97 ? "text-teal-600" : value >= 0.9 ? "text-amber-600" : "text-red-600";
  const pct = Math.min(100, (value / 1.2) * 100);
  const bar = value >= 0.97 ? "bg-teal-500" : value >= 0.9 ? "bg-amber-500" : "bg-red-500";
  return (
    <Card className="px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value.toFixed(2)}</div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-navy-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

function ForecastBar({ label, value, bac, cur }: { label: string; value: number; bac: number; cur: string }) {
  const over = value > bac;
  const pct = Math.min(100, (value / (bac * 1.3)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-navy-700/70">{label}</span>
        <span className={over ? "font-medium text-red-600" : "font-medium text-teal-600"}>
          {money(value, cur)}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-navy-100">
        <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-teal-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy-700/70">{label}</span>
      <span className={bad ? "font-medium text-red-600" : "font-medium text-navy-900"}>{value}</span>
    </div>
  );
}
