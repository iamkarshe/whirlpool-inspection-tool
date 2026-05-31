import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import type { ProductResponse } from "@/api/generated/model/productResponse";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { INSPECTION_LIST_SORT } from "@/pages/dashboard/inspections/components/inspection-list-query";
import { fetchInspectionsPage } from "@/services/inspections-api";

export type ProductInspectionTableMode =
  | "all"
  | "inbound"
  | "outbound"
  | "inboundFailed"
  | "outboundFailed";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function refineByMode(rows: Inspection[], mode: ProductInspectionTableMode) {
  switch (mode) {
    case "inbound":
      return rows.filter((r) => r.inspection_type === "inbound");
    case "outbound":
      return rows.filter((r) => r.inspection_type === "outbound");
    case "inboundFailed":
      return rows.filter(
        (r) => r.inspection_type === "inbound" && r.checklist_quality === "fail",
      );
    case "outboundFailed":
      return rows.filter(
        (r) =>
          r.inspection_type === "outbound" && r.checklist_quality === "fail",
      );
    default:
      return rows;
  }
}

export function useProductInspectionsServerTable(
  product: ProductResponse | null,
  mode: ProductInspectionTableMode,
  dateRange?: DateRange | undefined,
) {
  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;
  const search = product?.material_code?.trim() ?? "";

  const dataScopeKey = useMemo(
    () =>
      JSON.stringify({
        productId: product?.id ?? 0,
        mode,
        dateFrom,
        dateTo,
        search,
      }),
    [product?.id, mode, dateFrom, dateTo, search],
  );

  return useControlledServerTable<Inspection>({
    initialSorting: [{ id: "created_at", desc: true }],
    dataScopeKey,
    errorMessage: "Failed to load product inspections.",
    load: async ({ signal, pagination, searchQuery, sorting }) => {
      if (!product) return { data: [], total: 0 };
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        sorting,
        INSPECTION_LIST_SORT,
      );
      const q = searchQuery.trim() || search;
      const res = await fetchInspectionsPage(
        {
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
          search: q.length > 0 ? q : null,
          sort_by,
          sort_dir,
          date_field: dateFrom ? "created_at" : null,
          date_from: dateFrom,
          date_to: dateTo,
        },
        { signal },
      );
      const scoped = res.data.filter((r) => r.product_id === product.id);
      return {
        data: refineByMode(scoped, mode),
        total: res.total,
      };
    },
  });
}
