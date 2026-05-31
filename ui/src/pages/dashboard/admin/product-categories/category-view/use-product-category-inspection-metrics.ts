import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchProductCategoryListItemByUuid } from "@/services/product-categories-api";
import { fetchProductCategoryInspectionsPage } from "@/services/product-category-view-api";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type ProductCategoryInspectionMetrics = {
  total: number;
  inboundPassed: number;
  outboundPassed: number;
  inboundFailed: number;
  outboundFailed: number;
};

function metricsFromListItem(
  item: ProductCategoryListItemResponse | null,
): ProductCategoryInspectionMetrics {
  return {
    total: item?.inspections_count ?? 0,
    inboundPassed: item?.inspection_inbound_approved ?? 0,
    inboundFailed: item?.inspection_inbound_rejected ?? 0,
    outboundPassed: item?.inspection_outbound_approved ?? 0,
    outboundFailed: item?.inspection_outbound_rejected ?? 0,
  };
}

/** Overview KPIs from masters list aggregates; with a date range only `total` is date-scoped. */
export function useProductCategoryInspectionMetrics(
  categoryUuid: string,
  dateRange?: DateRange | undefined,
) {
  const [metrics, setMetrics] = useState<ProductCategoryInspectionMetrics>({
    total: 0,
    inboundPassed: 0,
    outboundPassed: 0,
    inboundFailed: 0,
    outboundFailed: 0,
  });
  const [loading, setLoading] = useState(true);

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;
  const hasDateRange = Boolean(dateFrom);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        if (hasDateRange) {
          const res = await fetchProductCategoryInspectionsPage(
            categoryUuid,
            {
              page: 1,
              per_page: 1,
              date_field: "created_at",
              date_from: dateFrom,
              date_to: dateTo,
            },
            ac.signal,
          );
          if (cancelled) return;
          const lifetime = await fetchProductCategoryListItemByUuid(
            categoryUuid,
            { signal: ac.signal },
          );
          if (cancelled) return;
          const base = metricsFromListItem(lifetime);
          setMetrics({ ...base, total: res.total });
        } else {
          const item = await fetchProductCategoryListItemByUuid(
            categoryUuid,
            { signal: ac.signal },
          );
          if (cancelled) return;
          setMetrics(metricsFromListItem(item));
        }
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Failed to load inspection metrics.";
        toast.error(message);
        setMetrics(metricsFromListItem(null));
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [categoryUuid, dateFrom, dateTo, hasDateRange]);

  return { metrics, loading };
}
