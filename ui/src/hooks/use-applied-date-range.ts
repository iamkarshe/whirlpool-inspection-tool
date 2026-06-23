import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import {
  dateRangesEqual,
  defaultDataTableDateRange,
  normalizeDateRangeDraft,
} from "@/lib/date-range-defaults";

export type UseAppliedDateRangeOptions = {
  initialApplied?: DateRange;
  /** When false, applied range starts unset (no date filter). Default true. */
  useDefaultRange?: boolean;
};

export function useAppliedDateRange(options?: UseAppliedDateRangeOptions) {
  const initialApplied = useMemo(() => {
    if (options?.initialApplied) return options.initialApplied;
    if (options?.useDefaultRange === false) return undefined;
    return defaultDataTableDateRange();
  }, [options?.initialApplied, options?.useDefaultRange]);

  const [draft, setDraft] = useState<DateRange | undefined>(initialApplied);
  const [applied, setApplied] = useState<DateRange | undefined>(initialApplied);

  const onDraftChange = useCallback((range: DateRange | undefined) => {
    setDraft(normalizeDateRangeDraft(range));
  }, []);

  const apply = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const isDirty = !dateRangesEqual(draft, applied);

  return {
    draft,
    applied,
    setDraft,
    setApplied,
    onDraftChange,
    apply,
    isDirty,
  };
}
