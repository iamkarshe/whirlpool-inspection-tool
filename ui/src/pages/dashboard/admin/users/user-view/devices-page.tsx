import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { getDevicesByUserId } from "@/pages/dashboard/admin/devices/device-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { UserViewContext } from "./context";

export default function UserViewDevicesPage() {
  const { user } = useOutletContext<UserViewContext>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDevicesByUserId(user.id)
      .then((data) => {
        if (!cancelled) setDevices(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DevicesDataTable data={devices} />;
}
