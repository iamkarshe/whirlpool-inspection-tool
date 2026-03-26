import { useEffect, useMemo, useState } from "react";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import type {
  Inspection,
  InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";
import {
  getInspectionQuestionResults,
  getInspections,
} from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { DateRange } from "react-day-picker";

function hasAnyFailed(rows: InspectionQuestionResult[]) {
  return rows.some((r) => r.status === "fail");
}

export default function OutboundFailedInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getInspections()
      .then(async (list) => {
        const outbound = list.filter((i) => i.inspection_type === "outbound");
        const flags = await Promise.all(
          outbound.map(async (i) => {
            const [outer, inner, product] = await Promise.all([
              getInspectionQuestionResults(i.id, "outer-packaging"),
              getInspectionQuestionResults(i.id, "inner-packaging"),
              getInspectionQuestionResults(i.id, "product"),
            ]);
            return { id: i.id, failed: [outer, inner, product].some(hasAnyFailed) };
          }),
        );
        const failedIds = new Set(flags.filter((f) => f.failed).map((f) => f.id));
        setInspections(outbound.filter((i) => failedIds.has(i.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => inspections, [inspections]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Outbound Failed"
          description="Outbound inspections with at least one failed check (Outer/Inner/Product)."
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

