/** Roles that may open New Inspection (nav, `/ops/new-inspection/*`, related CTAs). */
export const OPS_ROLES_ALLOWED_NEW_INSPECTION: readonly string[] = [
  "operator",
];

/** Normalized role string from session (`operator` | `manager` | …). */
export function normalizeOpsRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function canOpsRoleStartNewInspection(
  role: string | null | undefined,
): boolean {
  const r = normalizeOpsRole(role);
  return OPS_ROLES_ALLOWED_NEW_INSPECTION.includes(r);
}

export function isOpsManagerRole(role: string | null | undefined): boolean {
  return normalizeOpsRole(role) === "manager";
}

export function isOpsOperatorRole(role: string | null | undefined): boolean {
  return normalizeOpsRole(role) === "operator";
}
