import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import type { ProductResponse } from "@/api/generated/model/productResponse";
import type { DateRange } from "react-day-picker";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchAllProductCategoryInspections } from "@/services/product-category-view-api";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function normalizeType(t: string) {
  return t.toLowerCase();
}

function isInbound(row: ProductCategoryInspectionResponse) {
  return normalizeType(row.inspection_type).includes("inbound");
}

function isOutbound(row: ProductCategoryInspectionResponse) {
  return normalizeType(row.inspection_type).includes("outbound");
}

function isFailed(row: ProductCategoryInspectionResponse) {
  const n = normalizeType(row.inspection_type);
  return n.includes("fail") || n.includes("reject");
}

export function useProductInspectionsApi(
  product: ProductResponse | null,
  categoryUuid: string | null,
  dateRange?: DateRange | undefined,
) {
  const [rows, setRows] = useState<ProductCategoryInspectionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      if (!product || !categoryUuid) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const inspections = await fetchAllProductCategoryInspections(
          categoryUuid,
          { date_field: "created_at", date_from: dateFrom, date_to: dateTo },
          ac.signal,
        );
        if (cancelled) return;
        setRows(inspections.filter((r) => r.product_id === product.id));
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Failed to load product inspections.";
        toast.error(message);
        setRows([]);
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [product, categoryUuid, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const inbound = rows.filter(isInbound);
    const outbound = rows.filter(isOutbound);
    const inboundFailed = inbound.filter(isFailed).length;
    const outboundFailed = outbound.filter(isFailed).length;
    return {
      total: rows.length,
      inboundPassed: Math.max(0, inbound.length - inboundFailed),
      outboundPassed: Math.max(0, outbound.length - outboundFailed),
      inboundFailed,
      outboundFailed,
    };
  }, [rows]);

  return { rows, loading, metrics };
}
