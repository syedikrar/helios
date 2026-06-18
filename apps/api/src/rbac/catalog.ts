import type { RoleKey } from "@helios/types";

// ---- Modules (permission-gated features) grouped for navigation ----

export type ModuleGroup = "Foundation" | "CAPEX" | "Turnaround" | "Insights";

export interface ModuleDef {
  key: string;
  label: string;
  group: ModuleGroup;
}

export const MODULES: ModuleDef[] = [
  // Foundation
  { key: "admin", label: "Administration", group: "Foundation" },
  { key: "costlibrary", label: "Cost Library", group: "Foundation" },
  { key: "workflow", label: "Workflow & Approvals", group: "Foundation" },
  { key: "integrations", label: "Integrations", group: "Foundation" },
  { key: "audit", label: "Audit Trail", group: "Foundation" },
  { key: "notifications", label: "Notifications", group: "Foundation" },
  // CAPEX
  { key: "estimating", label: "Cost Estimating", group: "CAPEX" },
  { key: "scheduling", label: "Scheduling", group: "CAPEX" },
  { key: "tendering", label: "Tendering & Contracting", group: "CAPEX" },
  { key: "controls", label: "Project Controls / EVM", group: "CAPEX" },
  { key: "change", label: "Change Management", group: "CAPEX" },
  { key: "risk", label: "Risk Management", group: "CAPEX" },
  { key: "portfolio", label: "Portfolio", group: "CAPEX" },
  { key: "bim", label: "BIM / Takeoff", group: "CAPEX" },
  // Turnaround (STO)
  { key: "scoping", label: "Scoping", group: "Turnaround" },
  { key: "workpack", label: "Work Packs", group: "Turnaround" },
  { key: "material", label: "Material Management", group: "Turnaround" },
  { key: "weld", label: "Weld Management", group: "Turnaround" },
  { key: "qaqc", label: "QA/QC", group: "Turnaround" },
  { key: "safeguarding", label: "Safeguarding", group: "Turnaround" },
  { key: "execution", label: "Execution", group: "Turnaround" },
  { key: "lessons", label: "Lessons Learned", group: "Turnaround" },
  // Insights / differentiators
  { key: "dashboarding", label: "Dashboards", group: "Insights" },
  { key: "benchmarking", label: "Benchmarking", group: "Insights" },
  { key: "ai", label: "AI Copilot", group: "Insights" },
  { key: "esg", label: "ESG / Carbon", group: "Insights" },
];

const BASE_ACTIONS = ["view", "create", "edit", "delete"] as const;
// Modules that additionally support an "approve" action.
const APPROVE_MODULES = new Set([
  "workflow",
  "change",
  "estimating",
  "tendering",
  "controls",
  "portfolio",
]);

export interface PermissionDef {
  key: string;
  module: string;
  action: string;
}

// Full catalog of `module:action` permissions.
export function permissionCatalog(): PermissionDef[] {
  const out: PermissionDef[] = [];
  for (const m of MODULES) {
    const actions = APPROVE_MODULES.has(m.key)
      ? [...BASE_ACTIONS, "approve"]
      : [...BASE_ACTIONS];
    for (const action of actions) {
      out.push({ key: `${m.key}:${action}`, module: m.key, action });
    }
  }
  return out;
}

// ---- Roles ----

export interface RoleDef {
  key: RoleKey;
  name: string;
  description: string;
}

export const ROLES: RoleDef[] = [
  { key: "ADMIN", name: "System Administrator", description: "Manage users, roles, org settings, integrations, audit." },
  { key: "ESTIMATOR", name: "Cost Estimator", description: "Build estimates from the Cost Library; import BoQ/MTO; version; submit." },
  { key: "PLANNER", name: "Planner / Scheduler", description: "Build/maintain schedules; sync P6; link activities to cost & work packs." },
  { key: "PROCUREMENT", name: "Procurement & Contracts Officer", description: "Run tenders; evaluate bids vs reference; award contracts." },
  { key: "CONTROLLER", name: "Cost Controller", description: "Set baseline; record commitments/actuals; run EVM; forecast." },
  { key: "RISK_ANALYST", name: "Risk Analyst", description: "Maintain risk register; model contingency." },
  { key: "STO_MANAGER", name: "Turnaround / STO Manager", description: "Own scoping & turnaround plan; sequence work packs; oversee execution." },
  { key: "WORKPACK_ENGINEER", name: "Work-Pack / Preparation Engineer", description: "Build detailed work packs; define materials/tasks." },
  { key: "QAQC_ENGINEER", name: "QA/QC & Welding Engineer", description: "Inspections; welds, WPS/PQR, LISL; verify compliance & certs." },
  { key: "CONTRACTOR", name: "Contractor (external)", description: "Execute assigned work packs; submit progress & field data." },
  { key: "PROJECT_MANAGER", name: "Project / Portfolio Manager", description: "Oversee projects; monitor health; approve changes & gates." },
  { key: "EXECUTIVE", name: "Executive Sponsor", description: "Consume portfolio dashboards & KPIs." },
  { key: "DATA_STEWARD", name: "Data Steward / CESK Custodian", description: "Maintain cost-data quality; curate benchmarks; capture lessons." },
];

