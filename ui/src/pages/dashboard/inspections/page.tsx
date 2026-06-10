import { useEffect, useMemo, useState } from "react";

import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { InspectionStatCards } from "@/pages/dashboard/inspections/components/inspection-stat-cards";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getInspectionKpisForDateRange,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";
import { inspectionsApiErrorMessage } from "@/services/inspections-api";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { DateRange } from "react-day-picker";
import {
  buildInspectionFilterSections,
  defaultInspectionFilters,
  loadInspectionFilterOptions,
  mergeInspectionFilters,
  parseInspectionFiltersFromSearch,
  type InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import { useInspectionsServerTable } from "@/pages/dashboard/inspections/components/use-inspections-server-table";
import { AlertCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function InspectionsPage() {
  const location = useLocation();
  const [kpis, setKpis] = useState<InspectionKpis | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterOptions, setFilterOptions] =
    useState<InspectionFilterOptionsSource | null>(null);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>(
    () =>
      mergeInspectionFilters(
        defaultInspectionFilters(),
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
  });

  const filterSections = useMemo(() => {
    if (!filterOptions) return [];
    return buildInspectionFilterSections(filterOptions, { hasUser: true });
  }, [filterOptions]);

  useEffect(() => {
    const ac = new AbortController();
    queueMicrotask(() => {
      setLoadingKpis(true);
      setKpiError(null);
    });
    getInspectionKpisForDateRange(dateRange, {
      signal: ac.signal,
      filtersValue,
    })
      .then(setKpis)
      .catch((e) => {
        if (ac.signal.aborted) return;
        setKpis(null);
        setKpiError(
          inspectionsApiErrorMessage(e, "Could not load inspection KPIs."),
        );
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingKpis(false);
      });
    return () => ac.abort();
  }, [dateRange, filtersValue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Inspections"
          description="View and manage all inspections (inbound and outbound)."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <MultiSelectFiltersDialog
            title="Filters"
            description="Refine the table results."
            sections={filterSections}
            value={filtersValue}
            onApply={setFiltersValue}
            triggerLabel="Filters"
            optionsLoading={!filterOptions}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 space-y-4">
          {kpiError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inspection KPIs unavailable</AlertTitle>
              <AlertDescription>{kpiError}</AlertDescription>
            </Alert>
          ) : null}
          {loadingKpis ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <InspectionStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {error && !isLoading ? (
            <p className="text-destructive mb-3 text-sm">{error}</p>
          ) : null}
          <InspectionsDataTable
            data={rows}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            serverSide={serverSide}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
