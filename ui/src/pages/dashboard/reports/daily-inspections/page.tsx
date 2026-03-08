import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import {
  getDailyInspectionKpis,
  getDailyInspectionReport,
  type DailyInspectionKpis,
} from "@/pages/dashboard/reports/daily-inspections/daily-inspection-service";
import { DailyInspectionStatCards } from "@/pages/dashboard/reports/daily-inspections/components/daily-inspection-stat-cards";
import InspectionsDataTable from "@/pages/dashboard/transactions/inspections/inspections-data-table";
import type { Inspection } from "@/pages/dashboard/transactions/inspections/inspection-service";
import { useEffect, useState } from "react";

export default function DailyInspectionsReportPage() {
  const [kpis, setKpis] = useState<DailyInspectionKpis | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    setLoadingKpis(true);
    getDailyInspectionKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    setLoadingTable(true);
    getDailyInspectionReport()
      .then(setInspections)
      .finally(() => setLoadingTable(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Daily Inspections"
          description="Inspection volume and activity for the selected period."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker />
          <Button variant="outline" size="sm">
            Download
          </Button>
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
            <DailyInspectionStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {loadingTable ? (
            <SkeletonTable />
          ) : (
            <InspectionsDataTable data={inspections} />
          )}
        </div>
      </div>
    </div>
  );
}
