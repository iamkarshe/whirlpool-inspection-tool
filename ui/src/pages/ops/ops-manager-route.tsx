import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import { isOpsManagerRole } from "@/lib/ops-role";
import { Navigate, Outlet } from "react-router-dom";

/** Restricts child routes to warehouse managers (not operators). */
export default function OpsManagerRoute() {
  const user = useSessionUser();
  if (!isOpsManagerRole(user?.role)) {
    return <Navigate to={PAGES.OPS_HOME} replace />;
  }
  return <Outlet />;
}
