import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import {
  isFailedInspection,
  isInboundInspection,
  isOutboundInspection,
} from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspections";
import { fetchProductCategoryInspectionsPage } from "@/services/product-category-view-api";

export type ProductCategoryInspectionTableMode =
  | "all"
  | "inbound"
  | "outbound"
  | "inboundFailed"
  | "outboundFailed";

function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function refineByMode(
  rows: ProductCategoryInspectionResponse[],
  mode: ProductCategoryInspectionTableMode,
) {
  switch (mode) {
    case "inbound":
      return rows.filter((r) => isInboundInspection(r.inspection_type));
    case "outbound":
      return rows.filter((r) => isOutboundInspection(r.inspection_type));
    case "inboundFailed":
      return rows.filter(
        (r) =>
          isInboundInspection(r.inspection_type) &&
          isFailedInspection(r.inspection_type),
      );
    case "outboundFailed":
      return rows.filter(
        (r) =>
          isOutboundInspection(r.inspection_type) &&
          isFailedInspection(r.inspection_type),
      );
    default:
      return rows;
  }
}

const SORT = {
  allowedColumns: [
    "id",
    "uuid",
    "inspection_type",
    "created_at",
    "inspector_name",
    "product_id",
  ] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

export function useProductCategoryInspectionsServerTable(
  categoryUuid: string,
  mode: ProductCategoryInspectionTableMode,
  dateRange?: DateRange | undefined,
) {
  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;

  const dataScopeKey = useMemo(
    () => JSON.stringify({ categoryUuid, mode, dateFrom, dateTo }),
    [categoryUuid, mode, dateFrom, dateTo],
  );

  return useControlledServerTable<ProductCategoryInspectionResponse>({
    initialSorting: [{ id: "created_at", desc: true }],
    dataScopeKey,
    errorMessage: "Failed to load inspections.",
    load: async ({ signal, pagination, searchQuery, sorting }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(sorting, SORT);
      const res = await fetchProductCategoryInspectionsPage(
        categoryUuid,
        {
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
          search: searchQuery.trim() ? searchQuery.trim() : null,
          sort_by,
          sort_dir,
          date_field: "created_at",
          date_from: dateFrom,
          date_to: dateTo,
        },
        signal,
      );
      return {
        data: refineByMode(res.data, mode),
        total: res.total,
      };
    },
  });
}
