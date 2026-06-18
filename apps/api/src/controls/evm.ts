// Earned Value Management engine. All money in integer minor units.
// Period inputs are INCREMENTAL planned/earned/actual; we accumulate to S-curves
// and compute metrics at the status date (last period with progress).

export interface PeriodInput {
  periodIndex: number;
  label: string;
  plannedValue: number; // PV incremental
  earnedValue: number; // EV incremental
  actualCost: number; // AC incremental
}

export interface SCurvePoint {
  periodIndex: number;
  label: string;
  pvCum: number;
  evCum: number | null; // null after status date
  acCum: number | null;
}

export interface EvmResult {
  bac: number;
  statusLabel: string | null;
  pv: number;
  ev: number;
  ac: number;
  cv: number; // cost variance EV-AC
  sv: number; // schedule variance EV-PV
  cpi: number;
  spi: number;
  eac: number; // estimate at completion
  etc: number; // estimate to complete
  vac: number; // variance at completion
  tcpi: number; // to-complete performance index
  percentComplete: number;
  anomaly: boolean; // CPI < 0.9
  health: "GREEN" | "AMBER" | "RED" | "NONE";
  sCurve: SCurvePoint[];
  forecast: { best: number; likely: number; worst: number };
}

const round = (n: number) => Math.round(n);
const div = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function computeEvm(periodsRaw: PeriodInput[], baselineBac?: number): EvmResult {
  const periods = [...periodsRaw].sort((a, b) => a.periodIndex - b.periodIndex);

  // Cumulative series.
  let pvCum = 0;
  let evCum = 0;
  let acCum = 0;
  const cumulative = periods.map((p) => {
    pvCum += p.plannedValue;
    evCum += p.earnedValue;
    acCum += p.actualCost;
    return { ...p, pvCum, evCum, acCum };
  });

  const bac = baselineBac ?? cumulative.reduce((s, p) => Math.max(s, p.pvCum), 0);

  // Status date = last period showing progress.
  const statusIdx = (() => {
    for (let i = cumulative.length - 1; i >= 0; i--) {
      if (cumulative[i].earnedValue > 0 || cumulative[i].actualCost > 0) return i;
    }
    return cumulative.length - 1;
  })();
  const status = cumulative[statusIdx];

  const pv = status?.pvCum ?? 0;
  const ev = status?.evCum ?? 0;
  const ac = status?.acCum ?? 0;

  const cpi = div(ev, ac);
  const spi = div(ev, pv);
  const cv = ev - ac;
  const sv = ev - pv;
  const eac = cpi > 0 ? round(bac / cpi) : bac;
  const etc = eac - ac;
  const vac = bac - eac;
  const tcpi = bac - ac !== 0 ? div(bac - ev, bac - ac) : 0;
  const percentComplete = div(ev, bac) * 100;
  const anomaly = cpi > 0 && cpi < 0.9;

  // No baseline / no progress yet → neutral, not "at risk".
  const health: EvmResult["health"] =
    bac === 0 || (ev === 0 && ac === 0)
      ? "NONE"
      : cpi >= 0.97 && spi >= 0.95
        ? "GREEN"
        : cpi >= 0.9 && spi >= 0.9
          ? "AMBER"
          : "RED";

  // S-curve: PV across full plan; EV/AC only through status date.
  const sCurve: SCurvePoint[] = cumulative.map((p, i) => ({
    periodIndex: p.periodIndex,
    label: p.label,
    pvCum: p.pvCum,
    evCum: i <= statusIdx ? p.evCum : null,
    acCum: i <= statusIdx ? p.acCum : null,
  }));

  return {
    bac,
    statusLabel: status?.label ?? null,
    pv,
    ev,
    ac,
    cv,
    sv,
    cpi: round(cpi * 1000) / 1000,
    spi: round(spi * 1000) / 1000,
    eac,
    etc,
    vac,
    tcpi: round(tcpi * 1000) / 1000,
    percentComplete: round(percentComplete * 10) / 10,
    anomaly,
    health,
    sCurve,
    forecast: {
      best: round(ac + (bac - ev)), // remaining work at plan
      likely: eac, // BAC / CPI
      worst: cpi > 0 && spi > 0 ? round(bac / (cpi * spi)) : eac, // schedule-adjusted
    },
  };
}
