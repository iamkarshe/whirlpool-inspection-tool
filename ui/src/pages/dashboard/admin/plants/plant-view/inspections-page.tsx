import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
import { getInspectionsByPlantId } from "@/pages/dashboard/admin/plants/plant-view/plant-view-service";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type PlantViewContext = { plant: Plant };

export default function PlantViewInspectionsPage() {
  const { plant } = useOutletContext<PlantViewContext>();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInspectionsByPlantId(plant.id)
      .then((data) => {
        if (!cancelled) setInspections(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plant.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <InspectionsDataTable data={inspections} />;
}
