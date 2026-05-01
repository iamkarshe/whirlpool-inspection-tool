import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
import { getDevicesByPlantId } from "@/pages/dashboard/admin/plants/plant-view/plant-view-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type PlantViewContext = { plant: Plant };

export default function PlantViewDevicesPage() {
  const { plant } = useOutletContext<PlantViewContext>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDevicesByPlantId(plant.id)
      .then((data) => {
        if (!cancelled) setDevices(data);
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

  return <DevicesDataTable data={devices} />;
}
