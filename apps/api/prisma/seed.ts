// Phase 2 seed: organization, RBAC (permissions, 13 roles + matrix), 13 demo users.
// Idempotent. The full realistic enterprise dataset (Section 6) arrives in Phase 7.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ROLES,
  permissionCatalog,
  expandGrants,
} from "../src/rbac/catalog";
import { costLibrarySeed } from "../src/cost-library/seed-data";
import type { RoleKey } from "@helios/types";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Helios@Demo123";

// Section 7 — demo users.
const DEMO_USERS: { email: string; name: string; roleKey: RoleKey }[] = [
  { email: "admin@helios.demo", name: "Ava Administrator", roleKey: "ADMIN" },
  { email: "estimator@helios.demo", name: "Ethan Estimator", roleKey: "ESTIMATOR" },
  { email: "planner@helios.demo", name: "Priya Planner", roleKey: "PLANNER" },
  { email: "procurement@helios.demo", name: "Pedro Procurement", roleKey: "PROCUREMENT" },
  { email: "controller@helios.demo", name: "Carla Controller", roleKey: "CONTROLLER" },
  { email: "risk@helios.demo", name: "Raj Risk", roleKey: "RISK_ANALYST" },
  { email: "sto@helios.demo", name: "Sara Turnaround", roleKey: "STO_MANAGER" },
  { email: "workpack@helios.demo", name: "Walt Workpack", roleKey: "WORKPACK_ENGINEER" },
  { email: "qaqc@helios.demo", name: "Quinn Quality", roleKey: "QAQC_ENGINEER" },
  { email: "contractor@helios.demo", name: "Cory Contractor", roleKey: "CONTRACTOR" },
  { email: "pm@helios.demo", name: "Morgan Manager", roleKey: "PROJECT_MANAGER" },
  { email: "executive@helios.demo", name: "Eve Executive", roleKey: "EXECUTIVE" },
  { email: "datasteward@helios.demo", name: "Dana Steward", roleKey: "DATA_STEWARD" },
];

