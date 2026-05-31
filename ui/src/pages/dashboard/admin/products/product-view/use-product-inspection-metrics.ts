import type { ProductResponse } from "@/api/generated/model/productResponse";
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { ProductCategoryInspectionMetrics } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspection-metrics";
import { fetchProductListItemByUuid } from "@/services/products-api";
import { fetchInspectionsPage } from "@/services/inspections-api";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function metricsFromListItem(
  item: Awaited<ReturnType<typeof fetchProductListItemByUuid>>,
): ProductCategoryInspectionMetrics {
  return {
    total: item?.inspections_count ?? 0,
    inboundPassed: item?.inspection_inbound_approved ?? 0,
    inboundFailed: item?.inspection_inbound_rejected ?? 0,
    outboundPassed: item?.inspection_outbound_approved ?? 0,
    outboundFailed: item?.inspection_outbound_rejected ?? 0,
  };
}

export function useProductInspectionMetrics(
  product: ProductResponse | null,
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
      if (!product) {
        setMetrics(metricsFromListItem(null));
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (hasDateRange) {
          const res = await fetchInspectionsPage(
            {
              page: 1,
              per_page: 1,
              search: product.material_code?.trim() || null,
              date_field: "created_at",
              date_from: dateFrom,
              date_to: dateTo,
              sort_by: "created_at",
              sort_dir: "desc",
            },
            { signal: ac.signal },
          );
          if (cancelled) return;
          const lifetime = await fetchProductListItemByUuid(product.uuid, {
            signal: ac.signal,
          });
          if (cancelled) return;
          const base = metricsFromListItem(lifetime);
          const scopedTotal = res.data.filter((r) => r.product_id === product.id)
            .length;
          setMetrics({ ...base, total: res.total > 0 ? res.total : scopedTotal });
        } else {
          const item = await fetchProductListItemByUuid(product.uuid, {
            signal: ac.signal,
          });
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
  }, [product, dateFrom, dateTo, hasDateRange]);

  return { metrics, loading };
}
