import type { ApplicationLogItemResponseDetails } from "@/api/generated/model/applicationLogItemResponseDetails";
import { formatDateHumanized } from "@/lib/core";

export function readLogDetailString(
  details: ApplicationLogItemResponseDetails | undefined,
  key: string,
): string | null {
  if (!details || typeof details !== "object") return null;
  const value = details[key];
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function readLogDetailBoolean(
  details: ApplicationLogItemResponseDetails | undefined,
  key: string,
): boolean | null {
  if (!details || typeof details !== "object") return null;
  const value = details[key];
  if (typeof value === "boolean") return value;
  return null;
}

export function formatLogDetailsJson(
  details: ApplicationLogItemResponseDetails | undefined,
): string {
  if (!details) return "—";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export function formatLogDetailKey(key: string): string {
  return key
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatLogDetailValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "—";
    const iso = parseIsoDateValue(trimmed, key);
    if (iso) return formatDateHumanized(iso);
    return trimmed;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function parseIsoDateValue(value: string, key?: string): string | null {
  const looksLikeDateKey =
    Boolean(key) &&
    (key!.endsWith("_at") ||
      key!.endsWith("_date") ||
      key!.includes("timestamp"));
  const looksLikeIso = /^\d{4}-\d{2}-\d{2}T/.test(value);
  if (!looksLikeDateKey && !looksLikeIso) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

export type LogDetailEntry = {
  key: string;
  label: string;
  value: string;
  multiline: boolean;
  isoDate?: string;
};

export function listLogDetailEntries(
  details: ApplicationLogItemResponseDetails | undefined,
): LogDetailEntry[] {
  if (!details || typeof details !== "object") return [];

  return Object.entries(details)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const isoDate = parseIsoDateValue(
        typeof value === "string" ? value : "",
        key,
      );
      const formatted = formatLogDetailValue(value, key);
      const multiline =
        !isoDate &&
        (formatted.includes("\n") ||
          (typeof value === "object" && value !== null) ||
          formatted.length > 120);

      return {
        key,
        label: formatLogDetailKey(key),
        value: formatted,
        multiline,
        isoDate: isoDate ?? undefined,
      };
    });
}

/** Normalize API filter value vs row `source` label for column selection. */
export function sourceTabMatchesRow(
  activeSource: string | null,
  rowSource: string,
): boolean {
  if (!activeSource) return false;
  const normalizedRow = rowSource.trim().toUpperCase().replace(/\s+/g, "_");
  const normalizedActive = activeSource.trim().toUpperCase().replace(/\s+/g, "_");
  return normalizedRow === normalizedActive;
}
