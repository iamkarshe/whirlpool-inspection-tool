/** Normalized role string from session (`operator` | `manager` | …). */
export function normalizeOpsRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function isOpsManagerRole(role: string | null | undefined): boolean {
  return normalizeOpsRole(role) === "manager";
}

export function isOpsOperatorRole(role: string | null | undefined): boolean {
  return normalizeOpsRole(role) === "operator";
}
