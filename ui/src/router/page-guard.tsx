import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  hasAnyAppRole,
  normalizeAppRole,
  resolveAppHomeHref,
  type AppRoleSlug,
} from "@/lib/app-roles";

export type PageGuardProps = {
  /** Role slugs that may view the wrapped route(s). */
  allowedRoles: readonly AppRoleSlug[];
  /** Override redirect when access is denied. */
  redirectTo?: string;
  children?: ReactNode;
};

/**
 * Route-level RBAC guard. Redirects unauthorized roles without signing out.
 * Use as a layout route element (`<PageGuard …><Outlet /></PageGuard>`) or
 * wrap a single page component.
 */
export function PageGuard({
  allowedRoles,
  redirectTo,
  children,
}: PageGuardProps) {
  const sessionUser = useSessionUser();
  const role = normalizeAppRole(sessionUser?.role);

  if (!sessionUser || !role) {
    return <Navigate to={PAGES.LOGIN} replace />;
  }

  if (!hasAnyAppRole(role, allowedRoles)) {
    return <Navigate to={redirectTo ?? resolveAppHomeHref(role)} replace />;
  }

  return children ?? <Outlet />;
}
