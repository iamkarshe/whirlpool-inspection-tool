import { endOfDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

/**
 * Filter an array by a date range. getDate(row) should return an ISO date string.
 * from/to in datetime-local format (YYYY-MM-DDTHH:mm) or empty string = no bound.
 */
export function filterByDateRange<T>(
  data: T[],
  getDate: (row: T) => string | undefined | null,
  from: string,
  to: string,
): T[] {
  if (!from && !to) return data;
  const fromTime = from ? new Date(from).getTime() : null;
  const toTime = to ? new Date(to).getTime() : null;
  return data.filter((row) => {
    const raw = getDate(row);
    if (raw == null || raw === "") return false;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    if (fromTime != null && t < fromTime) return false;
    if (toTime != null && t > toTime) return false;
    return true;
  });
}

/**
 * Filter an array by a DateRange (from CalendarDateRangePicker).
 * getDate(row) should return an ISO date string or Date. Row is included if its date is within [range.from (start of day), range.to (end of day)].
 */
export function filterByCalendarDateRange<T>(
  data: T[],
  getDate: (row: T) => string | Date | undefined | null,
  range: DateRange | undefined,
): T[] {
  if (!range?.from) return data;
  const fromTime = startOfDay(range.from).getTime();
  const toTime = range.to ? endOfDay(range.to).getTime() : endOfDay(range.from).getTime();
  return data.filter((row) => {
    const raw = getDate(row);
    if (raw == null || (typeof raw === "string" && raw === "")) return false;
    const t = typeof raw === "string" ? new Date(raw).getTime() : raw.getTime();
    if (Number.isNaN(t)) return false;
    if (t < fromTime) return false;
    if (t > toTime) return false;
    return true;
  });
}
