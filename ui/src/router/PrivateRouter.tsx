import { PAGES } from "@/endpoints";
import DashboardLayout from "@/pages/dashboard/layout";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  isDashboardRole,
  isOpsRole,
  normalizeAppRole,
  resolveAppHomeHref,
} from "@/lib/app-roles";
import { requiresPasswordChange } from "@/lib/session-password-flags";
import { Navigate, useLocation } from "react-router-dom";

const ACCESS_TOKEN_KEY = "whirlpool.access_token";

export default function PrivateRouter() {
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

  if (requiresPasswordChange()) {
    return <Navigate to={PAGES.CHANGE_PASSWORD} replace />;
  }

  if (sessionUser && isOpsRole(role)) {
    return <Navigate to={PAGES.OPS_HOME} replace />;
  }

  if (sessionUser && !isDashboardRole(role)) {
    return <Navigate to={resolveAppHomeHref(role)} replace />;
  }

  return <DashboardLayout />;
}
