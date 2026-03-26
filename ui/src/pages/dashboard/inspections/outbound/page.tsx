import { useEffect, useMemo, useState } from "react";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { DateRange } from "react-day-picker";

export default function OutboundInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then((list) => {
        setInspections(list.filter((i) => i.inspection_type === "outbound"));
      })
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => inspections, [inspections]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Outbound Inspections"
          description="All outbound inspections for the selected period."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
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

