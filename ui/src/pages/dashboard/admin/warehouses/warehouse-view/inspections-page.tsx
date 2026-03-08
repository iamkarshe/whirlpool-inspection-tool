import InspectionsDataTable from "@/pages/dashboard/transactions/inspections/inspections-data-table";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { getInspectionsByWarehouseId } from "@/pages/dashboard/admin/warehouses/warehouse-view/warehouse-view-service";
import type { Inspection } from "@/pages/dashboard/transactions/inspections/inspection-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewInspectionsPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInspectionsByWarehouseId(warehouse.id)
      .then((data) => {
        if (!cancelled) setInspections(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouse.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <InspectionsDataTable data={inspections} />;
}
