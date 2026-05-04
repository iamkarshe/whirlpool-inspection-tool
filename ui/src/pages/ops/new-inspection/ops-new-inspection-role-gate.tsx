import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  canOpsRoleStartNewInspection,
  isOpsManagerRole,
} from "@/lib/ops-role";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";

/**
 * Operators: full new-inspection subtree.
 * Managers: barcode lookup only — `/ops/new-inspection?mode=search` and matching
 * `unit/:barcode?mode=search` (no inbound/outbound starts).
 */
export function OpsNewInspectionRoleGate() {
  const user = useSessionUser();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (canOpsRoleStartNewInspection(user?.role)) {
    return <Outlet />;
  }

  if (isOpsManagerRole(user?.role)) {
    const path = location.pathname;
    if (
      path.includes("/new-inspection/inbound") ||
      path.includes("/new-inspection/outbound")
    ) {
      return <Navigate to={PAGES.OPS_HOME} replace />;
    }

    const isIndex = path === "/ops/new-inspection";
    const isUnit = /^\/ops\/new-inspection\/unit\/[^/]+$/.test(path);
    if (!isIndex && !isUnit) {
      return <Navigate to={PAGES.OPS_HOME} replace />;
    }

    if (searchParams.get("mode") !== "search") {
      return <Navigate to={`${path}?mode=search`} replace />;
    }
    return <Outlet />;
  }

  return <Navigate to={PAGES.OPS_HOME} replace />;
}
