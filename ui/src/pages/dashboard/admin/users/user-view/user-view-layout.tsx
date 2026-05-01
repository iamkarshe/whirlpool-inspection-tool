import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { UserBadges } from "@/pages/dashboard/admin/users/user-badge";
import { TabbedContent } from "@/components/tabbed-content";
import type { UserViewContext } from "@/pages/dashboard/admin/users/user-view/context";
import { fetchAllUsers, userApiErrorMessage } from "@/services/users-api";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function UserViewLayout() {
  const params = useParams<{ id: string }>();
  const idParam = params.id ?? "";
  const id = parseInt(idParam, 10);
  const [user, setUser] = useState<UserViewContext["user"] | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAllUsers()
      .then((rows) => {
        if (cancelled) return;
        setUser(rows.find((u) => u.id === id) ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast.error(userApiErrorMessage(e, "Failed to load user."));
        setUser(null);
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
  const tabs = [
    { label: "Details", to: basePath, end: true },
    { label: "Devices", to: devicesPath },
    { label: "Inspections", to: inspectionsPath },
    { label: "Login history", to: loginsPath },
  ] as const;

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

      <TabbedContent tabs={tabs} className="my-0">
        <Outlet context={{ user }} />
      </TabbedContent>
    </div>
  );
}
