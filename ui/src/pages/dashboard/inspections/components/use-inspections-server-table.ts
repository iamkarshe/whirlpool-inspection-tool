import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import type { MultiSelectFiltersValue } from "@/components/filters/multi-select-filters-dialog";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import type { InspectionFilterContext } from "@/pages/dashboard/inspections/components/inspection-filter-options-types";
import {
  buildInspectionListApiParams,
  INSPECTION_LIST_SORT,
  refineInspectionListPageRows,
  type InspectionListServerScope,
} from "@/pages/dashboard/inspections/components/inspection-list-query";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { fetchInspectionsPage } from "@/services/inspections-api";

export type UseInspectionsServerTableOptions = {
  dateRange?: DateRange;
  filtersValue: MultiSelectFiltersValue;
  filterContext?: InspectionFilterContext;
  scope?: InspectionListServerScope;
  errorMessage?: string;
};

export function useInspectionsServerTable({
  dateRange,
  filtersValue,
  filterContext,
  scope,
  errorMessage = "Failed to load inspections.",
}: UseInspectionsServerTableOptions) {
  const dataScopeKey = useMemo(
    () =>
      JSON.stringify({
        dateRange: dateRange?.from?.toISOString() ?? "",
        dateTo: dateRange?.to?.toISOString() ?? "",
        filtersValue,
        scope,
      }),
    [dateRange, filtersValue, scope],
  );

  return useControlledServerTable<Inspection>({
    initialSorting: [{ id: "created_at", desc: true }],
    dataScopeKey,
    errorMessage,
    load: async ({ signal, pagination, searchQuery, sorting }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        sorting,
        INSPECTION_LIST_SORT,
      );
      const apiParams = buildInspectionListApiParams({
        pagination,
        searchQuery,
        sortBy: sort_by,
        sortDir: sort_dir,
        dateRange,
        filtersValue,
        scope,
      });
      const { data, total } = await fetchInspectionsPage(apiParams, {
        signal,
      });
      const rows = refineInspectionListPageRows(data, {
        filtersValue,
        filterContext,
        scope,
      });
      return { data: rows, total };
    },
  });
}
