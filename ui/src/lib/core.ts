import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const APP_TIMEZONE = "Asia/Kolkata";

/** `14/Jun/2026 3:20 AM` in IST. */
export function formatDateCompact(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const formatted = formatInTimeZone(d, APP_TIMEZONE, "dd/MMM/yyyy h:mm a");
    return formatted.replace(/\s(am|pm)$/i, (_, meridiem: string) => {
      return ` ${meridiem.toUpperCase()}`;
    });
  } catch {
    return iso;
  }
}

function formatRelativeLabel(iso: string, diffMs: number): string {
  const d = new Date(iso);
  const minute = 60_000;

  if (diffMs < 0) return "in the future";
  if (diffMs < minute) return "Just now";
  if (diffMs < 5 * minute) return "Few mins ago";

  return formatDistanceToNow(d, { addSuffix: true });
}

export function setPageTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_APP_TITLE}`;
}

export function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const formatted = formatInTimeZone(d, APP_TIMEZONE, "dd/MMMM/yyyy h:mma");
    return formatted.replace(/\b(AM|PM)\b/g, (m: string) => m.toLowerCase());
  } catch {
    return iso;
  }
}

/** `14/Jun/2026 3:20 AM (Few mins ago)` in IST. */
export function formatDateHumanized(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const diffMs = Date.now() - d.getTime();
    const absolute = formatDateCompact(iso);
    const relative = formatRelativeLabel(iso, diffMs);

    return `${absolute} (${relative})`;
  } catch {
    return iso;
  }
}

// Backwards-compat for existing callers.
export function formatCreatedAt(iso: string) {
  return formatDate(iso);
}
