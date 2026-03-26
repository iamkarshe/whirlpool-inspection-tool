import { useEffect, useState } from "react";

import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { InspectionStatCards } from "@/pages/dashboard/inspections/components/inspection-stat-cards";
import {
  getInspectionKpis,
  getInspections,
  type Inspection,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";

export default function InspectionsPage() {
  const [kpis, setKpis] = useState<InspectionKpis | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setLoadingKpis(true));
    getInspectionKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => setLoadingTable(true));
    getInspections()
      .then(setInspections)
      .finally(() => setLoadingTable(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Inspections"
        description="View and manage all inspections (inbound and outbound)."
      />

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
            <InspectionsDataTable data={inspections} />
          )}
        </div>
      </div>
    </div>
  );
}
