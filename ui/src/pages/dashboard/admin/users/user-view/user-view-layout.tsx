import { Button } from "@/components/ui/button";
import { TabbedContent } from "@/components/tabbed-content";
import { PAGES } from "@/endpoints";
import { UserBadges } from "@/pages/dashboard/admin/users/user-badge";
import type { UserViewContext } from "@/pages/dashboard/admin/users/user-view/context";
import {
  fetchUserByUuid,
  userApiErrorMessage,
} from "@/services/users-api";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { toast } from "sonner";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UserViewLayout() {
  const params = useParams<{ userUuid: string }>();
  const userUuid = (params.userUuid ?? "").trim();
  const uuidValid = UUID_RE.test(userUuid);
  const [user, setUser] = useState<UserViewContext["user"] | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async (): Promise<void> => {
    if (!uuidValid) return;
    try {
      const match = await fetchUserByUuid(userUuid);
      setUser(match);
    } catch (e: unknown) {
      toast.error(userApiErrorMessage(e, "Failed to load user."));
      setUser(null);
    }
  }, [userUuid, uuidValid]);

  useEffect(() => {
    if (!uuidValid) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    reloadUser().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uuidValid, reloadUser]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!uuidValid || user === null || user === undefined) {
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

  const basePath = PAGES.userViewPath(user.uuid);
  const devicesPath = PAGES.userViewDevicesPath(user.uuid);
  const inspectionsPath = PAGES.userViewInspectionsPath(user.uuid);
  const loginsPath = PAGES.userViewLoginsPath(user.uuid);
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
          <Link to={PAGES.DASHBOARD_ADMIN_USERS}>
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
        <Outlet
          context={{ user, reloadUser } satisfies UserViewContext}
        />
      </TabbedContent>
    </div>
  );
}
