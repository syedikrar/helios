// Shared contracts between the Helios API and web app.
// Types-only (no runtime enums) so the compiled output is consumable by both
// the CommonJS Nest backend and the ESM Vite frontend.

// ---- API envelope (Section 10: consistent API shape) ----

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ---- RBAC ----

export type RoleKey =
  | "ADMIN"
  | "ESTIMATOR"
  | "PLANNER"
  | "PROCUREMENT"
  | "CONTROLLER"
  | "RISK_ANALYST"
  | "STO_MANAGER"
  | "WORKPACK_ENGINEER"
  | "QAQC_ENGINEER"
  | "CONTRACTOR"
  | "PROJECT_MANAGER"
  | "EXECUTIVE"
  | "DATA_STEWARD";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

// Permission strings follow the `module:action` convention, e.g. "estimating:create".
export type Permission = `${string}:${PermissionAction}`;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  roles: RoleKey[];
  permissions: Permission[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  roles: RoleKey[];
  permissions: Permission[];
}

// ---- Common domain enums (as literal unions) ----

export type ProjectType = "CAPEX" | "STO";

export type AaceClass = "CLASS_5" | "CLASS_4" | "CLASS_3" | "CLASS_2" | "CLASS_1";

export type EstimateMethod =
  | "PARAMETRIC"
  | "FACTOR"
  | "SEMI_DETAILED"
  | "DETAILED";

export type ApprovalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type Health = "GREEN" | "AMBER" | "RED";
