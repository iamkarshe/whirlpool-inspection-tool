import { filterByCalendarDateRange } from "@/lib/date-range-filter";
import {
  computeInspectionStatusMap,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import { getInspections, type Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

export function useProductInspections(
  productSerial: string,
  dateRange?: DateRange | undefined,
) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [statusMap, setStatusMap] = useState<InspectionStatusMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then(async (list) => {
        const scoped = list.filter((i) => i.product_serial === productSerial);
        const filtered = dateRange
          ? filterByCalendarDateRange(scoped, (i) => i.created_at, dateRange)
          : scoped;
        const map = await computeInspectionStatusMap(filtered);
        if (cancelled) return;
        setInspections(filtered);
        setStatusMap(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, productSerial]);

  const failedIds = useMemo(() => {
    if (!statusMap) return new Set<string>();
    return new Set(Object.entries(statusMap).filter(([, v]) => v === "fail").map(([k]) => k));
  }, [statusMap]);

  return { inspections, statusMap, failedIds, loading };
}

