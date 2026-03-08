import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { DeviceHeaderBadges } from "@/pages/dashboard/admin/devices/device-badge";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { loadDeviceView } from "@/pages/dashboard/admin/devices/device-view/controller";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  const inspectionsPath = PAGES.deviceInspectionsPath(device.id);
  const loginsPath = PAGES.deviceLoginsPath(device.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_DEVICES} aria-label="Back to devices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Device {device.id}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <DeviceHeaderBadges device={device} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-background px-4 py-2 pb-6 text-sm text-muted-foreground my-3 space-y-4">
        <nav className="flex gap-1 border-b border-border">
          <NavLink
            to={basePath}
            end
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            Device details
          </NavLink>
          <NavLink
            to={inspectionsPath}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            Inspections
          </NavLink>
          <NavLink
            to={loginsPath}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            Logins
          </NavLink>
        </nav>

        <Outlet context={{ device }} />
      </div>
    </div>
  );
}
