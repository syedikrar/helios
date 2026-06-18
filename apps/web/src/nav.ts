// Navigation model. Each item is gated by a permission; the sidebar renders
// only the items the logged-in user can access. `phase` marks where the real
// page arrives (placeholders are shown until then).

export type NavGroup =
  | "Overview"
  | "CAPEX"
  | "Turnaround (STO)"
  | "Insights"
  | "Foundation"
  | "Administration";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  permission: string; // required permission to see/visit
  group: NavGroup;
  phase: number; // build phase that delivers the real screen
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", permission: "dashboarding:view", group: "Overview", phase: 2 },
  { key: "projects", label: "Projects", path: "/projects", permission: "dashboarding:view", group: "Overview", phase: 4 },
  { key: "portfolio", label: "Portfolio", path: "/portfolio", permission: "portfolio:view", group: "Overview", phase: 4 },

  // CAPEX
  { key: "estimating", label: "Cost Estimating", path: "/estimating", permission: "estimating:view", group: "CAPEX", phase: 4 },
  { key: "scheduling", label: "Scheduling", path: "/scheduling", permission: "scheduling:view", group: "CAPEX", phase: 4 },
  { key: "tendering", label: "Tendering & Contracting", path: "/tendering", permission: "tendering:view", group: "CAPEX", phase: 4 },
  { key: "controls", label: "Project Controls / EVM", path: "/controls", permission: "controls:view", group: "CAPEX", phase: 4 },
  { key: "change", label: "Change Management", path: "/change", permission: "change:view", group: "CAPEX", phase: 4 },
  { key: "risk", label: "Risk Management", path: "/risk", permission: "risk:view", group: "CAPEX", phase: 4 },
  { key: "bim", label: "BIM / Takeoff", path: "/bim", permission: "bim:view", group: "CAPEX", phase: 4 },

  // Turnaround / STO
  { key: "scoping", label: "Scoping", path: "/scoping", permission: "scoping:view", group: "Turnaround (STO)", phase: 5 },
  { key: "workpack", label: "Work Packs", path: "/workpack", permission: "workpack:view", group: "Turnaround (STO)", phase: 5 },
  { key: "material", label: "Material Management", path: "/material", permission: "material:view", group: "Turnaround (STO)", phase: 5 },
  { key: "weld", label: "Weld Management", path: "/weld", permission: "weld:view", group: "Turnaround (STO)", phase: 5 },
  { key: "qaqc", label: "QA/QC", path: "/qaqc", permission: "qaqc:view", group: "Turnaround (STO)", phase: 5 },
  { key: "safeguarding", label: "Safeguarding", path: "/safeguarding", permission: "safeguarding:view", group: "Turnaround (STO)", phase: 5 },
  { key: "execution", label: "Execution", path: "/execution", permission: "execution:view", group: "Turnaround (STO)", phase: 5 },
  { key: "lessons", label: "Lessons Learned", path: "/lessons", permission: "lessons:view", group: "Turnaround (STO)", phase: 5 },

  // Insights / differentiators
  { key: "benchmarking", label: "Benchmarking", path: "/benchmarking", permission: "benchmarking:view", group: "Insights", phase: 4 },
  { key: "ai", label: "AI Copilot", path: "/ai", permission: "ai:view", group: "Insights", phase: 2 },
  { key: "esg", label: "ESG / Carbon", path: "/esg", permission: "esg:view", group: "Insights", phase: 2 },
  { key: "pricing", label: "Pricing", path: "/pricing", permission: "notifications:view", group: "Insights", phase: 2 },
  { key: "devportal", label: "Developer Portal", path: "/dev-portal", permission: "notifications:view", group: "Insights", phase: 2 },

  // Foundation
  { key: "costlibrary", label: "Cost Library", path: "/cost-library", permission: "costlibrary:view", group: "Foundation", phase: 3 },
  { key: "workflow", label: "Workflow & Approvals", path: "/workflow", permission: "workflow:view", group: "Foundation", phase: 3 },
  { key: "integrations", label: "Integrations", path: "/integrations", permission: "integrations:view", group: "Foundation", phase: 3 },
  { key: "audit", label: "Audit Trail", path: "/audit", permission: "audit:view", group: "Foundation", phase: 3 },

  // Administration
  { key: "users", label: "Users", path: "/admin/users", permission: "admin:view", group: "Administration", phase: 2 },
  { key: "matrix", label: "Permission Matrix", path: "/admin/matrix", permission: "admin:view", group: "Administration", phase: 2 },
];

export const NAV_GROUP_ORDER: NavGroup[] = [
  "Overview",
  "CAPEX",
  "Turnaround (STO)",
  "Insights",
  "Foundation",
  "Administration",
];
