import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { getDevicesByWarehouseId } from "@/pages/dashboard/admin/warehouses/warehouse-view/warehouse-view-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewDevicesPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDevicesByWarehouseId(warehouse.id)
      .then((data) => {
        if (!cancelled) setDevices(data);
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

  return <DevicesDataTable data={devices} />;
}