async function main() {
  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { id: "org-helios-demo" },
    update: {},
    create: {
      id: "org-helios-demo",
      name: "Helios Demo Industries",
      baseCurrency: "USD",
      regions: ["US Gulf Coast", "North Sea", "Middle East", "Australia"],
    },
  });

  // 2. Permission catalog
  const catalog = permissionCatalog();
  for (const p of catalog) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, action: p.action },
      create: { key: p.key, module: p.module, action: p.action },
    });
  }
  const permByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p.id]),
  );

  // 3. Roles + role→permission matrix
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description },
      create: { key: r.key, name: r.name, description: r.description },
    });
    const grantKeys = expandGrants(r.key);
    // Reset then apply grants (idempotent).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grantKeys
        .map((k) => permByKey.get(k))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  const roleByKey = new Map(
    (await prisma.role.findMany()).map((r) => [r.key, r.id]),
  );

  // 4. Demo users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userByEmail = new Map<string, { id: string }>();
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, orgId: org.id },
      create: { email: u.email, name: u.name, passwordHash, orgId: org.id },
    });
    userByEmail.set(u.email, user);
    const roleId = roleByKey.get(u.roleKey)!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
  }
  const admin = userByEmail.get("admin@helios.demo")!;
  const estimator = userByEmail.get("estimator@helios.demo")!;
  const pm = userByEmail.get("pm@helios.demo")!;

  // 5. Cost Library (~150 items).
  // Codes are insertion-order based, so wipe + recreate to stay idempotent even
  // when the catalog definition changes between seed runs.
  const libItems = costLibrarySeed();
  await prisma.costLibraryItem.deleteMany({ where: { orgId: org.id } });
  await prisma.costLibraryItem.createMany({
    data: libItems.map((it) => ({
      orgId: org.id,
      code: it.code,
      description: it.description,
      discipline: it.discipline,
      category: it.category,
      unit: it.unit,
      baseRate: Math.round(it.rate * 100),
      currency: "USD",
      locationFactor: it.locationFactor,
      region: it.region,
      source: it.source,
      isParametric: it.isParametric ?? false,
      paramName: it.paramName ?? null,
      paramUnit: it.paramUnit ?? null,
      paramBase: it.paramBase ? Math.round(it.paramBase * 100) : null,
      paramExponent: it.paramExponent ?? null,
    })),
  });

  // 6. Connectors + sync logs (all mocked)
  const connectors = [
    { key: "SAP", name: "SAP ERP", category: "ERP / Finance", description: "Commitments, actuals, POs." },
    { key: "P6", name: "Oracle Primavera P6", category: "Scheduling", description: "Schedule activities round-trip." },
    { key: "MAXIMO", name: "IBM Maximo", category: "Asset Management", description: "Asset tags into Scoping." },
    { key: "UNISIM", name: "Honeywell UniSim", category: "Process Simulation", description: "Equipment list → estimate skeleton." },
    { key: "POWERBI", name: "Power BI / Snowflake", category: "Analytics", description: "Outbound analytics dataset feed." },
    { key: "EXCEL", name: "MS Excel / CSV", category: "Office", description: "Import/export estimates, BoQ, takeoffs." },
  ];
  for (const c of connectors) {
    const created = await prisma.connector.upsert({
      where: { key: c.key },
      update: { name: c.name, category: c.category, description: c.description },
      create: {
        orgId: org.id,
        key: c.key,
        name: c.name,
        category: c.category,
        description: c.description,
        status: "CONNECTED",
        lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    });
    const existingLogs = await prisma.syncLog.count({ where: { connectorId: created.id } });
    if (existingLogs === 0) {
      await prisma.syncLog.create({
        data: {
          connectorId: created.id,
          direction: c.key === "POWERBI" ? "EXPORT" : "IMPORT",
          status: "SUCCESS",
          message: `Initial ${c.name} synchronisation`,
          recordCount: 25,
        },
      });
    }
  }

  // 7. Sample approvals (only seed if none exist)
  if ((await prisma.approvalRequest.count()) === 0) {
    await prisma.approvalRequest.create({
      data: {
        orgId: org.id,
        entityType: "estimate",
        entityId: "demo-estimate-1",
        title: "Class 3 Estimate — GC Refinery Crude Unit",
        status: "SUBMITTED",
        submittedById: estimator.id,
        submittedBy: "Ethan Estimator",
        events: { create: { type: "SUBMIT", actorId: estimator.id, actorEmail: "estimator@helios.demo", comment: "Ready for review." } },
      },
    });
    await prisma.approvalRequest.create({
      data: {
        orgId: org.id,
        entityType: "change",
        entityId: "demo-change-1",
        title: "Change #CR-014 — Additional flare tie-in",
        status: "APPROVED",
        submittedById: estimator.id,
        submittedBy: "Ethan Estimator",
        events: {
          create: [
            { type: "SUBMIT", actorId: estimator.id, actorEmail: "estimator@helios.demo", comment: "Scope increase." },
            { type: "APPROVE", actorId: pm.id, actorEmail: "pm@helios.demo", comment: "Approved within tolerance." },
          ],
        },
      },
    });
  }

  // 8. Sample notifications
  if ((await prisma.notification.count()) === 0) {
    await prisma.notification.createMany({
      data: [
        { orgId: org.id, userId: estimator.id, type: "INFO", title: "Your estimate was approved", body: "Change #CR-014 approved by Morgan Manager.", link: "/workflow" },
        { orgId: org.id, userId: admin.id, type: "INFO", title: "Welcome to Helios", body: "13 demo users and the cost library are seeded." },
        { orgId: org.id, userId: pm.id, type: "WARNING", title: "Approval pending", body: "Class 3 Estimate awaits your review.", link: "/workflow" },
      ],
    });
  }

  // 9. A few seed audit entries (runtime mutations add more)
  if ((await prisma.auditLog.count()) === 0) {
    await prisma.auditLog.createMany({
      data: [
        { orgId: org.id, userId: admin.id, userEmail: "admin@helios.demo", action: "CREATE", entityType: "connector", summary: "Configured SAP ERP connector" },
        { orgId: org.id, userId: estimator.id, userEmail: "estimator@helios.demo", action: "CREATE", entityType: "cost-library", summary: "Imported CESK catalog" },
      ],
    });
  }

  // 10. CAPEX portfolios + projects with full estimate → baseline → EVM chain.
  const pf1 = await prisma.portfolio.upsert({
    where: { id: "pf-upstream" },
    update: {},
    create: { id: "pf-upstream", orgId: org.id, name: "Upstream & Refining", description: "Oil, gas and refining capital projects." },
  });
  const pf2 = await prisma.portfolio.upsert({
    where: { id: "pf-minerals" },
    update: {},
    create: { id: "pf-minerals", orgId: org.id, name: "Minerals & Power", description: "Mining and power capital projects." },
  });

  const libDb = await prisma.costLibraryItem.findMany({ where: { orgId: org.id }, orderBy: { code: "asc" } });
  const qtyByUnit: Record<string, number> = { ton: 50, m3: 500, m: 800, ea: 4, hr: 3000, m2: 600 };
  const carbonByDiscipline: Record<string, number> = {
    Civil: 90, Structural: 1800, Piping: 30, Mechanical: 500, Electrical: 5,
    Instrumentation: 10, "Painting & Insulation": 2, Labour: 0,
  };

  async function buildCapex(opts: {
    code: string; name: string; region: string; portfolioId: string; healthy: boolean;
    status?: "PLANNING" | "EXECUTION";
  }) {
    const project = await prisma.project.upsert({
      where: { code: opts.code },
      update: { name: opts.name, portfolioId: opts.portfolioId },
      create: {
        orgId: org.id, portfolioId: opts.portfolioId, code: opts.code, name: opts.name,
        type: "CAPEX", status: opts.status ?? "EXECUTION", region: opts.region, createdById: admin.id,
      },
    });
    if (await prisma.baseline.findUnique({ where: { projectId: project.id } })) return project;

    const est = await prisma.estimate.create({
      data: {
        orgId: org.id, projectId: project.id, code: "EST-001",
        name: `${opts.name} — Class 3 Estimate`, aaceClass: "CLASS_3",
        method: "SEMI_DETAILED", status: "APPROVED", contingencyPct: 12, indirectPct: 18,
        createdById: estimator.id,
      },
    });

    // ~32 line items spread across the catalog.
    const picks = libDb.filter((_, i) => i % Math.max(1, Math.floor(libDb.length / 32)) === 0).slice(0, 32);
    let sort = 0;
    for (const it of picks) {
      const qty = qtyByUnit[it.unit] ?? 10;
      await prisma.estimateLineItem.create({
        data: {
          estimateId: est.id, costLibraryItemId: it.id, code: it.code,
          description: it.description, discipline: it.discipline, category: it.category,
          unit: it.unit, quantity: qty, unitRate: Math.round(it.baseRate * it.locationFactor),
          carbonFactor: carbonByDiscipline[it.discipline] ?? 5, sortOrder: sort++,
        },
      });
    }

    // Promote → baseline (recompute totals here to set BAC).
    const lines = await prisma.estimateLineItem.findMany({ where: { estimateId: est.id } });
    let direct = 0;
    for (const l of lines) direct += Math.round(l.quantity * l.unitRate);
    const indirect = Math.round(direct * 0.18);
    const contingency = Math.round((direct + indirect) * 0.12);
    const bac = direct + indirect + contingency;
    await prisma.estimate.update({ where: { id: est.id }, data: { status: "BASELINED" } });
    await prisma.baseline.create({
      data: { projectId: project.id, estimateId: est.id, name: `Baseline — ${est.name}`, bac, setById: admin.id },
    });

    // 6 monthly control periods; progress through period 4 of 6.
    const pv = Math.round(bac / 6);
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    const evInc = opts.healthy ? pv : Math.round(0.15 * bac);
    const acInc = opts.healthy ? Math.round(pv / 1.02) : Math.round(0.1744 * bac);
    for (let i = 0; i < 6; i++) {
      const active = i < 4;
      await prisma.controlPeriod.upsert({
        where: { projectId_periodIndex: { projectId: project.id, periodIndex: i + 1 } },
        update: {},
        create: {
          projectId: project.id, periodIndex: i + 1, label: months[i],
          plannedValue: pv, earnedValue: active ? evInc : 0, actualCost: active ? acInc : 0,
        },
      });
    }

    // Changes + risks
    const changes = [
      { ref: "CR-001", title: "Additional flare tie-in", costImpact: 4_50000, timeImpact: 7, status: "APPROVED" as const },
      { ref: "CR-002", title: "Revised foundation design", costImpact: 2_20000, timeImpact: 3, status: "ASSESSED" as const },
      { ref: "CR-003", title: "Client-requested instrument upgrade", costImpact: 1_80000, timeImpact: 0, status: "OPEN" as const },
      { ref: "CR-004", title: "Scope reduction — defer Unit B", costImpact: -3_10000, timeImpact: -10, status: "APPROVED" as const },
    ];
    for (const c of changes) {
      await prisma.changeRequest.create({
        data: { orgId: org.id, projectId: project.id, ...c, raisedById: estimator.id },
      });
    }
    const risks = [
      { ref: "R-001", title: "Long-lead compressor delivery slip", category: "Schedule", probability: 0.5, impactCost: 8_00000 },
      { ref: "R-002", title: "Steel price escalation", category: "Cost", probability: 0.6, impactCost: 5_50000 },
      { ref: "R-003", title: "Permit approval delay", category: "External", probability: 0.3, impactCost: 3_00000 },
      { ref: "R-004", title: "Subsurface conditions worse than expected", category: "Technical", probability: 0.25, impactCost: 6_50000 },
      { ref: "R-005", title: "Labour availability shortfall", category: "Resource", probability: 0.4, impactCost: 4_20000 },
      { ref: "R-006", title: "Weather downtime", category: "External", probability: 0.55, impactCost: 2_10000 },
      { ref: "R-007", title: "Scope creep on tie-ins", category: "Cost", probability: 0.45, impactCost: 3_80000 },
      { ref: "R-008", title: "Vendor data late", category: "Schedule", probability: 0.5, impactCost: 1_60000 },
      { ref: "R-009", title: "Currency exposure (imported equipment)", category: "Cost", probability: 0.35, impactCost: 4_00000 },
      { ref: "R-010", title: "Commissioning rework", category: "Technical", probability: 0.3, impactCost: 3_30000 },
    ];
    for (const r of risks) {
      await prisma.risk.create({
        data: { orgId: org.id, projectId: project.id, ...r, owner: "Raj Risk", response: "Mitigation plan in place", status: "OPEN" },
      });
    }
    return project;
  }

  await buildCapex({ code: "GC-CRUDE-EXP", name: "GC Refinery Crude Unit Expansion", region: "US Gulf Coast", portfolioId: pf1.id, healthy: true });
  await buildCapex({ code: "NS-TOPSIDES", name: "North Sea Platform Topsides Revamp", region: "North Sea", portfolioId: pf1.id, healthy: false });
  await buildCapex({ code: "CU-DEBOT", name: "Copper Concentrator Debottleneck", region: "Australia", portfolioId: pf2.id, healthy: true });
  // STO project shells (full turnaround detail added below).
  await prisma.project.upsert({ where: { code: "RU4-TA-2026" }, update: {}, create: { orgId: org.id, portfolioId: pf1.id, code: "RU4-TA-2026", name: "Refinery Unit 4 Major Turnaround 2026", type: "STO", status: "PLANNING", region: "Middle East", createdById: admin.id } });
  await prisma.project.upsert({ where: { code: "ETH-SD-Q3" }, update: {}, create: { orgId: org.id, portfolioId: pf2.id, code: "ETH-SD-Q3", name: "Ethylene Plant Shutdown Q3", type: "STO", status: "PLANNING", region: "Middle East", createdById: admin.id } });

  // Tenders (3 bids each) + schedule for every CAPEX project; award one to seed a contract.
  const capexProjects = await prisma.project.findMany({ where: { orgId: org.id, type: "CAPEX", deletedAt: null } });
  const scheduleTemplate = [
    ["1000", "Engineering & design", "2026-01-01", "2026-03-31", 100],
    ["2000", "Procurement — long lead", "2026-02-01", "2026-05-15", 70],
    ["3000", "Civil & foundations", "2026-03-01", "2026-05-30", 60],
    ["4000", "Mechanical erection", "2026-04-15", "2026-08-30", 25],
    ["5000", "E&I installation", "2026-06-01", "2026-09-30", 0],
    ["6000", "Commissioning & startup", "2026-09-01", "2026-10-31", 0],
  ];
  for (const proj of capexProjects) {
    if ((await prisma.tender.count({ where: { projectId: proj.id } })) === 0) {
      const tender = await prisma.tender.create({
        data: { orgId: org.id, projectId: proj.id, ref: "TND-001", title: "Mechanical erection package", referenceEstimate: 18_500000, status: "EVALUATING" },
      });
      await prisma.bid.createMany({
        data: [
          { tenderId: tender.id, vendor: "Apex Construction", amount: 17_900000, score: 88 },
          { tenderId: tender.id, vendor: "Meridian E&C", amount: 19_200000, score: 82 },
          { tenderId: tender.id, vendor: "Coastal Industrial", amount: 18_650000, score: 91 },
        ],
      });
    }
    if ((await prisma.scheduleActivity.count({ where: { projectId: proj.id } })) === 0) {
      let so = 0;
      for (const [wbs, name, s, e, pc] of scheduleTemplate) {
        await prisma.scheduleActivity.create({
          data: { projectId: proj.id, wbs: wbs as string, name: name as string, startDate: new Date(s as string), endDate: new Date(e as string), percentComplete: pc as number, sortOrder: so++ },
        });
      }
    }
    // Seed an awarded contract on the healthy GC project.
    if (proj.code === "GC-CRUDE-EXP" && (await prisma.contract.count({ where: { projectId: proj.id } })) === 0) {
      await prisma.contract.create({
        data: { orgId: org.id, projectId: proj.id, ref: "CTR-TND-000", vendor: "Coastal Industrial", type: "LUMP_SUM", value: 18_650000 },
      });
    }
  }

  // Benchmark records (anonymised cross-project).
  if ((await prisma.benchmarkRecord.count()) === 0) {
    await prisma.benchmarkRecord.createMany({
      data: [
        { orgId: org.id, name: "Refinery unit — installed cost", metric: "$/bpd", value: 8500, unit: "bpd", discipline: "Overall", region: "US Gulf Coast", year: 2025, source: "Federated benchmark" },
        { orgId: org.id, name: "Structural steel erected", metric: "$/tonne", value: 4200, unit: "tonne", discipline: "Structural", region: "North Sea", year: 2025 },
        { orgId: org.id, name: "Process piping installed", metric: "$/dia-inch-m", value: 165, unit: "dia-in-m", discipline: "Piping", region: "Global", year: 2025 },
        { orgId: org.id, name: "Concrete placed", metric: "$/m3", value: 410, unit: "m3", discipline: "Civil", region: "Australia", year: 2024 },
        { orgId: org.id, name: "E&I cost factor", metric: "% of TIC", value: 12, unit: "%", discipline: "Electrical", region: "Global", year: 2025 },
        { orgId: org.id, name: "Field labour productivity", metric: "hrs/tonne", value: 38, unit: "hrs/tonne", discipline: "Structural", region: "Middle East", year: 2025 },
        { orgId: org.id, name: "Turnaround day rate", metric: "$/day", value: 1_250000, unit: "day", discipline: "STO", region: "Global", year: 2025 },
        { orgId: org.id, name: "Indirect cost ratio", metric: "% of direct", value: 22, unit: "%", discipline: "Overall", region: "Global", year: 2025 },
      ],
    });
  }

  // 11. STO turnaround data — welders/WPS/PQR (org-scoped) + per-project detail.
  if ((await prisma.welder.count()) === 0) {
    const yr = (offset: number) => new Date(2026, 5, 18 + offset);
    await prisma.welder.createMany({
      data: [
        { orgId: org.id, stamp: "W01", name: "Tom Welder", process: "GTAW", certification: "ASME IX 6G", certExpiry: yr(365) },
        { orgId: org.id, stamp: "W02", name: "Lena Arc", process: "SMAW", certification: "ASME IX 6G", certExpiry: yr(220) },
        { orgId: org.id, stamp: "W03", name: "Hiro Tig", process: "GTAW", certification: "ASME IX 6G", certExpiry: yr(-30) }, // expired
        { orgId: org.id, stamp: "W04", name: "Sam Bevel", process: "SMAW", certification: "ASME IX 3G", certExpiry: yr(120) },
        { orgId: org.id, stamp: "W05", name: "Otto Root", process: "GTAW", certification: "ASME IX 6G", certExpiry: yr(-10) }, // expired
        { orgId: org.id, stamp: "W06", name: "Mei Fill", process: "FCAW", certification: "ASME IX 4G", certExpiry: yr(300) },
      ],
    });
    const wps1 = await prisma.wps.create({ data: { orgId: org.id, ref: "WPS-001", description: "CS butt weld, GTAW root + SMAW fill", process: "GTAW/SMAW", baseMetal: "A106-B", fillerMetal: "ER70S-2" } });
    const wps2 = await prisma.wps.create({ data: { orgId: org.id, ref: "WPS-002", description: "CS fillet, SMAW", process: "SMAW", baseMetal: "A106-B", fillerMetal: "E7018" } });
    const wps3 = await prisma.wps.create({ data: { orgId: org.id, ref: "WPS-003", description: "SS butt weld, GTAW", process: "GTAW", baseMetal: "A312-316L", fillerMetal: "ER316L" } });
    await prisma.pqr.createMany({
      data: [
        { orgId: org.id, ref: "PQR-001", wpsId: wps1.id, description: "Supports WPS-001" },
        { orgId: org.id, ref: "PQR-002", wpsId: wps2.id, description: "Supports WPS-002" },
        { orgId: org.id, ref: "PQR-003", wpsId: wps3.id, description: "Supports WPS-003" },
      ],
    });
  }
  const welders = await prisma.welder.findMany({ where: { orgId: org.id } });
  const wpsList = await prisma.wps.findMany({ where: { orgId: org.id } });

  const STO_DISCIPLINES = ["Mechanical", "Piping", "Inspection", "Electrical", "Civil"];
  const contractors = ["Apex Construction", "Meridian E&C", "Coastal Industrial"];

  async function buildSto(code: string, weldCount: number) {
    const project = await prisma.project.findUnique({ where: { code } });
    if (!project) return;
    if ((await prisma.scopeItem.count({ where: { projectId: project.id } })) > 0) return;
    project.status === "PLANNING" && (await prisma.project.update({ where: { id: project.id }, data: { status: "EXECUTION" } }));

    // Scope items
    const scopeIds: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const s = await prisma.scopeItem.create({
        data: {
          orgId: org.id, projectId: project.id, ref: `SC-${String(i).padStart(3, "0")}`,
          description: `Inspect/repair item ${i}`, discipline: STO_DISCIPLINES[i % STO_DISCIPLINES.length],
          equipmentTag: `${["V", "E", "P", "T", "C"][i % 5]}-${1000 + i}`,
          priority: ["HIGH", "MEDIUM", "LOW"][i % 3], estimatedHours: 20 + (i % 7) * 15,
          status: i <= 24 ? "IN_WORKPACK" : "APPROVED",
        },
      });
      scopeIds.push(s.id);
    }

    // Work packs (12), linking scope items, with varied execution status.
    const statuses = ["COMPLETE", "COMPLETE", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "READY", "READY", "PLANNED", "PLANNED", "ON_HOLD", "IN_PROGRESS", "COMPLETE"] as const;
    for (let i = 0; i < 12; i++) {
      const planned = 200 + (i % 5) * 120;
      const st = statuses[i];
      const progress = st === "COMPLETE" ? 100 : st === "IN_PROGRESS" ? 40 + (i % 4) * 12 : st === "ON_HOLD" ? 25 : st === "READY" ? 0 : 0;
      const wp = await prisma.workPack.create({
        data: {
          orgId: org.id, projectId: project.id, ref: `WP-${String(i + 1).padStart(3, "0")}`,
          title: `${STO_DISCIPLINES[i % STO_DISCIPLINES.length]} work pack ${i + 1}`,
          discipline: STO_DISCIPLINES[i % STO_DISCIPLINES.length],
          plannedHours: planned, hoursBurned: Math.round((planned * progress) / 100),
          progressPercent: progress, contractor: contractors[i % contractors.length], status: st,
        },
      });
      // link 2 scope items
      await prisma.scopeItem.updateMany({ where: { id: { in: scopeIds.slice(i * 2, i * 2 + 2) } }, data: { workPackId: wp.id } });
      // materials
      const matStatuses = ["RECEIVED", "RECEIVED", "ORDERED", "SHORTAGE"] as const;
      for (let m = 0; m < 3; m++) {
        await prisma.material.create({
          data: {
            workPackId: wp.id, partNo: `P-${wp.ref}-${m + 1}`, description: `Spool / gasket / bolt set ${m + 1}`,
            quantity: 4 + m * 2, unit: ["ea", "set", "m"][m % 3], status: matStatuses[(i + m) % matStatuses.length],
            supplier: contractors[(i + m) % contractors.length],
          },
        });
      }
      // safeguards (1-2 per pack)
      await prisma.safeguardItem.create({
        data: { orgId: org.id, projectId: project.id, workPackId: wp.id, type: ["PTW", "ISOLATION", "HOT_WORK", "CONFINED_SPACE"][i % 4] as any, title: `${wp.ref} permit`, status: i % 3 === 0 ? "OPEN" : "ACTIVE", responsible: "Quinn Quality" },
      });
    }

    // Welds with welders/WPS/NDE results (mostly pass, some fail/pending) + expired-cert welds.
    for (let i = 1; i <= weldCount; i++) {
      const r = i % 12;
      const nde = r === 3 ? "FAIL" : r >= 9 ? "PENDING" : "PASS";
      const status = nde === "FAIL" ? "REJECTED" : nde === "PASS" ? "ACCEPTED" : "WELDED";
      const welder = welders[i % welders.length];
      const wps = wpsList[i % wpsList.length];
      await prisma.weldRecord.create({
        data: {
          orgId: org.id, projectId: project.id, weldId: `W-${String(i).padStart(4, "0")}`,
          joint: ["BW", "SW", "FW"][i % 3], lineIso: `${code.slice(0, 3)}-L${String((i % 8) + 1).padStart(3, "0")}`,
          welderId: welder.id, wpsId: wps.id, pqrRef: `PQR-00${(i % 3) + 1}`,
          heatNo: `HT-${20000 + i}`, ndeResult: nde as any, status: status as any,
        },
      });
    }

    // QA checks
    for (let i = 1; i <= 15; i++) {
      await prisma.qaCheck.create({
        data: {
          orgId: org.id, projectId: project.id, checklist: `${["Fit-up", "Visual", "Dimensional", "Coating DFT", "Bolt torque"][i % 5]} inspection`,
          result: i % 7 === 0 ? "FAIL" : "PASS", inspector: "Quinn Quality",
        },
      });
    }
    // NCRs
    await prisma.ncr.createMany({
      data: [
        { orgId: org.id, projectId: project.id, ref: "NCR-001", title: "Weld porosity exceeds acceptance", severity: "MAJOR", status: "OPEN", raisedBy: "qaqc@helios.demo" },
        { orgId: org.id, projectId: project.id, ref: "NCR-002", title: "Incorrect gasket material installed", severity: "MINOR", status: "IN_REVIEW", raisedBy: "qaqc@helios.demo" },
        { orgId: org.id, projectId: project.id, ref: "NCR-003", title: "Missing material traceability cert", severity: "CRITICAL", status: "OPEN", raisedBy: "qaqc@helios.demo" },
      ],
    });
    // Lessons
    await prisma.lessonLearned.createMany({
      data: [
        { orgId: org.id, projectId: project.id, category: "Planning", description: "Long-lead valve delivery underestimated.", recommendation: "Add 4-week buffer in cost library lead times." },
        { orgId: org.id, projectId: project.id, category: "Welding", description: "Repair rate higher on SS lines.", recommendation: "Increase NDE coverage to 100% on SS." },
        { orgId: org.id, projectId: project.id, category: "Safety", description: "Confined space permits bottlenecked execution.", recommendation: "Pre-stage permits before window." },
        { orgId: org.id, projectId: project.id, category: "Cost", description: "Scaffolding hours exceeded norm.", recommendation: "Update scaffold labour norm in CESK." },
      ],
    });
  }

  await buildSto("RU4-TA-2026", 60);
  await buildSto("ETH-SD-Q3", 45);

  const projectCount = await prisma.project.count({ where: { orgId: org.id } });
  console.log(`Org: ${org.name}`);
  console.log(`Permissions: ${catalog.length} | Roles: ${ROLES.length} | Users: ${DEMO_USERS.length}`);
  console.log(`Cost library items: ${libItems.length} | Connectors: ${connectors.length}`);
  console.log(`Portfolios: 2 | Projects: ${projectCount}`);
  console.log(`Welds: ${await prisma.weldRecord.count()} | Work packs: ${await prisma.workPack.count()} | Scope items: ${await prisma.scopeItem.count()}`);
  console.log(`Password for all demo users: ${DEMO_PASSWORD}`);
  console.log("Phase 5 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
