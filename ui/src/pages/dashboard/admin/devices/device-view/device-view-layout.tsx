import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { DeviceHeaderBadges } from "@/pages/dashboard/admin/devices/device-badge";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { loadDeviceView } from "@/pages/dashboard/admin/devices/device-view/controller";
import { TabbedContent } from "@/components/tabbed-content";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";

export default function DeviceViewLayout() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [device, setDevice] = useState<Device | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    loadDeviceView(id)
      .then((d) => {
        if (!cancelled) setDevice(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (device === null || device === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Device not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_DEVICES}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to devices
          </Link>
        </Button>
      </div>
    );
  }

  const basePath = PAGES.deviceViewPath(device.id);
  const usersPath = PAGES.deviceUsersPath(device.id);
  const inspectionsPath = PAGES.deviceInspectionsPath(device.id);
  const loginsPath = PAGES.deviceLoginsPath(device.id);
  const lockHistoryPath = PAGES.deviceLockHistoryPath(device.id);
  const notificationsPath = PAGES.deviceNotificationsPath(device.id);
  const tabs = [
    { label: "Device Details", to: basePath, end: true },
    { label: "Inspections", to: inspectionsPath },
    { label: "Logins", to: loginsPath },
    { label: "Previous Users", to: usersPath },
    { label: "Lock History", to: lockHistoryPath },
    { label: "Notifications", to: notificationsPath },
  ] as const;

  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: "backwards" }}
      >
        <Button variant="ghost" size="icon" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_DEVICES}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to devices</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Device [{device.id}]
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <DeviceHeaderBadges device={device} />
          </div>
        </div>
      </div>

      <TabbedContent tabs={tabs}>
        <Outlet context={{ device }} />
      </TabbedContent>
    </div>
  );
}
