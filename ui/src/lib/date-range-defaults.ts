import { endOfDay, startOfDay, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";

/** Default dashboard list/report window: last three calendar months through today. */
export function defaultDataTableDateRange(): DateRange {
  const today = new Date();
  return {
    from: startOfDay(subMonths(today, 3)),
    to: endOfDay(today),
  };
}

export function normalizeDateRangeDraft(
  range: DateRange | undefined,
): DateRange | undefined {
  if (!range?.from) return undefined;
  return {
    from: range.from,
    to: range.to ?? range.from,
  };
}

export function dateRangesEqual(
  a: DateRange | undefined,
  b: DateRange | undefined,
): boolean {
  const fromA = a?.from?.getTime();
  const fromB = b?.from?.getTime();
  const toA = a?.to?.getTime() ?? a?.from?.getTime();
  const toB = b?.to?.getTime() ?? b?.from?.getTime();
  return fromA === fromB && toA === toB;
}
