import {
  DASHBOARD_APP_ROLES,
  SUPERADMIN_APP_ROLES,
} from "@/lib/app-roles";
import { PAGES } from "@/endpoints";

function normalizeDashboardPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : PAGES.DASHBOARD;
}

/**
 * Roles allowed for a dashboard pathname.
 * Superadmin-only: `/dashboard/admin/*`
 * Biz-admin + superadmin: reports, masters, inspections, settings, etc.
 */
export function getDashboardRouteAllowedRoles(
  pathname: string,
): readonly (typeof DASHBOARD_APP_ROLES)[number][] {
  const path = normalizeDashboardPath(pathname);

  if (path.startsWith("/dashboard/admin")) {
    return SUPERADMIN_APP_ROLES;
  }

  return DASHBOARD_APP_ROLES;
}
