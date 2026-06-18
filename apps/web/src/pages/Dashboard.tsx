import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS, NAV_GROUP_ORDER } from "../nav";
import { Card, Badge } from "../components/ui";

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const visible = NAV_ITEMS.filter(
    (i) => hasPermission(i.permission) && i.group !== "Administration",
  );
  const grouped = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-navy-700/70">
          You are signed in as{" "}
          <span className="font-medium">{user?.roles.join(", ")}</span>. Your
          workspace below reflects exactly what your role can access.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Stat label="Roles" value={String(user?.roles.length ?? 0)} />
        <Stat label="Permissions" value={String(user?.permissions.length ?? 0)} />
        <Stat label="Modules available" value={String(visible.length)} />
      </div>

      {grouped.map(({ group, items }) => (
        <div key={group}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-700/60">
            {group}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link key={item.key} to={item.path}>
                <Card className="flex items-center justify-between p-4 transition hover:border-teal-300 hover:shadow">
                  <span className="font-medium text-navy-900">{item.label}</span>
                  {item.phase > 2 ? (
                    <Badge className="bg-amber-50 text-amber-600">
                      Phase {item.phase}
                    </Badge>
                  ) : (
                    <Badge className="bg-teal-50 text-teal-600">Live</Badge>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-5 py-3">
      <div className="text-xs uppercase tracking-wide text-navy-700/50">
        {label}
      </div>
      <div className="text-2xl font-bold text-navy-900">{value}</div>
    </Card>
  );
}
