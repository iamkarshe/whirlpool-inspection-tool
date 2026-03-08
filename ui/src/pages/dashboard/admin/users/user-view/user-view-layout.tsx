import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { UserBadges } from "@/pages/dashboard/admin/users/user-badge";
import {
  getUserById,
  type User,
} from "@/pages/dashboard/admin/users/user-service";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function UserViewLayout() {
  const params = useParams<{ id: string }>();
  const idParam = params.id ?? "";
  const id = parseInt(idParam, 10);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserById(id)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (Number.isNaN(id) || user === null || user === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_USERS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>
    );
  }

  const basePath = PAGES.userViewPath(user.id);
  const devicesPath = PAGES.userViewDevicesPath(user.id);
  const inspectionsPath = PAGES.userViewInspectionsPath(user.id);
  const loginsPath = PAGES.userViewLoginsPath(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_USERS} aria-label="Back to users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <UserBadges user={user} />
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border">
        <NavLink
          to={basePath}
          end
          className={({ isActive }) =>
            cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          Details
        </NavLink>
        <NavLink
          to={devicesPath}
          className={({ isActive }) =>
            cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          Devices
        </NavLink>
        <NavLink
          to={inspectionsPath}
          className={({ isActive }) =>
            cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          Inspections
        </NavLink>
        <NavLink
          to={loginsPath}
          className={({ isActive }) =>
            cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          Login history
        </NavLink>
      </nav>

      <Outlet context={{ user }} />
    </div>
  );
}
