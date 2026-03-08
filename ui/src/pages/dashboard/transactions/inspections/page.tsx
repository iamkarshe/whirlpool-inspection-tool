import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import InspectionsDataTable from "@/pages/dashboard/transactions/inspections/inspections-data-table";
import {
  getInspections,
  type Inspection,
} from "@/pages/dashboard/transactions/inspections/inspection-service";
import { useEffect, useState } from "react";

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getInspections()
      .then(setInspections)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Inspections"
        description="View and manage all inspections (inbound and outbound)."
      />
      {isLoading ? (
        <SkeletonTable />
      ) : (
        <InspectionsDataTable data={inspections} />
      )}
    </div>
  );
}