// ---- Role → permission grants ----
// Grant tokens: "*" (everything), "module" (view+create+edit+delete),
// or an explicit "module:action".
export const ROLE_GRANTS: Record<RoleKey, string[]> = {
  ADMIN: ["*"],
  ESTIMATOR: [
    "estimating:view", "estimating:create", "estimating:edit",
    "costlibrary:view", "bim:view", "bim:create", "bim:edit",
    "dashboarding:view", "notifications:view",
    "workflow:view", "workflow:create",
    "ai:view", "ai:create", "esg:view",
  ],
  PLANNER: [
    "scheduling:view", "scheduling:create", "scheduling:edit",
    "estimating:view", "dashboarding:view", "notifications:view",
  ],
  PROCUREMENT: [
    "tendering:view", "tendering:create", "tendering:edit", "tendering:approve",
    "estimating:view", "dashboarding:view", "notifications:view",
  ],
  CONTROLLER: [
    "controls:view", "controls:create", "controls:edit", "controls:approve",
    "change:view", "change:create", "change:edit",
    "estimating:view", "scheduling:view", "dashboarding:view",
    "esg:view", "workflow:view", "notifications:view", "ai:view",
  ],
  RISK_ANALYST: [
    "risk:view", "risk:create", "risk:edit",
    "controls:view", "dashboarding:view", "notifications:view",
  ],
  STO_MANAGER: [
    "scoping:view", "scoping:create", "scoping:edit",
    "workpack:view", "workpack:create", "workpack:edit",
    "execution:view", "execution:create", "execution:edit",
    "material:view", "dashboarding:view", "notifications:view",
    "workflow:view", "workflow:approve",
  ],
  WORKPACK_ENGINEER: [
    "workpack:view", "workpack:create", "workpack:edit",
    "material:view", "material:create", "material:edit",
    "scoping:view", "execution:view", "weld:view",
    "dashboarding:view", "notifications:view",
  ],
  QAQC_ENGINEER: [
    "qaqc:view", "qaqc:create", "qaqc:edit",
    "weld:view", "weld:create", "weld:edit",
    "safeguarding:view", "safeguarding:create", "safeguarding:edit",
    "workpack:view", "execution:view",
    "dashboarding:view", "notifications:view",
  ],
  CONTRACTOR: [
    "execution:view", "execution:edit",
    "workpack:view", "material:view",
    "dashboarding:view", "notifications:view",
  ],
  PROJECT_MANAGER: [
    "portfolio:view", "portfolio:approve", "dashboarding:view",
    "workflow:view", "workflow:approve", "change:view", "change:approve",
    "estimating:view", "controls:view", "risk:view", "scheduling:view",
    "tendering:view", "scoping:view", "workpack:view", "execution:view",
    "benchmarking:view", "esg:view", "notifications:view", "ai:view",
  ],
  EXECUTIVE: [
    "dashboarding:view", "portfolio:view", "esg:view", "notifications:view",
  ],
  DATA_STEWARD: [
    "costlibrary:view", "costlibrary:create", "costlibrary:edit", "costlibrary:delete",
    "benchmarking:view", "benchmarking:create", "benchmarking:edit",
    "lessons:view", "lessons:create", "lessons:edit",
    "audit:view", "dashboarding:view", "esg:view", "notifications:view",
  ],
};

// Expand a role's grant tokens into concrete permission keys.
export function expandGrants(roleKey: RoleKey): string[] {
  const catalog = permissionCatalog();
  const allKeys = catalog.map((p) => p.key);
  const grants = ROLE_GRANTS[roleKey] ?? [];
  const result = new Set<string>();

  for (const grant of grants) {
    if (grant === "*") {
      allKeys.forEach((k) => result.add(k));
    } else if (grant.includes(":")) {
      if (allKeys.includes(grant)) result.add(grant);
    } else {
      // bare module → all of its actions
      catalog
        .filter((p) => p.module === grant)
        .forEach((p) => result.add(p.key));
    }
  }
  return [...result].sort();
}
