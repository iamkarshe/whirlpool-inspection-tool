import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import type { DateRange } from "react-day-picker";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchAllProductCategoryInspections } from "@/services/product-category-view-api";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function isInboundInspection(type: string) {
  return type.toLowerCase().includes("inbound");
}

export function isOutboundInspection(type: string) {
  return type.toLowerCase().includes("outbound");
}

export function isFailedInspection(type: string) {
  const n = type.toLowerCase();
  return n.includes("fail") || n.includes("reject");
}

export function useProductCategoryInspections(
  categoryUuid: string,
  dateRange?: DateRange | undefined,
) {
  const [inspections, setInspections] = useState<ProductCategoryInspectionResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const rows = await fetchAllProductCategoryInspections(
          categoryUuid,
          { date_from: dateFrom, date_to: dateTo, date_field: "created_at" },
          ac.signal,
        );
        if (cancelled) return;
        setInspections(rows);
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Failed to load inspections.";
        toast.error(message);
        setInspections([]);
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [categoryUuid, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const total = inspections.length;
    const inbound = inspections.filter((i) =>
      isInboundInspection(i.inspection_type),
    );
    const outbound = inspections.filter((i) =>
      isOutboundInspection(i.inspection_type),
    );
    const inboundFailed = inbound.filter((i) =>
      isFailedInspection(i.inspection_type),
    ).length;
    const outboundFailed = outbound.filter((i) =>
      isFailedInspection(i.inspection_type),
    ).length;

    return {
      total,
      inboundTotal: inbound.length,
      outboundTotal: outbound.length,
      inboundFailed,
      outboundFailed,
      inboundPassed: Math.max(0, inbound.length - inboundFailed),
      outboundPassed: Math.max(0, outbound.length - outboundFailed),
    };
  }, [inspections]);

  return { inspections, loading, metrics };
}
