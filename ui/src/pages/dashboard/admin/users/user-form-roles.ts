import { UserCreateRequestRole } from "@/api/generated/model/userCreateRequestRole";

export type AssignableUserRole = UserCreateRequestRole;

export const ASSIGNABLE_USER_ROLES: readonly {
  value: AssignableUserRole;
  label: string;
}[] = [
  { value: UserCreateRequestRole.operator, label: "Operator" },
  { value: UserCreateRequestRole.manager, label: "Manager" },
  { value: UserCreateRequestRole["biz-admin"], label: "Biz Admin" },
];

export function parseAssignableUserRole(role: string): AssignableUserRole {
  const normalized = role.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "manager") return UserCreateRequestRole.manager;
  if (normalized === "biz-admin") return UserCreateRequestRole["biz-admin"];
  return UserCreateRequestRole.operator;
}

/** Normalizes warehouse codes from the API for multi-select state. */
export function normalizeAllowedWarehouseCodes(
  codes: string[] | null | undefined,
): string[] {
  const unique = new Set<string>();
  for (const code of codes ?? []) {
    const trimmed = code.trim();
    if (trimmed) unique.add(trimmed);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}
