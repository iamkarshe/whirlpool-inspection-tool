import type { DateRange } from "react-day-picker";

import type { MultiSelectFiltersValue } from "@/components/filters/multi-select-filters-dialog";
import { TYPE_BOTH_ID } from "@/pages/dashboard/inspections/components/inspection-filters";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import type { InspectionReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";
import { inspectionMatchesReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";
import {
  parseNumericIdsFromFilterValues,
  parseProductCategoryKeysFromFilterValues,
  type InspectionKpisQueryParams,
  type InspectionsPageParams,
} from "@/services/inspection-list-api-params";
import {
  formatCalendarDateForApi,
  inspectionKpisParamsFromDateRange,
} from "@/services/inspections-api";

export const INSPECTION_LIST_SORT = {
  allowedColumns: [
    "created_at",
    "inspection_type",
    "review_status",
    "inspector_name",
    "product_material_code",
  ] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

export type InspectionListServerScope = {
  inspectionType?: "inbound" | "outbound";
  reviewLane?: InspectionReviewLane;
  checklistStatusPreset?: Array<"pass" | "fail">;
};

export type BuildInspectionListQueryInput = {
  pagination: { pageIndex: number; pageSize: number };
  searchQuery: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  dateRange?: DateRange;
  filtersValue?: MultiSelectFiltersValue;
  scope?: InspectionListServerScope;
};

function nonEmpty(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export function inspectionFiltersToServerParams(
  filtersValue?: MultiSelectFiltersValue,
  scope?: InspectionListServerScope,
): Pick<
  InspectionsPageParams,
  | "inspection_type"
  | "warehouse_ids"
  | "plant_ids"
  | "product_category"
  | "user_ids"
> {
  const warehouseIds = parseNumericIdsFromFilterValues(
    nonEmpty(filtersValue?.warehouse),
  );
  const plantIds = parseNumericIdsFromFilterValues(
    nonEmpty(filtersValue?.plant),
  );
  const userIds = parseNumericIdsFromFilterValues(nonEmpty(filtersValue?.user));
  const productCategory = parseProductCategoryKeysFromFilterValues(
    nonEmpty(filtersValue?.product_category),
  );

  let inspectionType = scope?.inspectionType ?? null;
  if (!inspectionType) {
    const types = nonEmpty(filtersValue?.type).filter((t) => t !== TYPE_BOTH_ID);
    if (types.length === 1) {
      inspectionType = types[0] as "inbound" | "outbound";
    }
  }

  return {
    inspection_type: inspectionType,
    warehouse_ids: warehouseIds.length > 0 ? warehouseIds : null,
    plant_ids: plantIds.length > 0 ? plantIds : null,
    product_category: productCategory.length > 0 ? productCategory : null,
    user_ids: userIds.length > 0 ? userIds : null,
  };
}

export function buildInspectionListApiParams(
  input: BuildInspectionListQueryInput,
): InspectionsPageParams {
  const params: InspectionsPageParams = {
    page: input.pagination.pageIndex + 1,
    per_page: input.pagination.pageSize,
    sort_by: input.sortBy,
    sort_dir: input.sortDir,
    search: input.searchQuery.trim() ? input.searchQuery.trim() : null,
    ...inspectionFiltersToServerParams(input.filtersValue, input.scope),
  };

  if (input.dateRange?.from) {
    params.date_field = "created_at";
    params.date_from = formatCalendarDateForApi(input.dateRange.from);
    params.date_to = formatCalendarDateForApi(
      input.dateRange.to ?? input.dateRange.from,
    );
  }

  return params;
}

export function buildInspectionKpisApiParams(input: {
  dateRange?: DateRange;
  filtersValue?: MultiSelectFiltersValue;
}): InspectionKpisQueryParams {
  const dateParams = inspectionKpisParamsFromDateRange({
    from: input.dateRange?.from,
    to: input.dateRange?.to,
  });
  const warehouseIds = parseNumericIdsFromFilterValues(
    nonEmpty(input.filtersValue?.warehouse),
  );
  const plantIds = parseNumericIdsFromFilterValues(
    nonEmpty(input.filtersValue?.plant),
  );
  const userIds = parseNumericIdsFromFilterValues(
    nonEmpty(input.filtersValue?.user),
  );
  const productCategory = parseProductCategoryKeysFromFilterValues(
    nonEmpty(input.filtersValue?.product_category),
  );

  return {
    ...dateParams,
    warehouse_ids: warehouseIds.length > 0 ? warehouseIds : null,
    plant_ids: plantIds.length > 0 ? plantIds : null,
    product_category: productCategory.length > 0 ? productCategory : null,
    user_ids: userIds.length > 0 ? userIds : null,
  };
}

/**
 * Scoped-route refinements not yet on `GET /api/inspections` (review lane, checklist preset).
 * Warehouse, plant, category, and inspector filters are applied server-side via kpi-parameters values.
 */
export function refineInspectionListPageRows(
  rows: Inspection[],
  options: {
    scope?: InspectionListServerScope;
  },
): Inspection[] {
  let next = rows;
  if (options.scope?.reviewLane) {
    next = next.filter((row) =>
      inspectionMatchesReviewLane(row, options.scope!.reviewLane),
    );
  }
  const preset = options.scope?.checklistStatusPreset;
  if (preset?.length) {
    const allowed = new Set(preset);
    next = next.filter(
      (row) =>
        row.checklist_quality != null && allowed.has(row.checklist_quality),
    );
  }
  return next;
}
