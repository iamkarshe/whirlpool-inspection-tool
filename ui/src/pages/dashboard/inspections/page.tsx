import { useEffect, useMemo, useState } from "react";

import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { InspectionStatCards } from "@/pages/dashboard/inspections/components/inspection-stat-cards";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import {
  getInspectionKpis,
  getInspections,
  type Inspection,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { DateRange } from "react-day-picker";

export default function InspectionsPage() {
  const [kpis, setKpis] = useState<InspectionKpis | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>({
    type: [],
  });

  const filteredInspections = useMemo(() => {
    const types = new Set(filtersValue.type ?? []);
    if (types.size === 0) return inspections;
    return inspections.filter((i) => types.has(i.inspection_type));
  }, [filtersValue.type, inspections]);

  useEffect(() => {
    queueMicrotask(() => setLoadingKpis(true));
    getInspectionKpis(
      dateRange?.from ? dateRange.from.toISOString() : undefined,
      dateRange?.to ? dateRange.to.toISOString() : undefined,
    )
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => {
    queueMicrotask(() => setLoadingTable(true));
    getInspections()
      .then(setInspections)
      .finally(() => setLoadingTable(false));
  }, []);

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
            sections={[
              {
                key: "type",
                label: "Type",
                options: [
                  { id: "inbound", label: "Inbound" },
                  { id: "outbound", label: "Outbound" },
                ],
              },
            ]}
            value={filtersValue}
            onApply={setFiltersValue}
            triggerLabel="Filters"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {loadingKpis ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-lg border bg-muted/50"
                />
              ))}
            </div>
          ) : kpis ? (
            <InspectionStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {loadingTable ? (
            <SkeletonTable />
          ) : (
            <InspectionsDataTable
              data={filteredInspections}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
