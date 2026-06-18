import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { ModulePlaceholder } from "./pages/ModulePlaceholder";
import { AdminUsersPage } from "./pages/admin/Users";
import { PermissionMatrixPage } from "./pages/admin/PermissionMatrix";
import { CostLibraryPage } from "./pages/foundation/CostLibrary";
import { IntegrationsPage } from "./pages/foundation/Integrations";
import { AuditPage } from "./pages/foundation/Audit";
import { WorkflowPage } from "./pages/foundation/Workflow";
import { ProjectsPage } from "./pages/capex/Projects";
import { ProjectDetailPage } from "./pages/capex/ProjectDetail";
import { PortfolioPage } from "./pages/capex/Portfolio";
import { ModuleLanding } from "./pages/capex/ModuleLanding";
import { AiCopilotPage } from "./pages/differentiators/AiCopilot";
import { EsgPage } from "./pages/differentiators/Esg";
import { PricingPage } from "./pages/differentiators/Pricing";
import { DevPortalPage } from "./pages/differentiators/DevPortal";
import { NAV_ITEMS } from "./nav";
import { Spinner } from "./components/ui";

// Component selected per nav item; CAPEX module keys land on a project picker.
const MODULE_LANDING = <ModuleLanding />;
const PAGE_BY_KEY: Record<string, JSX.Element> = {
  dashboard: <DashboardPage />,
  users: <AdminUsersPage />,
  matrix: <PermissionMatrixPage />,
  costlibrary: <CostLibraryPage />,
  integrations: <IntegrationsPage />,
  audit: <AuditPage />,
  workflow: <WorkflowPage />,
  projects: <ProjectsPage />,
  portfolio: <PortfolioPage />,
  estimating: MODULE_LANDING,
  controls: MODULE_LANDING,
  change: MODULE_LANDING,
  risk: MODULE_LANDING,
  scheduling: MODULE_LANDING,
  tendering: MODULE_LANDING,
  bim: MODULE_LANDING,
  benchmarking: MODULE_LANDING,
  scoping: MODULE_LANDING,
  workpack: MODULE_LANDING,
  material: MODULE_LANDING,
  weld: MODULE_LANDING,
  qaqc: MODULE_LANDING,
  safeguarding: MODULE_LANDING,
  execution: MODULE_LANDING,
  lessons: MODULE_LANDING,
  ai: <AiCopilotPage />,
  esg: <EsgPage />,
  pricing: <PricingPage />,
  devportal: <DevPortalPage />,
};

// First nav path the user can actually reach — used as a loop-proof landing.
function useLandingPath(): string {
  const { hasPermission } = useAuth();
  const first = NAV_ITEMS.find((i) => hasPermission(i.permission));
  return first?.path ?? "/login";
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Landing() {
  return <Navigate to={useLandingPath()} replace />;
}

function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: JSX.Element;
}) {
  const { hasPermission } = useAuth();
  const landing = useLandingPath();
  // Redirect denials to a guaranteed-accessible page (avoids redirect loops).
  if (!hasPermission(permission)) return <Navigate to={landing} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Landing />} />
        <Route
          path="/projects/:id"
          element={
            <RequirePermission permission="dashboarding:view">
              <ProjectDetailPage />
            </RequirePermission>
          }
        />
        {NAV_ITEMS.map((item) => (
          <Route
            key={item.key}
            path={item.path}
            element={
              <RequirePermission permission={item.permission}>
                {PAGE_BY_KEY[item.key] ?? <ModulePlaceholder />}
              </RequirePermission>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
