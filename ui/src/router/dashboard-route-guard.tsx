import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useSessionUser } from "@/hooks/use-session-user";
import {
  getDashboardRouteAllowedRoles,
} from "@/lib/dashboard-route-access";
import {
  hasAnyAppRole,
  normalizeAppRole,
  resolveAppHomeHref,
} from "@/lib/app-roles";

/** Enforces per-path dashboard RBAC inside the desktop layout. */
export default function DashboardRouteGuard() {
  const { pathname } = useLocation();
  const sessionUser = useSessionUser();
  const role = normalizeAppRole(sessionUser?.role);

  if (!sessionUser || !role) {
    return null;
  }

  const allowedRoles = getDashboardRouteAllowedRoles(pathname);
  if (!hasAnyAppRole(role, allowedRoles)) {
    return <Navigate to={resolveAppHomeHref(role)} replace />;
  }

  return <Outlet />;
}
