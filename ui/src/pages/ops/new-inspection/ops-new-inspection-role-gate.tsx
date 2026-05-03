import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import { canOpsRoleStartNewInspection } from "@/lib/ops-role";
import { Navigate, Outlet } from "react-router-dom";

/** Blocks `/ops/new-inspection/*` for roles outside `OPS_ROLES_ALLOWED_NEW_INSPECTION`. */
export function OpsNewInspectionRoleGate() {
  const user = useSessionUser();
  if (!canOpsRoleStartNewInspection(user?.role)) {
    return <Navigate to={PAGES.OPS_HOME} replace />;
  }
  return <Outlet />;
}
