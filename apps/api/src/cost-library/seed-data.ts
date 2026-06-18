// Deterministic Cost Library catalog generator (~150 items).
// Rates are realistic-looking cost-engineering values in MAJOR units here and
// converted to minor units (cents) by the seed. No randomness → idempotent.

export interface LibItemInput {
  code: string;
  description: string;
  discipline: string;
  category: string;
  unit: string;
  rate: number; // major units (e.g. USD)
  locationFactor: number;
  region: string;
  source: string;
  isParametric?: boolean;
  paramName?: string;
  paramUnit?: string;
  paramBase?: number; // major units
  paramExponent?: number;
}

const REGIONS = [
  { region: "US Gulf Coast", f: 1.0 },
  { region: "North Sea", f: 1.25 },
  { region: "Middle East", f: 0.9 },
  { region: "Australia", f: 1.15 },
];

const SOURCE = "Helios CESK 2026";

export function costLibrarySeed(): LibItemInput[] {
  const items: LibItemInput[] = [];
  let n = 0;
  const reg = () => REGIONS[n % REGIONS.length];

  const add = (
    disc: string,
    discCode: string,
    category: string,
    unit: string,
    description: string,
    rate: number,
    extra: Partial<LibItemInput> = {},
  ) => {
    n += 1;
    const r = reg();
    items.push({
      code: `${discCode}-${String(n).padStart(4, "0")}`,
      description,
      discipline: disc,
      category,
      unit,
      rate,
      locationFactor: r.f,
      region: r.region,
      source: SOURCE,
      ...extra,
    });
  };

  // ---- Civil ----
  [
    ["Excavation, common soil", 18],
    ["Excavation, rock", 62],
    ["Backfill, compacted", 22],
    ["Granular fill / sub-base", 35],
    ["Site grading & levelling", 9],
  ].forEach(([d, r]) => add("Civil", "CIV", "Earthworks", "m3", d as string, r as number));
  [
    ["Structural concrete C30/37", 195],
    ["High-strength concrete C40/50", 235],
    ["Blinding concrete", 140],
    ["Mass concrete", 165],
    ["Non-shrink grout", 480],
  ].forEach(([d, r]) => add("Civil", "CIV", "Concrete", "m3", d as string, r as number));
  [
    ["Bored pile, 600mm dia", 220, "m"],
    ["Driven pile, precast", 185, "m"],
    ["Pile cap, reinforced", 320, "m3"],
    ["Equipment foundation", 410, "m3"],
    ["Reinforcement, supplied & fixed", 1520, "ton"],
  ].forEach(([d, r, u]) => add("Civil", "CIV", "Foundations", u as string, d as string, r as number));

  [
    ["Asphalt road, base + wearing", 48, "m2"],
    ["Concrete hardstand", 88, "m2"],
    ["Kerb & channel", 42, "m"],
    ["Site drainage, RCP 300mm", 95, "m"],
  ].forEach(([d, r, u]) => add("Civil", "CIV", "Roads & Drainage", u as string, d as string, r as number));

  // ---- Structural ----
  [
    ["Primary structural steel", 3200],
    ["Secondary steel", 2850],
    ["Galvanized steel", 3650],
    ["Stainless structural steel", 7400],
  ].forEach(([d, r]) => add("Structural", "STR", "Structural Steel", "ton", d as string, r as number));
  [
    ["Steel grating, galvanized", 165, "m2"],
    ["Handrail, two-rail", 95, "m"],
    ["Stair flight, steel", 2400, "ea"],
    ["Caged ladder", 380, "m"],
    ["Chequer plate flooring", 210, "m2"],
  ].forEach(([d, r, u]) => add("Structural", "STR", "Platforms & Access", u as string, d as string, r as number));

  // ---- Piping ----
  const csSizes = [2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 30, 36];
  csSizes.forEach((s) =>
    add("Piping", "PIP", "CS Pipe", "m", `CS pipe spool, ${s}" Sch40, installed`, 38 + s * 8),
  );
  [2, 4, 6, 8, 10, 12, 16, 20, 24].forEach((s) =>
    add("Piping", "PIP", "SS Pipe", "m", `SS316 pipe spool, ${s}", installed`, 70 + s * 18),
  );
  const valveTypes = ["Gate", "Globe", "Ball", "Check", "Butterfly"];
  [2, 4, 6, 8, 10, 12].forEach((s) =>
    valveTypes.forEach((t) =>
      add("Piping", "PIP", "Valves", "ea", `${t} valve, ${s}" CL150`, 320 + s * 110 + valveTypes.indexOf(t) * 60),
    ),
  );
  [
    ["Elbow, 6\" LR", 85],
    ["Tee, 6\"", 110],
    ["Weld-neck flange, 6\"", 95],
    ["Concentric reducer", 75],
    ["Pipe support, fabricated", 145],
  ].forEach(([d, r]) => add("Piping", "PIP", "Fittings & Supports", "ea", d as string, r as number));

  // ---- Mechanical / Equipment (parametric models) ----
  const parametric: [string, string, string, string, number, number][] = [
    // category, description, paramName, paramUnit, base, exponent
    ["Pumps", "Centrifugal pump, API 610", "Flow", "m3/h", 8500, 0.62],
    ["Pumps", "Vertical multistage pump", "Flow", "m3/h", 9600, 0.6],
    ["Pumps", "Positive displacement pump", "Flow", "m3/h", 11200, 0.58],
    ["Vessels", "Pressure vessel, CS", "Volume", "m3", 14000, 0.65],
    ["Vessels", "Distillation column", "Volume", "m3", 22000, 0.68],
    ["Vessels", "Atmospheric storage tank", "Volume", "m3", 4200, 0.7],
    ["Exchangers", "Shell & tube exchanger", "Area", "m2", 6200, 0.59],
    ["Exchangers", "Air-cooled exchanger", "Area", "m2", 5400, 0.6],
    ["Exchangers", "Plate heat exchanger", "Area", "m2", 4800, 0.56],
    ["Compressors", "Centrifugal compressor", "Power", "kW", 28000, 0.7],
    ["Compressors", "Reciprocating compressor", "Power", "kW", 31000, 0.72],
  ];
  parametric.forEach(([cat, d, pn, pu, base, exp]) =>
    add("Mechanical", "MEC", cat, "ea", d, base, {
      isParametric: true,
      paramName: pn,
      paramUnit: pu,
      paramBase: base,
      paramExponent: exp,
    }),
  );
  [
    ["Cartridge filter package", 18500],
    ["Static mixer", 6400],
    ["Belt conveyor, per metre", 1450],
    ["Agitator / mixer drive", 24500],
  ].forEach(([d, r]) => add("Mechanical", "MEC", "Packaged Equipment", "ea", d as string, r as number));

  // ---- Electrical ----
  [
    ["LV power cable, 4c 50mm2", 31],
    ["MV power cable, 3c 95mm2", 78],
    ["Control cable, multicore", 22],
    ["Instrument cable, twisted pair", 18],
    ["Earthing conductor, bare Cu", 14],
    ["Cable tray, galvanized, 600mm", 48],
  ].forEach(([d, r]) => add("Electrical", "ELE", "Cable & Containment", "m", d as string, r as number));
  [
    ["LV motor control centre (MCC)", 42000],
    ["MV switchgear panel", 68000],
    ["Distribution transformer, 1 MVA", 54000],
    ["UPS system, 20 kVA", 23000],
    ["Standby diesel generator", 95000],
  ].forEach(([d, r]) => add("Electrical", "ELE", "Power Distribution", "ea", d as string, r as number));

  // ---- Instrumentation ----
  [
    ["Pressure transmitter", 1850],
    ["Temperature transmitter w/ RTD", 1450],
    ["Coriolis flow meter", 8800],
    ["Guided-wave level transmitter", 3200],
    ["Control valve w/ positioner", 6400],
    ["Gas analyzer", 14500],
    ["On/off actuated valve", 3800],
  ].forEach(([d, r]) => add("Instrumentation", "INS", "Field Instruments", "ea", d as string, r as number));
  [
    ["DCS I/O per point", 420],
    ["Safety PLC per point", 560],
    ["Marshalling cabinet", 9800],
    ["Junction box, field", 380],
  ].forEach(([d, r]) => add("Instrumentation", "INS", "Control System", "ea", d as string, r as number));

  // ---- Painting & Insulation ----
  [
    ["Surface prep, blast SA2.5", 14],
    ["Primer coat", 9],
    ["Intermediate coat", 8],
    ["Topcoat, polyurethane", 11],
  ].forEach(([d, r]) => add("Painting & Insulation", "PNT", "Coating", "m2", d as string, r as number));
  [
    ["Hot insulation, mineral wool 50mm", 62],
    ["Cold insulation, cellular glass", 95],
    ["Aluminium cladding", 38],
    ["Fireproofing, intumescent", 145],
  ].forEach(([d, r]) => add("Painting & Insulation", "PNT", "Insulation", "m2", d as string, r as number));

  [
    ["Heat tracing, electric", 58, "m"],
    ["Lighting, LED floodlight", 420, "ea"],
    ["Small power socket outlet", 180, "ea"],
    ["Lightning protection, air terminal", 240, "ea"],
  ].forEach(([d, r, u]) => add("Electrical", "ELE", "Ancillary", u as string, d as string, r as number));

  // ---- Labour norms ----
  [
    ["Welder (coded)", 72],
    ["Pipefitter", 64],
    ["Electrician", 66],
    ["Instrument technician", 70],
    ["Civil / general labour", 42],
    ["Scaffolder", 58],
    ["Painter / blaster", 52],
    ["Construction supervisor", 95],
    ["QA/QC inspector", 88],
    ["Rigger", 60],
    ["Crane operator", 84],
  ].forEach(([d, r]) => add("Labour", "LAB", "Direct Labour", "hr", d as string, r as number));

  return items;
}
