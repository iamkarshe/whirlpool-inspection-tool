import type { DateRange } from "react-day-picker";

import type { MultiSelectFiltersValue } from "@/components/filters/multi-select-filters-dialog";
import type { InspectionFilterContext } from "@/pages/dashboard/inspections/components/inspection-filter-options-types";
import {
  applyInspectionFilters,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import type { InspectionReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";
import { inspectionMatchesReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";
import {
  formatCalendarDateForApi,
  type InspectionsPageParams,
} from "@/services/inspections-api";

const TYPE_BOTH_ID = "both";

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

export function buildInspectionListApiParams(
  input: BuildInspectionListQueryInput,
): InspectionsPageParams {
  const params: InspectionsPageParams = {
    page: input.pagination.pageIndex + 1,
    per_page: input.pagination.pageSize,
    sort_by: input.sortBy,
    sort_dir: input.sortDir,
    search: input.searchQuery.trim() ? input.searchQuery.trim() : null,
  };

  if (input.dateRange?.from) {
    params.date_field = "created_at";
    params.date_from = formatCalendarDateForApi(input.dateRange.from);
    params.date_to = formatCalendarDateForApi(
      input.dateRange.to ?? input.dateRange.from,
    );
  }

  const scopeType = input.scope?.inspectionType;
  if (scopeType) {
    params.inspection_type = scopeType;
  } else {
    const types = (input.filtersValue?.type ?? []).filter(
      (t) => t !== TYPE_BOTH_ID,
    );
    if (types.length === 1) {
      params.inspection_type = types[0];
    }
  }

  return params;
}

/** Client refinements not yet on `GET /api/inspections` (applied to the current page only). */
export function refineInspectionListPageRows(
  rows: Inspection[],
  options: {
    filtersValue?: MultiSelectFiltersValue;
    filterContext?: InspectionFilterContext;
    statusMap?: InspectionStatusMap | null;
    scope?: InspectionListServerScope;
  },
): Inspection[] {
  let next = rows;
  if (options.filtersValue) {
    next = applyInspectionFilters(
      next,
      options.filtersValue,
      options.statusMap ?? null,
      options.filterContext,
    );
  }
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
