import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Sun, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS, NAV_GROUP_ORDER, type NavItem } from "../nav";
import { Badge } from "./ui";
import { NotificationBell } from "./NotificationBell";

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Only items the user is permitted to see.
  const visible = NAV_ITEMS.filter((i) => hasPermission(i.permission));
  const grouped = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-navy-100 bg-navy-800 text-white">
        <div className="flex items-center gap-2 px-5 py-4">
          <Sun className="text-amber-500" />
          <span className="text-lg font-bold">Helios</span>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navy-100/40">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarLink key={item.key} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-navy-100 bg-white px-6 py-3">
          <div className="text-sm text-navy-700/60">
            {user?.roles.join(", ")}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <div className="text-sm font-medium text-navy-900">{user?.name}</div>
              <div className="text-xs text-navy-700/50">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-50"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-navy-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition ${
          isActive
            ? "bg-teal-500/20 text-white"
            : "text-navy-100/80 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span>{item.label}</span>
      {item.phase > 2 && (
        <Badge className="bg-white/10 text-[10px] text-navy-100/60">
          P{item.phase}
        </Badge>
      )}
    </NavLink>
  );
}
