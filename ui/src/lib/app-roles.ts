import { PAGES } from "@/endpoints";

/** Canonical API role slugs used across dashboard and ops. */
export const APP_ROLE = {
  superadmin: "superadmin",
  bizAdmin: "biz-admin",
  manager: "manager",
  operator: "operator",
} as const;

export type AppRoleSlug = (typeof APP_ROLE)[keyof typeof APP_ROLE];

export const DASHBOARD_APP_ROLES: readonly AppRoleSlug[] = [
  APP_ROLE.superadmin,
  APP_ROLE.bizAdmin,
];

export const OPS_APP_ROLES: readonly AppRoleSlug[] = [
  APP_ROLE.operator,
  APP_ROLE.manager,
];

export const SUPERADMIN_APP_ROLES: readonly AppRoleSlug[] = [
  APP_ROLE.superadmin,
];

/** Normalizes session/API role strings (legacy `admin` → superadmin). */
export function normalizeAppRole(
  role: string | null | undefined,
): AppRoleSlug | "" {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return APP_ROLE.superadmin;
  if (
    r === APP_ROLE.superadmin ||
    r === APP_ROLE.bizAdmin ||
    r === APP_ROLE.manager ||
    r === APP_ROLE.operator
  ) {
    return r;
  }
  return "";
}

export function isSuperadminRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === APP_ROLE.superadmin;
}

export function isBizAdminRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === APP_ROLE.bizAdmin;
}

export function isDashboardRole(role: string | null | undefined): boolean {
  const r = normalizeAppRole(role);
  return r === APP_ROLE.superadmin || r === APP_ROLE.bizAdmin;
}

export function isOpsRole(role: string | null | undefined): boolean {
  const r = normalizeAppRole(role);
  return r === APP_ROLE.operator || r === APP_ROLE.manager;
}

export function hasAnyAppRole(
  role: string | null | undefined,
  allowed: readonly AppRoleSlug[],
): boolean {
  const normalized = normalizeAppRole(role);
  if (!normalized) return false;
  return allowed.includes(normalized);
}

/** Default landing route when a role hits a forbidden screen in its app shell. */
export function resolveAppHomeHref(role: string | null | undefined): string {
  if (isOpsRole(role)) return PAGES.OPS_HOME;
  if (isDashboardRole(role)) {
    return PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS;
  }
  return PAGES.LOGIN;
}
