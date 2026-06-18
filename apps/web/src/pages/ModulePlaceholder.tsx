import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "../nav";
import { Card, Badge } from "../components/ui";

// Generic page for modules whose real UI lands in a later phase. Keeps the
// role-aware navigation fully walkable now.
export function ModulePlaceholder() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const item = NAV_ITEMS.find((i) => i.path === pathname);
  const module = item?.permission.split(":")[0];
  const heldForModule = (user?.permissions ?? []).filter((p) =>
    p.startsWith(`${module}:`),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-navy-900">
          {item?.label ?? "Module"}
        </h1>
        {item && (
          <Badge className="bg-amber-50 text-amber-600">
            Arrives in Phase {item.phase}
          </Badge>
        )}
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <Construction className="text-amber-500" size={36} />
        <div className="max-w-md text-navy-700/70">
          This module is on the roadmap. The navigation, route guard, and your
          access to it are already wired — the interactive screens are delivered
          in <span className="font-medium">Phase {item?.phase}</span>.
        </div>
      </Card>

      {heldForModule.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold text-navy-900">
            Your permissions on this module
          </div>
          <div className="flex flex-wrap gap-2">
            {heldForModule.map((p) => (
              <Badge key={p} className="bg-teal-50 text-teal-600">
                {p}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
