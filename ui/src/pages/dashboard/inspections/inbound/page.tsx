import { useEffect, useMemo, useState } from "react";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { DateRange } from "react-day-picker";
import {
  applyInspectionFilters,
  buildInspectionFilterSections,
  computeInspectionStatusMap,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";

export default function InboundInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>({
    type: ["inbound"],
    status: [],
    warehouse: [],
    product: [],
    inspector: [],
  });
  const [statusMap, setStatusMap] = useState<InspectionStatusMap | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then(async (list) => {
        const inbound = list.filter((i) => i.inspection_type === "inbound");
        setInspections(inbound);
        const map = await computeInspectionStatusMap(inbound);
        setStatusMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const filterSections = useMemo(
    () => buildInspectionFilterSections(inspections),
    [inspections],
  );
  const data = useMemo(
    () => applyInspectionFilters(inspections, filtersValue, statusMap),
    [filtersValue, inspections, statusMap],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Inbound Inspections"
          description="All inbound inspections for the selected period."
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

