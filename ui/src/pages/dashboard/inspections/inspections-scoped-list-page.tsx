import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useLocation } from "react-router-dom";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import {
  applyInspectionFilters,
  buildInspectionFilterSections,
  computeInspectionStatusMap,
  defaultInspectionFilters,
  mergeInspectionFilters,
  parseInspectionFiltersFromSearch,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import type { InspectionScopeConfig } from "@/pages/dashboard/inspections/inspection-scope-config";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import { inspectionMatchesReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";

export function InspectionsScopedListPage({
  config,
}: {
  config: InspectionScopeConfig;
}) {
  const location = useLocation();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>(
    () =>
      mergeInspectionFilters(
        {
          ...defaultInspectionFilters(),
          type: [config.inspectionType],
          ...(config.checklistStatusPreset?.length
            ? { status: [...config.checklistStatusPreset] }
            : {}),
        },
        parseInspectionFiltersFromSearch(location.search),
      ),
  );
  const [statusMap, setStatusMap] = useState<InspectionStatusMap | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then(async (list) => {
        const scoped = list.filter(
          (i) => i.inspection_type === config.inspectionType,
        );
        setInspections(scoped);
        const map = await computeInspectionStatusMap(scoped);
        setStatusMap(map);
      })
      .finally(() => setLoading(false));
  }, [config.inspectionType]);

  const filterSections = useMemo(
    () => buildInspectionFilterSections(inspections),
    [inspections],
  );

  const data = useMemo(() => {
    const merged = applyInspectionFilters(
      inspections,
      filtersValue,
      statusMap,
    );
    return merged.filter((row) =>
      inspectionMatchesReviewLane(row, config.reviewLane),
    );
  }, [config.reviewLane, filtersValue, inspections, statusMap]);

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

      {loading ? (
        <SkeletonTable />
      ) : (
        <InspectionsDataTable
          data={data}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      )}
    </div>
  );
}
