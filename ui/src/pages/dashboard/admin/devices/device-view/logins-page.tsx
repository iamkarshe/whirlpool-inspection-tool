import SkeletonTable from "@/components/skeleton7";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import {
  getLoginsByUserId,
  type LoginActivity,
} from "@/pages/dashboard/admin/logins/login-service";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type DeviceViewContext = { device: Device };

export default function DeviceViewLoginsPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLoginsByUserId(device.user_id)
      .then((data) => {
        if (!cancelled) setLogins(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [device.user_id]);

  if (loading) {
    return <SkeletonTable />;
  }

  return <LoginsDataTable data={logins} />;
}
