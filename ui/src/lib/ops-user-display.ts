/** First whitespace-delimited token of a display name, for greetings; empty input → null. */
export function firstNameFromDisplayName(
  name: string | undefined | null,
): string | null {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/).filter(Boolean)[0];
  return first ?? null;
}

/** Two-letter avatar initials from a display name. */
export function userInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0]!;
    return w.slice(0, Math.min(2, w.length)).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** API roles used in this app (lowercase): superadmin | manager | operator. */
export function formatOpsRoleBadgeLabel(roleRaw: string): string {
  const r = roleRaw.trim().toLowerCase();
  if (r === "superadmin") return "SUPERADMIN";
  if (r === "manager") return "MANAGER";
  if (r === "operator") return "OPERATOR";
  return roleRaw.trim().replace(/_/g, " ").toUpperCase();
}
