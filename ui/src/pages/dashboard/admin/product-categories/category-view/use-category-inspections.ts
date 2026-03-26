import {
  computeInspectionStatusMap,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import {
  getInspections,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import { useEffect, useMemo, useState } from "react";

export function useCategoryInspections(categoryId: number) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [statusMap, setStatusMap] = useState<InspectionStatusMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then(async (list) => {
        const filtered = list.filter((i) => i.product_category_id === categoryId);
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
  }, [categoryId]);

  const failedIds = useMemo(() => {
    if (!statusMap) return new Set<string>();
    return new Set(Object.entries(statusMap).filter(([, v]) => v === "fail").map(([k]) => k));
  }, [statusMap]);

  return { inspections, statusMap, failedIds, loading };
}

