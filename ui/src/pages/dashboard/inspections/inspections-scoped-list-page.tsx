import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useLocation } from "react-router-dom";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import PageActionBar from "@/components/page-action-bar";
import {
  buildInspectionFilterSections,
  defaultInspectionFilters,
  loadInspectionFilterOptions,
  mergeInspectionFilters,
  parseInspectionFiltersFromSearch,
  type InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import { useInspectionsServerTable } from "@/pages/dashboard/inspections/components/use-inspections-server-table";
import type { InspectionScopeConfig } from "@/pages/dashboard/inspections/inspection-scope-config";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";

export function InspectionsScopedListPage({
  config,
}: {
  config: InspectionScopeConfig;
}) {
  const location = useLocation();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterOptions, setFilterOptions] =
    useState<InspectionFilterOptionsSource | null>(null);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>(
    () =>
      mergeInspectionFilters(
        {
          ...defaultInspectionFilters(),
          type: [config.inspectionType],
        },
        parseInspectionFiltersFromSearch(location.search),
      ),
  );

  useEffect(() => {
    const ac = new AbortController();
    loadInspectionFilterOptions({ signal: ac.signal })
      .then(setFilterOptions)
      .catch(() => setFilterOptions(null));
    return () => ac.abort();
  }, []);

  const scope = useMemo(
    () => ({
      inspectionType: config.inspectionType,
      reviewLane: config.reviewLane,
      checklistStatusPreset: config.checklistStatusPreset,
    }),
    [config],
  );

  const { rows, isLoading, error, serverSide } = useInspectionsServerTable({
    dateRange,
    filtersValue,
    scope,
  });

  const filterSections = useMemo(() => {
    if (!filterOptions) return [];
    return buildInspectionFilterSections(filterOptions);
  }, [filterOptions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar title={config.title} description={config.description} />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <MultiSelectFiltersDialog
            title="Filters"
            description="Refine the table results."
            sections={filterSections}
            value={filtersValue}
            onApply={setFiltersValue}
            triggerLabel="Filters"
          />
        </div>
      </div>

      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <InspectionsDataTable
        data={rows}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        serverSide={serverSide}
        isLoading={isLoading}
      />
    </div>
  );
}
