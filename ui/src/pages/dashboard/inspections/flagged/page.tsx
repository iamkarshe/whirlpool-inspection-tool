import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { AppliedDateRangePicker } from "@/components/applied-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import PageActionBar from "@/components/page-action-bar";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import {
  buildInspectionFilterSections,
  defaultFlaggedInspectionFilters,
  loadInspectionFilterOptions,
  mergeInspectionFilters,
  parseInspectionFiltersFromSearch,
  type InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import { useInspectionsServerTable } from "@/pages/dashboard/inspections/components/use-inspections-server-table";
import { useAppliedDateRange } from "@/hooks/use-applied-date-range";

export default function FlaggedInspectionsPage() {
  const location = useLocation();
  const {
    draft: dateRangeDraft,
    applied: dateRange,
    onDraftChange,
    apply: applyDateRange,
    isDirty: dateRangeDirty,
  } = useAppliedDateRange();
  const [filterOptions, setFilterOptions] =
    useState<InspectionFilterOptionsSource | null>(null);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>(() =>
    mergeInspectionFilters(
      defaultFlaggedInspectionFilters(),
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

  const { rows, isLoading, error, serverSide } = useInspectionsServerTable({
    dateRange,
    filtersValue,
    scope: {
      checklistStatusPreset: ["fail"],
    },
  });

  const filterSections = useMemo(() => {
    if (!filterOptions) return [];
    return buildInspectionFilterSections(filterOptions);
  }, [filterOptions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Flagged Inspections"
          description="Inspections with at least one failed check (Outer packaging, Inner packaging, or Product)."
        />
        <div className="flex flex-wrap items-center gap-2">
          <AppliedDateRangePicker
            draft={dateRangeDraft}
            onDraftChange={onDraftChange}
            onApply={applyDateRange}
            isDirty={dateRangeDirty}
          />
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
        serverSide={serverSide}
        isLoading={isLoading}
      />
    </div>
  );
}
