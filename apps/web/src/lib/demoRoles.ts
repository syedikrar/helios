import type { RoleKey } from "@helios/types";

// Section 7 — demo accounts for the "Quick login as…" switcher.
export const DEMO_PASSWORD = "Helios@Demo123";

export interface DemoRole {
  roleKey: RoleKey;
  email: string;
  label: string;
}

export const DEMO_ROLES: DemoRole[] = [
  { roleKey: "ADMIN", email: "admin@helios.demo", label: "System Administrator" },
  { roleKey: "ESTIMATOR", email: "estimator@helios.demo", label: "Cost Estimator" },
  { roleKey: "PLANNER", email: "planner@helios.demo", label: "Planner / Scheduler" },
  { roleKey: "PROCUREMENT", email: "procurement@helios.demo", label: "Procurement & Contracts" },
  { roleKey: "CONTROLLER", email: "controller@helios.demo", label: "Cost Controller" },
  { roleKey: "RISK_ANALYST", email: "risk@helios.demo", label: "Risk Analyst" },
  { roleKey: "STO_MANAGER", email: "sto@helios.demo", label: "Turnaround / STO Manager" },
  { roleKey: "WORKPACK_ENGINEER", email: "workpack@helios.demo", label: "Work-Pack Engineer" },
  { roleKey: "QAQC_ENGINEER", email: "qaqc@helios.demo", label: "QA/QC & Welding Engineer" },
  { roleKey: "CONTRACTOR", email: "contractor@helios.demo", label: "Contractor (external)" },
  { roleKey: "PROJECT_MANAGER", email: "pm@helios.demo", label: "Project / Portfolio Manager" },
  { roleKey: "EXECUTIVE", email: "executive@helios.demo", label: "Executive Sponsor" },
  { roleKey: "DATA_STEWARD", email: "datasteward@helios.demo", label: "Data Steward" },
];
