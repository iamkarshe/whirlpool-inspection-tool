import { useSessionUser } from "@/hooks/use-session-user";
import { PAGES } from "@/endpoints";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ACCESS_TOKEN_KEY = "whirlpool.access_token";

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

/** Ops PWA: token required; only `operator` and `manager` may use `/ops`. */
export function OpsRouter() {
  const location = useLocation();
  const sessionUser = useSessionUser();

  const hasToken =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim());

  if (!hasToken) {
    return (
      <Navigate
        to={PAGES.LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (sessionUser) {
    const r = normalizeRole(sessionUser.role);
    if (r !== "operator" && r !== "manager") {
      return <Navigate to={PAGES.DASHBOARD} replace />;
    }
  }

  return <Outlet />;
}

