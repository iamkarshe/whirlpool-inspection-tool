import { formatInTimeZone } from "date-fns-tz";

export function setPageTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_APP_TITLE}`;
}

export function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const formatted = formatInTimeZone(d, "Asia/Kolkata", "dd/MMMM/yyyy h:mma");
    return formatted.replace(/\b(AM|PM)\b/g, (m: string) => m.toLowerCase());
  } catch {
    return iso;
  }
}

// Backwards-compat for existing callers.
export function formatCreatedAt(iso: string) {
  return formatDate(iso);
}
