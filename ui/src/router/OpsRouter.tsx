import { useSessionUser } from "@/hooks/use-session-user";
import { PAGES } from "@/endpoints";
import {
  isDashboardRole,
  isOpsRole,
  normalizeAppRole,
  resolveAppHomeHref,
} from "@/lib/app-roles";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ACCESS_TOKEN_KEY = "whirlpool.access_token";

export function OpsRouter() {
  const location = useLocation();
  const sessionUser = useSessionUser();
  const role = normalizeAppRole(sessionUser?.role);

  const hasToken =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim());

  if (!hasToken) {
    return (
      <Navigate to={PAGES.LOGIN} replace state={{ from: location.pathname }} />
    );
  }

  if (sessionUser && isDashboardRole(role)) {
    return <Navigate to={resolveAppHomeHref(role)} replace />;
  }

  if (sessionUser && !isOpsRole(role)) {
    return <Navigate to={resolveAppHomeHref(role)} replace />;
  }

  return <Outlet />;
}
